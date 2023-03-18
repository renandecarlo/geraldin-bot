const chalk = require('chalk');
const Sentry = require("@sentry/node");

const puppeteer = require('puppeteer');
const ChromeLauncher = require('chrome-launcher');

const config = require('./config');
const wpp = require('./whatsapp-bot');

/* Check if user is signed in */
if(!module.parent || !module.parent.signedin) {
    console.err(chalk.bgRedBright('-> Não foi possível verificar a assinatura'));

    Sentry.close(8000).then(() => {
        process.exit();
    });
}

/* Base url */
const baseUrl = 'https://geraldo.aiqfome.com';

/* Check if user is logged in */
const isLoggedIn = async () => {
    try {
        const check = await page.evaluate(async (baseUrl) => {
            const result = await fetch(`${baseUrl}/sistema_usuarios/verificaAutonomia`, { method: 'POST' });

            return {
                status: result.status, 
                redirected: result.redirected,
                ok: result.ok
            }
        }, baseUrl);

        if(check.status == 200 && !check.redirected) {
            console.log(chalk.blueBright('-> Usuário já está logado'));

            return true;
        }
    } catch (e) {
        console.log(chalk.redBright('-> Não foi possível verificar se o usuário está logado', e));
    }
}

/* Log in user */
const login = async () => {
    if(await isLoggedIn())
        return;

    console.log(chalk.blueBright('-> Usuário não está logado. Entrando...'));

    try {
        if(!page.url().includes('/login')) /* Go to login page if not already */
            await page.goto(`${baseUrl}/login`);

        await page.bringToFront();
        
        await page.type('input[name=login]', config.user);
        await page.type('input[name=senha]', config.password);

        await page.click('[type=submit]');

        await page.waitForNavigation();

        if(!await page.$('.user-header-detail'))
            return false;
    } catch (e) {
        console.log(chalk.redBright('-> Não foi possível fazer o login.'), e);
    }
}

/* Intercept orders from socket in real time */
const interceptOrdersSocket = async () => {
    const client = await page.target().createCDPSession(); /* Created a chrome dev tools session */
    await client.send('Network.enable');

    client.on('Network.webSocketFrameReceived', async data => {
        if(data.response?.payloadData) {
            try {
                const msg = JSON.parse(data.response.payloadData);

                if(msg.event == 'Pedidos' && msg.channel.includes('private-cidade')) {
                    const msgData = JSON.parse(msg.data);

                    if(msgData.action == 'Insert')
                        parseOrders([ msgData.data ]);
                }
                
            } catch(e) {}
        }
    });
}

/* Intercept orders refresh from ajax */
const interceptOrdersRefresh = () => {
    page.on('response', async (response) => {
        const request = response.request();

        if (request.url().includes('/refresh_pedidos')) {
            // console.log(chalk.bgBlueBright('-> Verificando pedidos...'));

            /* Check response status and try logging again if needed */
            let status = response.status();
            if(status != 200) {
                console.log(chalk.blueBright('-> A requisição retornou um erro. Verificando se o usuário ainda está logado'), status);
                return await login();
            }

            try {
                let text = await response.text();

                if(text) {
                    const orders = JSON.parse(text);
                    parseOrders(orders);

                    /* Refresh page every few minutes to avoid visually stuck orders. Do it here to avoid reload breaking order refresh */
                    reloadPage();
                }
            } catch(e) {
                console.log(chalk.redBright('-> Não foi possível ler os dados dos pedidos.'), e, response);
            }
        }
    })
}

/* Refresh orders */
const refreshOrders = async () => {
    try {
        /* Check if it's on order page before refreshing */
        if(!page.url().includes('/pedidos'))
            return await login();

        await page.evaluate(() => {
            methods?.refreshPedidos?.();
        })
    } catch(e) {
        console.log(chalk.redBright('-> Não foi possível recarregar os pedidos.'), e);

        /* Try logging in once again */
        await login();
    }
}


/* Parse orders */
let orderCheckDate = {};
const parseOrders = async (orders) => {
    Object.values(orders).forEach(async order => {

        /* Avoid parsing order too often */
        if(orderCheckDate[order.id] && Date.now() - orderCheckDate[order.id] < 1000 * 15) /* Wait 15 seconds */
            return;

        orderCheckDate[order.id] = Date.now();

        /* Add order to watchdog, if enabled */
        if(config.watchdog && watchdog?.ready) {
            if(watchdog.orders[order.id] && typeof watchdog.orders[order.id].score !== 'number') return; /* Avoid showing msg without watchdog score */

            await watchdog.addOrder(order);

            order = {...watchdog.orders[order.id], ...order }; /* Merge updated order data */
        }

        /* Order is waiting */
        if(order.status == 1) {
            const waitingTime = Math.round((Date.now() - Date.parse(order.created)) / 1000 / 60);

            console.log(
                chalk.yellow.inverse('-> Pedido não lido identificado'), 
                watchdog?.ready && typeof watchdog.orders[order.id]?.score === 'number' ? chalk.bgMagenta('Risco:', watchdog.orders[order.id].score) : '', 
                chalk.yellowBright(
                    order.usuario.nome_completo, 
                    order.id, 
                    order.restaurante.nome, 
                    getOrderSellerNumbers(order),
                    `[${waitingTime} min]`
                ),
            );

            await checkOrder(order);
        }
    })
}

/* Reload page every few minutes */
let lastReload = Date.now();
const reloadPage = async () => {
    if(Date.now() - lastReload > 1000 * 870) { /* 14.5 min */
        lastReload = Date.now();

        await page.reload();
    }
}


/* Check if orders are old enough */
let sentMessagesDate = {};
let sentMessagesCount = {};
let partnerSentMessagesDate = {};
const checkOrder = async order => {

    /* Send message if order is old enough */
    if(Date.now() - Date.parse(order.created) > config.waitFor)
        if(!config.maxMsgs || !sentMessagesCount[order.id] || sentMessagesCount[order.id] < config.maxMsgs) { /* Check if enough messages have been sent */
            if(!sentMessagesDate[order.id] || Date.now() - sentMessagesDate[order.id] > config.waitForBetween) {   
                console.log(chalk.green('-> O pedido está esperando por muito tempo. Enviando mensagem...'));
                
                if(config.notifySellers)
                    if(await sendMessage(order)) {
                        sentMessagesDate[order.id] = Date.now();

                        if(!sentMessagesCount[order.id])
                            sentMessagesCount[order.id] = 1;
                        else
                            sentMessagesCount[order.id]++;
                    }
            }
        }

    /* Also send the partner a message if it's old enough */
    if(config.notifyPartner)
        if(Date.now() - Date.parse(order.created) > config.notifyPartnerWaitFor) {
            if(!partnerSentMessagesDate[order.id] || Date.now() - partnerSentMessagesDate[order.id] > config.notifyPartnerWaitForBetween) {   
                console.log(chalk.green('-> Enviando mensagem de alerta ao CM...'));

                if(await sendPartnerMessage(order))
                    partnerSentMessagesDate[order.id] = Date.now();
            }
        }
}

/* Check if seller is in config filter list */
const filteredSeller = id => {
    const sellersToFilter = config.sellersToFilter?.split(',').map(v => Number(v));

    return sellersToFilter.includes(id);
}

/* Get order seller numbers according to desired config option */
const getOrderSellerNumbers = order => {
    let numbers;

    if(config.sendToExtraNumbers) {
        if(config.sendOnlyToExtraNumbers)
            numbers = order.restaurante.celulares;
        else
            numbers = order.restaurante.telefones_celulares;
    } else
        numbers = order.restaurante.telefones;

    return numbers;
}

/* Send message if order is waiting for too long */
const sendMessage = async order => {
    /* Check if seller is in filter list */
    if(filteredSeller(order.restaurante.id)) {
        console.log(chalk.redBright('-> O restaurante está bloqueado no filtro. A mensagem não será enviada.'), [ order.restaurante.id, order.restaurante.nome ] );
        return;
    }

    const numbers = getOrderSellerNumbers(order);
    const wppNumbers = numbers.replace(/[^\d,+]/g, '').split(',');

    return await wpp.sendMessage({ 
        wppNumbers: wppNumbers, 
        message: setCustomMessage(config.message, order)
    });
}

/* Send a message back to the partner if order is waiting for too long */
const sendPartnerMessage = async order => {
    const wppNumbers = config.notifyPartnerNumbers?.replace(/[^\d,+]/g, '').split(',');

    const msg = await wpp.sendMessage({
        wppNumbers: wppNumbers, 
        message: setCustomMessage(config.notifyPartnerMsg, order),
        notifyPartnerMsg: true
    });

    /* Send seller's contact card if option enabled */
    if(msg)
        if(config.notifyPartnerSendContactCard)
            sendContactVcard(order, wppNumbers);

    return msg;
}

/* Send a contact vcard */
const sendContactVcard = async (order, wppNumbers) => {
    let contacts;

    /* Get seller's numbers */
    const numbers = getOrderSellerNumbers(order);
    const sellerWppNumbers = numbers.replace(/[^\d,+]/g, '').split(',');

    /* Get possible seller's wpp numbers from user's contact list */
    contacts = await wpp.getUserContacts(sellerWppNumbers);

    /* If there aren't any, send the first seller's valid wpp number */
    if(!contacts?.length)
        contacts = await wpp.getValidNumbers(sellerWppNumbers);

    if(contacts?.length)
        return await wpp.sendContactVcard({
            wppNumbers: wppNumbers, 
            contactNumber: contacts[0],
            contactName: order.restaurante.nome
        });
    else
        console.log(chalk.redBright('-> Cartão de contato não enviado. Restaurante não possui número com WhatsApp.'), [ order.restaurante.id, order.restaurante.nome ] );
}

/* Replace custom message details */
const setCustomMessage = (msg, order) => {
    const waitingTime = Math.round((Date.now() - Date.parse(order.created)) / 1000 / 60);
    const orderTime = new Date(order.created).toLocaleTimeString().substr(0, 5);

    const replace = { 
        '%tempo_esperando%':    waitingTime,
        '%pedido_horario%':     orderTime,
        '%pedido_n%':           order.id,
        '%restaurante%':        order.restaurante.nome,
        '%fominha%':            order.usuario.nome_completo,
        '%fominha_n_pedidos%':  order.usuario.quantidade_pedidos,
        '%score%':              order.score,
    };

    for(const key in replace)
        msg = msg.replace(key, replace[key]);

    return msg;
}

let page;
let watchdog;
(async () => {
    /* Set up browser */
    const chromePath = ChromeLauncher.Launcher.getInstallations()[0];
    const browser = await puppeteer.launch({
        // devtools: true,
        defaultViewport: null,
        headless: config.headless,
        args: ['--mute-audio', '--disable-extensions'],
        executablePath: chromePath
    });
    
    /* Use current page instead of opening a new one */
    const pages = await browser.pages();
    page = pages[0] || await browser.newPage();

    /* Set page navigation timeout */
    page.setDefaultNavigationTimeout(55000);

    /* Avoid notification permission dialog */
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(baseUrl, []);

    /* Handle browser exit */
    page.on('close', msg => {
        console.log(chalk.bgRedBright('-> O navegador do Geraldo foi fechado. Encerrando programa...', msg));
        
        Sentry.close(8000).then(() => {
            process.exit();
        });
    });

    /**
     * Run
     */

    try {
        /* Check if logged in */
        await login();

        /* Intercept and parse orders */
        interceptOrdersRefresh();
    
        /* Head to orders page */
        if(!page.url().includes('/pedidos'))
            await page.goto(`${baseUrl}/pedidos`);

        /* Refresh orders */
        refreshOrders();
    
        /* Refresh orders every 1 minute */
        let ordersMonitor = setInterval(async () => {
            refreshOrders();
        }, 1000 * 60);

        /* Init watchdog */
        if(config.watchdog) {
            watchdog = require('./watchdog');
            await watchdog.init(browser);

            interceptOrdersSocket(); /* Intercept orders from socket in real time */
        }
    } catch (e) {
        console.err(chalk.bgRedBright('-> Erro', e));
    }

    // await browser.close();
})();

module.exports = { isLoggedIn, login, setCustomMessage, baseUrl }