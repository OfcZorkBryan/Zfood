# PostgreSQL e pgAdmin

O Zfood agora aceita SQLite (padrão) e PostgreSQL (`ZFOOD_STORAGE=postgres`). O pgAdmin visualiza o mesmo PostgreSQL usado pelo aplicativo. Esta é uma migração de fonte de dados, não uma replicação bidirecional com o SQLite.

## Configuração local

1. Instale dependências com `npm ci`.
2. Copie `.env.example` para `.env`, caso o arquivo local não exista.
3. Preencha `PGPASSWORD` com a senha do usuário PostgreSQL. Não envie esse arquivo ao GitHub.
4. Confira host, porta, usuário e nome do banco; o destino separado autorizado para este projeto é `zfood`.
5. Execute `npm run db:setup`. O comando cria o banco quando necessário e prepara `users`, `sessions` e `orders`.

## Migrar dados existentes

Pare o servidor para evitar novos pedidos durante a troca de banco. Execute:

```sh
npm run db:migrate
npm start
```

A migração lê `data/zfood.sqlite` e copia contas (preservando os hashes de senha), pedidos, perfis e endereços em uma transação. Não altera a origem. O destino deve estar vazio; se já houver registros, ela para sem substituir dados. Sessões antigas não são copiadas: faça login novamente. Origens de versões anteriores sem as tabelas de perfil/endereço continuam aceitas.

Para outra origem SQLite, configure `ZFOOD_SQLITE_SOURCE`. Não execute gravações no SQLite depois da troca de banco: esses dados posteriores não serão replicados automaticamente.

## Ver no pgAdmin

No servidor **PostgreSQL 18** (`localhost:5432`), atualize **Databases**. Abra **zfood → Schemas → public → Tables**. As tabelas são `users`, `sessions`, `orders`, `customer_profiles` e `addresses`. Use o Query Tool:

```sql
SELECT id, name, email, role FROM users;
SELECT id,
       payload::jsonb ->> 'number' AS pedido,
       payload::jsonb ->> 'restaurant' AS restaurante,
       payload::jsonb ->> 'status' AS status,
       (payload::jsonb ->> 'total')::integer / 100.0 AS total_reais
FROM orders ORDER BY rowid DESC;
```

Os pedidos mantêm o formato JSON da primeira versão dentro de `payload`; as chaves e relações são tabeladas. Uma próxima evolução pode normalizar itens, restaurantes e eventos sem perder o histórico.

## Testes PostgreSQL

`npm test` sempre verifica SQLite. A CI também inicia PostgreSQL 18 e habilita os testes reais do driver. Para executar localmente, depois de configurar uma conexão válida:

```powershell
$env:ZFOOD_TEST_POSTGRES='1'
npm run test:postgres
```

O teste usa um schema temporário exclusivo e o remove no final; os dados do aplicativo não são usados. Para produção, configure um usuário restrito e infraestrutura adequada; as credenciais locais de administração servem para o ambiente de desenvolvimento.
