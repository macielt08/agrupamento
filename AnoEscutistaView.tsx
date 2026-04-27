import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, RefreshCw, Loader2, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAnoEscutista, createAnoEscutista, updateAnoEscutista } from 'zite-endpoints-sdk';
import type { GetAnoEscutistaOutputType } from 'zite-endpoints-sdk';

type AnoEscutistaRecord = GetAnoEscutistaOutputType['records'][0];

export default function AnoEscutistaView() {
  const [records, setRecords] = useState<AnoEscutistaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AnoEscutistaRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnoEscutistaRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({ ano: '', estado: 'Aberto' });

  const loadData = async () => {
    try {
      const data = await getAnoEscutista({});
      const filtered = (data?.records || []).filter(r => r.estado !== 'Eliminado');
      setRecords(filtered);
    } catch {
      toast.error('Erro ao carregar anos escutistas');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const openNew = () => {
    setEditingRecord(null);
    setFormData({ ano: '', estado: 'Aberto' });
    setDialogOpen(true);
  };

  const openEdit = (record: AnoEscutistaRecord) => {
    setEditingRecord(record);
    setFormData({ ano: record.ano || '', estado: record.estado || 'Aberto' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.ano.trim()) {
      toast.error('O campo Ano é obrigatório');
      return;
    }
    setIsSaving(true);
    try {
      if (editingRecord) {
        await updateAnoEscutista({ id: editingRecord.id, ano: formData.ano, estado: formData.estado });
        toast.success('Ano escutista atualizado');
      } else {
        await createAnoEscutista({ ano: formData.ano, estado: formData.estado });
        toast.success('Ano escutista criado');
      }
      setDialogOpen(false);
      await loadData();
    } catch {
      toast.error('Erro ao guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await updateAnoEscutista({ id: deleteTarget.id, estado: 'Eliminado' });
      toast.success('Ano escutista eliminado');
      setDeleteTarget(null);
      await loadData();
    } catch {
      toast.error('Erro ao eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  const estadoBadge = (estado?: string) => {
    if (estado === 'Aberto') return <Badge className="bg-green-100 text-green-800 border-green-200 font-semibold text-xs">Aberto</Badge>;
    if (estado === 'Fechado') return <Badge className="bg-muted text-muted-foreground border font-semibold text-xs">Fechado</Badge>;
    return <Badge variant="outline" className="text-xs">{estado || '—'}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Anos Escutistas</h2>
          <Badge variant="secondary" className="text-xs">{records.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo Ano
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold uppercase text-xs tracking-wide">Ano Escutista</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wide">Estado</TableHead>
              <TableHead className="text-right font-bold uppercase text-xs tracking-wide">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground text-sm">
                  Nenhum ano escutista encontrado. Clique em "Novo Ano" para criar.
                </TableCell>
              </TableRow>
            ) : (
              records.map(r => (
                <TableRow key={r.id} className="group">
                  <TableCell className="font-mono font-semibold">{r.ano || '—'}</TableCell>
                  <TableCell>{estadoBadge(r.estado)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Editar Ano Escutista' : 'Novo Ano Escutista'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ano" className="text-xs font-bold uppercase text-muted-foreground">Ano Escutista *</Label>
              <Input
                id="ano"
                placeholder="ex: 2025/2026"
                value={formData.ano}
                onChange={e => setFormData({ ...formData, ano: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Estado</Label>
              <Select value={formData.estado} onValueChange={v => setFormData({ ...formData, estado: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="Fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingRecord ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Ano Escutista</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer eliminar o ano <strong>{deleteTarget?.ano}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
