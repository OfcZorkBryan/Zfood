# Zfood 🎃

Delivery de comida — primeira versão local, com edição Halloween. Projeto colaborativo de [OfcZorkBryan](https://github.com/OfcZorkBryan/Zfood).

## Executar

Instale **Node.js 24.11 ou superior**. O driver PostgreSQL é instalado pelo npm.

```sh
git clone https://github.com/OfcZorkBryan/Zfood.git
cd Zfood
npm ci
npm start
```

Abra a URL mostrada no terminal (por padrão `http://127.0.0.1:3000`). Se a porta estiver ocupada, no PowerShell:

```powershell
$env:PORT = '4173'
npm start
```

O Node 24 pode exibir o aviso de recurso experimental do SQLite nativo; os dados são salvos em `data/zfood.sqlite`. Não versione o banco nem arquivos `.env`.

## O que funciona

- Catálogo demonstrativo de 4 restaurantes e 10 pratos, busca e categorias.
- Favoritos e sacola conservados no navegador.
- Pedidos por restaurante, ajuste de quantidade e desconto `HALLOWEEN10` de 10% no subtotal.
- Cadastro, login, logout e sessões em cookie HttpOnly.
- Checkout com endereço, telefone, observações e dinheiro na entrega.
- Preços recalculados pelo servidor; repetição do mesmo checkout não duplica o pedido.
- Histórico de pedidos por cliente; atualização do status a cada 15 segundos quando a página está visível.
- Histórico com horários e responsável pelas mudanças; cancelamento pelo cliente antes do preparo.
- Pedir novamente, revisando os preços atuais e confirmando a troca se a sacola já tiver itens.
- Ordenação por menor/maior preço combinada com busca e categorias.
- Gestão administrativa: recebimento → preparo → entrega → entregue, com cancelamento antes da saída.
- SQLite persistente: contas e pedidos sobrevivem ao reinício do servidor.

**Este ambiente não envia pedidos a restaurantes reais e não cobra pagamentos.** Restaurantes, notas, prazos, imagens e produtos são ilustrativos. Fotos remotas de alimentos pelo Unsplash, com alternativa visual em caso de falha.

## Painel administrativo

Antes da primeira execução, escolha um email ainda não cadastrado e uma senha com pelo menos 12 caracteres. Configure as variáveis **somente na sua sessão local**, depois execute o servidor:

```powershell
$env:ZFOOD_ADMIN_EMAIL = 'seu-email-administrativo'
$env:ZFOOD_ADMIN_PASSWORD = 'sua-senha-forte-com-pelo-menos-12-caracteres'
npm start
```

Entre no site com essas credenciais: a aba **Gestão** aparecerá. Não há senha padrão. A inicialização não promove contas públicas existentes e não troca senhas de contas já criadas. As variáveis podem ser removidas da sessão após a criação. O cadastro normal sempre cria um cliente.

## Testes

```sh
npm test
npm run check
```

Os testes usam banco temporário, duas contas de cliente e uma conta administrativa. Cobrem login, desconto, preço adulterado, quantidades inválidas, mistura de restaurantes, cupom inválido, isolamento entre clientes, permissões administrativas, transições, origem externa, idempotência, logout e persistência após reinício. A interface também foi verificada manualmente no navegador; isso não substitui uma suíte automatizada de frontend.

## Estrutura

```text
public/       Interface responsiva sem framework
src/          API HTTP, catálogo e persistência SQLite
tests/        Testes de integração reais HTTP + SQLite
docs/         Escopo, plano e próximos marcos
.github/      CI e modelo de pull request
```

Valores monetários são inteiros em centavos. Senhas usam scrypt com salt; tokens de sessão são aleatórios e apenas o hash é salvo no banco. Queries usam parâmetros. A aplicação escuta somente em loopback para desenvolvimento.

## PostgreSQL e pgAdmin

O pgAdmin é o gerenciador; o aplicativo conecta diretamente ao PostgreSQL. Veja [a configuração e migração](docs/POSTGRESQL.md). Sem configuração, continua disponível o SQLite. Com `ZFOOD_STORAGE=postgres`, o PostgreSQL passa a ser a fonte dos dados; não há sincronização contínua entre dois bancos.

## Próximos marcos

Veja [ROADMAP.md](docs/ROADMAP.md). Antes de operação pública: hospedagem HTTPS, email verificado/recuperação de senha, isolamento por lojista, painel do entregador, gateway e webhooks, estoque/disponibilidade, regiões e taxas reais, notificações, backups, revisão de segurança, observabilidade e documentos de privacidade/termos. Para HTTPS configure `ZFOOD_SECURE_COOKIES=true` e adapte o proxy/origem; esta versão não inclui a infraestrutura de produção.

## Colaborar

Leia [CONTRIBUTING.md](CONTRIBUTING.md). Pessoas externas podem fazer fork e abrir pull requests. Para editar diretamente, o proprietário precisa convidá-las em **Settings → Collaborators** do GitHub. Um repositório público permite leitura, mas não concede escrita a todos.
