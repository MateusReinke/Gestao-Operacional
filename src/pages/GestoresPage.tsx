import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBootstrap } from '@/hooks/useBootstrap';
import { api } from '@/lib/api';
import { Gestor } from '@/types/sgo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, UserCog } from 'lucide-react';

const emptyGestor: Omit<Gestor, 'id'> = { nome: '', email: '', equipe_ids: [] };

export default function GestoresPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useBootstrap();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Gestor> | null>(null);
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: Partial<Gestor>) => payload.id ? api.update<Gestor>('gestores', payload.id, payload) : api.create<Gestor>('gestores', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bootstrap'] }); setOpen(false); },
  });

  const filtered = useMemo(() => (data?.gestores || []).filter(g => g.nome.toLowerCase().includes(search.toLowerCase())), [data, search]);
  if (isLoading) return <p>Carregando gestores...</p>;
  if (isError || !data) return <p>Não foi possível carregar os gestores.</p>;

  const toggleEquipe = (eqId: string) => {
    if (!editing) return;
    const equipe_ids = editing.equipe_ids?.includes(eqId) ? editing.equipe_ids.filter(id => id !== eqId) : [...(editing.equipe_ids || []), eqId];
    setEditing({ ...editing, equipe_ids });
  };

  return <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Gestores</h1><p className="text-sm text-muted-foreground">{data.gestores.length} gestores</p></div><Button onClick={() => { setEditing(emptyGestor); setOpen(true); }} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Novo Gestor</Button></div><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar gestores..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(g => <Card key={g.id}><CardHeader className="pb-2 flex flex-row items-start justify-between"><div className="flex items-center gap-2"><div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><UserCog className="h-4 w-4 text-primary" /></div><div className="min-w-0"><CardTitle className="text-base truncate">{g.nome}</CardTitle><p className="text-xs text-muted-foreground truncate">{g.email}</p></div></div><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setEditing(g); setOpen(true); }}><Pencil className="h-3 w-3" /></Button></CardHeader><CardContent><p className="text-xs text-muted-foreground mb-2">Equipes gerenciadas:</p><div className="flex flex-wrap gap-1">{g.equipe_ids.map(eqId => <Badge key={eqId} variant="outline" className="text-xs">{data.equipes.find(e => e.id === eqId)?.nome || eqId}</Badge>)}{g.equipe_ids.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma equipe vinculada</span>}</div></CardContent></Card>)}</div><Sheet open={open} onOpenChange={setOpen}><SheetContent><SheetHeader><SheetTitle>{editing?.id ? 'Editar Gestor' : 'Novo Gestor'}</SheetTitle></SheetHeader>{editing && <div className="space-y-4 mt-6"><div className="space-y-2"><Label>Nome</Label><Input value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} /></div><div className="space-y-2"><Label>E-mail</Label><Input value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div><div className="space-y-2"><Label>Equipes</Label><div className="space-y-2 border rounded-md p-3">{data.equipes.filter(e => e.ativo).map(eq => <div key={eq.id} className="flex items-center gap-2"><Checkbox checked={editing.equipe_ids?.includes(eq.id)} onCheckedChange={() => toggleEquipe(eq.id)} /><span className="text-sm">{eq.nome}</span></div>)}</div></div><Button onClick={() => mutation.mutate({ ...editing, equipe_ids: editing.equipe_ids || [] })} className="w-full" disabled={mutation.isPending}>Salvar</Button></div>}</SheetContent></Sheet></div>;
}
