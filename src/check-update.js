const semver = require('semver');
const package = require('../package.json');

const fetch = require('node-fetch');

const chalk = require('chalk');
const ora = require('ora');


const checkUpdate = async () => {
    /* Load spinner */
    const spinner = ora(chalk.bgBlueBright(`Verificando atualização...`)).start();

    try {
        let response;

        response = await fetch('https://api.github.com/repos/renandecarlo/geraldin-bot/releases/latest');
        const lastRelease = await response.json();

        response = await fetch(`https://github.com/renandecarlo/geraldin-bot/raw/${lastRelease.tag_name}/package.json`);
        const remotePackage = await response.json();

        if(semver.gt(remotePackage.version, package.version))
            spinner.succeed(chalk.bgBlueBright(`Nova atualização ${lastRelease.tag_name} disponível.`) + chalk.blueBright(' https://github.com/renandecarlo/geraldin-bot/releases/latest'));
        else
            spinner.succeed(`Você está na última versão: v${package.version}`);

    } catch(error) {
        const msg = chalk.redBright('Não foi possível verificar a atualização.', [ error.code, error.message ]);

        spinner.fail(msg);
        console.silent(msg);
    }
}

module.exports = checkUpdate;