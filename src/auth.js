const dotenv = require('dotenv');
const chalk = require('chalk');
const ora = require('ora');
const fetch = require('node-fetch');
const path = require('path');

dotenv.config({ path: './.env.ini' });
dotenv.config({ path: path.join(__dirname, '../', '.env.build') }); /* Load build settings if available */

const config = {
    user: process.env.USUARIO,
    apiEndpoint: process.env.API_ENDPOINT
};

class Auth {
    async signin() {
        /* Load spinner */
        const spinner = ora(`Verificando assinatura para o usuário `+ chalk.blueBright(config.user) +`...`).start();

        try {
            const res = await fetch(`${config.apiEndpoint}?user=${config.user}`);
            const data = await res.json();

            await new Promise(resolve => setTimeout(resolve, 3000)); /* Sleep for 3 seconds */

            /* Check if user has valid subscription */
            if(data.error == true || data.credentials == 'invalid') {
                spinner.fail(`Não encontrei uma assinatura válida para o usuário `+ chalk.blueBright(config.user) +`\n`);
                console.error(data);

                return false;
            }

            else if(data.credentials == 'valid')
                spinner.succeed(`Assinatura válida! Iniciando...`);

            return true;
        } catch(e) {
            spinner.fail(chalk.redBright('Não foi possível verificar a assinatura no momento. Tente mais tarde. \n'));

            return false;
        }
    }
}

module.exports = new Auth;