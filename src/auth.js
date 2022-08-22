const dotenv = require('dotenv');
const chalk = require('chalk');
const ora = require('ora');
const fetch = require('node-fetch');
const path = require('path');

const config = require('./config');

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
                const msg = `Não encontrei uma assinatura válida para o usuário `+ chalk.blueBright(config.user) +`\n`;

                spinner.fail(msg);

                console.info(data); /* Show returned error data */
                console.msg(msg, data); /* Log */

                return false;
            }

            else if(data.credentials == 'valid')
                spinner.succeed(`Assinatura válida! Iniciando...\n`);

            return true;
        } catch(e) {
            const msg = chalk.redBright('Não foi possível verificar a assinatura no momento. Tente mais tarde. \n');

            spinner.fail(msg);
            console.silent(msg);

            return false;
        }
    }
}

module.exports = new Auth;