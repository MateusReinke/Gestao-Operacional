import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBootstrap } from '@/hooks/useBootstrap';
import { api } from '@/lib/api';
import { Cliente } from '@/types/sgo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Pencil } from 'lucide-react';

const emptyCliente: Omit<Cliente, 'id'> = { nome: '', id_whatsapp: '', escalation: '', responsavel_interno_id: null, ativo: true };

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useBootstrap();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Cliente> | null>(null);
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: Partial<Cliente>) => payload.id ? api.update<Cliente>('clientes', payload.id, payload) : api.create<Cliente>('clientes', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bootstrap'] }); setOpen(false); },
  });

  const filtered = useMemo(() => (data?.clientes || []).filter(c => c.nome.toLowerCase().includes(search.toLowerCase())), [data, search]);

  if (isLoading) return <p>Carregando clientes...</p>;
  if (isError || !data) return <p>Não foi possível carregar os clientes.</p>;

  const getResponsavel = (id: string | null) => data.colaboradores.find(c => c.id === id)?.nome || '—';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Clientes</h1><p className="text-sm text-muted-foreground">{data.clientes.length} registros</p></div><Button onClick={() => { setEditing(emptyCliente); setOpen(true); }} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Novo Cliente</Button></div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar clientes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden"><div className="table-responsive"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="hidden md:table-cell">WhatsApp</TableHead><TableHead className="hidden lg:table-cell">Escalation</TableHead><TableHead className="hidden sm:table-cell">Responsável</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader><TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow> : filtered.map(c => <TableRow key={c.id} className={!c.ativo ? 'opacity-50' : ''}><TableCell className="font-medium">{c.nome}</TableCell><TableCell className="hidden md:table-cell font-mono text-xs">{c.id_whatsapp}</TableCell><TableCell className="hidden lg:table-cell text-sm">{c.escalation}</TableCell><TableCell className="hidden sm:table-cell text-sm">{getResponsavel(c.responsavel_interno_id)}</TableCell><TableCell><Badge variant={c.ativo ? 'default' : 'secondary'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div></div>
      <Sheet open={open} onOpenChange={setOpen}><SheetContent><SheetHeader><SheetTitle>{editing?.id ? 'Editar Cliente' : 'Novo Cliente'}</SheetTitle></SheetHeader>{editing && <div className="space-y-4 mt-6"><div className="space-y-2"><Label>Nome</Label><Input value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} /></div><div className="space-y-2"><Label>WhatsApp ID</Label><Input value={editing.id_whatsapp || ''} onChange={e => setEditing({ ...editing, id_whatsapp: e.target.value })} /></div><div className="space-y-2"><Label>Escalation</Label><Input value={editing.escalation || ''} onChange={e => setEditing({ ...editing, escalation: e.target.value })} /></div><div className="space-y-2"><Label>Responsável interno</Label><Select value={editing.responsavel_interno_id || 'none'} onValueChange={v => setEditing({ ...editing, responsavel_interno_id: v === 'none' ? null : v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Sem responsável</SelectItem>{data.colaboradores.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center gap-2"><Switch checked={Boolean(editing.ativo)} onCheckedChange={v => setEditing({ ...editing, ativo: v })} /><Label>Ativo</Label></div><Button onClick={() => mutation.mutate(editing)} className="w-full" disabled={mutation.isPending}>Salvar</Button></div>}</SheetContent></Sheet>
    </div>
  );
}
