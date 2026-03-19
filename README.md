# SGO pronto para deploy no Coolify

Sistema de Gestão Operacional com frontend React/Vite, API Node e PostgreSQL configurado por variáveis de ambiente.

## O que foi preparado

- deploy de serviço único no Coolify com `Dockerfile` multi-stage otimizado;
- backend HTTP em `server/index.js` com rotas REST e autenticação baseada em banco;
- criação automática das tabelas PostgreSQL na inicialização;
- usuário administrador bootstrapado com `ADMIN_EMAIL` e `ADMIN_PASSWORD`;
- frontend sem mocks, consumindo `/api/*` em tempo real;
- formulários de clientes, equipes, colaboradores, gestores, escalas e férias integrados com a API.

## Variáveis de ambiente

Use os valores do arquivo `.env.example`:

- `DATABASE_URL`: string completa de conexão PostgreSQL;
- `PGSSL`: `true` para bancos gerenciados com SSL obrigatório;
- `PORT`: porta do servidor;
- `CORS_ORIGIN`: origem permitida para chamadas externas;
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: usuário inicial criado automaticamente;
- `VITE_API_URL`: opcional. Deixe vazio quando frontend e API estiverem no mesmo serviço.

## Deploy no Coolify

1. Crie um novo recurso apontando para este repositório.
2. Escolha deploy por `Dockerfile`.
3. Adicione as variáveis de ambiente do `.env.example`.
4. Informe a `DATABASE_URL` do PostgreSQL que você criar no próprio Coolify ou em um serviço externo.
5. Faça o deploy. Na primeira subida o backend criará as tabelas automaticamente.

## Banco criado automaticamente

As tabelas provisionadas são:

- `users`
- `clientes`
- `equipes`
- `colaboradores`
- `gestores`
- `escalas`
- `escala_detalhes`
- `escala_colaboradores`
- `ferias`

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run build
npm run start
```

Para desenvolvimento do frontend isolado:

```bash
npm install
npm run dev
```

> Observação: para usar o app completo localmente, mantenha um PostgreSQL acessível e configure `DATABASE_URL`.
