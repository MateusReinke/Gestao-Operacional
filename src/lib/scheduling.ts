import type { BootstrapData, EscalaDetalhe, EscalaOverride, EscalaRotacao, EscalaRotacaoMembro, Plantao } from '@/types/sgo';

export const formatDate = (date: Date) => date.toISOString().split('T')[0];

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const isDateInRange = (date: string, start: string, end: string) => date >= start && date <= end;

function getApprovedVacationIds(data: BootstrapData, date: string) {
  return new Set(
    data.ferias
      .filter((ferias) => ferias.status === 'aprovado' && isDateInRange(date, ferias.data_inicio, ferias.data_fim))
      .map((ferias) => ferias.colaborador_id),
  );
}

function isActiveCollaborator(data: BootstrapData, colaboradorId: string) {
  return data.colaboradores.some((colaborador) => colaborador.id === colaboradorId && colaborador.ativo);
}

function getRotationStep(rotation: EscalaRotacao, date: Date) {
  const reference = new Date(`${rotation.data_referencia}T00:00:00`);
  const current = new Date(`${formatDate(date)}T00:00:00`);
  const diffDays = Math.floor((current.getTime() - reference.getTime()) / 86400000);

  if (rotation.tipo_rotacao === 'quinzenal') return Math.floor(diffDays / 14);
  if (rotation.tipo_rotacao === 'fim_semana') return Math.floor(diffDays / 7);
  return Math.floor(diffDays / 7);
}

function resolveRotationAssignment(
  rotation: EscalaRotacao,
  members: EscalaRotacaoMembro[],
  date: Date,
) {
  if (!rotation.ativo || members.length === 0) return null;
  const ordered = [...members].sort((a, b) => a.ordem - b.ordem);
  const step = getRotationStep(rotation, date);
  const index = Math.abs(step) % ordered.length;
  return ordered[index]?.colaborador_id ?? null;
}

function buildBasePlantoesForDate(data: BootstrapData, date: Date): Plantao[] {
  const dateStr = formatDate(date);
  const dow = date.getDay();
  const vacationIds = getApprovedVacationIds(data, dateStr);
  const result: Plantao[] = [];
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
        turno_id: detail.turno_id ?? null,
        escala_id: binding.escala_id,
        equipe_id: collaborator?.equipe_id ?? null,
      });
    }
  }

  const rotationsForDay = data.escalaDetalhes.filter((detail) => detail.dia_semana === dow && (detail.quantidade_pessoas ?? 1) > 0);

  for (const detail of rotationsForDay) {
    const matchingRotation = data.escalaRotacoes.find((rotation) => rotation.escala_id === detail.escala_id && rotation.ativo && (rotation.turno_id ?? null) === (detail.turno_id ?? null));
    if (!matchingRotation) continue;

    const members = data.escalaRotacaoMembros.filter((member) => member.rotacao_id === matchingRotation.id);
    const collaboratorId = resolveRotationAssignment(matchingRotation, members, date);
    if (!collaboratorId || !isActiveCollaborator(data, collaboratorId) || vacationIds.has(collaboratorId)) continue;

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
      turno_id: detail.turno_id ?? null,
      escala_id: detail.escala_id,
      equipe_id: collaborator?.equipe_id ?? null,
    });
  }

  return result;
}

function buildOverridePlantoesForDate(data: BootstrapData, date: Date): Plantao[] {
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
      turno_id: override.turno_id ?? null,
      equipe_id: override.equipe_id ?? data.colaboradores.find((item) => item.id === override.colaborador_id)?.equipe_id ?? null,
      observacao: override.observacao,
    }));
}

function getOverrideKey(item: Pick<EscalaOverride | EscalaDetalhe | Plantao, 'hora_inicio' | 'hora_fim'> & { turno_id?: string | null; equipe_id?: string | null }) {
  return [item.turno_id ?? 'sem-turno', item.hora_inicio, item.hora_fim, item.equipe_id ?? 'sem-equipe'].join('|');
}

export function resolveDailyPlantoes(data: BootstrapData, date: Date): Plantao[] {
  const base = buildBasePlantoesForDate(data, date);
  const overrides = buildOverridePlantoesForDate(data, date);
  const overrideKeys = new Set(overrides.map((item) => getOverrideKey(item)));

  const withoutOverriddenBase = base.filter((item) => !overrideKeys.has(getOverrideKey(item)));
  return [...withoutOverriddenBase, ...overrides].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio) || a.hora_fim.localeCompare(b.hora_fim));
}

export function generatePlantoes(data: BootstrapData): Plantao[] {
  const today = new Date();
  const result: Plantao[] = [];

  for (let dayOffset = -7; dayOffset <= 30; dayOffset += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    result.push(...resolveDailyPlantoes(data, date));
  }

  return result;
}

export function isPlantaoActiveNow(plantao: Plantao, now: Date) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(plantao.hora_inicio);
  const end = toMinutes(plantao.hora_fim);
  return end < start ? currentMinutes >= start || currentMinutes < end : currentMinutes >= start && currentMinutes < end;
}

export function summarizeCoverage(data: BootstrapData, date: Date) {
  const dateStr = formatDate(date);
  const daily = resolveDailyPlantoes(data, date);

  return data.escalaDetalhes
    .filter((detail) => detail.dia_semana === date.getDay())
    .map((detail) => {
      const assigned = daily.filter((plantao) => (plantao.turno_id ?? null) === (detail.turno_id ?? null) && plantao.hora_inicio === detail.hora_inicio && plantao.hora_fim === detail.hora_fim).length;
      return {
        key: getOverrideKey(detail),
        turno_id: detail.turno_id ?? null,
        hora_inicio: detail.hora_inicio,
        hora_fim: detail.hora_fim,
        required: detail.quantidade_pessoas ?? 1,
        assigned,
        date: dateStr,
      };
    });
}
