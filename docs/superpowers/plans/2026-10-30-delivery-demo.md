# Evolução da demonstração Zfood

Execução direta solicitada pelo usuário. Pagamentos explicitamente imaginários para demonstração.

**Objetivo:** ampliar catálogo visual, promoções verificadas no servidor, perfil e endereços privados do cliente e checkout com pagamento demonstrativo.

**Decisões:** manter Node/SQLite/PostgreSQL existentes e marca enviada. Tabelas novas de perfil/endereços, sem alterar dados anteriores. Pagamentos cash/card_demo/pix_demo/card_delivery; cartão de teste fixo (sem número/CVV do visitante), Pix ilustrativo sem chave/QR bancário real e confirmação simulada pelo próprio cliente. Admin só avança pedido Pix após confirmação demo. Cupons com mínimo e limites. Endereço salvo consultado por proprietário e copiado no pedido. Fotos locais de produtos para não depender de imagens remotas ao navegar.

- [x] Testes de isolamento de perfil/endereço, cupons, cálculo e pagamento demo antes da implementação.
- [x] API, schema aditivo, promoções e catálogo ampliado.
- [x] Interface: banners, combos, fotos, cliente/endereços, checkout e pagamento.
- [x] Navegador desktop/celular, revisão, testes locais/CI, atualização do PR.

Permanece pendente de rodada anterior: ativar PostgreSQL local depende da senha em .env. Esta evolução funciona com SQLite na prévia e PostgreSQL na CI.
