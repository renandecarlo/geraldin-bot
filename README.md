<div align="center">
  <a href="#instalação"><b>Como Usar</b></a> | 
  <a href="#saiba-que"><b>Observações</b></a> | 
  <a href="#configurações"><b>Configurações</b></a> | 
  <a href="#bugs-conhecidos"><b>Bugs Conhecidos</b></a> | 
  <a href="https://github.com/renandecarlo/geraldin-bot/discussions"><b>Comentários</b></a> | 
  <a href="https://github.com/renandecarlo/geraldin-bot/issues"><b>Reportar Problemas</b></a> | 
  <a href="#contribuições"><b>Doar</b></a>
  <br /><br />
  <img src="https://user-images.githubusercontent.com/6974980/127627282-7f157406-0bce-4d3c-ae96-c0b8795467ed.png" /><br />
  <h1>Geraldin Bot</h1>
 </div>
 
 Este bot foi desenvolvido para automatizar o envio de mensagens através do WhatsApp para parceiros Aiqfome.
 > Atenção: este programa está em fase de testes, use com cautela.

<br />


## Como funciona
O bot, de forma autônoma, entra no painel Geraldo e fica monitorando os novos pedidos. Caso um pedido não tenha sido visualizado por um determinado tempo pelo parceiro, o bot envia uma mensagem através do WhatsApp Web.

## Saiba que

Você não poderá usar o WhatsApp Web em outro lugar (com o mesmo número) enquanto o bot está aberto. Caso isso seja um problema, o uso de um número de telefone específico para o bot é recomendado.

O WhatsApp Web só funciona em conjunto com o WhatsApp no celular, então você precisará manter o computador e o celular conectados na internet.

## Instalação
> Requisitos: é necessário ter o [Google Chrome](https://www.google.com/intl/pt-BR/chrome/) instalado para o programa funcionar.

### Modo fácil
Veja o video explicativo aqui: https://youtu.be/LBcj_rPX6dU

1. [Clique aqui](https://github.com/renandecarlo/geraldin-bot/releases/download/v1.4-beta/geraldin-bot.v1.4-beta.zip) para fazer o download do programa e descompacte o arquivo.
2. Abra o arquivo `.env.ini` no Bloco de Notas ou WordPad e altere as configurações necessárias
3. Inicie o programa abrindo o arquivo `geraldin-bot.exe`
4. Leia o QRCode pelo WhatsApp (no celular) indo em Menu > Aparelhos conectados > Conectar um aparelho
5. Pronto!

### Modo difícil (para desenvolvedores)
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
| **ESPERA_PRIMEIRA_MSG** | Aguardar quanto tempo *(em minutos)* para enviar a mensagem depois do pedido chegar. | Ex: `0` (instantâneo), `1`, `3`, `5` (minutos).|
| **ESPERA_ENTRE_MSG** | Quanto tempo *(em minutos)* esperar para enviar outra mensagem, caso o pedido ainda não tenha sido lido. | Ex: `2`, `4`, `6` (minutos)|
| **LIMITE_DE_MSGS** | Limitar a quantidade de mensagens enviadas. | `0 = ilimitado`, `1 = envia só a primeira mensagem`, `2 = 2 msgs`..|
| **ENVIA_MSG_TODOS_NUMEROS** | Envia mensagem para todos os números cadastrados do parceiro. | `0 = envia somente para o primeiro número válido de WhatsApp`, `1 = habilitado`|
| **MOSTRAR_NAVEGADOR_WHATSAPP** | Mostrar o navegador do WhatsApp Web. | `0 = navegador fica invisível`, `1 = navegador visível`|
| **MOSTRAR_NAVEGADOR_GERALDO** | Mostrar o navegador do Geraldo. | `0 = navegador fica invisível`, `1 = navegador visível`|
| **MENSAGEM** | Personaliza a mensagem a ser enviada. Podem ser usados os seguintes códigos na mensagem: | `%tempo_esperando%` - Tempo que o pedido está em aberto, em minutos |
| | | `%pedido_horario%` - Horário em que o pedido foi feito (hh:mm) |
| | | `%pedido_n%` - Número do pedido |
| | | `%restaurante%` - Nome do restaurante parceiro |
| | | `%fominha%` - Nome completo do fominha |
| | | `%fominha_n_pedidos%` - Nº de pedidos do fominha |

## Bugs conhecidos
Por enquanto...
- Às vezes o bot não consegue efetuar o login assim que é aberto, atrasando o funcionamento...

## Dependências
Este projeto usa o [puppeteer](https://github.com/puppeteer/puppeteer) para monitorar o Geraldo, e o [venom](https://github.com/orkestral/venom) para gerenciar o WhatsApp Web.

<br /><br />

## Contribuições
Gostou do projeto? Considere fazer uma contribuição! ❤️


| **PIX** |  |
|--|--|
| Chave aleatória | 48847a94-13bf-4c16-8f1e-16bbe2ce00ef |
| QR Code | ![2bf3f09e-f364-4203-a727-aa4a5a98ecc6](https://user-images.githubusercontent.com/6974980/127782830-b4766b53-451c-4f37-a1e1-0be27148886c.png) |
