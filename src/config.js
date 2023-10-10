const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: './.env.ini' });
dotenv.config({ path: path.join(__dirname, '../', '.env.build') }); /* Load build settings */

const config = {
    /* geraldo-listener.js */
    notifySellers:                  process.env.NOTIFICA_LOJAS,
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
    headlessWhatsapp:               process.env.MOSTRAR_NAVEGADOR_WHATSAPP == '1' ? false : true,
    message:                        process.env.MENSAGEM || 'Olá parceiro, você tem um novo pedido (#%pedido_n%) esperando há *%tempo_esperando% minutos*! 🚀',
	
    /* whatsapp-bot.js */
    sendToEveryone:		            process.env.ENVIA_MSG_TODOS_NUMEROS == '1' ? true : false,
	numbersToFilter:	            process.env.FILTRO_TELEFONES || '',

    /* auth.js */
    user: process.env.USUARIO,
    apiEndpoint: process.env.API_ENDPOINT,

    /* logger.js */
    sentryEndpoint: process.env.SENTRY_ENDPOINT,

    /* watchdog.js */
    watchdog: process.env.ANTITROTE == '1' ? true : false,
    watchdogNotifyPartner: process.env.ANTITROTE_NOTIFICA_CM == '1' ? true : false,
    watchdogNotifyPartnerNumbers: process.env.ANTITROTE_NOTIFICA_CM_NUMEROS,
    watchdogNotifyPartnerScore: parseInt(process.env.ANTITROTE_NOTIFICA_CM_SCORE),
    watchdogNotifyPartnerMsg: process.env.ANTITROTE_NOTIFICA_CM_MSG || '⚠ ATENÇÃO, possível trote! Pedido (#%pedido_n%) com *score de risco %score%*, do fominha *%fominha%* no *%restaurante%*! %detalhes%',
    watchdogCancelOrders: process.env.ANTITROTE_CANCELA_PEDIDOS == '1' ? true : false,
    watchdogCancelOrdersScore: parseInt(process.env.ANTITROTE_CANCELA_PEDIDOS_SCORE),
    watchdogCancelAllOrdersFromUser: process.env.ANTITROTE_CANCELA_TODOS_PEDIDOS_DO_USUARIO == '1' ? true : false,
    watchdogVerifyAreaCode: process.env.ANTITROTE_VERIFICA_DDD == '1' ? true : false,
    watchdogValidAreaCodes: process.env.ANTITROTE_DDDS_VALIDOS,
    watchdogVerifyExpensiveCoupons: process.env.ANTITROTE_VERIFICA_CUPOM_ALTO == '1' ? true : false,
    watchdogVerifyExpensiveCouponsPercentage: process.env.ANTITROTE_PORCENTAGEM_CUPOM_ALTO,
};

module.exports = config;