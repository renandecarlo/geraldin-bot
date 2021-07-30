const dotenv = require('dotenv').config({ path: './.env.ini' });
const puppeteer = require('puppeteer');

const io = require('socket.io-client');
const socket = io('ws://localhost:3000');

const config = {
    user:               process.env.USUARIO,
    password:           process.env.SENHA,
    waitFor:            process.env.ESPERA_PRIMEIRA_MSG * 60 * 1000,
    waitForBetween:     process.env.ESPERA_ENTRE_MSG * 60 * 1000,
    maxMsgs:            parseInt(process.env.LIMITE_DE_MSGS),
    headless:           process.env.MOSTRAR_NAVEGADOR_GERALDO == '1' ? false : true
};

(async () => {
    /* Set up browser */
    const browser = await puppeteer.launch({ 
        defaultViewport: null,
        headless: config.headless,
        args: ['--mute-audio']
    });
    const page = await browser.newPage();

    /* Handle browser exit */
    page.on('close', msg => {
        process.exit();
    });

    /* Check if user is logged in */
    const isLoggedIn = async () => {
        await page.goto('https://geraldo.aiqfome.com/pedidos');

        return await page.$('.user-header-detail');
    }

    /* Log in user */
    const login = async () => {
        if(await isLoggedIn())
            return;

        console.log('-> User is logged out. Log in.');

        if(!page.url().includes('/login')) /* Go to login page if not already */
            await page.goto('https://geraldo.aiqfome.com/login');
        
        await page.type('input[name=login]', config.user);
        await page.type('input[name=senha]', config.password);

        await page.click('[type=submit]');

        await page.waitForSelector('.user-header-detail');
    }

    /* Intercept order refresh requests */
    let orders = {};
    const interceptOrders = () => {
        page.on('response', async (response) => {
            const request = response.request();

            if (request.url().includes('/refresh_pedidos')) {
                let text = await response.text();

                if(text)
                    orders = JSON.parse(text);

                parseOrders();
            }
        })
    }

    /* Refresh orders */
    const refreshOrders = async () => {
        await page.evaluate(() => {
            methods.refreshPedidos();
        })
    }


    /* Parse orders */
    const parseOrders = () => {
        Object.values(orders).forEach(order => {
            order.status == 1 && console.log(order.status, order.id, order.restaurante.id, order.restaurante.nome, order.restaurante.telefones);
            
            /* Order is waiting */
            if(order.status == 1)
                checkOrder(order);
        })
    }


    /* Check if orders are old enough */
    let sentMessagesDate = {};
    let sentMessagesCount = {};
    const checkOrder = order => {

        if(Date.now() - Date.parse(order.created) > config.waitFor)
            if(!config.maxMsgs || !sentMessagesCount[order.id] || sentMessagesCount[order.id] < config.maxMsgs) { /* Check if enough messages have been sent */
                if(!sentMessagesDate[order.id] || Date.now() - sentMessagesDate[order.id] > config.waitForBetween) {   
                    console.log('-> Order is waiting for too long. Sending message');

                    sendMessage(order);

                    sentMessagesDate[order.id] = Date.now();

                    if(!sentMessagesCount[order.id])
                        sentMessagesCount[order.id] = 1;
                    else
                    sentMessagesCount[order.id]++;
                }
            }
    }


    /* Send message if order is waiting for too long */
    const sendMessage = order => {
        let wppNumber = order.restaurante.telefones.split(',')[0].replace(/[^\d+]/g, '');
        let waitingTime = Math.round((Date.now() - Date.parse(order.created)) / 1000 / 60);

        socket.emit('message', { wppNumber: wppNumber, message: `Olá parceiro, você tem um novo pedido (#${order.id}) esperando há *${waitingTime} minutos*! 🚀`});
    }

    /**
     * Run
     */

    /* Check if logged in */
    await login();    

    /* Head to orders page */
    await page.goto('https://geraldo.aiqfome.com/pedidos');

    /* Intercept and parse orders */
    interceptOrders();

    /* Refresh orders */
    refreshOrders();

    /* Refresh orders every 1 minute */
    let ordersMonitor = setInterval(async () => {
        await refreshOrders();
    }, 1000 * 60);

    // await browser.close();
})()