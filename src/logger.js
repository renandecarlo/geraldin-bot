const dotenv = require('dotenv');
const moment = require('moment');
const util = require('util');
const path = require('path');
const package = require('../package.json');

dotenv.config({ path: './.env.ini' });
dotenv.config({ path: path.join(__dirname, '../', '.env.build') }); /* Load build settings */

const winston = require('winston');
const { combine, timestamp, label, printf } = winston.format;


/* Setup Sentry */
const Sentry = require("@sentry/node");

Sentry.init({
    dsn: process.env.SENTRY_ENDPOINT,
    release: package.version,
    tracesSampleRate: 1.0,
    initialScope: {
        user: { id: process.env.USUARIO },
    },
});


/* Function to remove console colors from msg */
const removeColor = msg => {
	if(typeof msg == 'object') {
		if(msg?.map)
			return msg.map(v => {
				return removeColor(v);
			});
	} 

	else if(typeof msg == 'string')
		return msg.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

	return msg;
}

/* Set default file format */
const fileFormat = printf(info => {
	let args = '';

	const message = util.format(removeColor( info.message )).trim();

    /* Get extra parameters and use util.format for prettier output */
    const splat = info[Symbol.for('splat')];

	if(splat)
		args = util.format(removeColor(splat[0])).trim();

	return `[${info.label}] ${info.timestamp}: ${message} ${args}`;
})

/* Setup winston (local file logger) */
const logger = winston.createLogger({
	format: combine(
		label({label: `${package.name} v${package.version}`}),
		timestamp({format: 'YYYY-MM-DD HH:mm:ss'}), 
		fileFormat, 
		winston.format.splat()
	),
	transports: [
		new winston.transports.File({
            filename: 'debug.log',
            maxsize: 1024 * 1024 * 10, /* 10mb file */ 
            tailable: true, /* New logs always go on the debug.log file, regardless of rotation */
            maxFiles: 3, 
            handleExceptions: true 
        }),
	],
	exitOnError: false, /* Prevent exiting on exceptions */
});


/* Inject date in log msg */
const injectDate = msg => {
    const date = moment().format('DD/MM HH:mm');

    if(msg.includes && msg.includes('->'))
        msg = msg.replace('->', `[${date}]->`);

    return msg;
}

/* Inject winston and sentry in console.{log,error} methods */
console.stdlog = console.log.bind(console);
console.stderr = console.error.bind(console);

/* Log msg to console+winston */
console.log = function(...args) {
    /* Log to console */
    consoleArgs = [ ...args ];
    consoleArgs[0] = injectDate(consoleArgs[0]);
    console.stdlog.apply(console, consoleArgs);

    /* Log to winston */
    if(args[0])
        logger.info(...args);
}

/* Log erro/exception to console+winston+sentry */
console.err = function(...args) {
    /* Log to console */
    consoleArgs = [ ...args ];
    consoleArgs[0] = injectDate(consoleArgs[0]);
    console.stderr.apply(console, consoleArgs);

    /* Log to winston */
    if(args[0])
        logger.error(...args);

    /* Log to sentry */
    args = removeColor(args);
    Sentry.captureException(args);
}

/* Log error/exception to winston+sentry, avoid console output */
console.silent = function(...args) {
    /* Log to winston */
    if(args[0])
        logger.error(...args);

    /* Log to sentry */
    args = removeColor(args);
    Sentry.captureException(args);
}

/* Log msg to winston+sentry, avoid console output */
console.msg = function(...args) {
    /* Log to winston */
    if(args[0])
        logger.info(...args);

    /* Log to sentry */
    args = removeColor(args);
    Sentry.captureMessage(args);
}