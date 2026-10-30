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
