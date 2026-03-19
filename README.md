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
- `HOST`: interface de rede que o servidor HTTP vai escutar. Use `0.0.0.0` para acesso pela rede local;
- `PORT`: porta do servidor;
- `CORS_ORIGIN`: origem permitida para chamadas externas;
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: usuário inicial criado automaticamente;
- `VITE_API_URL`: opcional. Deixe vazio quando frontend e API estiverem no mesmo serviço.

## Deploy no Coolify

Este repositório agora inclui `docker-compose.yml` para o Coolify detectar e pré-preencher as variáveis na tela **Environment Variables** durante a criação do recurso.

1. Crie um novo recurso apontando para este repositório.
2. Escolha deploy por `Docker Compose`.
3. Ao carregar o `docker-compose.yml`, o Coolify exibirá automaticamente as variáveis em **Environment Variables**.
4. Preencha principalmente `DATABASE_URL`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
5. Se o frontend e a API estiverem no mesmo serviço, mantenha `VITE_API_URL` vazio.
6. Faça o deploy. Na primeira subida o backend criará as tabelas automaticamente.

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

Para subir o serviço completo acessível na rede local pela porta `4333`:

```bash
npm install
cp .env.example .env
npm run build
HOST=0.0.0.0 PORT=4333 npm run start
```

Para desenvolvimento do frontend isolado na porta `4333` com acesso por outro dispositivo da rede:

```bash
npm install
npm run dev
```

A aplicação fica disponível em `http://localhost:4333` e, se a máquina tiver o IP `192.168.1.9`, também em `http://192.168.1.9:4333`.

> Observação: para usar o app completo localmente, mantenha um PostgreSQL acessível e configure `DATABASE_URL`.

## Acesso pela rede local

Para abrir a aplicação a partir de outro dispositivo usando `http://192.168.1.9:4333`, confirme também:

1. que o servidor foi iniciado com `HOST=0.0.0.0`;
2. que a máquina realmente está com o IP `192.168.1.9`;
3. que a porta `4333` está liberada no firewall/roteador;
4. que o PostgreSQL configurado em `DATABASE_URL` está acessível pelo backend.
