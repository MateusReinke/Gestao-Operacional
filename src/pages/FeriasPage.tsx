import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBootstrap } from '@/hooks/useBootstrap';
import { api } from '@/lib/api';
import { Ferias, StatusFerias } from '@/types/sgo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil } from 'lucide-react';

const statusLabels: Record<StatusFerias, string> = { aprovado: 'Aprovado', pendente: 'Pendente', rejeitado: 'Rejeitado' };
const statusVariant = (s: StatusFerias) => (s === 'aprovado' ? 'default' : s === 'pendente' ? 'secondary' : 'destructive');
const emptyFerias: Omit<Ferias, 'id'> = { colaborador_id: '', data_inicio: '', data_fim: '', status: 'pendente' };

export default function FeriasPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useBootstrap();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Ferias> | null>(null);
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: Partial<Ferias>) => payload.id ? api.update<Ferias>('ferias', payload.id, payload) : api.create<Ferias>('ferias', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bootstrap'] }); setOpen(false); },
  });

  const filtered = useMemo(() => (data?.ferias || []).filter(f => (data.colaboradores.find(c => c.id === f.colaborador_id)?.nome || '').toLowerCase().includes(search.toLowerCase())), [data, search]);
  if (isLoading) return <p>Carregando férias...</p>;
  if (isError || !data) return <p>Não foi possível carregar as férias.</p>;

  return <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Férias</h1><p className="text-sm text-muted-foreground">{data.ferias.length} registros de férias</p></div><Button onClick={() => { setEditing({ ...emptyFerias, colaborador_id: data.colaboradores[0]?.id || '' }); setOpen(true); }} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Registrar Férias</Button></div><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por colaborador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div><div className="rounded-lg border bg-card shadow-sm overflow-hidden"><div className="table-responsive"><Table><TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Início</TableHead><TableHead className="hidden sm:table-cell">Fim</TableHead><TableHead className="hidden md:table-cell">Dias</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader><TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow> : filtered.map(f => { const colab = data.colaboradores.find(c => c.id === f.colaborador_id); const dias = f.data_inicio && f.data_fim ? Math.ceil((new Date(f.data_fim).getTime() - new Date(f.data_inicio).getTime()) / 86400000) + 1 : 0; return <TableRow key={f.id}><TableCell className="font-medium">{colab?.nome}</TableCell><TableCell className="font-mono text-xs">{f.data_inicio}</TableCell><TableCell className="hidden sm:table-cell font-mono text-xs">{f.data_fim}</TableCell><TableCell className="hidden md:table-cell font-mono text-sm">{dias}</TableCell><TableCell><Badge variant={statusVariant(f.status)}>{statusLabels[f.status]}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></TableCell></TableRow>; })}</TableBody></Table></div></div><Sheet open={open} onOpenChange={setOpen}><SheetContent><SheetHeader><SheetTitle>{editing?.id ? 'Editar Férias' : 'Registrar Férias'}</SheetTitle></SheetHeader>{editing && <div className="space-y-4 mt-6"><div className="space-y-2"><Label>Colaborador</Label><Select value={editing.colaborador_id || ''} onValueChange={v => setEditing({ ...editing, colaborador_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{data.colaboradores.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Data Início</Label><Input type="date" value={editing.data_inicio || ''} onChange={e => setEditing({ ...editing, data_inicio: e.target.value })} /></div><div className="space-y-2"><Label>Data Fim</Label><Input type="date" value={editing.data_fim || ''} onChange={e => setEditing({ ...editing, data_fim: e.target.value })} /></div><div className="space-y-2"><Label>Status</Label><Select value={editing.status || 'pendente'} onValueChange={v => setEditing({ ...editing, status: v as StatusFerias })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><Button onClick={() => mutation.mutate(editing)} className="w-full" disabled={mutation.isPending}>Salvar</Button></div>}</SheetContent></Sheet></div>;
}
