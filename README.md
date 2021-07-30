# Geraldin Bot
Este bot foi feito para facilitar o envio de mensagens através do WhatsApp para parceiros Aiqfome.

## Como funciona
O bot entra no painel Geraldo e fica monitorando os novos pedidos. Caso um pedido não tenha sido visualizado por um determinado tempo pelo parceiro, o bot envia uma mensagem através do WhatsApp Web.

## Saiba que
Você não poderá usar o WhatsApp Web em outro lugar (para aquele número de telefone) enquanto o bot está aberto. Caso isso seja um problema, recomendo o uso de um novo número de telefone específico para o bot.

O WhatsApp Web só funciona em conjunto com o WhatsApp no celular, então você precisará manter o computador e o celular conectados na internet.

## Instalação
### Modo fácil
1. Clique aqui para fazer o download do programa e descompacte o arquivo.
2. Abra o arquivo `.env.ini` no Bloco de Notas ou WordPad e altere as configurações necessárias
3. Execute o arquivo `geraldin-bot.exe`
4. Pronto!
### Para desenvolvedores
1. Instale o [NodeJS](https://nodejs.dev/)
2. Clone este repositório ou faça o download da pasta [clicando aqui](https://github.com/renandecarlo/geraldin-bot/archive/refs/heads/main.zip)
3. Extraia o arquivo se necessário e abra o cmd/console na pasta que você acabou de baixar
4. Rode o comando: `npm install`
5. Renomeie o arquivo `.env.ini.example` para `.env.ini`
6. Abra o arquivo `.env.ini` no Bloco de Notas ou WordPad e altere as configurações necessárias
7. Inicie o programa com o comando: `npm start`
8. Leia o QRCode pelo WhatsApp (no celular) indo em Menu > Aparelhos conectados > Conectar um aparelho
9. Pronto!

## Configurações
| config | descrição | opções |
|--|--|--|
| **USUARIO** | Seu usuário/email do Geraldo | Ex: `teste@aiqfome.com.br`
| **SENHA** | Sua senha do Geraldo | Ex: `12345`
| **ESPERA_PRIMEIRA_MSG** | Aguardar quanto tempo *(em minutos)* para enviar a mensagem depois do pedido chegar. | Ex: `1`, `3`, `5` (minutos)
| **ESPERA_ENTRE_MSG** | Quanto tempo *(em minutos)* esperar para enviar outra mensagem, caso o pedido ainda não tenha sido lido. | Ex: `2`, `4`, `6` (minutos)
| **LIMITE_DE_MSGS** | Limitar a quantidade de mensagens enviadas. | `0 = ilimitado`, `1 = envia só a primeira mensagem`, `2 = 2 msgs`..
| **MOSTRAR_NAVEGADOR_WHATSAPP** | Mostrar o navegador do WhatsApp Web. | `0 = navegador fica invisível`, `1 = navegador visível



## Dependências
Este projeto usa o [puppeteer](https://github.com/puppeteer/puppeteer) para monitorar o Geraldo, e o [venom](https://github.com/orkestral/venom) para gerenciar o WhatsApp Web.