import type { BootstrapData, Plantao } from '@/types/sgo';

export const formatDate = (date: Date) => date.toISOString().split('T')[0];

export function generatePlantoes(data: BootstrapData): Plantao[] {
  const today = new Date();
  const result: Plantao[] = [];
  let id = 1;

  for (let dayOffset = -7; dayOffset <= 30; dayOffset += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = formatDate(date);
    const dow = date.getDay();

    for (const vinculo of data.escalaColaboradores) {
      if (dateStr < vinculo.data_inicio || dateStr > vinculo.data_fim) continue;
      const escala = data.escalas.find(item => item.id === vinculo.escala_id);
      const detalhes = data.escalaDetalhes.filter(item => item.escala_id === vinculo.escala_id && item.dia_semana === dow);

      for (const detalhe of detalhes) {
        result.push({
          id: `p${id++}`,
          colaborador_id: vinculo.colaborador_id,
          data: dateStr,
          hora_inicio: detalhe.hora_inicio,
          hora_fim: detalhe.hora_fim,
          tipo: escala?.tipo || 'personalizada',
        });
      }
    }
  }

  return result;
}
