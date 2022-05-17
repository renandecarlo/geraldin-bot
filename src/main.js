const auth = require('./auth');

(async () => {    
    if(await auth.signin()) {
        require('./whatsapp-bot');
        require('./geraldo-listener');
    }
})()