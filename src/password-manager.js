const keytar = require('keytar');
const readline = require('readline');
const chalk = require('chalk');
const crypto = require('crypto');
const Sentry = require('@sentry/node');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const package = require('../package.json');

const encryptedConfig = {
    passwordPlaceholder: '***SENHA CRIPTOGRAFADA***',
    passwordEnvKey: 'SENHA',
};

/* Promisify the readline prompt */
const passwordPrompt = question => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            return resolve(answer);
        });
    });
};

const setPassword = async () => {
    await keytar.deletePassword(package.name, config.user); /* Delete any remaining password */

    const firstPrompt = 
        chalk.redBright(`Senha não encontrada! Configure sua senha.\n`) +
        chalk.bgRed.whiteBright(`Nota: Sua senha será criptografada e armazenada de forma segura para futuros acessos.\n` +
        `Caso deseje redefinir a senha, basta deixar o campo "SENHA" em branco no arquivo de configuração.\n\n`);

    const secondPrompt =
        `Por favor, insira sua senha do Geraldo e pressione <Enter> para confirmar:`;

    const password = await passwordPrompt(firstPrompt + secondPrompt);

    /* Clear the line and prevent password being visible */
    process.stdout.moveCursor(0, -1); /* Move cursor up one line */
    process.stdout.clearLine();
    console.log(`${secondPrompt}OK!\n`);

    if(password) {

        try {
            const encryptedPassword = encryptPassword(password, config.CRYPT_KEY);
            await keytar.setPassword(package.name, config.user, encryptedPassword); /* Save encrypted password */

            config.password = password; /* Set config password for current session */
            return setEnvPassword();
        } catch(e) {
            console.err(chalk.bgRedBright('-> Não foi possível salvar a senha criptografada.'));

            Sentry.close(8000).then(() => {
                process.exit();
            });
        }
    }
}

const encryptPassword = (password, key) => {
    const cipher = crypto.createCipheriv('aes-256-ecb', key, null); /* Aes-256-ecb without IV */
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
}

const decryptPassword = (encrypted, key) => {
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/* Set password as encrypted in config file */
const setEnvPassword = () => {
    /* Path to .env.ini file */
    const envFilePath = path.resolve('./.env.ini');
    const envContent = fs.readFileSync(envFilePath, 'utf8');

    /* Check if the password config exists in the config file */
    const regex = new RegExp(`^${encryptedConfig.passwordEnvKey}=.*`, 'm');
    
    if (regex.test(envContent)) {
        /* Replace value */
        const updatedContent = envContent.replace(regex, `${encryptedConfig.passwordEnvKey}=${encryptedConfig.passwordPlaceholder}`);
        fs.writeFileSync(envFilePath, updatedContent);
    }

    return true;
}

const passwordManager = async () => {
    /* Set an encrypted password if no password set */
    if(!config.password) {
        return await setPassword();
    }

    /* Decrypt password if it's encrypted */
    if(config.password?.includes(encryptedConfig.passwordPlaceholder)) {
        const encryptedPassword = await keytar.getPassword(package.name, config.user);

        try {
            config.password = decryptPassword(encryptedPassword, config.CRYPT_KEY);
        } catch(e) {
            console.err(chalk.bgRedBright('-> Não foi possível descriptografar a senha.'));

            return await setPassword();
        }
    }

    return true;
}

module.exports = passwordManager;