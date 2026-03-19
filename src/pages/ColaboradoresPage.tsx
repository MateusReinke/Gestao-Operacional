import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBootstrap } from '@/hooks/useBootstrap';
import { api } from '@/lib/api';
import { Colaborador, ModeloTrabalho, TipoContrato } from '@/types/sgo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil } from 'lucide-react';

const modeloLabels: Record<ModeloTrabalho, string> = { presencial: 'Presencial', hibrido: 'Híbrido', remoto: 'Remoto' };
const contratoLabels: Record<TipoContrato, string> = { clt: 'CLT', pj: 'PJ', estagio: 'Estágio', temporario: 'Temporário' };
const emptyColaborador: Omit<Colaborador, 'id'> = { nome: '', email: '', telefone: '', equipe_id: null, tipo_contrato: 'clt', modelo_trabalho: 'presencial', ativo: true };

export default function ColaboradoresPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useBootstrap();
  const [search, setSearch] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('all');
  const [editing, setEditing] = useState<Partial<Colaborador> | null>(null);
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: Partial<Colaborador>) => payload.id ? api.update<Colaborador>('colaboradores', payload.id, payload) : api.create<Colaborador>('colaboradores', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bootstrap'] }); setOpen(false); },
  });

  const filtered = useMemo(() => (data?.colaboradores || []).filter(c => c.nome.toLowerCase().includes(search.toLowerCase()) && (filterEquipe === 'all' || c.equipe_id === filterEquipe)), [data, search, filterEquipe]);
  if (isLoading) return <p>Carregando colaboradores...</p>;
  if (isError || !data) return <p>Não foi possível carregar os colaboradores.</p>;

  const today = new Date().toISOString().split('T')[0];
  const emFerias = new Set(data.ferias.filter(f => f.status === 'aprovado' && f.data_inicio <= today && f.data_fim >= today).map(f => f.colaborador_id));

  return <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Colaboradores</h1><p className="text-sm text-muted-foreground">{data.colaboradores.filter(c => c.ativo).length} ativos de {data.colaboradores.length}</p></div><Button onClick={() => { setEditing(emptyColaborador); setOpen(true); }} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Novo Colaborador</Button></div><div className="flex gap-3 flex-col sm:flex-row"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div><Select value={filterEquipe} onValueChange={setFilterEquipe}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Equipe" /></SelectTrigger><SelectContent><SelectItem value="all">Todas equipes</SelectItem>{data.equipes.map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.nome}</SelectItem>)}</SelectContent></Select></div><div className="rounded-lg border bg-card shadow-sm overflow-hidden"><div className="table-responsive"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="hidden md:table-cell">E-mail</TableHead><TableHead className="hidden lg:table-cell">Equipe</TableHead><TableHead className="hidden sm:table-cell">Contrato</TableHead><TableHead className="hidden lg:table-cell">Modelo</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader><TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum colaborador encontrado.</TableCell></TableRow> : filtered.map(c => <TableRow key={c.id} className={!c.ativo ? 'opacity-50' : ''}><TableCell className="font-medium"><div>{c.nome}{emFerias.has(c.id) && <Badge variant="secondary" className="ml-2 text-[10px]">Férias</Badge>}<p className="text-xs text-muted-foreground md:hidden">{c.email}</p></div></TableCell><TableCell className="hidden md:table-cell text-sm">{c.email}</TableCell><TableCell className="hidden lg:table-cell text-sm">{data.equipes.find(e => e.id === c.equipe_id)?.nome || 'Sem equipe'}</TableCell><TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-xs">{contratoLabels[c.tipo_contrato]}</Badge></TableCell><TableCell className="hidden lg:table-cell text-xs">{modeloLabels[c.modelo_trabalho]}</TableCell><TableCell><Badge variant={c.ativo ? 'default' : 'secondary'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div></div><Sheet open={open} onOpenChange={setOpen}><SheetContent><SheetHeader><SheetTitle>{editing?.id ? 'Editar Colaborador' : 'Novo Colaborador'}</SheetTitle></SheetHeader>{editing && <div className="space-y-4 mt-6"><div className="space-y-2"><Label>Nome</Label><Input value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} /></div><div className="space-y-2"><Label>E-mail</Label><Input value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div><div className="space-y-2"><Label>Telefone</Label><Input value={editing.telefone || ''} onChange={e => setEditing({ ...editing, telefone: e.target.value })} /></div><div className="space-y-2"><Label>Equipe</Label><Select value={editing.equipe_id || 'none'} onValueChange={v => setEditing({ ...editing, equipe_id: v === 'none' ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem equipe</SelectItem>{data.equipes.filter(eq => eq.ativo).map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.nome}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Tipo Contrato</Label><Select value={editing.tipo_contrato || 'clt'} onValueChange={v => setEditing({ ...editing, tipo_contrato: v as TipoContrato })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(contratoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Modelo Trabalho</Label><Select value={editing.modelo_trabalho || 'presencial'} onValueChange={v => setEditing({ ...editing, modelo_trabalho: v as ModeloTrabalho })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(modeloLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center gap-2"><Switch checked={Boolean(editing.ativo)} onCheckedChange={v => setEditing({ ...editing, ativo: v })} /><Label>Ativo</Label></div><Button onClick={() => mutation.mutate(editing)} className="w-full" disabled={mutation.isPending}>Salvar</Button></div>}</SheetContent></Sheet></div>;
}
