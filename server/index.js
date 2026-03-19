import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL não configurada.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSL === 'false' ? false : (process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined),
});

const schemaSql = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gestor')),
  equipe_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  id_whatsapp TEXT NOT NULL DEFAULT '',
  escalation TEXT NOT NULL DEFAULT '',
  responsavel_interno_id UUID NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cliente_id UUID NULL REFERENCES clientes(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT NOT NULL DEFAULT '',
  equipe_id UUID NULL REFERENCES equipes(id) ON DELETE SET NULL,
  tipo_contrato TEXT NOT NULL CHECK (tipo_contrato IN ('clt','pj','estagio','temporario')),
  modelo_trabalho TEXT NOT NULL CHECK (modelo_trabalho IN ('presencial','hibrido','remoto')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clientes_responsavel_fk'
  ) THEN
    ALTER TABLE clientes
      ADD CONSTRAINT clientes_responsavel_fk
      FOREIGN KEY (responsavel_interno_id)
      REFERENCES colaboradores(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS gestores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  equipe_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('12x36','5x2','personalizada')),
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escala_detalhes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id UUID NOT NULL REFERENCES escalas(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TEXT NOT NULL,
  hora_fim TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escala_colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  escala_id UUID NOT NULL REFERENCES escalas(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ferias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('aprovado','pendente','rejeitado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function ensureSchema() {
  await pool.query(schemaSql);

  const adminName = process.env.ADMIN_NAME || 'Administrador';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'troque-essa-senha';
  await pool.query(
    `INSERT INTO users (nome, email, password, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [adminName, adminEmail, adminPassword],
  );
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

const resourceMap = {
  clientes: {
    table: 'clientes',
    columns: ['nome', 'id_whatsapp', 'escalation', 'responsavel_interno_id', 'ativo'],
    defaults: { id_whatsapp: '', escalation: '', responsavel_interno_id: null, ativo: true },
    orderBy: 'nome ASC',
  },
  equipes: {
    table: 'equipes',
    columns: ['nome', 'cliente_id', 'ativo'],
    defaults: { cliente_id: null, ativo: true },
    orderBy: 'nome ASC',
  },
  colaboradores: {
    table: 'colaboradores',
    columns: ['nome', 'email', 'telefone', 'equipe_id', 'tipo_contrato', 'modelo_trabalho', 'ativo'],
    defaults: { telefone: '', equipe_id: null, tipo_contrato: 'clt', modelo_trabalho: 'presencial', ativo: true },
    orderBy: 'nome ASC',
  },
  gestores: {
    table: 'gestores',
    columns: ['nome', 'email', 'equipe_ids'],
    defaults: { equipe_ids: [] },
    orderBy: 'nome ASC',
  },
  escalas: {
    table: 'escalas',
    columns: ['nome', 'tipo', 'descricao'],
    defaults: { tipo: '5x2', descricao: '' },
    orderBy: 'nome ASC',
  },
  ferias: {
    table: 'ferias',
    columns: ['colaborador_id', 'data_inicio', 'data_fim', 'status'],
    defaults: { status: 'pendente' },
    orderBy: 'data_inicio DESC',
  },
};

async function listResource(name) {
  const resource = resourceMap[name];
  const result = await pool.query(`SELECT * FROM ${resource.table} ORDER BY ${resource.orderBy}`);
  return result.rows;
}

async function createResource(name, payload) {
  const resource = resourceMap[name];
  const data = { ...resource.defaults, ...payload };
  const cols = resource.columns.filter((column) => data[column] !== undefined);
  const values = cols.map((column) => data[column]);
  const placeholders = cols.map((_, index) => `$${index + 1}`);
  const result = await pool.query(
    `INSERT INTO ${resource.table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values,
  );
  return result.rows[0];
}

async function updateResource(name, id, payload) {
  const resource = resourceMap[name];
  const cols = resource.columns.filter((column) => payload[column] !== undefined);
  if (cols.length === 0) throw new Error('Nenhum campo enviado para atualização.');
  const assignments = cols.map((column, index) => `${column} = $${index + 1}`);
  const values = cols.map((column) => payload[column]);
  const result = await pool.query(
    `UPDATE ${resource.table} SET ${assignments.join(', ')}, updated_at = NOW() WHERE id = $${cols.length + 1} RETURNING *`,
    [...values, id],
  );
  return result.rows[0] || null;
}

async function deleteResource(name, id) {
  const resource = resourceMap[name];
  await pool.query(`DELETE FROM ${resource.table} WHERE id = $1`, [id]);
}

async function getBootstrap() {
  const [clientes, equipes, colaboradores, gestores, escalas, escalaDetalhes, escalaColaboradores, ferias] = await Promise.all([
    pool.query('SELECT * FROM clientes ORDER BY nome ASC'),
    pool.query('SELECT * FROM equipes ORDER BY nome ASC'),
    pool.query('SELECT * FROM colaboradores ORDER BY nome ASC'),
    pool.query('SELECT * FROM gestores ORDER BY nome ASC'),
    pool.query('SELECT * FROM escalas ORDER BY nome ASC'),
    pool.query('SELECT * FROM escala_detalhes ORDER BY dia_semana ASC, hora_inicio ASC'),
    pool.query('SELECT * FROM escala_colaboradores ORDER BY data_inicio DESC'),
    pool.query('SELECT * FROM ferias ORDER BY data_inicio DESC'),
  ]);

  return {
    clientes: clientes.rows,
    equipes: equipes.rows,
    colaboradores: colaboradores.rows,
    gestores: gestores.rows,
    escalas: escalas.rows,
    escalaDetalhes: escalaDetalhes.rows,
    escalaColaboradores: escalaColaboradores.rows,
    ferias: ferias.rows,
  };
}

function serveStatic(req, res) {
  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end('Build não encontrada. Execute npm run build.'); return;
  }
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'OPTIONS') {
      json(res, 204, {});
      return;
    }

    if (url.pathname === '/api/health') {
      json(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/api/bootstrap' && req.method === 'GET') {
      json(res, 200, await getBootstrap());
      return;
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readBody(req);
      const result = await pool.query('SELECT id, nome, email, role, equipe_ids, password FROM users WHERE email = $1', [body.email]);
      const user = result.rows[0];
      if (!user || user.password !== body.password) {
        json(res, 401, { message: 'Credenciais inválidas.' });
        return;
      }
      delete user.password;
      json(res, 200, user);
      return;
    }

    const match = url.pathname.match(/^\/api\/(clientes|equipes|colaboradores|gestores|escalas|ferias)(?:\/([^/]+))?$/);
    if (match) {
      const [, resource, id] = match;
      if (req.method === 'GET' && !id) {
        json(res, 200, await listResource(resource));
        return;
      }
      if (req.method === 'POST' && !id) {
        json(res, 201, await createResource(resource, await readBody(req)));
        return;
      }
      if ((req.method === 'PUT' || req.method === 'PATCH') && id) {
        const updated = await updateResource(resource, id, await readBody(req));
        if (!updated) {
          json(res, 404, { message: 'Registro não encontrado.' });
          return;
        }
        json(res, 200, updated);
        return;
      }
      if (req.method === 'DELETE' && id) {
        await deleteResource(resource, id);
        json(res, 204, {});
        return;
      }
    }

    serveStatic(req, res);
  } catch (error) {
    console.error(error);
    json(res, 500, { message: error.message || 'Erro interno do servidor.' });
  }
});

ensureSchema()
  .then(() => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`SGO disponível na porta ${port}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao preparar banco:', error);
    process.exit(1);
  });
