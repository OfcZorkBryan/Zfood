# Verificação — 30/10/2026

- Node.js 24.11.1 no Windows.
- `npm test`: teste integrado HTTP + SQLite passou, incluindo regressão de PATCH concorrente após cancelamento.
- `npm run check`: sintaxe do servidor e frontend válida.
- Navegador: busca de pepperoni, inclusão de item, cupom (R$ 32,90 + R$ 5,99 − R$ 3,29 = R$ 35,60), cadastro com dados fictícios, checkout e pedido salvo no histórico.
- Corrigida perda de endereço/telefone/observações ao mudar quantidade ou cupom; conferência manual preservou campos nos dois casos.
- Desktop 1280 e celular 390: largura de conteúdo não excede a viewport.
- Revisão independente de código identificou corrida de status e perda de rascunho; ambos corrigidos. Sem menores adiados reportados.
- O SQLite nativo do Node 24 emite aviso experimental. Não há serviço de pagamento, entrega ou comunicação externa para validar.

O banco local usado em QA contém apenas uma conta e um pedido fictícios. Ele está ignorado pelo Git.

## Rodada de melhorias

- Halloween reforçado com composição noturna, ilustrações SVG próprias e movimento opcional respeitando redução de animações.
- Conferidos no navegador: ordenação crescente por preço, cancelamento com confirmação, timeline e repetição do pedido com preços atuais e sem reutilizar cupom antigo.
- Layout conferido em 1280 e 390 px, sem exceder a largura da viewport.
- Revisão apontou cache de pedidos atravessando troca de conta: listas/cache agora são limpos ao sair, e respostas assíncronas são descartadas se a conta mudou.
- Suíte local: 2 testes passam; 1 teste PostgreSQL é ignorado enquanto não houver credenciais. CI configurada com PostgreSQL 18 para executar esse teste.
- Integração PostgreSQL e migração preparadas. `db:setup` interrompe com instrução clara se `PGPASSWORD` estiver vazia. Até o preenchimento da senha, o banco `zfood` não foi criado/migrado localmente; a prévia continua usando SQLite.

## Demonstração ampliada

- Mais fotos locais, combos, banners de cupons e fontes locais Manrope/Sora.
- Perfil e endereço fictício cadastrados pelo navegador. Seleção no checkout preserva o endereço completo no pedido.
- Checkout Pix demo com BOO15: subtotal R$ 119,70 + taxa R$ 5,99 − desconto R$ 17,96 = R$ 107,73. Aprovação simulada conferida no histórico.
- Dinheiro com troco: campos preservados ao aumentar quantidade; pedido de R$ 101,79 com troco para R$ 150,00 conferido.
- Corrigidos recarregamento do formulário durante edição, telefone formatado incompleto aceito pelo perfil, fotografia de bebida inválida e fotografia de donuts incorreta.
- Revisão independente verificou isolamento dos endereços e pagamentos; a regressão de telefone está coberta por teste.
- Suíte ampliada inclui o mesmo fluxo de perfil/pagamento em PostgreSQL e migração com perfil/endereço, executados pela CI. Localmente esses testes dependem das credenciais PostgreSQL.
