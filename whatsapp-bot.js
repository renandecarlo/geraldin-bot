const dotenv = require('dotenv').config({ path: './.env.ini' });
const venom = require('venom-bot');

const io = require('socket.io')();

const config = {
    headless: 		process.env.MOSTRAR_NAVEGADOR_WHATSAPP == '1' ? false : true,
	sendToEveryone:	process.env.ENVIA_MSG_TODOS_NUMEROS == '1' ? true : false,
};

/* Start venom browser */
venom
	.create('geraldo-bot', false, handleSession, { headless: config.headless })
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
	console.log('-> Abrindo socket de mensagens');
	io.listen(3000);

	io.on('connection', socket => {
        console.log('-> Cliente socket conectado');

		socket.on('message', async (data) => {
            console.log('-> Enviando mensagem', data);

			for(const wppNumber of data.wppNumbers) {
				try {
					let result = await client.sendText(`55${wppNumber}@c.us`, data.message);
					// console.log('Result: ', result); // return object success

					/* Check if message has been sent. Send to next number otherwise */
					if(!result.erro) {
						console.log('-> Enviado!', [ result.status, wppNumber ] )
						
						/* Send to everyone if enabled, break otherwise. */
						if(!config.sendToEveryone)
							break;
					}
				} catch (error) {
					console.log('-> Mensagem não enviada. Tentando próximo número', [ error.status, wppNumber, error.text ] );
				}
			}
		});
	});
}