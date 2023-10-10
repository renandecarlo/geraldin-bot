<div align="center">
  <a href="#instalação"><b>Como Usar</b></a> | 
  <a href="#saiba-que"><b>Observações</b></a> | 
  <a href="#configurações"><b>Configurações</b></a> | 
  <a href="#bugs-conhecidos"><b>Bugs Conhecidos</b></a> | 
  <a href="https://github.com/renandecarlo/geraldin-bot/issues"><b>Reportar Problemas</b></a> | 
  <a href="#assinatura"><b>Assinatura</b></a>
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

1. [Clique aqui](https://github.com/renandecarlo/geraldin-bot/releases/latest) para fazer o download do programa e descompacte o arquivo.
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
| **NOTIFICA_LOJAS** | Habilita a função principal do bot de notificar as lojas com pedidos atrasados. | `0 = desativado, 1 = ativado`|
| **USUARIO** | Seu usuário/email do Geraldo. | Ex: `teste@aiqfome.com.br`|
| **SENHA** | Sua senha do Geraldo. | Ex: `12345`|
| **ESPERA_PRIMEIRA_MSG** | Aguardar quanto tempo *(em minutos)* para enviar a mensagem depois do pedido chegar. | Ex: `0` (instantâneo), `1`, `3`, `5` (minutos).|
| **ESPERA_ENTRE_MSG** | Quanto tempo *(em minutos)* esperar para enviar outra mensagem, caso o pedido ainda não tenha sido lido. | Ex: `2`, `4`, `6` (minutos)|
| **LIMITE_DE_MSGS** | Limitar a quantidade de mensagens enviadas. | `0 = ilimitado`, `1 = envia só a primeira mensagem`, `2 = duas msgs...`|
| **ENVIA_MSG_TODOS_NUMEROS** | Envia mensagem para todos os números cadastrados do parceiro. | `0 = envia somente para o primeiro número válido de WhatsApp`, `1 = habilitado`|
| **MOSTRAR_NAVEGADOR_WHATSAPP** | Mostrar o navegador do WhatsApp Web. | `0 = navegador fica invisível`, `1 = navegador visível`|
| **MOSTRAR_NAVEGADOR_GERALDO** | Mostrar o navegador do Geraldo. | `0 = navegador fica invisível`, `1 = navegador visível`|
| **MENSAGEM** | Personaliza a mensagem a ser enviada. Podem ser usados os seguintes códigos na mensagem: | `%tempo_esperando%` - Tempo que o pedido está em aberto, em minutos |
| | | `%pedido_horario%` - Horário em que o pedido foi feito (hh:mm) |
| | | `%pedido_n%` - Número do pedido |
| | | `%restaurante%` - Nome do restaurante parceiro |
| | | `%fominha%` - Nome completo do fominha |
| | | `%fominha_n_pedidos%` - Nº de pedidos do fominha |

## Opções avançadas
| config | descrição | opções |
|--|--|--|
| **ENVIA_MSG_OUTROS_TELEFONES** | Habilita o envio de mensagens para os "outros telefones". | `0 = desativado, 1 = ativado`|
| **ENVIA_MSG_SOMENTE_OUTROS_TELEFONES** | Envia mensagem SOMENTE para os "outros telefones". | `0 = desativado, 1 = ativado`|
| **FILTRO_TELEFONES** | Uma lista de telefones que não serão enviadas mensagens. | Ex: `(99) 98765-4321,44 2222-2222,88977776666`|
| **FILTRO_LOJAS_ID** | Uma lista de IDs de lojas que não serão enviadas mensagens. | Ex: `9999999,9999998,9999997`|
| **NOTIFICA_CM** | Habilita a opção de enviar uma mensagem de volta para o CM quando o pedido atrasar por determinado tempo. | `0 = desativado, 1 = ativado`|
| **NOTIFICA_CM_TEMPO** | Aguardar quanto tempo *(em minutos)* para enviar a mensagem para o CM depois do pedido chegar. | Ex: `6`, `8`, `10` (minutos)|
| **NOTIFICA_CM_TEMPO_ENTRE_MSG** | Quanto tempo (em minutos) esperar para enviar outra mensagem, caso o pedido ainda não tenha sido lido. | Ex: `2`, `4`, `6` (minutos)|
| **NOTIFICA_CM_ENVIA_CONTATO** | Envia o contato de WhatsApp do restaurante para o CM. O bot dará prioridade aos números já salvos na agenda, e depois seguirá pela ordem dos telefones no Geraldo. | `0 = desativado, 1 = ativado` |
| **NOTIFICA_CM_NUMEROS** | Um número ou uma lista de números que serão notificados. | Ex: `(88) 97654-3210,44 3333-3333,77966665555` |
| **NOTIFICA_CM_MSG** | Mensagem que será usada para notificar o CM. Também pode ser personalizada com os mesmos códigos da **MENSAGEM**. | |

## Anti-trote
O anti-trote foi desenvolvido de modo a evitar pedidos maliciosos, e funciona analisando e cruzando diversas informações. Ao detectar um novo pedido, ele o atribui um score de risco de 0 a 100, podendo então cancelá-lo automaticamente ou apenas emitir um alerta.
> Atenção: o modo anti-trote usa uma quantidade considerável de recursos do sistema. Habilite-o somente em casos necessários.

| config | descrição | opções |
|--|--|--|
| **ANTITROTE** | Habilita o anti-trote | `0 = desativado, 1 = ativado`|
| **ANTITROTE_NOTIFICA_CM** | Habilita a opção de enviar mensagem para o CM quando o score de risco do pedido ultrapassar determinado valor | `0 = desativado, 1 = ativado`|
| **ANTITROTE_NOTIFICA_CM_NUMEROS** | Um número ou uma lista de números que serão notificados. | Ex: `(99) 98765-4321,44 2222-2222,88977776666`|
| **ANTITROTE_NOTIFICA_CM_SCORE** | Um score de risco de 0 a 100 que, quando ultrapassado, enviará a mensagem. Quanto maior o valor, maior o risco do pedido. | Ex: `20`,`40`,`60`|
| **ANTITROTE_NOTIFICA_CM_MSG** | Mensagem que será usada para notificar o CM. Pode ser personalizada com os mesmos códigos da **MENSAGEM**. Também pode ser usado com o seguinte código: | `%score%` - Score de risco do pedido |
| **ANTITROTE_CANCELA_PEDIDOS** | Habilita a opção de cancelar os pedidos automaticamente quando o score de risco do pedido ultrapassar determinado valor. *(\*\*\*experimental\*\*\*)*| `0 = desativado, 1 = ativado`|
| **ANTITROTE_CANCELA_PEDIDOS_SCORE** | Um score de risco de 0 a 100 que, quando ultrapassado, cancelará o pedido. | Ex: `80`, `85`, `90`, `100`|
| **ANTITROTE_CANCELA_TODOS_PEDIDOS_DO_USUARIO** | Se habilitado, em conjunto com a opção de cancelar, cancelará todos os pedidos em aberto do usuário, assim que ultrapassado o risco escolhido. | `0 = desativado, 1 = ativado` |
| **ANTITROTE_VERIFICA_DDD** | Verifica e atribui um peso para o score quando o DDD do pedido não coincide com os DDDs válidos. O peso é adicionado somente quando NENHUM número cadastrado do usuário possui um DDD válido. | Ex: `0 = desativado, 1 = ativado` |
| **ANTITROTE_DDDS_VALIDOS** | Uma lista com um ou mais DDDs válidos. | Ex: `21,22,24` |
| **ANTITROTE_VERIFICA_CUPOM_ALTO** | Habilita a verificação de cupons com valores altos. | Ex: `0 = desativado, 1 = ativado`  |
| **ANTITROTE_PORCENTAGEM_CUPOM_ALTO** | Um valor de 0 a 100 que corresponde à porcentagem do cupom sob o total do pedido. Por ex, `50`, alerta para cupons com valor acima de 50% do valor do pedido. O valor total usado é o sub-total do pedido (total sem taxas de entrega) | Ex: `50`,`60`,`70` |


## Bugs conhecidos
Por enquanto...
- Às vezes o bot não consegue efetuar o login assim que é aberto, atrasando o funcionamento...
- Aparece o erro "Não foi possível encontrar o módulo..." quando inicia o programa. Tente limpar a pasta temporária do Windows. Abra o Windows Explorer, na barra de endereço digite `%AppData%\..\Local\Temp\`, e apague todo o conteúdo desta pasta.
- Para erros relacionados ao envio de mensagens, tente apagar a pasta `tokens` (na mesma pasta do bot). 

## Dependências
Este projeto usa o [puppeteer](https://github.com/puppeteer/puppeteer) para monitorar o Geraldo, e o [wppconnect](https://github.com/wppconnect-team/wppconnect/) para gerenciar o WhatsApp Web.

## Assinatura
A partir da v2.0 este programa passou a operar com assinaturas pagas. Acesse https://geraldin.vip e veja mais detalhes.
