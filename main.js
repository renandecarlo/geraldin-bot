const process = require('child_process');

process.fork('./whatsapp-bot.js');
process.fork('./geraldo-listener.js');