const logger = require('./logger');
const auth = require('./auth');
const readline = require('readline');
const checkUpdate = require('./check-update');

(async () => {    
    await checkUpdate();

    if(await auth.signin()) {
        module.signedin = true;

        require('./whatsapp-bot');
        require('./geraldo-listener');
    }
})();

/* Keep console running */
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});