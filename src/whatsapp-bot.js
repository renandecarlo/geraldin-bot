const dotenv = require('dotenv').config({ path: './.env.ini' });
const chalk = require('chalk');
const venom = require('venom-bot');

const io = require('socket.io')();

const config = {
    headless: 		process.env.MOSTRAR_NAVEGADOR_WHATSAPP == '1' ? false : true,
	sendToEveryone:	process.env.ENVIA_MSG_TODOS_NUMEROS == '1' ? true : false,
};

/* Check if user is signed in */
if(!module.parent || !module.parent.signedin) {
	console.log(chalk.bgRedBright('-> Não foi possível verificar a assinatura'));
	process.exit();
}

/* Start venom browser */
venom
	.create('geraldo-bot', false, handleSession, { headless: config.headless, multidevice: true, autoClose: false })
	.then((client) => start(client))
	.catch((erro) => {
		console.log(erro);
	});

/* Handle browser exit */
function handleSession(statusSession, session) {
	if(statusSession == 'browserClose') {
		io.close();
		process.exit();
	}
}

/**
 * Run
 */
function start(client) {
	console.log(chalk.magentaBright('-> Abrindo socket de mensagens'));
	io.listen(3000);

	io.on('connection', socket => {
        console.log(chalk.magentaBright('-> Cliente socket conectado'));

		socket.on('message', async (data) => {
            console.log(chalk.green('-> Enviando mensagem'), data.message);

			for(const wppNumber of data.wppNumbers) {
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
		});
	});
}
