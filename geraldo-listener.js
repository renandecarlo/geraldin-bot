const dotenv = require('dotenv').config({ path: './.env.ini' });

const puppeteer = require('puppeteer');
const ChromeLauncher = require('chrome-launcher');

const io = require('socket.io-client');
const socket = io('ws://localhost:3000');

const config = {
    user:               process.env.USUARIO,
    password:           process.env.SENHA,
    waitFor:            process.env.ESPERA_PRIMEIRA_MSG * 60 * 1000,
    waitForBetween:     process.env.ESPERA_ENTRE_MSG * 60 * 1000,
    maxMsgs:            parseInt(process.env.LIMITE_DE_MSGS),
    headless:           process.env.MOSTRAR_NAVEGADOR_GERALDO == '1' ? false : true,
    message:            process.env.MENSAGEM || 'Olá parceiro, você tem um novo pedido (#%pedido_n%) esperando há *%tempo_esperando% minutos*! 🚀'
};

(async () => {
    /* Set up browser */
    const chromePath = ChromeLauncher.Launcher.getInstallations()[0];
    const browser = await puppeteer.launch({ 
        defaultViewport: null,
        headless: config.headless,
        args: ['--mute-audio'],
        executablePath: chromePath
    });
    const page = await browser.newPage();

    /* Handle browser exit */
    page.on('close', msg => {
        process.exit();
    });

    /* Check if user is logged in */
    const isLoggedIn = async () => {
        try {
            await page.goto('https://geraldo.aiqfome.com/pedidos');

            if(await page.$('.user-header-detail')) {
                console.log('-> Usuário já está logado');
                
                return true;
            }
        } catch (e) {
            console.log('-> Não foi possível verificar se o usuário está logado', e);
        }
    }

    /* Log in user */
    const login = async () => {
        if(await isLoggedIn())
            return;

        console.log('-> Usuário não está logado. Entrando...');

        try {
            if(!page.url().includes('/login')) /* Go to login page if not already */
                await page.goto('https://geraldo.aiqfome.com/login');
            
            await page.type('input[name=login]', config.user);
            await page.type('input[name=senha]', config.password);
    
            await page.click('[type=submit]');
    
            await page.waitForSelector('.user-header-detail');
        } catch (e) {
            console.log('-> Não foi possível fazer o login.', e);
        }
    }

    /* Intercept order refresh requests */
    let orders = {};
    const interceptOrders = () => {
        page.on('response', async (response) => {
            const request = response.request();

            if (request.url().includes('/refresh_pedidos')) {
                /* Check response status and try logging again if needed */
                let status = await response.status();
                if(status != 200) {
                    console.log("-> A requisição retornou um erro. Verificando se o usuário ainda está logado", status);
                    return await login();
                }

                let text = await response.text();

                if(text)
                    orders = JSON.parse(text);

                parseOrders();
            }
        })
    }

    /* Refresh orders */
    const refreshOrders = async () => {
        try {
            await page.evaluate(() => {
                methods.refreshPedidos();
            })
        } catch(e) {
            console.log('-> Não foi possível recarregar os pedidos.', e);

            /* Try logging in once again */
            await login();
        }
    }


    /* Parse orders */
    const parseOrders = () => {
        Object.values(orders).forEach(order => {
            order.status == 1 && console.log('-> Pedido não lido identificado', [order.status, order.id, order.restaurante.nome, order.restaurante.telefones] );
            
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
                    console.log('-> O pedido está esperando por muito tempo. Enviando mensagem...');
                    
                    sendMessage(order);

                    sentMessagesDate[order.id] = Date.now();

                    if(!sentMessagesCount[order.id])
                        sentMessagesCount[order.id] = 1;
                    else
                        sentMessagesCount[order.id]++;
                }
            }
    }

    /* Connect to message socket */
    const connectSocket = () => {
        if(!socket || !socket.connected) {
            console.log('-> Socket desconectado, conectando...');
            socket.connect();
        }
    }


    /* Send message if order is waiting for too long */
    const sendMessage = order => {
        connectSocket();

        const wppNumbers = order.restaurante.telefones.replace(/[^\d,+]/g, '').split(',');

        socket.emit('message', { 
            wppNumbers: wppNumbers, 
            message: setCustomMessage(config.message, order)
        });
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
        };

        for(const key in replace)
            msg = msg.replace(key, replace[key]);

        return msg;
    }

    /**
     * Run
     */

    try {
        /* Check if logged in */
        await login();
    
        /* Intercept and parse orders */
        interceptOrders();
    
        /* Head to orders page */
        await page.goto('https://geraldo.aiqfome.com/pedidos');
    
        /* Refresh orders */
        await refreshOrders();
    
        /* Refresh orders every 1 minute */
        let ordersMonitor = setInterval(async () => {
            await refreshOrders();
        }, 1000 * 60);
    } catch (e) {
        console.log('-> Erro', e);
    }

    // await browser.close();
})()