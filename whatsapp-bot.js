const dotenv = require('dotenv').config();
const venom = require('venom-bot');

const io = require('socket.io')();

const config = {
    headless: process.env.MOSTRAR_NAVEGADOR_WHATSAPP == '1' ? false : true
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
	io.listen(3000);

	io.on('connection', socket => {
        console.log('-> Client connected.');
		socket.on('message', (data) => {
            console.log('-> Message received', data);

			client
                .sendText(`55${data.wppNumber}@c.us`, data.message)
                .then((result) => {
                    // console.log('Result: ', result); // return object success
                })
                .catch((error) => {
                    console.error('Error when sending: ', error); //return object error
                });
		});
	});
}