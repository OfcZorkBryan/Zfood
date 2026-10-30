# Caminho para uma rede de delivery

## Entregue nesta primeira versão

Catálogo demonstrativo, cliente com login, sacola, checkout local, persistência e administração global de pedidos. Tema Halloween responsivo com ilustrações próprias. Cancelamento antes do preparo, histórico de status, repetir pedido e ordenação por preço. Driver PostgreSQL e comandos de migração preparados; a ativação local exige credenciais válidas. Repositório compartilhável com CI.

## Próximo: operação de restaurantes

- Cadastro e aprovação de restaurantes, com contas e permissões por estabelecimento.
- Editor de produtos, fotos próprias, adicionais, estoque, horários e pausa da loja.
- Área de cobertura, pedido mínimo, prazo e taxa de entrega calculados por região.
- Status e cancelamento com histórico de auditoria e comunicação ao cliente.

## Próximo: pagamentos e entregas

- Integração de gateway com Pix/cartão e webhooks idempotentes.
- Confirmação, estorno e reconciliação; nenhuma coleta de cartão no próprio servidor.
- Conta e painel de entregador, aceite, despacho e comprovante de entrega.
- Mapas e GPS com consentimento, endereço validado e atualizações em tempo real.
- Notificações por email/push e suporte ao cliente.

## Antes do lançamento público

- Definir cidades, parceiros e regras reais de entrega/cancelamento.
- HTTPS e infraestrutura, configuração segura de origem/proxy, backups restauráveis.
- Verificação de email, recuperação de senha, proteção contra abuso e revisão de segurança.
- Banco e serviços adequados à escala; métricas, logs e alertas sem expor dados pessoais.
- Revisão de acessibilidade, testes automatizados de interface, carga e operação.
- Conteúdo e imagens autorizados, política de privacidade, termos e retenção de dados.

As etapas acima ainda não estão implementadas. Não é necessário contratar serviços externos para rodar a versão local atual.
