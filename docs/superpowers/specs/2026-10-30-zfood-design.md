# Zfood — primeira versão local

Pedido recuperado: delivery de comida, colaboração no GitHub OfcZorkBryan/Zfood e tema Halloween. O usuário pediu execução direta ("mão em massa").

Decisão de implementação: aplicação web responsiva, servidor Node.js 24 e SQLite nativo, sem dependências de execução. Permite executar e compartilhar com poucos passos. Alternativas: aplicativo nativo exige lojas e duas distribuições; plataforma com serviços gerenciados exige contas e configuração externa. Nenhuma dessas integrações foi fornecida.

Cliente: catálogo de restaurantes e produtos demonstrativos, busca e categorias, favoritos no navegador, carrinho por restaurante, cupom HALLOWEEN10, cadastro e login, endereço e telefone no checkout, pagamento na entrega, histórico e acompanhamento do status real salvo no banco.

Administração: conta criada somente por configuração explícita do operador; lista pedidos e avança status. Cliente só consulta seus pedidos. Preços, taxas e desconto calculados no servidor em centavos. Senhas com scrypt e salt; sessões em cookies HttpOnly, SameSite e prazo de expiração; mutações com verificação de origem.

Visual: fundo creme, títulos escuros, laranja queimado, roxo e detalhes sazonais; catálogo com fotos, navegação simples e carrinho lateral, adaptável a celular.

Limites: ambiente local para desenvolvimento, sem cobrança real, GPS, notificações externas, publicação ou envio a restaurantes. Multioperadores, painel do entregador, edição de cardápio, gateway, recuperação de senha, monitoramento e políticas de operação são próximos marcos. Não apresentar a primeira versão como rede pronta para operar.
