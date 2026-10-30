# Melhorias da experiência de pedidos

Execução direta solicitada pelo usuário: continuar melhorias da versão existente.

**Escopo:** cliente pode cancelar somente pedido recebido, após confirmação na interface; servidor verifica propriedade e estado atual. Registro persistente de horário e responsável (cliente/admin) em cada mudança. Repetir pedido repõe sacola pelos IDs atuais e exige confirmar substituição de sacola existente; preço/cupom antigos não são copiados. Ordenação por menor/maior preço combinada com filtros.

**Arquitetura:** preservar Node/SQLite e frontend existente. Histórico no JSON de pedido, sem migração destrutiva; pedidos anteriores exibem evento de recebimento conhecido e status atual.

- [x] Teste HTTP falhando de cancelamento, propriedade, origem, transição e histórico.
- [x] Implementar endpoint e eventos de status, executar suíte.
- [x] Interface com confirmação, repetir pedido, timeline e ordenação; verificar no navegador.
- [ ] Atualizar documentação, revisar, executar testes e enviar ao GitHub.

Direcionamentos incorporados: reforçar tema Halloween e migrar para banco separado zfood em PostgreSQL/pgAdmin. Driver e migração adicionados; ativação local depende de PGPASSWORD no .env ignorado. Fonte SQLite preservada. Revisão independente encontrou cache entre contas; limpeza e descarte de resposta de sessão antiga implementados.
