const dotenv = require('dotenv').config({ path: './.env.ini' });
const chalk = require('chalk');
const venom = require('venom-bot');

const config = {
    headless: 			process.env.MOSTRAR_NAVEGADOR_WHATSAPP == '1' ? false : true,
	sendToEveryone:		process.env.ENVIA_MSG_TODOS_NUMEROS == '1' ? true : false,
	numbersToFilter:	process.env.FILTRO_TELEFONES,
};

/* Check if user is signed in */
if(!module.parent || !module.parent.signedin) {
	console.log(chalk.bgRedBright('-> Não foi possível verificar a assinatura'));
	process.exit();
}

/* Handle browser exit */
const handleSession = (statusSession, session) => {
	if(statusSession == 'browserClose') {
		io.close();
		process.exit();
	}
}


/* Send message to desired data.wppNumbers */
const sendMessage = async data => {
	if(!client) {
		console.log(chalk.blueBright('-> Aguardando inicialização do Whatsapp Web...'));
		return;
	}

	console.log(chalk.green('-> Enviando mensagem'), data.message);

	const numbersToFilter = config.numbersToFilter?.replace(/[^\d,+]/g, '').split(',');

	for(const wppNumber of data.wppNumbers) {
		/* Filter number according to config option */
		if(numbersToFilter.includes(wppNumber)) {
			console.log(chalk.redBright('-> Número filtrado. Tentando próximo número'), [ wppNumber ]);
			continue;
		}			

		try {
			let result = await client.sendText(`55${wppNumber}@c.us`, data.message);
			// console.log('Result: ', result); // return object success

			/* Check if message has been sent. Send to next number otherwise */
			if(!result.erro) {
				console.log(chalk.greenBright.inverse('-> Enviado!'), [ result.status, wppNumber ] )
				
				/* Send to everyone if enabled, break otherwise. */
				if(!config.sendToEveryone)
					break;
			}
		} catch (error) {
			console.log(chalk.redBright('-> Mensagem não enviada. Tentando próximo número'), [ error.status, wppNumber, error.text ] );
		}
	}
}

/**
 * Run
 */
let client;

(async () => {
	/* Start venom browser */
	try {
		client = await venom.create('geraldo-bot', false, handleSession, { headless: config.headless, multidevice: true, autoClose: false })
	} catch(e) {
		console.log(chalk.bgRedBright('-> Não foi possível inicializar o Whatsapp Web', e));
	}
})()

module.exports = { sendMessage }