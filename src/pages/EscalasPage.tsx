import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBootstrap } from '@/hooks/useBootstrap';
import { api } from '@/lib/api';
import { Escala, TipoEscala } from '@/types/sgo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, CalendarClock } from 'lucide-react';

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const tipoLabels: Record<TipoEscala, string> = { '12x36': '12×36', '5x2': '5×2', personalizada: 'Personalizada' };
const emptyEscala: Omit<Escala, 'id'> = { nome: '', tipo: '5x2', descricao: '' };

export default function EscalasPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useBootstrap();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Escala> | null>(null);
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: Partial<Escala>) => payload.id ? api.update<Escala>('escalas', payload.id, payload) : api.create<Escala>('escalas', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bootstrap'] }); setOpen(false); },
  });

  const filtered = useMemo(() => (data?.escalas || []).filter(e => e.nome.toLowerCase().includes(search.toLowerCase())), [data, search]);
  if (isLoading) return <p>Carregando escalas...</p>;
  if (isError || !data) return <p>Não foi possível carregar as escalas.</p>;

  return <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Escalas</h1><p className="text-sm text-muted-foreground">{data.escalas.length} escalas configuradas</p></div><Button onClick={() => { setEditing(emptyEscala); setOpen(true); }} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Nova Escala</Button></div><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar escalas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filtered.map(esc => { const detalhes = data.escalaDetalhes.filter(d => d.escala_id === esc.id); const vinculados = data.escalaColaboradores.filter(ec => ec.escala_id === esc.id); return <Card key={esc.id}><CardHeader className="pb-2 flex flex-row items-start justify-between"><div className="flex items-center gap-2"><div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><CalendarClock className="h-4 w-4 text-primary" /></div><div className="min-w-0"><CardTitle className="text-base truncate">{esc.nome}</CardTitle><p className="text-xs text-muted-foreground truncate">{esc.descricao}</p></div></div><div className="flex items-center gap-1 shrink-0"><Badge variant="outline">{tipoLabels[esc.tipo]}</Badge><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(esc); setOpen(true); }}><Pencil className="h-3 w-3" /></Button></div></CardHeader><CardContent className="space-y-3"><div><p className="text-xs font-medium text-muted-foreground mb-1">Horários:</p><div className="flex flex-wrap gap-1">{detalhes.map(d => <Badge key={d.id} variant="secondary" className="text-xs font-mono">{diasSemana[d.dia_semana]} {d.hora_inicio}–{d.hora_fim}</Badge>)}{detalhes.length === 0 && <span className="text-xs text-muted-foreground">Sem horários definidos</span>}</div></div><div><p className="text-xs font-medium text-muted-foreground mb-1">Colaboradores ({vinculados.length}):</p><div className="flex flex-wrap gap-1">{vinculados.map(ec => <Badge key={ec.id} variant="outline" className="text-xs">{data.colaboradores.find(c => c.id === ec.colaborador_id)?.nome}</Badge>)}</div></div></CardContent></Card>; })}</div><Sheet open={open} onOpenChange={setOpen}><SheetContent><SheetHeader><SheetTitle>{editing?.id ? 'Editar Escala' : 'Nova Escala'}</SheetTitle></SheetHeader>{editing && <div className="space-y-4 mt-6"><div className="space-y-2"><Label>Nome</Label><Input value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} /></div><div className="space-y-2"><Label>Tipo</Label><Select value={editing.tipo || '5x2'} onValueChange={v => setEditing({ ...editing, tipo: v as TipoEscala })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Descrição</Label><Input value={editing.descricao || ''} onChange={e => setEditing({ ...editing, descricao: e.target.value })} /></div><p className="text-xs text-muted-foreground">Os detalhes da escala e vínculos de colaboradores já estão conectados ao banco e podem ser populados diretamente no PostgreSQL.</p><Button onClick={() => mutation.mutate(editing)} className="w-full" disabled={mutation.isPending}>Salvar</Button></div>}</SheetContent></Sheet></div>;
}
