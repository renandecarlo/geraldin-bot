const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: './.env.ini' });
dotenv.config({ path: path.join(__dirname, '../', '.env.build') }); /* Load build settings */

const config = {
    /* geraldo-listener.js */
    notifySellers:                  process.env.NOTIFICA_SELLER,
    user:                           process.env.USUARIO,
    password:                       process.env.SENHA,
    waitFor:                        process.env.ESPERA_PRIMEIRA_MSG * 60 * 1000,
    waitForBetween:                 process.env.ESPERA_ENTRE_MSG * 60 * 1000,
    maxMsgs:                        parseInt(process.env.LIMITE_DE_MSGS),
    sendToExtraNumbers:	            process.env.ENVIA_MSG_OUTROS_TELEFONES == '1' ? true : false,
    sendOnlyToExtraNumbers:	        process.env.ENVIA_MSG_SOMENTE_OUTROS_TELEFONES == '1' ? true : false,
    sellersToFilter:                process.env.FILTRO_LOJAS_ID || '',
    notifyPartner:                  process.env.NOTIFICA_CM == '1' ? true : false,
    notifyPartnerWaitFor:           process.env.NOTIFICA_CM_TEMPO * 60 * 1000,
    notifyPartnerWaitForBetween:    process.env.NOTIFICA_CM_TEMPO_ENTRE_MSG * 60 * 1000,
    notifyPartnerNumbers:           process.env.NOTIFICA_CM_NUMEROS,
    notifyPartnerSendContactCard:   process.env.NOTIFICA_CM_ENVIA_CONTATO == '1' ? true : false,
    notifyPartnerMsg:               process.env.NOTIFICA_CM_MSG || '🚨 Atenção, o *%restaurante%* tem um pedido (#%pedido_n%) esperando há *%tempo_esperando% minutos*!',
    headless:                       process.env.MOSTRAR_NAVEGADOR_GERALDO == '1' ? false : true,
    message:                        process.env.MENSAGEM || 'Olá parceiro, você tem um novo pedido (#%pedido_n%) esperando há *%tempo_esperando% minutos*! 🚀',
	
    /* whatsapp-bot.js */
    sendToEveryone:		            process.env.ENVIA_MSG_TODOS_NUMEROS == '1' ? true : false,
	numbersToFilter:	            process.env.FILTRO_TELEFONES || '',

    /* auth.js */
    user: process.env.USUARIO,
    apiEndpoint: process.env.API_ENDPOINT,

    /* logger.js */
    sentryEndpoint: process.env.SENTRY_ENDPOINT,
};

module.exports = config;