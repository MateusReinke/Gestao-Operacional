import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBootstrap } from '@/hooks/useBootstrap';
import { Users, Building2, CalendarDays, Palmtree, Clock, AlertTriangle } from 'lucide-react';

import { formatDate, generatePlantoes, isPlantaoActiveNow } from '@/lib/scheduling';

export default function DashboardPage() {
  const { data, isLoading, isError } = useBootstrap();

  if (isLoading) return <p>Carregando dashboard...</p>;
  if (isError || !data) return <p>Não foi possível carregar os dados do dashboard.</p>;

  const plantoes = generatePlantoes(data);
  const now = new Date();
  const todayStr = formatDate(now);
  const feriasAtivasHoje = data.ferias.filter(f => f.status === 'aprovado' && f.data_inicio <= todayStr && f.data_fim >= todayStr);
  const colabEmFerias = new Set(feriasAtivasHoje.map(f => f.colaborador_id));

  const emPlantao = plantoes.filter(p => p.data === todayStr && !colabEmFerias.has(p.colaborador_id) && isPlantaoActiveNow(p, now));

  const proximos = plantoes
    .filter(p => p.data > todayStr || (p.data === todayStr && p.hora_inicio > `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`))
    .sort((a, b) => (a.data === b.data ? a.hora_inicio.localeCompare(b.hora_inicio) : a.data.localeCompare(b.data)))
    .slice(0, 6);

  const totalAtivos = data.colaboradores.filter(c => c.ativo).length;
  const totalClientes = data.clientes.filter(c => c.ativo).length;

  const tipoBadge = (tipo: string) => (tipo === '12x36' ? 'default' : tipo === '5x2' ? 'secondary' : 'outline');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Dados carregados via API em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Clock className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{emPlantao.length}</p><p className="text-xs text-muted-foreground">Em plantão agora</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><Users className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{totalAtivos}</p><p className="text-xs text-muted-foreground">Colaboradores ativos</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">{totalClientes}</p><p className="text-xs text-muted-foreground">Clientes ativos</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center"><Palmtree className="h-5 w-5 text-muted-foreground" /></div><div><p className="text-2xl font-bold">{feriasAtivasHoje.length}</p><p className="text-xs text-muted-foreground">Férias ativas hoje</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" />Plantão Atual</CardTitle></CardHeader>
        <CardContent>
          {emPlantao.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhum colaborador em plantão neste momento.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {emPlantao.map(plantao => {
                const colaborador = data.colaboradores.find(c => c.id === plantao.colaborador_id);
                const equipe = data.equipes.find(e => e.id === colaborador?.equipe_id);
                const cliente = data.clientes.find(c => c.id === equipe?.cliente_id);
                return (
                  <div key={plantao.id} className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2 gap-2"><p className="font-medium text-sm">{colaborador?.nome}</p><div className="flex gap-1"><Badge variant={tipoBadge(plantao.tipo)}>{plantao.tipo}</Badge>{plantao.origem === 'manual' && <Badge variant="destructive">override</Badge>}</div></div>
                    <p className="text-xs text-muted-foreground">{plantao.hora_inicio} – {plantao.hora_fim}</p>
                    {cliente && <p className="text-xs text-muted-foreground mt-1"><Building2 className="inline h-3 w-3 mr-1" />{cliente.nome}</p>}
                    <p className="text-xs text-muted-foreground">Equipe: {equipe?.nome || 'Sem equipe'}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Próximos Plantões</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {proximos.map(p => {
              const colab = data.colaboradores.find(c => c.id === p.colaborador_id);
              return (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center"><span className="text-xs font-medium">{colab?.nome?.[0] || '?'}</span></div><div><p className="text-sm font-medium">{colab?.nome}</p><p className="text-xs text-muted-foreground">{p.data} · {p.hora_inicio}–{p.hora_fim}</p></div></div>
                  <Badge variant={tipoBadge(p.tipo)} className="text-xs">{p.tipo}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
