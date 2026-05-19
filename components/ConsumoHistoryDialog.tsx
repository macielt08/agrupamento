import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  History, ChevronLeft, Minus, Plus, XCircle, Package, Loader2,
  Calendar, Users, Search, ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getConsumos, updateConsumo } from 'zite-endpoints-sdk';
import type { GetConsumosOutputType, UpdateConsumoInputType } from 'zite-endpoints-sdk';

type ConsumoGroup = GetConsumosOutputType['consumos'][0];
type ConsumoItem = ConsumoGroup['items'][0];

interface InventarioItem {
  id: number;
  produto: string;
  quantidade: number;
  marca?: string;
  categoria?: string;
}

interface EditItem extends ConsumoItem {
  removed: boolean;
  currentQty: number;
}

interface NewAddition {
  inventarioId: number;
  produto: string;
  marca: string;
  quantidade: number;
  maxQty: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  inventarioItems: InventarioItem[];
  userName?: string;
  onConsumoSaved: () => void;
}

const SECCOES = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Agrupamento'];

// ── Consumo List View ──────────────────────────────────────────────────────────
function ConsumoListView({
  consumos, loading, onSelect, searchTerm, setSearchTerm
}: {
  consumos: ConsumoGroup[];
  loading: boolean;
  onSelect: (c: ConsumoGroup) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
  const filtered = consumos.filter(c =>
    c.seccao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.utilizador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.numeroConsumo.includes(searchTerm) ||
    c.items.some(i => i.produto.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar consumos..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm font-bold uppercase">Nenhum consumo encontrado</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {filtered.map(consumo => (
            <button
              key={consumo.numeroConsumo}
              onClick={() => onSelect(consumo)}
              className="w-full text-left p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-all bg-card"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-xs">
                    #{consumo.numeroConsumo}
                  </Badge>
                  <span className="text-xs font-bold text-muted-foreground uppercase">{consumo.seccao}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {consumo.data}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {consumo.items.slice(0, 4).map((item, idx) => (
                  <span key={idx} className="text-[10px] bg-muted px-2 py-0.5 rounded-md font-medium text-muted-foreground">
                    {item.produto} ×{item.quantidade}
                  </span>
                ))}
                {consumo.items.length > 4 && (
                  <span className="text-[10px] text-muted-foreground font-bold">+{consumo.items.length - 4} mais</span>
                )}
              </div>
              {consumo.utilizador && (
                <div className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground/60 font-medium uppercase">
                  <Users className="h-2.5 w-2.5" /> {consumo.utilizador}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add From Inventory Panel ───────────────────────────────────────────────────
function AddFromInventoryPanel({
  inventarioItems,
  additions,
  onAdd,
  onRemove,
  onQtyChange,
}: {
  inventarioItems: InventarioItem[];
  additions: NewAddition[];
  onAdd: (item: InventarioItem) => void;
  onRemove: (inventarioId: number) => void;
  onQtyChange: (inventarioId: number, qty: number) => void;
}) {
  const [search, setSearch] = useState('');
  const available = inventarioItems.filter(i =>
    i.produto && i.produto.toUpperCase() !== 'DELETED' && i.quantidade > 0 &&
    (i.produto.toLowerCase().includes(search.toLowerCase()) || i.marca?.toLowerCase().includes(search.toLowerCase()))
  );
  const addedIds = new Set(additions.map(a => a.inventarioId));

  return (
    <div className="border rounded-xl p-3 bg-muted/20 space-y-2">
      <p className="text-[10px] font-black uppercase text-primary tracking-wider">+ Adicionar do Inventário</p>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>
      <div className="max-h-36 overflow-y-auto space-y-1">
        {available.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-2">Sem produtos disponíveis</p>
        )}
        {available.map(item => {
          const added = additions.find(a => a.inventarioId === item.id);
          return (
            <div key={item.id} className={cn(
              "flex items-center justify-between px-2 py-1.5 rounded-lg text-xs border transition-all",
              added ? "border-primary/30 bg-primary/5" : "border-border bg-card"
            )}>
              <div>
                <p className="font-bold text-foreground truncate max-w-[140px]">{item.produto}</p>
                <p className="text-[9px] text-muted-foreground">{item.marca || 'Sem marca'} · Stock: {item.quantidade}</p>
              </div>
              {added ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => onQtyChange(item.id, Math.max(1, added.quantidade - 1))}
                    className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-black w-6 text-center">{added.quantidade}</span>
                  <button onClick={() => onQtyChange(item.id, Math.min(item.quantidade, added.quantidade + 1))}
                    className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted">
                    <Plus className="h-3 w-3" />
                  </button>
                  <button onClick={() => onRemove(item.id)} className="h-6 w-6 rounded flex items-center justify-center text-destructive/60 hover:text-destructive ml-1">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-6 text-[10px] font-bold px-2" onClick={() => onAdd(item)}>
                  Adicionar
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Edit Consumo View ──────────────────────────────────────────────────────────
function EditConsumoView({
  consumo,
  inventarioItems,
  userName,
  onBack,
  onSaved,
}: {
  consumo: ConsumoGroup;
  inventarioItems: InventarioItem[];
  userName: string;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [editItems, setEditItems] = useState<EditItem[]>(() =>
    consumo.items.map(i => ({ ...i, removed: false, currentQty: i.quantidade }))
  );
  const [additions, setAdditions] = useState<NewAddition[]>([]);
  const [saving, setSaving] = useState(false);

  const handleQtyChange = (id: number, delta: number) => {
    setEditItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, currentQty: Math.max(1, item.currentQty + delta) }
        : item
    ));
  };

  const handleRemove = (id: number) => {
    setEditItems(prev => prev.map(item =>
      item.id === id ? { ...item, removed: true } : item
    ));
  };

  const handleRestore = (id: number) => {
    setEditItems(prev => prev.map(item =>
      item.id === id ? { ...item, removed: false } : item
    ));
  };

  const handleAddItem = (item: InventarioItem) => {
    setAdditions(prev => [...prev, {
      inventarioId: item.id,
      produto: item.produto,
      marca: item.marca || '',
      quantidade: 1,
      maxQty: item.quantidade,
    }]);
  };

  const handleRemoveAddition = (inventarioId: number) => {
    setAdditions(prev => prev.filter(a => a.inventarioId !== inventarioId));
  };

  const handleAdditionQtyChange = (inventarioId: number, qty: number) => {
    setAdditions(prev => prev.map(a =>
      a.inventarioId === inventarioId ? { ...a, quantidade: qty } : a
    ));
  };

  const hasSomethingChanged = () => {
    const hasRemovals = editItems.some(i => i.removed);
    const hasUpdates = editItems.some(i => !i.removed && i.currentQty !== i.quantidade);
    const hasAdditions = additions.length > 0;
    return hasRemovals || hasUpdates || hasAdditions;
  };

  const handleSave = async () => {
    if (!hasSomethingChanged()) return;
    setSaving(true);
    try {
      const removals: UpdateConsumoInputType['removals'] = editItems
        .filter(i => i.removed)
        .map(i => ({
          consumoRowId: i.id,
          produto: i.produto,
          quantidadeDevolver: i.quantidade,
          marca: i.marca || undefined,
        }));

      const updates: UpdateConsumoInputType['updates'] = editItems
        .filter(i => !i.removed && i.currentQty !== i.quantidade)
        .map(i => ({
          consumoRowId: i.id,
          produto: i.produto,
          newQty: i.currentQty,
          qtyToReturn: i.quantidade - i.currentQty,
          marca: i.marca || undefined,
        }));

      const additionsInput: UpdateConsumoInputType['additions'] = additions.map(a => ({
        inventarioId: a.inventarioId,
        produto: a.produto,
        quantidade: a.quantidade,
        marca: a.marca || undefined,
        numeroConsumo: parseInt(consumo.numeroConsumo),
        seccao: consumo.seccao,
        utilizador: userName || consumo.utilizador,
      }));

      await updateConsumo({ removals, updates, additions: additionsInput });
      toast.success('Consumo atualizado com sucesso!');
      onSaved();
    } catch {
      toast.error('Erro ao atualizar consumo.');
    } finally {
      setSaving(false);
    }
  };

  const activeItems = editItems.filter(i => !i.removed);
  const removedItems = editItems.filter(i => i.removed);

  return (
    <div className="flex flex-col gap-4">
      {/* Header info */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border">
        <Badge className="bg-primary/10 text-primary border-primary/20 font-black">#{consumo.numeroConsumo}</Badge>
        <div className="text-xs">
          <p className="font-bold text-foreground">{consumo.seccao}</p>
          <p className="text-muted-foreground">{consumo.data} · {consumo.utilizador}</p>
        </div>
      </div>

      {/* Active items */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto">
        {activeItems.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-3 py-2 border rounded-xl bg-card border-border">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{item.produto}</p>
              <p className="text-[9px] text-muted-foreground">{item.marca || 'Sem marca'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleQtyChange(item.id, -1)}
                disabled={item.currentQty <= 1}
                className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className={cn(
                "text-sm font-black w-8 text-center tabular-nums",
                item.currentQty < item.quantidade && "text-orange-500"
              )}>
                {item.currentQty}
              </span>
              <button
                onClick={() => handleQtyChange(item.id, 1)}
                disabled={item.currentQty >= item.quantidade}
                className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleRemove(item.id)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Removed items (with restore option) */}
      {removedItems.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase text-destructive/60">A remover (devolve ao stock):</p>
          {removedItems.map(item => (
            <div key={item.id} className="flex items-center justify-between px-3 py-1.5 border rounded-xl bg-destructive/5 border-destructive/20 opacity-70">
              <span className="text-xs font-bold text-foreground line-through">{item.produto} ×{item.quantidade}</span>
              <button onClick={() => handleRestore(item.id)} className="text-[9px] text-primary font-bold hover:underline">Restaurar</button>
            </div>
          ))}
        </div>
      )}

      {/* New additions from inventory */}
      {additions.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase text-primary/60">A adicionar ao consumo:</p>
          {additions.map(a => (
            <div key={a.inventarioId} className="flex items-center justify-between px-3 py-1.5 border rounded-xl bg-primary/5 border-primary/20">
              <span className="text-xs font-bold">{a.produto} ×{a.quantidade}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add from inventory */}
      <AddFromInventoryPanel
        inventarioItems={inventarioItems}
        additions={additions}
        onAdd={handleAddItem}
        onRemove={handleRemoveAddition}
        onQtyChange={handleAdditionQtyChange}
      />

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving || !hasSomethingChanged()}
        className="w-full font-black uppercase h-12 shadow-md"
      >
        {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
        Guardar Alterações
      </Button>
    </div>
  );
}

// ── Main Dialog ─────────────────────────────────────────────────────────────
export default function ConsumoHistoryDialog({ open, onClose, inventarioItems, userName = '', onConsumoSaved }: Props) {
  const [consumos, setConsumos] = useState<ConsumoGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConsumo, setSelectedConsumo] = useState<ConsumoGroup | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getConsumos({});
      setConsumos(result.consumos);
    } catch {
      toast.error('Erro ao carregar histórico de consumos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setSelectedConsumo(null);
      setSearchTerm('');
    }
  }, [open, load]);

  const handleConsumoSaved = () => {
    load();
    setSelectedConsumo(null);
    onConsumoSaved();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            {selectedConsumo && (
              <button onClick={() => setSelectedConsumo(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <DialogTitle className="font-black uppercase text-primary flex items-center gap-2 text-lg">
                <History className="h-5 w-5 shrink-0" />
                {selectedConsumo ? `Editar Consumo #${selectedConsumo.numeroConsumo}` : 'Histórico de Consumos'}
              </DialogTitle>
              <DialogDescription className="sr-only">Histórico e gestão de consumos do inventário.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {selectedConsumo ? (
            <EditConsumoView
              consumo={selectedConsumo}
              inventarioItems={inventarioItems}
              userName={userName}
              onBack={() => setSelectedConsumo(null)}
              onSaved={handleConsumoSaved}
            />
          ) : (
            <ConsumoListView
              consumos={consumos}
              loading={loading}
              onSelect={setSelectedConsumo}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
