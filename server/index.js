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

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 4333);
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

CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  equipe_id UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
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
  cargo_id UUID NULL REFERENCES cargos(id) ON DELETE SET NULL,
  data_admissao DATE NULL,
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

CREATE TABLE IF NOT EXISTS turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
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
  turno_id UUID NULL REFERENCES turnos(id) ON DELETE SET NULL,
  quantidade_pessoas INTEGER NOT NULL DEFAULT 1 CHECK (quantidade_pessoas > 0),
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

CREATE TABLE IF NOT EXISTS escala_rotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id UUID NOT NULL REFERENCES escalas(id) ON DELETE CASCADE,
  turno_id UUID NULL REFERENCES turnos(id) ON DELETE SET NULL,
  tipo_rotacao TEXT NOT NULL CHECK (tipo_rotacao IN ('semanal','quinzenal','fim_semana')),
  data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escala_rotacao_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotacao_id UUID NOT NULL REFERENCES escala_rotacoes(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL CHECK (ordem >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rotacao_id, ordem)
);

CREATE TABLE IF NOT EXISTS escala_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  equipe_id UUID NULL REFERENCES equipes(id) ON DELETE SET NULL,
  turno_id UUID NULL REFERENCES turnos(id) ON DELETE SET NULL,
  hora_inicio TEXT NOT NULL,
  hora_fim TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('plantao','trabalho')),
  origem TEXT NOT NULL CHECK (origem IN ('manual','automatico')) DEFAULT 'manual',
  observacao TEXT NOT NULL DEFAULT '',
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

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS cargo_id UUID NULL REFERENCES cargos(id) ON DELETE SET NULL;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS data_admissao DATE NULL;
ALTER TABLE escala_detalhes ADD COLUMN IF NOT EXISTS turno_id UUID NULL REFERENCES turnos(id) ON DELETE SET NULL;
ALTER TABLE escala_detalhes ADD COLUMN IF NOT EXISTS quantidade_pessoas INTEGER NOT NULL DEFAULT 1;
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
  cargos: {
    table: 'cargos',
    columns: ['nome', 'equipe_id', 'ativo'],
    defaults: { ativo: true },
    orderBy: 'nome ASC',
  },
  colaboradores: {
    table: 'colaboradores',
    columns: ['nome', 'email', 'telefone', 'equipe_id', 'cargo_id', 'data_admissao', 'tipo_contrato', 'modelo_trabalho', 'ativo'],
    defaults: { telefone: '', equipe_id: null, cargo_id: null, data_admissao: null, tipo_contrato: 'clt', modelo_trabalho: 'presencial', ativo: true },
    orderBy: 'nome ASC',
  },
  gestores: {
    table: 'gestores',
    columns: ['nome', 'email', 'equipe_ids'],
    defaults: { equipe_ids: [] },
    orderBy: 'nome ASC',
  },
  turnos: {
    table: 'turnos',
    columns: ['nome', 'descricao'],
    defaults: { descricao: '' },
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
  escala_overrides: {
    table: 'escala_overrides',
    columns: ['data', 'colaborador_id', 'equipe_id', 'turno_id', 'hora_inicio', 'hora_fim', 'tipo', 'origem', 'observacao'],
    defaults: { equipe_id: null, turno_id: null, tipo: 'plantao', origem: 'manual', observacao: '' },
    orderBy: 'data DESC, hora_inicio ASC',
  },
  escala_rotacoes: {
    table: 'escala_rotacoes',
    columns: ['escala_id', 'turno_id', 'tipo_rotacao', 'data_referencia', 'ativo'],
    defaults: { turno_id: null, tipo_rotacao: 'semanal', data_referencia: new Date().toISOString().slice(0, 10), ativo: true },
    orderBy: 'data_referencia DESC',
  },
  escala_rotacao_membros: {
    table: 'escala_rotacao_membros',
    columns: ['rotacao_id', 'colaborador_id', 'ordem'],
    defaults: { ordem: 0 },
    orderBy: 'ordem ASC',
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

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isDateInRange(date, start, end) {
  return date >= start && date <= end;
}

function getApprovedVacationIds(data, date) {
  return new Set(
    data.ferias
      .filter((ferias) => ferias.status === 'aprovado' && isDateInRange(date, ferias.data_inicio, ferias.data_fim))
      .map((ferias) => ferias.colaborador_id),
  );
}

function isActiveCollaborator(data, colaboradorId) {
  return data.colaboradores.some((colaborador) => colaborador.id === colaboradorId && colaborador.ativo);
}

function getRotationStep(rotation, date) {
  const reference = new Date(`${rotation.data_referencia}T00:00:00`);
  const current = new Date(`${formatDate(date)}T00:00:00`);
  const diffDays = Math.floor((current.getTime() - reference.getTime()) / 86400000);
  if (rotation.tipo_rotacao === 'quinzenal') return Math.floor(diffDays / 14);
  if (rotation.tipo_rotacao === 'fim_semana') return Math.floor(diffDays / 7);
  return Math.floor(diffDays / 7);
}

function resolveRotationAssignment(rotation, members, date) {
  if (!rotation.ativo || members.length === 0) return null;
  const ordered = [...members].sort((a, b) => a.ordem - b.ordem);
  const step = getRotationStep(rotation, date);
  const index = Math.abs(step) % ordered.length;
  return ordered[index]?.colaborador_id ?? null;
}

function getCoverageKey(item) {
  return [item.turno_id ?? 'sem-turno', item.hora_inicio, item.hora_fim, item.equipe_id ?? 'sem-equipe'].join('|');
}

function buildBasePlantoesForDate(data, date) {
  const dateStr = formatDate(date);
  const dow = date.getDay();
  const vacationIds = getApprovedVacationIds(data, dateStr);
  const result = [];
  let id = 1;

  const activeBindings = data.escalaColaboradores.filter((binding) => isDateInRange(dateStr, binding.data_inicio, binding.data_fim));

  for (const binding of activeBindings) {
    if (!isActiveCollaborator(data, binding.colaborador_id) || vacationIds.has(binding.colaborador_id)) continue;
    const details = data.escalaDetalhes.filter((detail) => detail.escala_id === binding.escala_id && detail.dia_semana === dow);
    const collaborator = data.colaboradores.find((item) => item.id === binding.colaborador_id);

    for (const detail of details) {
      result.push({
        id: `base-${dateStr}-${id++}`,
        colaborador_id: binding.colaborador_id,
        data: dateStr,
        hora_inicio: detail.hora_inicio,
        hora_fim: detail.hora_fim,
        tipo: 'trabalho',
        origem: 'automatico',
        turno_id: detail.turno_id,
        escala_id: binding.escala_id,
        equipe_id: collaborator?.equipe_id ?? null,
      });
    }
  }

  const detailsForDay = data.escalaDetalhes.filter((detail) => detail.dia_semana === dow && Number(detail.quantidade_pessoas || 1) > 0);
  for (const detail of detailsForDay) {
    const matchingRotation = data.escalaRotacoes.find((rotation) => rotation.escala_id === detail.escala_id && rotation.ativo && (rotation.turno_id ?? null) === (detail.turno_id ?? null));
    if (!matchingRotation) continue;

    const members = data.escalaRotacaoMembros.filter((member) => member.rotacao_id === matchingRotation.id);
    const collaboratorId = resolveRotationAssignment(matchingRotation, members, date);
    if (!collaboratorId || !isActiveCollaborator(data, collaboratorId) || vacationIds.has(collaboradorId)) continue;

    const collaborator = data.colaboradores.find((item) => item.id === collaboratorId);
    const alreadyAssigned = result.some((item) => item.colaborador_id === collaboratorId && item.data === dateStr && item.hora_inicio === detail.hora_inicio && item.hora_fim === detail.hora_fim);
    if (alreadyAssigned) continue;

    result.push({
      id: `rot-${dateStr}-${matchingRotation.id}`,
      colaborador_id: collaboratorId,
      data: dateStr,
      hora_inicio: detail.hora_inicio,
      hora_fim: detail.hora_fim,
      tipo: 'plantao',
      origem: 'automatico',
      turno_id: detail.turno_id,
      escala_id: detail.escala_id,
      equipe_id: collaborator?.equipe_id ?? null,
    });
  }

  return result;
}

function buildOverridePlantoesForDate(data, date) {
  const dateStr = formatDate(date);
  const vacationIds = getApprovedVacationIds(data, dateStr);

  return data.escalaOverrides
    .filter((override) => override.data === dateStr)
    .filter((override) => isActiveCollaborator(data, override.colaborador_id) && !vacationIds.has(override.colaborador_id))
    .map((override) => ({
      id: override.id,
      colaborador_id: override.colaborador_id,
      data: override.data,
      hora_inicio: override.hora_inicio,
      hora_fim: override.hora_fim,
      tipo: override.tipo,
      origem: override.origem,
      turno_id: override.turno_id,
      equipe_id: override.equipe_id ?? data.colaboradores.find((item) => item.id === override.colaborador_id)?.equipe_id ?? null,
      observacao: override.observacao,
    }));
}

function resolveDailyPlantoes(data, date) {
  const base = buildBasePlantoesForDate(data, date);
  const overrides = buildOverridePlantoesForDate(data, date);
  const overrideKeys = new Set(overrides.map((item) => getCoverageKey(item)));
  return [...base.filter((item) => !overrideKeys.has(getCoverageKey(item))), ...overrides]
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio) || a.hora_fim.localeCompare(b.hora_fim));
}

function isPlantaoActiveNow(plantao, now) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(plantao.hora_inicio);
  const end = toMinutes(plantao.hora_fim);
  return end < start ? currentMinutes >= start || currentMinutes < end : currentMinutes >= start && currentMinutes < end;
}

async function getBootstrap() {
  const [clientes, equipes, cargos, turnos, colaboradores, gestores, escalas, escalaDetalhes, escalaColaboradores, escalaRotacoes, escalaRotacaoMembros, escalaOverrides, ferias] = await Promise.all([
    pool.query('SELECT * FROM clientes ORDER BY nome ASC'),
    pool.query('SELECT * FROM equipes ORDER BY nome ASC'),
    pool.query('SELECT * FROM cargos ORDER BY nome ASC'),
    pool.query('SELECT * FROM turnos ORDER BY nome ASC'),
    pool.query('SELECT * FROM colaboradores ORDER BY nome ASC'),
    pool.query('SELECT * FROM gestores ORDER BY nome ASC'),
    pool.query('SELECT * FROM escalas ORDER BY nome ASC'),
    pool.query('SELECT * FROM escala_detalhes ORDER BY dia_semana ASC, hora_inicio ASC'),
    pool.query('SELECT * FROM escala_colaboradores ORDER BY data_inicio DESC'),
    pool.query('SELECT * FROM escala_rotacoes ORDER BY data_referencia DESC'),
    pool.query('SELECT * FROM escala_rotacao_membros ORDER BY ordem ASC'),
    pool.query('SELECT * FROM escala_overrides ORDER BY data DESC, hora_inicio ASC'),
    pool.query('SELECT * FROM ferias ORDER BY data_inicio DESC'),
  ]);

  return {
    clientes: clientes.rows,
    equipes: equipes.rows,
    cargos: cargos.rows,
    turnos: turnos.rows,
    colaboradores: colaboradores.rows,
    gestores: gestores.rows,
    escalas: escalas.rows,
    escalaDetalhes: escalaDetalhes.rows,
    escalaColaboradores: escalaColaboradores.rows,
    escalaRotacoes: escalaRotacoes.rows,
    escalaRotacaoMembros: escalaRotacaoMembros.rows,
    escalaOverrides: escalaOverrides.rows,
    ferias: ferias.rows,
  };
}

async function getCurrentPlantaoResponse(at) {
  const data = await getBootstrap();
  const now = at ? new Date(at) : new Date();
  const currentDate = formatDate(now);
  const daily = resolveDailyPlantoes(data, now);
  const ativos = daily.filter((plantao) => plantao.data === currentDate && isPlantaoActiveNow(plantao, now));
  return {
    data: currentDate,
    horario_consulta: now.toISOString(),
    total: ativos.length,
    plantoes: ativos,
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

    if (url.pathname === '/api/plantao/atual' && req.method === 'GET') {
      json(res, 200, await getCurrentPlantaoResponse(url.searchParams.get('at')));
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

    const match = url.pathname.match(/^\/api\/(clientes|equipes|cargos|colaboradores|gestores|turnos|escalas|ferias|escala_overrides|escala_rotacoes|escala_rotacao_membros)(?:\/([^/]+))?$/);
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
    server.listen(port, host, () => {
      console.log(`SGO disponível em http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao preparar banco:', error);
    process.exit(1);
  });
