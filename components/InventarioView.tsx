import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Package, Calendar, Search, RefreshCw, ChevronDown, Plus, 
  Loader2, Trash2, ShoppingCart, XCircle, 
  Minus, Plus as PlusIcon, ListOrdered, AlertCircle,
  Edit2, Check, ChevronsUpDown, PenLine
} from "lucide-react";
import ConsumoTabView from '@/components/ConsumoTabView';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { finalizeConsumo, getAtividades } from 'zite-endpoints-sdk';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';


// --- CONSTANTS ---
const CATEGORIAS = ["Alimentos", "Cozinha", "Material Campo", "Material Secção"];
const SECCOES = ["Lobitos", "Exploradores", "Pioneiros", "Caminheiros", "Agrupamento"];
const SECCOES_CONSUMO = ["Lobitos", "Exploradores", "Pioneiros", "Caminheiros", "Agrupamento"];
const ALL_TABS = ["Todos", ...CATEGORIAS];

// --- INTERFACES ---
interface InventarioItem {
  id: number;
  produto: string;
  mesValidade?: string;
  anoValidade?: string;
  quantidade: number;
  estado?: string;
  marca?: string;
  obs?: string;
  categoria?: string;
  seccao?: string;
}

interface InventarioViewProps {
  items: InventarioItem[];
  onRefresh: () => Promise<void>;
  onAddProduct: (product: Omit<InventarioItem, 'id'>) => Promise<void>;
  onDeleteProduct: (id: number) => Promise<void>;
  onUpdateQuantity: (id: number, newQuantity: number) => Promise<void>;
  onUpdateProduct?: (id: number, updates: Partial<InventarioItem>) => Promise<void>;
  isAdmin?: boolean;
  userName?: string;
  userSection?: string;
  [key: string]: any;
}

// --- COMBOBOX COMPONENT ---
interface ComboboxInputProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  createLabel?: string;
}

function ComboboxInput({ value, onChange, options, placeholder = 'Selecionar...', createLabel = 'Criar novo...' }: ComboboxInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return options;
    return options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const showCreateOption = search.length > 0 && !options.some(o => o.toLowerCase() === search.toLowerCase());

  const handleCreateNew = () => {
    setCreatingNew(true);
    setOpen(false);
    setSearch('');
  };

  if (creatingNew) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Escrever novo..."
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 text-muted-foreground"
          onClick={() => setCreatingNew(false)}
          title="Escolher existente"
        >
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-sm h-9 px-3"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            autoFocus
            placeholder="Pesquisar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="max-h-48 overflow-y-auto py-1">
          {filtered.length === 0 && !showCreateOption && (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum resultado.</p>
          )}
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
              className={cn(
                "w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted transition-colors flex items-center gap-2",
                value === opt && "bg-primary/5 text-primary"
              )}
            >
              <Check className={cn("h-3.5 w-3.5 shrink-0", value === opt ? "opacity-100 text-primary" : "opacity-0")} />
              {opt}
            </button>
          ))}
          {showCreateOption && (
            <button
              type="button"
              onClick={() => { onChange(search); setOpen(false); setSearch(''); }}
              className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-muted transition-colors flex items-center gap-2 text-primary border-t mt-1"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Usar &quot;{search}&quot;
            </button>
          )}
          <button
            type="button"
            onClick={handleCreateNew}
            className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground border-t"
          >
            <PenLine className="h-3.5 w-3.5 shrink-0" />
            {createLabel}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --- MAIN COMPONENT ---
export function InventarioView({ 
  items = [], 
  onRefresh, 
  onAddProduct, 
  onDeleteProduct, 
  onUpdateQuantity, 
  onUpdateProduct,
  isAdmin = true,
  userName = '',
  userSection = '',
}: InventarioViewProps) {
  
  // --- UI STATE ---
  const [mainTab, setMainTab] = useState('produtos');
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFinishingCart, setIsFinishingCart] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("Todos");

  // --- DATA STATE ---
  const [cart, setCart] = useState<Record<number, number>>({});
  const [newProduct, setNewProduct] = useState<Omit<InventarioItem, 'id'>>({
    produto: '', quantidade: 1, marca: '', mesValidade: '', anoValidade: '', estado: 'Disponível', obs: '', categoria: '', seccao: ''
  });
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);

  // --- MODAL STATE ---
  const [showSummary, setShowSummary] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);

  // --- CONSUMO STATE ---
  const [seccaoConsumo, setSeccaoConsumo] = useState<string>(userSection || '');
  const [addAtividade, setAddAtividade] = useState(false);
  const [atividadeConsumo, setAtividadeConsumo] = useState('');
  const [atividades, setAtividades] = useState<any[]>([]);
  const [openAtividadeCombobox, setOpenAtividadeCombobox] = useState(false);

  const loadAtividades = useCallback(async () => {
    try {
      const res = await getAtividades({});
      setAtividades((res as any)?.atividades || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (addAtividade) loadAtividades();
  }, [addAtividade, seccaoConsumo, loadAtividades]);

  const filteredAtividades = useMemo(() => {
    return atividades.filter(a =>
      a.nome && a.nome.trim() !== '' && a.nome.toUpperCase() !== 'DELETED' &&
      (a.seccao === seccaoConsumo || a.seccao === 'Agrupamento')
    );
  }, [atividades, seccaoConsumo]);

  const [consumeDialog, setConsumeDialog] = useState<{
    isOpen: boolean;
    item: InventarioItem | null;
    quantity: number;
  }>({ isOpen: false, item: null, quantity: 1 });

  // --- UNIQUE OPTIONS FOR DROPDOWNS ---
  const uniqueProdutos = useMemo(() => {
    const set = new Set(
      items
        .filter(i => i.produto && i.produto.toUpperCase() !== 'DELETED')
        .map(i => i.produto.trim())
    );
    return Array.from(set).sort();
  }, [items]);

  const uniqueMarcas = useMemo(() => {
    const set = new Set(
      items
        .filter(i => i.marca && i.marca.trim() !== '')
        .map(i => i.marca!.trim())
    );
    return Array.from(set).sort();
  }, [items]);

  // --- GROUPED & FILTERED ITEMS ---
  const groupedItems = useMemo(() => {
    const groups: Record<string, InventarioItem[]> = {};
    items
      .filter(item => item.produto && item.produto.toUpperCase() !== "DELETED")
      .forEach(item => {
        const nome = item.produto || "Sem Nome";
        if (!groups[nome]) groups[nome] = [];
        const qtyNoCarrinho = cart[item.id] || 0;
        groups[nome].push({ ...item, quantidade: item.quantidade - qtyNoCarrinho });
      });
    return groups;
  }, [items, cart]);

  const filteredGroupKeys = useMemo(() => {
    return Object.keys(groupedItems).filter(key => {
      const matchesSearch = key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        groupedItems[key].some(i => i.marca?.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;
      if (activeTab === "Todos") return true;
      return groupedItems[key].some(i => i.categoria === activeTab);
    });
  }, [groupedItems, searchTerm, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: 0 };
    CATEGORIAS.forEach(c => { counts[c] = 0; });
    Object.keys(groupedItems).forEach(key => {
      counts["Todos"]++;
      const cat = groupedItems[key][0]?.categoria || '';
      if (cat && counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [groupedItems]);

  const totalCartItems = Object.keys(cart).length;

  // --- CRUD ACTIONS ---
  const handleAddNew = async () => {
    if (!newProduct.produto) return toast.error("O nome do produto é obrigatório.");
    setIsProcessing(true);
    try {
      await onAddProduct(newProduct);
      setOpenAddModal(false);
      setNewProduct({ produto: '', quantidade: 1, marca: '', mesValidade: '', anoValidade: '', estado: 'Disponível', obs: '', categoria: '', seccao: '' });
      await onRefresh();
      toast.success("Produto adicionado ao inventário.");
    } catch (e) { toast.error("Erro ao adicionar produto."); }
    finally { setIsProcessing(false); }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    setIsProcessing(true);
    try {
      if (onUpdateProduct) {
        await onUpdateProduct(editingItem.id, editingItem);
      } else {
        await onUpdateQuantity(editingItem.id, editingItem.quantidade);
      }
      setOpenEditModal(false);
      await onRefresh();
      toast.success("Dados atualizados com sucesso.");
    } catch (e) { toast.error("Erro ao atualizar."); }
    finally { setIsProcessing(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja eliminar este lote permanentemente?")) return;
    try {
      await onDeleteProduct(id);
      await onRefresh();
      toast.success("Lote removido.");
    } catch (e) { toast.error("Erro ao eliminar."); }
  };

  // --- CART ACTIONS ---
  const handleFinalizeCart = async () => {
    if (!seccaoConsumo) {
      toast.error("Seleciona uma secção antes de confirmar.");
      return;
    }
    setIsFinishingCart(true);
    try {
      const cartItems = Object.entries(cart).map(([idStr, qty]) => {
        const item = items.find(i => i.id === Number(idStr));
        return {
          id: Number(idStr),
          produto: item?.produto || '',
          quantidade: qty,
          marca: item?.marca || '',
        };
      }).filter(i => i.produto);

      await finalizeConsumo({
        items: cartItems,
        seccao: seccaoConsumo,
        utilizador: userName || 'Sistema',
        atividade: addAtividade ? atividadeConsumo : '',
      });

      setCart({});
      setShowSummary(false);
      await onRefresh();
      toast.success("Saídas processadas e consumo registado!");
    } catch (e) { toast.error("Erro ao processar saídas."); }
    finally { setIsFinishingCart(false); }
  };

  const cartItemsInOtherTabs = useMemo(() => {
    if (activeTab === "Todos") return 0;
    return Object.keys(cart).filter(idStr => {
      const item = items.find(i => i.id === Number(idStr));
      return item && item.categoria !== activeTab;
    }).length;
  }, [cart, items, activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-card p-6 rounded-2xl border shadow-sm border-border/60">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter flex items-center justify-center md:justify-start gap-2">
            <Package className="text-primary h-7 w-7" /> Gestão de Inventário
          </h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Zite Platform - 2026</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {mainTab === 'produtos' && (
            <Button onClick={() => setOpenAddModal(true)} variant="outline" className="flex-1 md:flex-none font-bold">
              <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">NOVO PRODUTO</span>
            </Button>
          )}
          {mainTab === 'produtos' && totalCartItems > 0 && (
            <Button onClick={() => setShowSummary(true)} className="flex-1 md:flex-none font-black shadow-lg animate-in zoom-in relative">
              <ShoppingCart className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">SAÍDAS ({totalCartItems})</span>
              <span className="md:hidden">({totalCartItems})</span>
              {cartItemsInOtherTabs > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center">
                  {cartItemsInOtherTabs}
                </span>
              )}
            </Button>
          )}
          <Button onClick={async () => { setIsRefreshing(true); try { await onRefresh(); } finally { setIsRefreshing(false); } }} variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0">
            <RefreshCw className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* MAIN TABS */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <div className="flex justify-end mb-4">
          <div className="inline-flex p-1 bg-muted rounded-lg shadow-sm border border-border">
            <button
              onClick={() => setMainTab('produtos')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide ${
                mainTab === 'produtos'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              Produtos
            </button>
            <button
              onClick={() => setMainTab('consumos')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide ${
                mainTab === 'consumos'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListOrdered className="h-3.5 w-3.5" />
              Consumos
            </button>
          </div>
        </div>

        {/* ── TAB: PRODUTOS ────────────────────────────────────────────── */}
        <TabsContent value="produtos" className="mt-6 space-y-4">

          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="PESQUISAR MATERIAL POR NOME OU MARCA..." 
              className="pl-12 h-14 shadow-sm rounded-xl font-bold uppercase text-xs focus:ring-2 outline-none" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>

          {/* CATEGORY TABS */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {ALL_TABS.map(tab => {
              const isActive = activeTab === tab;
              const count = tabCounts[tab] ?? 0;
              const tabCartCount = tab === "Todos"
                ? totalCartItems
                : Object.keys(cart).filter(idStr => {
                    const item = items.find(i => i.id === Number(idStr));
                    return item?.categoria === tab;
                  }).length;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight whitespace-nowrap transition-all border shrink-0",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {tab}
                  <span className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded-md tabular-nums",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {count}
                  </span>
                  {tabCartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center leading-none">
                      {tabCartCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* PRODUCT LIST */}
          <div className="space-y-4">
            {filteredGroupKeys.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold uppercase text-sm">Nenhum produto encontrado</p>
                <p className="text-xs mt-1 opacity-60">
                  {activeTab !== "Todos" ? `Sem itens na categoria "${activeTab}"` : "Tente outro termo de pesquisa"}
                </p>
              </div>
            )}

            {filteredGroupKeys.map((produto) => {
              const variacoes = activeTab === "Todos"
                ? groupedItems[produto]
                : groupedItems[produto].filter(i => i.categoria === activeTab);
              
              if (variacoes.length === 0) return null;

              const isExpanded = !!expandedProducts[produto];
              const totalDisponivel = variacoes.reduce((acc, cur) => acc + cur.quantidade, 0);
              const cartCountForProduct = variacoes.reduce((acc, cur) => acc + (cart[cur.id] ? 1 : 0), 0);

              return (
                <div key={produto} className={cn(
                  "border rounded-2xl bg-card overflow-hidden shadow-sm transition-all hover:border-border",
                  cartCountForProduct > 0 ? "border-primary/40" : "border-border/60"
                )}>
                  <div 
                    className="flex items-center gap-4 p-5 cursor-pointer hover:bg-muted/30 transition-colors" 
                    onClick={() => setExpandedProducts(p => ({ ...p, [produto]: !p[produto] }))}
                  >
                    <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black uppercase truncate text-foreground">{produto}</h3>
                      {variacoes[0]?.categoria && (
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">{variacoes[0].categoria}</p>
                      )}
                    </div>
                    {cartCountForProduct > 0 && (
                      <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 font-black shrink-0 text-[10px]" variant="outline">
                        {cartCountForProduct} NO CARRINHO
                      </Badge>
                    )}
                    <Badge className={`font-black shrink-0 ${totalDisponivel <= 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`} variant="outline">
                      {totalDisponivel} EM STOCK
                    </Badge>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isExpanded && (
                    <div className="p-5 pt-0 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 animate-in slide-in-from-top-4">
                      {variacoes.map((item) => (
                        <Card key={item.id} className={`rounded-xl overflow-hidden transition-all shadow-none ${cart[item.id] ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3 gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-primary font-black text-[10px] uppercase truncate">{item.marca || 'MARCA BRANCA'}</p>
                                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold mt-1 uppercase">
                                  <Calendar className="h-3 w-3" /> {item.mesValidade || '--'}/{item.anoValidade || '--'}
                                </div>
                                {item.seccao && (
                                  <p className="text-[9px] text-muted-foreground/70 font-bold mt-0.5 uppercase">{item.seccao}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 -mt-1 -mr-1">
                                <button onClick={() => { setEditingItem(item); setOpenEditModal(true); }} className="p-1.5 text-muted-foreground/40 hover:text-orange-500 transition-colors">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-muted-foreground/40 hover:text-destructive transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center mb-3 border border-dashed border-border">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Stock Lote</span>
                              <span className="text-base font-black tabular-nums">{item.quantidade}</span>
                            </div>

                            {item.obs && item.obs.trim() !== '' && (
                              <div className="mb-3 px-1">
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic line-clamp-2" title={item.obs}>
                                  {item.obs}
                                </p>
                              </div>
                            )}

                            <div className={`flex gap-2`}>
                              <Button 
                                variant={cart[item.id] ? "secondary" : "outline"} 
                                className={`flex-1 h-11 font-black text-[10px] rounded-lg uppercase tracking-tight ${cart[item.id] ? 'bg-primary/10 text-primary border-primary/30' : ''}`} 
                                onClick={() => setConsumeDialog({ isOpen: true, item, quantity: cart[item.id] || 1 })} 
                                disabled={item.quantidade <= 0 && !cart[item.id]}
                              >
                                {cart[item.id] ? `AJUSTAR (-${cart[item.id]})` : "REQUISITAR MATERIAL"}
                              </Button>
                              {cart[item.id] && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-11 w-11 shrink-0 rounded-lg border-destructive/30 text-destructive/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                                  onClick={() => {
                                    const n = { ...cart };
                                    delete n[item.id];
                                    setCart(n);
                                    toast.info("Removido do carrinho.");
                                  }}
                                  title="Remover do carrinho"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {/* ADD NEW LOTE BUTTON */}
                      <button
                        onClick={() => {
                          const cat = groupedItems[produto][0]?.categoria || '';
                          setNewProduct({ produto, quantidade: 1, marca: '', mesValidade: '', anoValidade: '', estado: 'Disponível', obs: '', categoria: cat, seccao: '' });
                          setOpenAddModal(true);
                        }}
                        className="rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground hover:text-primary min-h-[160px] group"
                      >
                        <div className="bg-muted group-hover:bg-primary/10 p-3 rounded-xl transition-colors">
                          <Plus className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider">Novo Lote</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TAB: CONSUMOS ────────────────────────────────────────────── */}
        <TabsContent value="consumos" className="mt-6">
          <ConsumoTabView inventarioItems={items} userName={userName} />
        </TabsContent>
      </Tabs>

      {/* --- MODALS --- */}

      {/* 1. NEW PRODUCT */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="sm:max-w-[480px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-primary">Registar Entrada</DialogTitle>
            <DialogDescription className="sr-only">Formulário para registar uma nova entrada no inventário.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <div className="col-span-2 space-y-1">
              <Label className="text-[10px] font-bold uppercase">Nome do Produto *</Label>
              <ComboboxInput
                value={newProduct.produto}
                onChange={v => setNewProduct({ ...newProduct, produto: v })}
                options={uniqueProdutos}
                placeholder="Selecionar ou criar produto..."
                createLabel="Escrever nome novo..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Marca</Label>
              <ComboboxInput
                value={newProduct.marca || ''}
                onChange={v => setNewProduct({ ...newProduct, marca: v })}
                options={uniqueMarcas}
                placeholder="Selecionar ou criar marca..."
                createLabel="Escrever marca nova..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Qtd. Inicial</Label>
              <Input type="number" value={newProduct.quantidade} onChange={e => setNewProduct({...newProduct, quantidade: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Categoria</Label>
              <Select value={newProduct.categoria || ''} onValueChange={v => setNewProduct({ ...newProduct, categoria: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar categoria..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Secção</Label>
              <Select value={newProduct.seccao || ''} onValueChange={v => setNewProduct({ ...newProduct, seccao: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar secção..." /></SelectTrigger>
                <SelectContent>
                  {SECCOES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Mês Val.</Label>
              <Input placeholder="MM" value={newProduct.mesValidade} onChange={e => setNewProduct({...newProduct, mesValidade: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Ano Val.</Label>
              <Input placeholder="AAAA" value={newProduct.anoValidade} onChange={e => setNewProduct({...newProduct, anoValidade: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-[10px] font-bold uppercase">Obs</Label>
              <Textarea value={newProduct.obs} onChange={e => setNewProduct({...newProduct, obs: e.target.value})} className="h-20" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddNew} disabled={isProcessing} className="w-full font-bold uppercase py-6">
              {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : "Gravar no Inventário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. EDIT PRODUCT */}
      <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
        <DialogContent className="sm:max-w-[480px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-orange-500">Corrigir Lote</DialogTitle>
            <DialogDescription className="sr-only">Formulário para corrigir os dados de um lote do inventário.</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="grid grid-cols-2 gap-3 py-4">
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] font-bold uppercase">Produto</Label>
                <ComboboxInput
                  value={editingItem.produto}
                  onChange={v => setEditingItem({ ...editingItem, produto: v })}
                  options={uniqueProdutos}
                  placeholder="Selecionar produto..."
                  createLabel="Escrever nome novo..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Marca</Label>
                <ComboboxInput
                  value={editingItem.marca || ''}
                  onChange={v => setEditingItem({ ...editingItem, marca: v })}
                  options={uniqueMarcas}
                  placeholder="Selecionar marca..."
                  createLabel="Escrever marca nova..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Stock Real</Label>
                <Input type="number" value={editingItem.quantidade} onChange={e => setEditingItem({...editingItem, quantidade: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Categoria</Label>
                <Select value={editingItem.categoria || ''} onValueChange={v => setEditingItem({ ...editingItem, categoria: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar categoria..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Secção</Label>
                <Select value={editingItem.seccao || ''} onValueChange={v => setEditingItem({ ...editingItem, seccao: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar secção..." /></SelectTrigger>
                  <SelectContent>
                    {SECCOES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Mês Val.</Label>
                <Input value={editingItem.mesValidade || ''} onChange={e => setEditingItem({...editingItem, mesValidade: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Ano Val.</Label>
                <Input value={editingItem.anoValidade || ''} onChange={e => setEditingItem({...editingItem, anoValidade: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] font-bold uppercase">Obs</Label>
                <Textarea value={editingItem.obs || ''} onChange={e => setEditingItem({...editingItem, obs: e.target.value})} className="h-20" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={isProcessing} className="w-full bg-orange-500 hover:bg-orange-600 font-bold uppercase py-6 text-white">
              {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. CONSUME QUANTITY */}
      <Dialog open={consumeDialog.isOpen} onOpenChange={v => !v && setConsumeDialog(p => ({...p, isOpen: false}))}>
        <DialogContent className="sm:max-w-[400px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-primary">Retirar do Stock</DialogTitle>
            <DialogDescription className="sr-only">Selecione a quantidade a retirar do stock.</DialogDescription>
          </DialogHeader>
          <div className="py-8 flex flex-col items-center space-y-8">
            <div className="text-center"><p className="font-black text-xl uppercase tracking-tighter">{consumeDialog.item?.produto}</p></div>
            <div className="flex items-center gap-8">
              <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-2" onClick={() => setConsumeDialog(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}><Minus className="h-8 w-8" /></Button>
              <span className="text-7xl font-black tabular-nums">{consumeDialog.quantity}</span>
              <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-2" onClick={() => setConsumeDialog(p => ({ ...p, quantity: p.quantity + 1 }))}><PlusIcon className="h-8 w-8" /></Button>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-16 font-black text-xl uppercase shadow-lg" onClick={() => {
              const original = items.find(i => i.id === consumeDialog.item?.id);
              if (original && consumeDialog.quantity > original.quantidade) return toast.error("Sem stock suficiente!");
              setCart(prev => ({...prev, [consumeDialog.item!.id]: consumeDialog.quantity}));
              setConsumeDialog({isOpen: false, item: null, quantity: 1});
              toast.success("Adicionado ao resumo de saídas.");
            }}>Confirmar Quantidade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. CART SUMMARY */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-primary text-xl flex items-center gap-2">
              <ListOrdered className="h-6 w-6 shrink-0" /> Resumo de Saída
            </DialogTitle>
            <DialogDescription className="sr-only">Lista de itens selecionados para saída do inventário.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {Object.entries(cart).map(([idStr, qty]) => {
              const item = items.find(i => i.id === Number(idStr));
              return (
                <div key={idStr} className="flex items-center justify-between p-4 border rounded-xl bg-muted/30 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs uppercase truncate text-foreground">{item?.produto}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">{item?.marca || 'Genérico'}</p>
                      {item?.categoria && (
                        <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 h-4">{item.categoria}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className="bg-primary text-primary-foreground border-none font-black px-3 py-1">-{qty} UN</Badge>
                    <button onClick={() => { const n = {...cart}; delete n[Number(idStr)]; setCart(n); }} className="text-destructive/60 hover:text-destructive p-1">
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 w-full">
            <Select value={seccaoConsumo} onValueChange={v => { setSeccaoConsumo(v); setAtividadeConsumo(''); }}>
              <SelectTrigger className="h-10 text-xs font-bold border-2 focus:border-primary flex-1 bg-card">
                <SelectValue placeholder="Secção *" />
              </SelectTrigger>
              <SelectContent>
                {SECCOES_CONSUMO.map(s => (
                  <SelectItem key={s} value={s} className="font-semibold text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 shrink-0 bg-card px-3 h-10 rounded-md border-2">
              <Checkbox
                id="addAtividade"
                checked={addAtividade}
                onCheckedChange={v => { setAddAtividade(!!v); if (!v) setAtividadeConsumo(''); }}
              />
              <Label htmlFor="addAtividade" className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer">
                Atividade
              </Label>
            </div>
          </div>

          <Popover open={openAtividadeCombobox} onOpenChange={setOpenAtividadeCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                disabled={!addAtividade}
                className="w-full justify-between font-bold text-xs h-10 px-3 border-2 bg-card mt-3"
              >
                <span className="truncate">
                  {atividadeConsumo || (addAtividade ? "Selecionar atividade..." : "Atividade Desativada")}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Pesquisar..." className="h-9 text-xs" />
                <CommandList>
                  <CommandEmpty className="text-xs py-3">Nenhuma encontrada.</CommandEmpty>
                  <CommandGroup>
                    {filteredAtividades.map(a => (
                      <CommandItem
                        key={a.id ?? a.nome}
                        value={a.nome}
                        onSelect={() => { setAtividadeConsumo(a.nome); setOpenAtividadeCombobox(false); }}
                        className="text-xs"
                      >
                        <Check className={cn("mr-2 h-4 w-4", atividadeConsumo === a.nome ? "opacity-100" : "opacity-0")} />
                        {a.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full text-[10px] text-destructive/40 hover:text-destructive font-black uppercase tracking-[0.2em] transition-all py-1 mt-2"
          >
            Limpar Carrinho
          </button>

          <DialogFooter>
            <Button variant="ghost" className="font-bold text-xs uppercase" onClick={() => setShowSummary(false)}>
              Voltar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 font-black text-xs uppercase shadow-lg shadow-green-600/20"
              onClick={handleFinalizeCart}
              disabled={isFinishingCart || Object.keys(cart).length === 0 || !seccaoConsumo}
            >
              {isFinishingCart ? <Loader2 className="animate-spin h-5 w-5" /> : "Finalizar Saída"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. CLEAR CART CONFIRM */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-[350px]" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>Limpar Lista de Saídas</DialogTitle>
            <DialogDescription>Confirmação para limpar todos os itens selecionados.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center pt-6 text-center">
            <div className="bg-destructive/10 p-4 rounded-full mb-4 text-destructive"><AlertCircle className="h-10 w-10" /></div>
            <h3 className="font-black uppercase text-xl text-foreground leading-tight">Limpar Lista de Saídas?</h3>
            <p className="text-sm text-muted-foreground mt-2 font-medium px-4">Esta ação irá remover todos os itens de todas as categorias do carrinho.</p>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-3 mt-8">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)} className="font-bold h-12">Não, Manter</Button>
            <Button variant="destructive" className="font-black h-12 uppercase" onClick={() => { setCart({}); setShowClearConfirm(false); setShowSummary(false); toast.info("Carrinho esvaziado."); }}>Sim, Limpar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
