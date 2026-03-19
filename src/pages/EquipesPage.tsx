import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBootstrap } from '@/hooks/useBootstrap';
import { api } from '@/lib/api';
import { Equipe } from '@/types/sgo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, Users } from 'lucide-react';

const emptyEquipe: Omit<Equipe, 'id'> = { nome: '', cliente_id: null, ativo: true };

export default function EquipesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useBootstrap();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Equipe> | null>(null);
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: Partial<Equipe>) => payload.id ? api.update<Equipe>('equipes', payload.id, payload) : api.create<Equipe>('equipes', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bootstrap'] }); setOpen(false); },
  });

  const filtered = useMemo(() => (data?.equipes || []).filter(e => e.nome.toLowerCase().includes(search.toLowerCase())), [data, search]);
  if (isLoading) return <p>Carregando equipes...</p>;
  if (isError || !data) return <p>Não foi possível carregar as equipes.</p>;

  return <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Equipes</h1><p className="text-sm text-muted-foreground">{data.equipes.length} equipes cadastradas</p></div><Button onClick={() => { setEditing(emptyEquipe); setOpen(true); }} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Nova Equipe</Button></div><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar equipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(eq => { const membros = data.colaboradores.filter(c => c.equipe_id === eq.id && c.ativo); const cliente = data.clientes.find(c => c.id === eq.cliente_id); return <Card key={eq.id} className={!eq.ativo ? 'opacity-50' : ''}><CardHeader className="pb-2 flex flex-row items-start justify-between"><div><CardTitle className="text-base">{eq.nome}</CardTitle>{cliente && <p className="text-xs text-muted-foreground mt-1">{cliente.nome}</p>}</div><div className="flex gap-1"><Badge variant={eq.ativo ? 'default' : 'secondary'}>{eq.ativo ? 'Ativa' : 'Inativa'}</Badge><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(eq); setOpen(true); }}><Pencil className="h-3 w-3" /></Button></div></CardHeader><CardContent><div className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-4 w-4" /><span>{membros.length} colaborador{membros.length !== 1 ? 'es' : ''}</span></div></CardContent></Card>; })}</div><Sheet open={open} onOpenChange={setOpen}><SheetContent><SheetHeader><SheetTitle>{editing?.id ? 'Editar Equipe' : 'Nova Equipe'}</SheetTitle></SheetHeader>{editing && <div className="space-y-4 mt-6"><div className="space-y-2"><Label>Nome</Label><Input value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} /></div><div className="space-y-2"><Label>Cliente</Label><Select value={editing.cliente_id || 'none'} onValueChange={v => setEditing({ ...editing, cliente_id: v === 'none' ? null : v })}><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger><SelectContent><SelectItem value="none">Sem cliente</SelectItem>{data.clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center gap-2"><Switch checked={Boolean(editing.ativo)} onCheckedChange={v => setEditing({ ...editing, ativo: v })} /><Label>Ativa</Label></div><Button onClick={() => mutation.mutate(editing)} className="w-full" disabled={mutation.isPending}>Salvar</Button></div>}</SheetContent></Sheet></div>;
}
