const chalk = require('chalk');
const wppconnect = require('@wppconnect-team/wppconnect');
const Sentry = require("@sentry/node");

const config = require('./config');

/* Check if user is signed in */
if(!module.parent || !module.parent.signedin) {
	console.log(chalk.bgRedBright('-> Não foi possível verificar a assinatura'));

	Sentry.close(8000).then(() => {
		process.exit();
	});
}

/* Handle browser exit */
const handleSession = (statusSession, session) => {
	if(statusSession == 'browserClose') {
		Sentry.close(8000).then(() => {
			process.exit();
		});
	}
}

/* Get user wpp contacts between given numbers */
const getUserContacts = async wppNumbers => {
	if(!client) return;
	
	const contacts = [];
	try {
		const userContacts = await client.getAllContacts();
			
		for(const contact of userContacts) {
			if(contact.isMyContact)
				for(const wppNumber of wppNumbers) {
					if(contact.id.user == `55${wppNumber}`)
						contacts.push(wppNumber);
				}
		}
	} catch { /* Fail silently */ }
	
	return contacts;
}

/* Get valid wpp numbers between given numbers */
const getValidNumbers = async wppNumbers => {
	if(!client) return;

	const contacts = [];
	for(const wppNumber of wppNumbers) {
		if(await checkNumber(wppNumber))
			contacts.push(wppNumber);
	}

	return contacts;
}

/* Check if the wpp number is valid */
const checkNumber = async wppNumber => {
	if(!client) return;

	try {
		const result = await client.checkNumberStatus(`55${wppNumber}@c.us`);

		if(result?.status == 200)
			return result;

	} catch { /* Fail silently */ }
}

/* Send a contact vcard to desired data.wppNumbers */
const sendContactVcard = async data => {
	if(!client) return;

	for(const wppNumber of data.wppNumbers) {
		try {
			/* Check if it's a valid wpp number */
			const wppUser = await checkNumber(wppNumber);
			if(!wppUser) {
				console.log(chalk.redBright('-> Este número não possui WhatsApp. Tentando próximo número'), [ wppNumber ] );
				continue;
			}
			
			const result = await client.sendContactVcard(`${wppUser.id.user}@${wppUser.id.server}`, `55${data.contactNumber}@c.us`, data.contactName);

			if(result.ack)
				console.log(chalk.greenBright.inverse('-> Cartão de contato enviado!'), [ result.ack, wppNumber ] )

		} catch(error) {
			console.log(chalk.redBright('-> Não foi possível enviar o cartão de contato.'), [ wppNumber, error ] );
		}
	}

	return true;
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

		/* Check if it's a valid wpp number */
		const wppUser = await checkNumber(wppNumber);
		if(!wppUser) {
			console.log(chalk.redBright('-> Este número não possui WhatsApp. Tentando próximo número'), [ wppNumber ] );
			continue;
		}

		/* Send msg */
		try {
			const result = await client.sendText(`${wppUser.id.user}@${wppUser.id.server}`, data.message);
			// console.log('Result: ', result); // return object success

			/* Check if message has been sent. Send to next number otherwise */
			if(result.ack) {
				console.log(chalk.greenBright.inverse('-> Enviado!'), [ result.ack, wppNumber ] )
				
				/* Send to everyone if enabled or if it's a partner notification msg, break otherwise. */
				if(!config.sendToEveryone && !data.notifyPartnerMsg)
					break;
			} else
				throw result;

		} catch (error) {
			console.log(chalk.redBright('-> Mensagem não enviada. Tentando próximo número'), [ wppNumber, error ] );
		}
	}

	return true;
}

/* Check current wpp session status */
const isConnected = () => {
	if(client) return true;
}

/**
 * Run
 */
let client;

(async () => {
	/* Start venom browser */
	try {
		wppconnect.defaultLogger.level = 'info';

		client = await wppconnect.create({
			session: 'geraldo-bot', 
			statusFind: handleSession, 
			headless: config.headlessWhatsapp, 
			autoClose: false, 
			deviceSyncTimeout: false,
			browserArgs: ['--disable-extensions'],
		});

		client.page.on('close', () => {
			console.log(chalk.bgRedBright('-> O navegador do WhatsApp Web foi fechado. Encerrando programa...'));
			
			Sentry.close(8000).then(() => {
				process.exit();
			});
		});
	} catch(e) {
		console.err(chalk.bgRedBright('-> Não foi possível inicializar o Whatsapp Web', e));
	}
})()

module.exports = {
	sendMessage, 
	getUserContacts, 
	getValidNumbers, 
	sendContactVcard,
	isConnected,
}