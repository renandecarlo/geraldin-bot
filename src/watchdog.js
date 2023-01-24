const sprintf = require('sprintf-js').sprintf;
const chalk = require('chalk');
const emailValidator = require('deep-email-validator');
const gravatar = require('gravatar');
const fetch = require('node-fetch');
const retry = require('async-retry');
const DateTime = require('luxon').DateTime;

const config = require('./config');
const geraldo = require('./geraldo-listener');
const wpp = require('./whatsapp-bot');

class Watchdog {
    orders = {};
    untrustedData = {};
    orderCancelQueue = [];
    cleanTimer = null;
    cleanInterval = 5 * 60 * 1000;
    disableMonitoringTimeout = 0;
    closeTimeout = 0;
    ready = false;

    /* Custom log with prefix */
    log( ...args ) {
        console.plog(chalk.bgMagenta('[anti-trote]'), ...args);
    }

    /* Set up and initialize watchdog */
    async init(browser) {
        /* Check if wpp session is connected */
        if(!wpp.isConnected()) {
            return setTimeout(async () => {
                await this.init(browser);
            }, 1000);
        }

        console.log(chalk.bgMagenta('-> Iniciando anti-trote...'));

        this.browser = browser;
        await this.openPage();

        /* Intercept orders */
        this.interceptOrders();

        /* Load orders history */
        await this.filterOrders();

        /* Init cancel queue monitoring */
        this.checkCancelQueue();
    }

    /* Check if watchdog secondary tab is open */
    async checkPageOpen() {
        const pages = await this.browser.pages();

        return pages[1];
    }

    /* Open a new tab, if not yet */
    async openPage() {
        if(!this.page || !await this.checkPageOpen()) {
            this.page = await this.browser.newPage();

            /* Set page navigation timeout */
            this.page.setDefaultNavigationTimeout(55000);
        }
    }

    /* Close tab */
    async closePage() {
        if(this.page && await this.checkPageOpen())
            await this.page.close();
    }

    /* Close tab after a while, and try disabling monitoring */
    async closePageDelayed(delay = 30 * 1000) {
        clearTimeout(this.disableMonitoringTimeout);
        clearTimeout(this.closeTimeout);

        if(await this.isMonitoring())
            this.disableMonitoringDelayed(delay - 15 * 1000); /* Disable monitoring if enabled, 15 seconds earlier */

        this.closeTimeout = setTimeout(async () => {
            await this.closePage();
        }, delay);
    }

    /* Intercept order ajax requests */
    interceptOrders() {
        this.page.on('response', async (response) => {
            const request = response.request();
            
            if(request.url().includes('/getRelatorioPedidos')) {                        
                // this.log(chalk.bgBlueBright('-> Verificando pedidos...'));

                /* Check response status and try logging again if needed */
                let status = response.status();
                if(status != 200) {
                    this.log(chalk.blueBright('-> A requisição retornou um erro. Verificando se o usuário ainda está logado'), status);
                    return await geraldo.login();
                }
    
                try {
                    let text = await response.text();
    
                    if(text) {
                        const orders = JSON.parse(text);
                        
                        if(orders?.pedidos_master)
                            this.parseOrders(orders?.pedidos_master);
                    }
                } catch(e) {
                    this.log(chalk.redBright('-> Não foi possível ler os dados dos pedidos.'), e, response);
                }
            }
        });
    }

    /* Stop intercepting orders */
    stopInterceptingOrders() {
        this.page.off('response');
    }

    /* Filter order history */
    async filterOrders() {
        try {
            if(this.page.url() != `${geraldo.baseUrl}/relatorios/pedidos`) {
                /* Head to orders report page */
                await this.page.goto(`${geraldo.baseUrl}/relatorios/pedidos`);

                /* Check login */
                if(!await geraldo.isLoggedIn())
                    await geraldo.login();

                return this.filterOrders();
            }

            /* Get date range */
            const today = DateTime.now().toFormat('dd/MM/yyyy');
            const yesterday = DateTime.now().minus({days:1}).toFormat('dd/MM/yyyy');
            const date = `${yesterday} - ${today}`;

            await this.page.evaluate(date => {
                Filters.toggleDeselectSelectAll(cidades.id);
                $('#periodos').val(6);
                $('#daterangepicker').val(date);

                methods.filtrar();
            }, date);
    
            await this.loadOrdersPages();
            
            /* Stop and close tab if read all pages */
            this.closePageDelayed(15 * 1000);
            this.stopInterceptingOrders();

            /* Set ready to true to start getting score for new orders */
            this.ready = true;
        } catch(e) {
            this.log(chalk.redBright('-> Não foi possível carregar o relatório de pedidos.'), e);

            /* Check login */
            if(!await geraldo.isLoggedIn())
                await geraldo.login();
        }
    }

    /* Load additional order pages */
    async loadOrdersPages() {
        try {
            /* Check if there is pagination and if it's not loading */
            await this.page.waitForSelector('.reloading', { hidden: true });
            await this.page.waitForSelector('#pagina-atual-proxima', { timeout: 3000 });

            const shouldContinue = await this.page.evaluate(() => {
                const nextPage = document.querySelector('#pagina-atual-proxima');

                /* Stop if reached the last page */
                if(!nextPage || nextPage.disabled)
                    return false;
                else {
                    nextPage.click();
                    return true;
                }
            });

            if(shouldContinue)
                return await this.loadOrdersPages();
        } catch(e) {}
    }

    /* Parse orders */
    parseOrders(orders) {
        for(const key in orders)
            this.addOrder(orders[key]);
    }

    /* Add order */
    async addOrder(order) {
        if(this.isOldOrder(order)) return; /* Return if it's an old order */

        if(!this.orders[order.id]) {
            order = this.normalizeOrder(order);
            this.orders[order.id] = order;

            /* Compute score for new orders and also unread orders */
            if(this.ready || (!order.visualizado && order.status == 1)) {
                await this.getOrderScore(order);
            }
        }

        this.cleanOldOrders(); /* Clean older orders */

        return true;
    }

    /* Remove old orders from history (reset orders at 06:00) */
    cleanOldOrders() {
        if(this.cleanTimer > new Date - this.cleanInterval) return; /* Wait 5 minutes between cleanings */

        for(const key in this.orders)
            if(this.isOldOrder(this.orders[key])) {
                delete this.orders[key];

                if(this.untrustedData[key])
                    delete this.untrustedData[key];
            }

        this.cleanTimer = new Date;
    }

    /* Check if order is old (older than today at 6:00) */
    isOldOrder(order) {
        const now = new Date;

        const olderThan = new Date;
        olderThan.setHours(6, 0, 0); /* 06:00 */

        /* Check if now is between 00:00 and 05:59 and let it think it's still yesterday */
        if(now.getHours() > 0 && now.getHours() <= 5)
            olderThan.setDate(now.getDate() - 1);

        if(new Date(order.created) < olderThan)
            return true;
    }

    /* Normalize order fields. Websocket doesn't have some common fields that ajax request has. Try replacing them */
    normalizeOrder(order) {
        /* User created date */
        if(!order.usuario.virtual_created && order.usuario.created) {
            const date = order.usuario.created.split('-');
            order.usuario.virtual_created = `${date[2]}-${date[1]}-${date[0]}`;
        }

        /* User number */
        if(!order.usuario.telefone_celular && (order.usuario.telefone || order.usuario.celular)) {
            order.usuario.telefone_celular = [ ...new Set([order.usuario.telefone, order.usuario.celular]) ].join(', ');
        }

        /* Try using websocket CPF */
        if(!order.usuario.cpf && order.usuario.cpf_spin)
            order.usuario.cpf = order.usuario.cpf_spin;

        /* User browser info */
        if(!order.virtual_browser_infos && order.browser_infos) {
            order.virtual_browser_infos = JSON.parse(order.browser_infos);
        }

        return order;
    }

    /* Get order risk score */
    async getOrderScore(order) {
        await this.checkUserValidWppNumber(order);
        await this.checkUserVerifiedNumber(order);
        await this.checkUserRepeatedOrders(order);
        await this.checkIpRepeatedOrders(order);
        await this.checkTimeBetweenOrders(order);
        await this.checkPreviouslyCanceledOrder(order);
        await this.checkPreviouslyCanceledOrderSameIp(order);
        await this.checkSameIpUserLocation(order);
        await this.checkSameIpDeviceInfo(order);
        await this.checkUserOneSignalId(order);
        await this.checkUserTotalOrders(order);
        await this.checkOrderPaymentType(order);
        await this.checkOrderCoupon(order);
        await this.checkUserRegisteredDate(order);
        await this.checkUserAddress(order);
        await this.checkUserAvatar(order);
        await this.checkUserGravatar(order);
        await this.checkUserRegistrationSource(order);
        await this.checkUserCPF(order);
        await this.checkUserAreaCode(order);
        await this.deepValidateEmail(order);

        const score = this.computeScore(order);
        await this.processOrder(order);

        return score;
    }

    async processOrder(order) {
        /* Send message to partner if risk score is above config settings */
        if(config.watchdogNotifyPartner && order.score >= config.watchdogNotifyPartnerScore) {
            this.log(chalk.magenta('-> Pedido com risco alto. Enviando mensagem de alerta ao CM...'));

            await this.sendMessage(order);
        }

        /* Cancel order if risk score if above config settings */
        if(config.watchdogCancelOrders && order.score >= config.watchdogCancelOrdersScore) {
            this.log(chalk.magenta('-> Pedido com risco alto. Enviando para fila de cancelamento...'), [ order.id ]);
            
            this.addOrderToCancelQueue(order);

            /* Cancel every user order */
            if(config.watchdogCancelAllOrdersFromUser) {
                const userOrders = this.getAllUserOrders(order.usuario.id);

                for(const key in userOrders)
                    if(userOrders[key].id != order.id && order.status == 1) /* Avoid trying to cancel the main order again */
                        this.addOrderToCancelQueue(userOrders[key]);
            }
        }
    }

    /* Get all orders from user id */
    getAllUserOrders(id) {
        const orders = [];

        for(const key in this.orders)
            if(this.orders[key].usuario.id == id)
                orders.push(this.orders[key]);

        return orders;
    }

    /* Send warning message back to partner */
    async sendMessage(order) {
        const wppNumbers = config.watchdogNotifyPartnerNumbers?.replace(/[^\d,+]/g, '').split(',');

        let message = geraldo.setCustomMessage(config.watchdogNotifyPartnerMsg, order);
        message = this.setCustomMessageDetails(message, order);

        const send = await wpp.sendMessage({
            wppNumbers: wppNumbers, 
            message: message,
            notifyPartnerMsg: true /* Avoid breaking on first number */
        });

        return send;
    }

    /* Set details in message */
    setCustomMessageDetails(message, order) {
        let entries = [];

        const data = this.getUntrustedData(order.id);

        for(const key in data) {
            const entry = data[key];

            if(entry.pts > 0) entry.pts = `+${entry.pts}`; /* Add + to the msg if positive pts */

            const msg = `\n_- ${entry.msg} (risco ${entry.pts}, peso ${entry.weight})_`;
            entries.push(msg);
        }

        const details = "\n\n*Detalhes:*" + entries.join("") + "\n";

        message = message.replace('%detalhes%', details);

        return message;
    }

    /* Check if order client has valid wpp number */
    async checkUserValidWppNumber(order) {
        const hasWppMsg = 'Fominha tem número de WhatsApp válido';
        const noWppMsg = 'Fominha não tem número de WhatsApp válido';
        const hasWppPts = -10;
        const noWppPts = 60;
        const weight = 1;

        const numbers = this.getUserNumbers(order);
        const validNumbers = await wpp.getValidNumbers(numbers);

        if(validNumbers?.length)
            this.addUntrustedEntry(order.id, hasWppMsg, hasWppPts, weight); /* Count positively if user has wpp number registered */
        else
            this.addUntrustedEntry(order.id, noWppMsg, noWppPts, weight);
    }

    /* Check for repeated orders from same user */
    async checkUserRepeatedOrders(order) {
        const msg = 'Múltiplos pedidos *(%i)* do mesmo fominha *%s*';
        const pts = 60;
        const weight = 2; /* For each order */
        let repeatedCount = 1;

        for(const key in this.orders) {
            if(this.orders[key].id == order.id) continue; /* Skip current order */

            /* Check for orders with same user id */
            else if(this.orders[key].usuario.id == order.usuario.id) {
                repeatedCount++;
            }
        }

        if(repeatedCount > 1) {
            const tmpMsg = sprintf(msg, repeatedCount, order.usuario.nome_completo.trim());

            this.addUntrustedEntry(
                order.id, 
                tmpMsg, 
                this.getFinalEntryPts(pts, repeatedCount),
                weight * (repeatedCount-1)
            );
        }
    }

    /* Check for repeated orders from other users with same ip address.Maybe a real user in the same house. but maybe a new attacker */
    async checkIpRepeatedOrders(order) {
        const msg = 'Múltiplos pedidos *(%i)* com o mesmo ip. Usuários: *%s* e *%s*';
        const pts = 30;
        const weight = 1; /* For each order */
        const repeatedIpUsers = [];
        let repeatedCount = 1;

        
        for(const key in this.orders) {
            if(this.orders[key].id == order.id) continue; /* Skip current order */
            else if(this.orders[key].usuario.id == order.usuario.id) continue; /* Skip if same user */
            

            /* Check for orders with same ip */
            else if(
                this.orders[key].virtual_browser_infos &&
                this.orders[key].virtual_browser_infos.ip == order.virtual_browser_infos?.ip
            ) {
                repeatedIpUsers.push(this.orders[key].usuario.nome_completo.trim());
                repeatedCount++;
            }
        }

        if(repeatedCount > 1) {
            const users = [ ... new Set(repeatedIpUsers)].join('*, *');
            const tmpMsg = sprintf(msg, repeatedCount, order.usuario.nome_completo.trim(), users);   

            this.addUntrustedEntry(order.id, tmpMsg, pts, weight * (repeatedCount-1));
        }
    }

    /* Check the time between orders */
    async checkTimeBetweenOrders(order) {
        const msg = 'Fominha fez *(%s)* pedidos em *%i minutos*';
        const weight = 4;
        const pts = 100; /* Decrease pts for each extra minute between orders */
        let finalPts = 0;
        let repeatedCount = 1;
        let firstOrderDate;

        for(const key in this.orders) {
            if(this.orders[key].id == order.id) continue; /* Skip current order */

            /* Check for orders with same user id */
            else if(this.orders[key].usuario.id == order.usuario.id) {
                const timeDiff = Math.floor(Math.abs(new Date(order.created) - new Date(this.orders[key].created)) / 60 / 1000);
                const ptsEase = timeDiff * -1; /* Ease some of the points as time pass by. 1pts each 1 min */

                const orderPts = pts + ptsEase;

                if(orderPts > 0) {
                    finalPts = finalPts + orderPts;
                    repeatedCount++;

                    const orderCreated = new Date(this.orders[key].created);
                    if(!firstOrderDate || orderCreated < firstOrderDate) firstOrderDate = orderCreated;
                }
            }
        }
        
        if(repeatedCount > 1) {
            /* Get time diff between first order and now */
            const timeDiff = Math.floor(Math.abs(new Date(order.created) - firstOrderDate) / 60 / 1000);
            finalPts = Math.round(finalPts / (repeatedCount-1)); /* Get pts average if more than 2 orders */
            
            this.addUntrustedEntry(
                order.id, 
                sprintf(msg, repeatedCount, timeDiff), 
                finalPts,
                weight * (repeatedCount-1)
            );
        }        
    }

    /* Check if user has older orders. Real users might have some. Count positively */
    async checkUserTotalOrders(order) {
        const msg = 'Fominha tem um total de *(%i)* pedidos antigos';
        const pts = -10; /* For each old order */
        const weight = 2;
        let totalOrdersToday = 1;

        for(const key in this.orders) {
            if(this.orders[key].id == order.id) continue; /* Skip current order */

            /* Check for orders with same user id */
            else if(this.orders[key].usuario.id == order.usuario.id) {
                totalOrdersToday++;
            }
        }

        const total = Number(order.usuario.quantidade_pedidos) - totalOrdersToday;

        if(total > 1)
            this.addUntrustedEntry(order.id, sprintf(msg, total), pts * total, weight);
    }

    /* Check order payment type. If it's online, it's usually trustworthy */
    async checkOrderPaymentType(order) {
        const msg = 'Fominha fez o pagamento online';
        const pts = -90;
        const weight = 6;

        const onlinePaymentTypes = [
            258, /* FORMA_PAGAMENTO_ONLINE_CREDITO */
            287, /* FORMA_PAGAMENTO_SPINPAY */
            349, /* FORMA_PAGAMENTO_NUPAY */
            345, /* FORMA_PAGAMENTO_PIX */
            348 /* FORMA_PAGAMENTO_MAGALU_PAY */
        ];

        if(onlinePaymentTypes.includes(order.formas_pagamento_id))
            this.addUntrustedEntry(order.id, msg, pts, weight);
    }

    /* Check if order has coupon */
    async checkOrderCoupon(order) {
        const msg = 'O pedido foi feito com cupom';
        const pts = -90;
        const weight = 4;

        if(order.cupom_id)
            this.addUntrustedEntry(order.id, msg, pts, weight);
    }

    /* Check for user registered date */
    async checkUserRegisteredDate(order) {
        const msg = 'Fominha é registrado há %s dias';
        const weightOlderUser = 1;
        const weightNewUser = 3;
        let pts = 40;
        let ptsEase;

        const userCreatedDate = new Date(order.usuario.virtual_created);
        const daysDiff = Math.floor((new Date - userCreatedDate) / 60 / 60 / 24 / 1000);

        /* Ease the points each day the user is registered. Higher on the first 3 days */
        if(daysDiff >= 0 && daysDiff <= 3)
            ptsEase = daysDiff * -15;

        /* Reset pts if more than 3 days */
        else {
            pts = 0;
            ptsEase = daysDiff * -3;
        }

        pts = pts + ptsEase;

        if(pts > 0)   
            this.addUntrustedEntry(order.id, sprintf(msg, daysDiff), pts, weightNewUser);

        else
            this.addUntrustedEntry(order.id, sprintf(msg, daysDiff), pts, weightOlderUser);
    }

    /* Check for address completeness */
    async checkUserAddress(order) {
        const msg = 'Fominha não tem complemento e nem referência no endereço';
        const pts = 40;
        const weight = 1;

        if(!order.pedidos_endereco) return;

        if(!order.pedidos_endereco.complemento && !order.pedidos_endereco.referencia)
            this.addUntrustedEntry(order.id, msg, pts, weight);
    }

    /* Check if user has avatar image */
    async checkUserAvatar(order) {
        const msg = 'Fominha possui imagem de perfil';
        const pts = -10;
        const weight = 1;

        if(order.usuario.tem_avatar)
            this.addUntrustedEntry(order.id, msg, pts, weight);

    }

    /* Check if email address has a gravatar.com image set (may indicate that the email address is really used) */
    async checkUserGravatar(order) {
        const msg = 'Fominha possui gravatar registrado no email: %s';
        const pts = -10;
        const weight = 1;

        const profile = gravatar.profile_url(order.usuario.email);
        const res = await fetch(profile);

        if(res.status == 200)
            this.addUntrustedEntry(order.id, sprintf(msg, order.usuario.email), pts, weight);
    }

    /* Check user registering source */
    async checkUserRegistrationSource(order) {
        const msg = 'Fominha se registrou pelo %s';
        const pts = -25;
        const weight = 1;

        if(order.usuario.origem_cadastro)
            this.addUntrustedEntry(order.id, sprintf(msg, order.usuario.origem_cadastro), pts, weight);
    }

    /* Check if user has registered cpf? */
    async checkUserCPF(order) {
        const msg = 'Fominha tem CPF registrado';
        const pts = -50;
        const weight = 2;

        if(order.usuario.cpf)
            this.addUntrustedEntry(order.id, msg, pts, weight);
    }

    /* Check if user has previously canceled orders due to fraud */
    async checkPreviouslyCanceledOrder(order) {
        const msg = 'Fominha já tem pedido cancelado por trote (*#%s*)';
        const pts = 100;
        const weight = 8;
        const fraudOrders = [];
        let repeatedCount = 1;

        for(const key in this.orders) {
            if(this.orders[key].id == order.id) continue; /* Skip current order */

            /* Check for orders with same user id */
            else if(this.orders[key].usuario.id == order.usuario.id) {
                if(
                    this.orders[key].status == 0 && 
                    this.orders[key].status_motivo && 
                    this.orders[key].status_motivo.includes('Trote')
                ) {
                    fraudOrders.push(this.orders[key].id);
                    repeatedCount++;
                }
            }
        }

        if(repeatedCount > 1) {
            const orders = [ ... new Set(fraudOrders)].join('*, #');
            this.addUntrustedEntry(order.id, sprintf(msg, orders), pts, weight * (repeatedCount-1));
        }
    }

    /* Check if user with same IP has previously canceled orders due to fraud */
    async checkPreviouslyCanceledOrderSameIp(order) {
        const msg = 'Um fominha com o mesmo IP já tem pedido cancelado por trote (*#%s*)';
        const pts = 70;
        const weight = 4;
        const fraudOrders = [];
        let repeatedCount = 1;

        for(const key in this.orders) {
            if(this.orders[key].id == order.id) continue; /* Skip current order */
            else if(this.orders[key].usuario.id == order.usuario.id) continue; /* Skip if same user */

            /* Check for orders with same ip and canceled orders */
            else if(
                this.orders[key].virtual_browser_infos &&
                this.orders[key].virtual_browser_infos.ip == order.virtual_browser_infos?.ip
            ) {
                if(
                    this.orders[key].status == 0 && 
                    this.orders[key].status_motivo &&
                    this.orders[key].status_motivo.includes('Trote')
                ) {
                    fraudOrders.push(this.orders[key].id);
                    repeatedCount++;
                }
            }
        }

        if(repeatedCount > 1) {
            const orders = [ ... new Set(fraudOrders)].join('*, #');

            this.addUntrustedEntry(
                order.id, 
                sprintf(msg, orders), 
                this.getFinalEntryPts(pts, repeatedCount),
                weight * (repeatedCount-1)
            );
        }
    }

    /* Check if users with same ip share the same exact location (probably same device = frauder) */
    async checkSameIpUserLocation(order) {
        const msg = 'Múltiplos pedidos *(%s)* de usuários com o mesmo IP e mesma localização. Usuários *%s* e *%s*';
        const pts = 70;
        const weight = 2;
        const fraudUsers = [];
        let repeatedCount = 1;

        for(const key in this.orders) {
            if(this.orders[key].id == order.id) continue; /* Skip current order */
            else if(this.orders[key].usuario.id == order.usuario.id) continue; /* Skip if same user */

            /* Check for orders with same ip and same location */
            else if(
                this.orders[key].virtual_browser_infos && 
                this.orders[key].virtual_browser_infos.ip == order.virtual_browser_infos?.ip
            ) {
                if(
                    this.orders[key].virtual_browser_infos.location &&
                    this.orders[key].virtual_browser_infos.location == order.virtual_browser_infos?.location
                ) {
                    fraudUsers.push(this.orders[key].usuario.nome_completo.trim());
                    repeatedCount++;
                }
            }
        }

        if(repeatedCount > 1) {
            const users = [ ... new Set(fraudUsers)].join('*, *');

            this.addUntrustedEntry(
                order.id, 
                sprintf(msg, repeatedCount, order.usuario.nome_completo.trim(), users), 
                this.getFinalEntryPts(pts, repeatedCount),
                weight  * repeatedCount
            );
        }
    }

    /* Check if users with same ip share the android version and app version (probably same device = frauder) */
    async checkSameIpDeviceInfo(order) {
        const msg = 'Múltiplos pedidos *(%s)* de usuários com o mesmo IP e mesma versão de sistema operacional (Android/iOS) e app (aiqfome) instalados (possivelmente mesmo aparelho). Usuários *%s* e *%s*';
        const pts = 70;
        const weight = 2;
        const fraudUsers = [];
        let repeatedCount = 1;

        for(const key in this.orders) {
            if(this.orders[key].id == order.id) continue; /* Skip current order */
            else if(this.orders[key].usuario.id == order.usuario.id) continue; /* Skip if same user */

            /* Check for orders with same ip and device info */
            else if(
                this.orders[key].virtual_browser_infos && 
                this.orders[key].virtual_browser_infos.ip == order.virtual_browser_infos?.ip
            ) {
                if(
                    this.orders[key].virtual_browser_infos.os && 
                    this.orders[key].virtual_browser_infos.os == order.virtual_browser_infos?.os &&
                    this.orders[key].virtual_browser_infos.app &&
                    this.orders[key].virtual_browser_infos.app == order.virtual_browser_infos?.app
                ) {
                    fraudUsers.push(this.orders[key].usuario.nome_completo.trim());
                    repeatedCount++;
                }
            }
        }

        if(repeatedCount > 1) {
            const users = [ ... new Set(fraudUsers)].join('*, *');

            this.addUntrustedEntry(
                order.id, 
                sprintf(msg, repeatedCount, order.usuario.nome_completo.trim(), users), 
                this.getFinalEntryPts(pts, repeatedCount),
                weight * (repeatedCount-1)
            );
        }
    }

    /* Get final pts for entry. Increase risk points for each entry, for each repeated orders. More repeated orders = higher pts */
    getFinalEntryPts(pts, repeatedCount) {
        const recurringFactor = 1 + ((repeatedCount - 2) * 0.50); /* Increase pts by 50% for each additional orders higher than 2 */

        return Math.round(pts * recurringFactor);
    }

    /* Check user area code */
    async checkUserAreaCode(order) {
        if(!config.watchdogVerifyAreaCode) return;

        const msg = 'Fominha não tem um DDD válido da cidade';
        const pts = 40;
        const weight = 2;

        const validAreaCodes = config.watchdogValidAreaCodes.replace(/[^\d,+]/g, '').split(',');
        const userNumbers = this.getUserNumbers(order);

        const invalid = [];
        for(const i in userNumbers) {
            const userAreaCode = userNumbers[i].slice(0, 2);

            if(!validAreaCodes.includes(userAreaCode))
                invalid.push(userNumbers[i]);
        }

        /* Check if all user numbers have invalid area code */
        if(invalid.length == userNumbers.length)
            this.addUntrustedEntry(order.id, msg, pts, weight);
    }

    /* Check if user has verified number */
    async checkUserVerifiedNumber(order) {
        const msg = 'Fominha tem número verificado';
        const pts = -80;
        const weight = 2;

        if(order.usuario.numero_verificado)
            this.addUntrustedEntry(order.id, msg, pts, weight);
    }

    /* Check user OneSignal ID */
    async checkUserOneSignalId(order) {
        const msg = 'Fominha tem o mesmo ID de push de outro usuário (possivelmente mesmo aparelho). Usuários: *%s* e *%s*';
        const pts = 80;
        const weight = 2;
        const fraudUsers = [];
        let repeatedCount = 1;

        for(const key in this.orders) {
            if(this.orders[key].id == order.id) continue; /* Skip current order */
            else if(this.orders[key].usuario.id == order.usuario.id) continue; /* Skip if same user */

            /* Check for orders with same OneSignal ID */
            else if(this.orders[key].onesignal_id && this.orders[key].onesignal_id == order.onesignal_id) {
                fraudUsers.push(this.orders[key].usuario.nome_completo.trim());
                repeatedCount++;
            }
        }

        if(repeatedCount > 1) {
            const users = [ ... new Set(fraudUsers)].join('*, *');

            this.addUntrustedEntry(
                order.id, 
                sprintf(msg, order.usuario.nome_completo.trim(), users), 
                this.getFinalEntryPts(pts, repeatedCount),
                weight * (repeatedCount-1)
            );
        }
    }

    /* Get user numbers */
    getUserNumbers(order) {
        let numbers = [];

        if(order.usuario.telefone_celular)
            numbers = order.usuario.telefone_celular.replace(/[^\d,+]/g, '').split(',');

        if(order.pedidos_endereco?.telefone)
            numbers.push(order.pedidos_endereco?.telefone.replace(/[^\d,+]/g, ''));

        numbers = [...new Set(numbers)]; /* Filter duplicated values */

        return numbers;
    }

    /* Deep validate email address (c̶h̶e̶c̶k̶ ̶i̶f̶ ̶e̶m̶a̶i̶l̶ ̶a̶c̶c̶o̶u̶n̶t̶ ̶r̶e̶a̶l̶l̶y̶ ̶e̶x̶i̶s̶t̶s̶ [not yet]) */
    async deepValidateEmail(order) {
        let msg = 'Fominha com e-mail inválido: %s (%s)';
        const pts = 70;
        const weight = 1;

        if(order.usuario.email) {            
            const res = await emailValidator.validate({
                email: order.usuario.email,
                validateTypo: false, /* Doesn't work so well for local domains */
                validateSMTP: false, /* Home ISPs usually block communication with mail servers. FIX: use API in the future */
            });
            
            if(!res.valid) {
                let reason;

                /* Get full invalid reason */
                for(const i in res.validators)
                    if(reason = res.validators[i].reason)
                        break;

                msg = sprintf(msg, order.usuario.email, reason);
                this.addUntrustedEntry(order.id, msg, pts, weight);
            }
        }
    }

    /* Add new untrusted reason entry */
    addUntrustedEntry(id, msg, pts, weight = 1) {
        if(!this.untrustedData[id])
            this.untrustedData[id] = [];

        return this.untrustedData[id].push({
            msg: msg,
            pts: pts,
            weight: weight
        });
    }

    /* Get all order untrusted entries */
    getUntrustedData(id) {
        return this.untrustedData[id];
    }

    /* Compute final score. [0-100] LOWER = LEGIT, HIGHER = RISKY */
    computeScore(order) {
        let weight = 0;
        let pts = 0;

        for(const key in this.untrustedData[order.id]) {
            const data = this.untrustedData[order.id][key];

            weight = weight + data.weight;
            pts = pts + (data.pts * data.weight);
        }

        let total = pts / (weight || 1);

        /* Limit between 0 and 100 */
        if(total > 100) total = 100;
        else if(total < 0) total = 0;

        /* Round */
        total = Math.round(total);

        /* Set score to order data */
        this.orders[order.id]['score'] = total;

        // console.log(order.id, this.getUntrustedData(order.id));

        return total;
    }

    /* Enable partner monitoring mode */
    async enableMonitoring() {
        try {
            await retry(async () => { /* Sometimes the server returns a 403, try again then... */
                this.log(chalk.magenta('-> Ativando modo de monitoramento...'));

                await this.isMonitoring(); /* Make sure we're on the right page */
        
                await this.page.evaluate(() => {
                    return methods.monitorarLicenciado();
                });        

                await this.page.waitForNavigation();
            }, { 
                retries: 1,
                onRetry: (e) => {
                    this.log(chalk.redBright('-> Não foi possível ativar o modo de monitoramento. Tentando novamente.'), e);
                }
            });
        } catch(e) {
            this.log(chalk.redBright('-> Não foi possível desativar o modo de monitoramento.'), e);
        }
    }

    /* Disable partner monitoring mode */
    async disableMonitoring() {
        try {
            await retry(async () => { /* Sometimes the server returns a 403, try again then... */
                this.log(chalk.magenta('-> Desativando modo de monitoramento...'));
    
                await this.isMonitoring(); /* Make sure we're on the right page */
    
                await this.page.evaluate(() => {
                    return methods.pararMonitorarLicenciado();
                });
    
                await this.page.waitForNavigation();
            }, { 
                retries: 1,
                onRetry: (e) => {
                    this.log(chalk.redBright('-> Não foi possível desativar o modo de monitoramento. Tentando novamente.'), e);
                }
            });
        } catch(e) {
            this.log(chalk.redBright('-> Não foi possível desativar o modo de monitoramento.'), e);
        }
    }

    /* Disable monitoring after a few seconds */
    disableMonitoringDelayed(delay = 15 * 1000) {
        clearTimeout(this.disableMonitoringTimeout);

        this.disableMonitoringTimeout = setTimeout(async () => {
            if(await this.isMonitoring())
                await this.disableMonitoring();
        }, delay);
    }

    /* Check if the orders are currently being monitored */
    async isMonitoring() {
        await this.page.bringToFront();

        if(this.page.url() != `${geraldo.baseUrl}/pedidos`) {
            /* Head to orders page */
            await this.page.goto(`${geraldo.baseUrl}/pedidos`);

            /* Check login */
            if(!await geraldo.isLoggedIn())
                await geraldo.login();
        }

        const monitoring = await this.page.$('#btn-autonomia-nao[hidden]'); /* Check if the "monitoring" button is hidden = not monitoring */

        return !monitoring;
    }

    /* Add an order to the cancelling queue */
    addOrderToCancelQueue(order) {
        /* Check if order is already in the queue */
        for(const i in this.orderCancelQueue)
            if(order.id == this.orderCancelQueue[i]) return;

        return this.orderCancelQueue.push(order.id);
    }

    /* Remove an order from the cancelling queue */
    removeOrderFromCancelQueue(order) {
        for(const i in this.orderCancelQueue)
            if(order.id == this.orderCancelQueue[i])
                return this.orderCancelQueue.splice(i, 1);
    }

    /* Check and initiate cancel queue interval */
    async checkCancelQueue() {
        if(this.orderCancelQueue.length > 0)
            await this.cancelOrder(this.orders[this.orderCancelQueue[0]]);

        setTimeout(() => this.checkCancelQueue(), 1000);
    }

    /* Cancel user order */
    async cancelOrder(order) {
        if(!order) return;
        if(order.status == 0 || order.status == 2) { /* Already canceled */
            this.removeOrderFromCancelQueue(order);
            return;
        }

        /* Disable timeouts that might interfere with canceling */
        clearTimeout(this.disableMonitoringTimeout);
        clearTimeout(this.closeTimeout);

        this.log(chalk.magenta('-> Cancelando pedido'), [ order.id ]);

        /* Retry a couple of times if it fails */
        try {
            await retry(async () => {
                await this.openPage(); /* Open a new tab, if not yet */
    
                const isMonitoring = await this.isMonitoring();
                if(!isMonitoring)
                    await this.enableMonitoring();
        
                /* Filter to desired order */
                // await this.page.$eval('#filtro', el => el.value = "");
                await this.page.$eval('#filtro', (el, id) => el.value = String(id), order.id);
                await this.page.click('.btn-filtrar');
                
                /* Wait for order to load */
                await this.page.waitForSelector(`#pedido-${order.id}-buscado`, { visible: true });
    
                /* Check if order has already been canceled */
                const canceled = await this.page.$(`#pedido-${order.id}-buscado .card-footer.cancelado`);
                
                if(canceled) {
                    this.log(chalk.redBright('-> O pedido já foi cancelado.'), [ order.id ]);
                    this.removeOrderFromCancelQueue(order);
    
                    /* Close tab and disable monitoring if no other orders to cancel */
                    this.closePageDelayed();
    
                    return;
                }
    
                /* Open cancel popup */
                await this.page.$eval(`#pedido-${order.id}-buscado .btn-cancelar`, el => el.click());
        
                /* Wait for cancel popup and select custom options */
                await this.page.waitForSelector('#modal-cancelamento', { visible: true });
        
                await this.page.select('#motivo-cancelar', '22'); /* Outros */
                await this.page.$eval('#input-motivo-cancelar', el => el.value = 'Trote (geraldin-bot)');
                await this.page.click('#remover-avaliacao');
        
                /* Cancel order */
                await this.page.click('#button-send-cancelar');
        
                /* Wait for confirmation and dismiss */
                await this.page.waitForSelector('#alertify-ok', { visible: true });
                const cancel = await this.page.$eval('#alertify-ok', el => { 
                    el.click();
                    return true;
                });

                if(cancel) {
                    this.log(chalk.magenta('-> Pedido cancelado!'), [ order.id ] );
                    this.removeOrderFromCancelQueue(order);

                    /* Set order status to canceled */
                    this.orders[order.id].status = 0;
                }
    
                /* Close tab and disable monitoring if no other orders to cancel */
                this.closePageDelayed();
            }, {
                retries: 2,
                minTimeout: 10 * 1000,
                maxTimeout: 10 * 1000,
                onRetry: (e) => {    
                    this.log(chalk.redBright('-> Não foi possível cancelar o pedido. Tentando novamente.'), [ order.id ], e);
                }
            });
        } catch(e) {
            /* Close tab and disable monitoring after a while if failed */
            this.closePageDelayed();
    
            this.log(chalk.redBright('-> Não foi possível cancelar o pedido.'), [ order.id ], e);

            await this.checkPageOpen();
        }
    }
}

module.exports = new Watchdog;