<div align="center">
  <a href="#instalação"><b>Como Instalar</b></a> | 
  <a href="#saiba-que"><b>Observações</b></a> | 
  <a href="#configurações"><b>Configurações</b></a> | 
  <a href="https://github.com/renandecarlo/geraldin-bot/discussions"><b>Comentários</b></a> | 
  <a href="https://github.com/renandecarlo/geraldin-bot/issues"><b>Reportar problemas</b></a> | 
  <a href="#contribuições"><b>Doar</b></a>
  <br /><br />
  <img src="https://user-images.githubusercontent.com/6974980/127627282-7f157406-0bce-4d3c-ae96-c0b8795467ed.png" /><br />
  <h1>Geraldin Bot</h1>
  <p>Este bot foi desenvolvido para facilitar o envio de mensagens através do WhatsApp para parceiros Aiqfome.</p>
 </div>
 <br /><br />


## Como funciona
O bot entra no painel Geraldo e fica monitorando os novos pedidos. Caso um pedido não tenha sido visualizado por um determinado tempo pelo parceiro, o bot envia uma mensagem através do WhatsApp Web.

## Saiba que

Você não poderá usar o WhatsApp Web em outro lugar (com o mesmo número) enquanto o bot está aberto. Caso isso seja um problema, o uso de um número de telefone específico para o bot é recomendado.

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
| **USUARIO** | Seu usuário/email do Geraldo | Ex: `teste@aiqfome.com.br`|
| **SENHA** | Sua senha do Geraldo | Ex: `12345`|
| **ESPERA_PRIMEIRA_MSG** | Aguardar quanto tempo *(em minutos)* para enviar a mensagem depois do pedido chegar. | Ex: `1`, `3`, `5` (minutos)|
| **ESPERA_ENTRE_MSG** | Quanto tempo *(em minutos)* esperar para enviar outra mensagem, caso o pedido ainda não tenha sido lido. | Ex: `2`, `4`, `6` (minutos)|
| **LIMITE_DE_MSGS** | Limitar a quantidade de mensagens enviadas. | `0 = ilimitado`, `1 = envia só a primeira mensagem`, `2 = 2 msgs`..|
| **MOSTRAR_NAVEGADOR_WHATSAPP** | Mostrar o navegador do WhatsApp Web. | `0 = navegador fica invisível`, `1 = navegador visível`|


## Dependências
Este projeto usa o [puppeteer](https://github.com/puppeteer/puppeteer) para monitorar o Geraldo, e o [venom](https://github.com/orkestral/venom) para gerenciar o WhatsApp Web.

<br /><br />

## Contribuições
Gostou do projeto? Considere fazer uma contribuição! ❤️

<a href="https://picpay.me/renandecarlo" target="_blank">
  <img src="https://user-images.githubusercontent.com/6974980/127633110-839b2ec2-e485-4b22-8eeb-59d133d6dc0f.png" width="128" />
</a>