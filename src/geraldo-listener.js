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

(async () => {
    /* Base url */
    const baseUrl = 'https://geraldo.aiqfome.com';

    /* Set up browser */
    const chromePath = ChromeLauncher.Launcher.getInstallations()[0];
    const browser = await puppeteer.launch({ 
        defaultViewport: null,
        headless: config.headless,
        args: ['--mute-audio'],
        executablePath: chromePath
    });
    const page = await browser.newPage();

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

    /* Check if user is logged in */
    const isLoggedIn = async () => {
        try {
            if(!await page.$('.user-header-detail'))
            await page.goto(`${baseUrl}/pedidos`);

            if(await page.$('.user-header-detail')) {
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

    /* Intercept order refresh requests */
    let orders = {};
    const interceptOrders = () => {
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
                        orders = JSON.parse(text);
                        parseOrders();

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
            if(page.url() != `${baseUrl}/pedidos`)
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
    const parseOrders = () => {
        Object.values(orders).forEach(async order => {
            /* Order is waiting */
            if(order.status == 1) {
                console.log(chalk.yellow.inverse('-> Pedido não lido identificado'), chalk.yellowBright(order.usuario.nome_completo, order.id, order.restaurante.nome, getOrderSellerNumbers(order)));
                await checkOrder(order);
            }
        })
    }

    /* Reload page every few minutes */
    let lastReload = null;
    const reloadPage = async () => {
        if(Date.now() - lastReload > 1000 * 60 * 5) {
            await page.reload();

            lastReload = Date.now();
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
            contacts = await wpp.getValidNumber(sellerWppNumbers);

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
        await page.goto(`${baseUrl}/pedidos`);
    
        /* Refresh orders */
        await refreshOrders();
    
        /* Refresh orders every 1 minute */
        let ordersMonitor = setInterval(async () => {
            await refreshOrders();
        }, 1000 * 60);
    } catch (e) {
        console.err(chalk.bgRedBright('-> Erro', e));
    }

    // await browser.close();
})()