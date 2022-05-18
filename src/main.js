const auth = require('./auth');
const readline = require('readline');

(async () => {    
    if(await auth.signin()) {
        require('./whatsapp-bot');
        require('./geraldo-listener');
    }
})();

/* Keep console running */
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});