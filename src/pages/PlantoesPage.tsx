import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBootstrap } from '@/hooks/useBootstrap';
import { formatDate, generatePlantoes, summarizeCoverage } from '@/lib/scheduling';

const diasSemanaHeader = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function PlantoesPage() {
  const { data, isLoading, isError } = useBootstrap();
  const [currentDate, setCurrentDate] = useState(new Date());

  if (isLoading) return <p>Carregando plantões...</p>;
  if (isError || !data) return <p>Não foi possível carregar os plantões.</p>;

  const plantoes = generatePlantoes(data);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i += 1) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i += 1) calendarDays.push(i);

  const fmt = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const feriasAprovadas = data.ferias.filter(f => f.status === 'aprovado');
  const isEmFerias = (colabId: string, dateStr: string) => feriasAprovadas.some(f => f.colaborador_id === colabId && f.data_inicio <= dateStr && f.data_fim >= dateStr);
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const todayCoverage = summarizeCoverage(data, new Date());
  const todayStr = formatDate(new Date());

  return <div className="space-y-4"><div><h1 className="text-2xl font-bold">Plantões</h1><p className="text-sm text-muted-foreground">Visualização mensal da escala real: overrides manuais têm prioridade sobre a escala base e a rotação.</p></div><Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button><CardTitle className="text-lg capitalize">{monthName}</CardTitle><Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button></div></CardHeader><CardContent className="p-2 sm:p-6"><div className="hidden sm:grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">{diasSemanaHeader.map(d => <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}{calendarDays.map((day, i) => { if (day === null) return <div key={`empty-${i}`} className="bg-card p-2 min-h-[80px]" />; const dateStr = fmt(day); const dayPlantoes = plantoes.filter(p => p.data === dateStr); const today = new Date(); const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear(); return <div key={dateStr} className={`bg-card p-1.5 min-h-[80px] ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}><p className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day}</p><div className="space-y-0.5">{dayPlantoes.slice(0, 3).map(p => { const colab = data.colaboradores.find(c => c.id === p.colaborador_id); const emFeriasFlag = isEmFerias(p.colaborador_id, dateStr); return <div key={p.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${emFeriasFlag ? 'bg-muted line-through text-muted-foreground' : ''}`} title={`${colab?.nome} · ${p.hora_inicio}–${p.hora_fim} (${p.tipo})${emFeriasFlag ? ' ⚠️ EM FÉRIAS' : ''}`}><Badge variant="outline" className="text-[9px] px-1 py-0 h-auto mr-0.5">{p.tipo[0].toUpperCase()}</Badge>{colab?.nome.split(' ')[0]}</div>; })}{dayPlantoes.length > 3 && <p className="text-[9px] text-muted-foreground">+{dayPlantoes.length - 3}</p>}</div></div>; })}</div></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-base">Cobertura de hoje</CardTitle></CardHeader><CardContent className="space-y-2">{todayCoverage.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma necessidade de cobertura cadastrada para {todayStr}.</p> : todayCoverage.map(item => { const turno = data.turnos.find(t => t.id === item.turno_id); const complete = item.assigned >= item.required; return <div key={item.key} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{turno?.nome || 'Sem turno'} · {item.hora_inicio}–{item.hora_fim}</p><p className="text-xs text-muted-foreground">Necessário: {item.required} · Alocado: {item.assigned}</p></div><Badge variant={complete ? 'default' : 'destructive'}>{complete ? 'Coberto' : 'Descoberto'}</Badge></div>; })}</CardContent></Card></div>;
}
