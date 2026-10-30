# Contribuir com Zfood

1. Faça fork ou peça ao proprietário acesso de colaboração.
2. Clone o repositório e crie uma branch: `git switch -c feat/nome-da-mudanca`.
3. Use Node.js 24.11 ou superior e rode `npm start`.
4. Faça uma alteração focada e descreva como reproduzir o resultado.
5. Execute `npm test` e `npm run check`. Para telas, confira teclado, celular e desktop.
6. Abra um pull request explicando o problema, a mudança e a verificação.

Nunca envie senhas, tokens, banco de dados, endereços reais de clientes nem arquivos `.env`. Use dados fictícios nos testes. Não altere acesso, pagamentos ou cobrança sem discutir o escopo com o proprietário.

## Convenções

- JavaScript com módulos ES; frontend sem dependências.
- Dinheiro em centavos e cálculos autoritativos no servidor.
- Escape de conteúdo do usuário antes de inserir HTML.
- Todo endpoint privado verifica sessão e permissão no servidor.
- Cada mudança de comportamento deve ter teste relevante, especialmente checkout e autorização.
