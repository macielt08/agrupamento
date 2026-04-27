import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Loader2, LogOut, Download, RefreshCw, Edit, Trash2, Menu, AlertCircle, CircleDollarSign, Users, Settings, CalendarDays, Tent, LineChart, Package, Award } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import Dashboard from '@/components/Dashboard';
import { DashboardView } from '@/components/DashboardView';
import MovementsTable from '@/components/MovementsTable';
import MovementDialog from '@/components/MovementDialog';
import FilterPanel from '@/components/FilterPanel';
import CategoryDialog from '@/components/CategoryDialog';
import SummaryPanel from '@/components/SummaryPanel';
import LoginPage from '@/components/LoginPage';
import UserManagement from '@/components/UserManagement';
import AnoEscutistaView from '@/components/AnoEscutistaView';
import ReportsView from '@/components/ReportsView';
import TransferenciasView from '@/components/TransferenciasView';
import ThemeToggle from '@/components/ThemeToggle';
import ThemeInitializer from '@/components/ThemeInitializer';
import VersionChecker from '@/components/VersionChecker';
import SPPView from '@/components/SPPView';
import EspecialidadesView from '@/components/EspecialidadesView';
import ElementosView from '@/components/ElementosView';
import AtividadesView from '@/components/AtividadesView';
import NoitesCampoView from '@/components/NoitesCampoView';
import { BudgetAnualView } from '@/components/BudgetAnualView';
import { SaldosView } from '@/components/Saldos';
import { InventarioView } from '@/components/InventarioView';
import NMovimentosView from '@/components/NMovimentosView';
import NTransferenciasView from '@/components/NTransferenciasView';
import NRelatorioGruposView from '@/components/NRelatorioGruposView';
import NRelatoriosView from '@/components/NRelatoriosView';
import { Movement, Category, MovementFilters } from '@/types';
import { getMovements, createMovement, updateMovement, getCategories, createCategory, updateCategory, deleteCategory, getUsers, updateUser, 
        createUser, deleteUser, createTransferMovement, processMovementTransfer, getAtividades, getOrcamento, createOrcamento, updateOrcamento, 
        deleteOrcamento, getNMovimentos, getNCategorias, getNSaldos, updateNSaldos, getInventario, createInventario, updateInventario, deleteInventario } from 'zite-endpoints-sdk';
import { parseValor, formatDateForDisplay, getTodayInputDate } from '@/utils/dateUtils';
import { retryWithBackoff } from '@/utils/retryUtils';
import { getPermissions, AppUser } from '@/utils/permissions';

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

type UserType = {
  id: number;
  nome?: string;
  pin?: number;
  email?: string;
  seccao?: string;
  categoria?: string;
  // Legacy fields
  admin?: string;
  subAdmin?: string;
  programer?: string;
  estado?: string;
  // Menu flags
  menuFinancas?: string;
  menuElemento?: string;
  menuSpp?: string;
  menuAtividades?: string;
  menuNoitesCampo?: string;
  menuInventario?: string;
  menuAdmin?: string;
  // New role columns
  ca?: number;
  caa?: number;
  ta?: number;
  tas?: number;
  cu?: number;
  dirigente?: number;
  escuteiro?: number;
};

export default function App() {
  const [user, setUser] = useState<UserType | null>(() => {
    const savedUser = localStorage.getItem('financeflow_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [movements, setMovements] = useState<Movement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState<MovementFilters>({});
  const [searchText, setSearchText] = useState('');
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | undefined>();
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [activeTab, setActiveTab] = useState('financas');
  const [financasSubTab, setFinancasSubTab] = useState('n_relatorios');
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMovements, setSelectedMovements] = useState<Set<number>>(new Set());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orcamentoAnual, setOrcamentoAnual] = useState<any[]>([]);
  const [seccaoVisualizada, setSeccaoVisualizada] = useState<string>('');
  const [nMovimentos, setNMovimentos] = useState<any[]>([]);
  const [nCategorias, setNCategorias] = useState<any[]>([]);
  const [nSaldos, setNSaldos] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);

  // ── Central permissions (single source of truth) ──────────────────────────
  const perms = useMemo(() => getPermissions(user as AppUser | null), [user]);

  // Legacy variable aliases — keep existing code working during FASE 2 migration
  const isProgramer = perms.isProgramer;
  const isAdmin = perms.isCA;           // CA/CAA replaces old "admin"
  const isSubAdmin = perms.isTA;        // TA replaces old "subAdmin"
  const hasAdminPermissions = perms.isCA || perms.isTA;
  const hasFinancasAccess = perms.hasFinancasAccess;
  const hasElementoAccess = perms.hasElementoAccess;
  const hasSppAccess = perms.hasSppAccess;
  const hasAtividadesAccess = perms.hasAtividadesAccess;
  const hasNoitesCampoAccess = perms.hasNoitesCampoAccess;
  const hasInventarioAccess = perms.hasInventarioAccess;
  const hasAnyAccess = perms.hasAnyAccess;

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (m.tipo === 'Eliminado') return false;
      

      
      // Section / record visibility based on central permissions
      if (!perms.canViewAllSections) {
        if (perms.canViewOnlyOwnRecords) {
          // Escuteiro: only records related to their name
          if (m.elemento !== user?.nome && m.utilizador !== user?.nome) return false;
        } else {
          // TAS / Dirigente: own section + transfers targeting own section
          const isOwnSection = m.seccao === user?.seccao;
          const isTransferToOwnSection = m.tipo === 'Transferencia' && m.seccaoTransferencia === user?.seccao;
          if (!isOwnSection && !isTransferToOwnSection) return false;
        }
      }
      if (filters.tipo && m.tipo !== filters.tipo) return false;
      if (filters.seccao && m.seccao !== filters.seccao) return false;
      if (filters.categoria && m.categoria !== filters.categoria) return false;
      if (filters.subCategoria && m.subCategoria !== filters.subCategoria) return false;
      if (filters.tipoPagamento && m.tipoPagamento !== filters.tipoPagamento) return false;
      if (filters.entregueTesouraria !== undefined) {
        const value = filters.entregueTesouraria ? 'Sim' : 'Não';
        if (m.entregueTesouraria !== value) return false;
      }
      if (filters.pendenteSeccao !== undefined) {
        const value = filters.pendenteSeccao ? 'Sim' : 'Não';
        if (m.pendenteSeccao !== value) return false;
      }
      // Search filter
      if (searchText) {
        const search = searchText.toLowerCase();
        const dateString = formatDateForDisplay(m.data);
        const matchesSearch = 
          m.descricao?.toLowerCase().includes(search) ||
          m.categoria?.toLowerCase().includes(search) ||
          m.subCategoria?.toLowerCase().includes(search) ||
          m.seccao?.toLowerCase().includes(search) ||
          m.utilizador?.toLowerCase().includes(search) ||
          m.elemento?.toLowerCase().includes(search) ||
          m.valor?.toString().includes(search) ||
          m.atividade?.toLowerCase().includes(search) ||
          dateString.includes(search);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [movements, filters, searchText, perms, user]);

  const filteredCategories = useMemo(() => {
    let filtered = categories;
    
    // Filter out deleted categories (marked as "DELETED")
    filtered = filtered.filter(cat => 
      cat.categoria !== 'DELETED' && 
      cat.subCategoria !== 'DELETED' && 
      cat.seccao !== 'DELETED'
    );
    
    // Only CA/CAA/Programer/TA/CU see all sections; others see only their own
    if (!perms.canViewAllSections) {
      filtered = filtered.filter(cat => cat.seccao === user?.seccao);
    }
    
    // Only Programer sees categories with blank SubCategoria or Secção
    if (!perms.isProgramer) {
      filtered = filtered.filter(cat => cat.subCategoria && cat.subCategoria.trim() !== '' && cat.seccao && cat.seccao.trim() !== '');
    }
    
    return filtered;
  }, [categories, perms, user]);

  const sections = useMemo(() => {
    return Array.from(new Set(movements.map(m => m.seccao).filter(Boolean))) as string[];
  }, [movements]);

  const parseDateSafely = (dateStr: any) => {
    if (!dateStr) return new Date(0);
    if (dateStr instanceof Date) return dateStr;
    const s = String(dateStr).trim();
    const ptMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ptMatch) {
      const [, d, m, y] = ptMatch.map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(s);
  };

  const loadData = useCallback(async (isBackgroundSync = false) => {
    try {
      if (!isBackgroundSync) setLoading(true);
      // Retry with exponential backoff for service unavailable errors
      // Load in small batches of 2 to avoid ECONNRESET on Google Sheets
      const [movementsData, categoriesData] = await retryWithBackoff(
        async () => await Promise.all([getMovements({}), getCategories({})])
      );
      const [atividadesData, orcamentoData] = await retryWithBackoff(
        async () => await Promise.all([getAtividades({}), getOrcamento({})])
      );
      const [nMovimentosData, nCategoriasData] = await retryWithBackoff(
        async () => await Promise.all([getNMovimentos({}), getNCategorias({})])
      );
      const [nSaldosData, inventarioData] = await retryWithBackoff(
        async () => await Promise.all([getNSaldos({}), getInventario({})])
      );
      const rawMovements = movementsData?.movements || [];
      const normalizedMovements = rawMovements.map(m => ({
        ...m,
        dataObject: parseDateSafely(m.data)
      }))
      
      setMovements(normalizedMovements);
      setCategories(categoriesData?.categories || []);
      setAtividades(atividadesData?.atividades || []);

      const rawNMovimentos = nMovimentosData?.records || [];
      const normalizedNMovimentos = rawNMovimentos.map((m: any) => ({
        ...m,
        dataObject: parseDateSafely(m.data)
      }));
      setNMovimentos(normalizedNMovimentos);
      setNCategorias(nCategoriasData?.records || []);
      setInventario(inventarioData?.records || []);

      const rawSaldos = nSaldosData?.records || [];
      const normalizedSaldos = rawSaldos.map((item: any) => ({
        // Isto garante que independentemente de como vem da sheet, 
        // o componente recebe com "S" e "V" maiúsculos
        Seccao: item.Seccao || item.seccao || "Sem Nome",
        Valor: Number(item.Valor || item.valor || 0)
      }));
      setNSaldos(normalizedSaldos);

      const rawRecords = orcamentoData?.records || [];
      const normalizedOrcamento = rawRecords
        .filter((item: any) => item.ano !== 'DELETED')
        .map((item: any) => ({
          id: item.id,
          ano: String(item.ano || ""), 
          seccao: item.seccao,
          categoria: item.categoria,
          tipo: item.tipo,
          descricao: item.descricao,
          participantes: Number(item.participantes) || 0,
          custoUnitario: Number(item.custoUnitario || item.custo || 0),
          custoTotal: Number(item.total || item.custoTotal || 0)
        }));

      setOrcamentoAnual(normalizedOrcamento);
      
      if (perms.hasAdminAccess) {
        try {
          const usersData = await retryWithBackoff(async () => getUsers({}));
          setUsers(usersData?.users || []);
        } catch (userError) {
          console.error('Error loading users:', userError);
          // Don't fail the entire load if just users fail
          if (!isBackgroundSync) {
            toast.error('Erro ao carregar utilizadores, mas outros dados foram carregados.');
          }
        }
      }
      
      setLastSyncTime(new Date());
      setLoadError(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      console.error('Error loading data:', error);
      
      // Only show errors and set error state for foreground loads
      if (!isBackgroundSync) {
        setLoadError(true);
        
        // Check if it's a network/fetch error
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
        } else if (errorMessage.includes('service is currently unavailable') || errorMessage.includes('unavailable')) {
          toast.error('O serviço Google Sheets está temporariamente indisponível. Por favor, tente novamente mais tarde.');
        } else {
          toast.error('Erro ao carregar dados. Por favor, tente novamente.');
        }
      }
      // For background syncs, fail silently to avoid disrupting the user
    } finally {
      if (!isBackgroundSync) {
        setLoading(false);
      } else {
        setSyncing(false);
      }
    }
  }, [perms.isCA, perms.isProgramer, perms.hasAdminAccess]);

  // Initial data load and set default tab based on permissions
  useEffect(() => {
    if (user) {
      loadData(false);
      
      // Set the visualized section to user's section initially
      setSeccaoVisualizada(user.seccao || '');
      
      // Set the first available tab based on permissions
      if (user.menuFinancas === 'Sim') {
        setActiveTab('financas');
        setFinancasSubTab('n_relatorios');
      } else if (user.menuElemento === 'Sim') {
        setActiveTab('elementos');
      } else if (user.menuAtividades === 'Sim') {
        setActiveTab('atividades');
      } else if (user.menuNoitesCampo === 'Sim') {
        setActiveTab('noitescampo');
      } else if (user.menuSpp === 'Sim') {
        setActiveTab('spp');
      } else if (user.menuInventario === 'Sim') {
        setActiveTab('inventario');
      } else if (user.admin === 'Sim') {
        setActiveTab('admin');
      }
    }
  }, [user, loadData]);

  // Auto-sync every 5 minutes
  useEffect(() => {
    if (!user) return;

    const syncInterval = setInterval(() => {
      // Only sync if no dialogs are open
      if (!movementDialogOpen && !categoryDialogOpen) {
        loadData(true);
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(syncInterval);
  }, [user, loadData, movementDialogOpen, categoryDialogOpen]);

  const loadUsers = async () => {
    try {
      const usersData = await getUsers({});
      setUsers(usersData.users);
    } catch (error) {
      toast.error('Erro ao carregar utilizadores');
      console.error(error);
    }
  };

  const handleUpdateUser = async (id: number, userData: any) => {
    await updateUser({
      id,
      ...userData
    });
  };

  const handleCreateUser = async (userData: any) => {
    await createUser(userData);
  };

  const handleDeleteUser = async (id: number) => {
    await deleteUser({
      id
    });
  };

  const handleLogout = () => {
    setUser(null);
    setMovements([]);
    setCategories([]);
    localStorage.removeItem('financeflow_user');
    toast.success('Logout efetuado com sucesso');
  };

  const handleSaveMovement = async (movement: Partial<Movement>) => {
    try {
      if (editingMovement) {
        await updateMovement({
          id: editingMovement.id,
          tipo: movement.tipo,
          data: movement.data as any,
          valor: typeof movement.valor === 'number' ? movement.valor : parseValor(movement.valor),
          seccao: movement.seccao,
          categoria: movement.categoria,
          subCategoria: movement.subCategoria,
          descricao: movement.descricao,
          tipoPagamento: movement.tipoPagamento,
          entregueTesouraria: movement.entregueTesouraria,
          pendenteSeccao: movement.pendenteSeccao,
          foto: movement.foto,
          movAgrupamento: movement.movAgrupamento,
          elemento: movement.elemento,
          atividade: movement.atividade,
          utilizador: user?.nome,
          bloqueado: movement.bloqueado
        });
        toast.success('Movimento atualizado com sucesso');
      } else {
        await createMovement({
          tipo: movement.tipo!,
          data: movement.data as any,
          valor: typeof movement.valor === 'number' ? movement.valor : parseValor(movement.valor!),
          seccao: movement.seccao!,
          categoria: movement.categoria!,
          subCategoria: movement.subCategoria!,
          descricao: movement.descricao!,
          tipoPagamento: movement.tipoPagamento!,
          entregueTesouraria: movement.entregueTesouraria,
          pendenteSeccao: movement.pendenteSeccao,
          foto: movement.foto,
          movAgrupamento: movement.movAgrupamento,
          elemento: movement.elemento,
          atividade: movement.atividade,
          utilizador: user?.nome,
          bloqueado: movement.bloqueado
        });
        toast.success('Movimento criado com sucesso');
      }
      await loadData(true);
      setEditingMovement(undefined);
      setMovementDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao guardar movimento');
      console.error(error);
    }
  };

  const handleDeleteMovement = async (id: number) => {
    const movement = movements.find(m => m.id === id);
    
    // NO ONE can delete movements delivered to treasury (not even Admin)
    if (movement?.entregueTesouraria === 'Sim') {
      toast.error('Movimentos entregues à tesouraria não podem ser eliminados');
      return;
    }
    
    // Only CA/CAA/Programer can delete blocked movements
    if (movement?.bloqueado === 'Sim' && !hasAdminPermissions) {
      toast.error('Este movimento está bloqueado. Apenas administradores podem eliminá-lo');
      return;
    }
    // Check section-level delete permission
    const isAgr = !!(movement?.movAgrupamento);
    if (!perms.canDeleteRecord(movement?.seccao || '', isAgr)) {
      toast.error('Não tem permissão para eliminar este movimento');
      return;
    }
    if (!confirm('Tem a certeza que deseja eliminar este movimento?')) return;
    try {
      await updateMovement({
        id,
        tipo: 'Eliminado'
      });
      toast.success('Movimento eliminado com sucesso');
      await loadData(true);
    } catch (error) {
      toast.error('Erro ao eliminar movimento');
      console.error(error);
    }
  };

  const handleEditMovement = (movement: Movement) => {
    // If locked AND delivered to treasury, only true Admin (not SubAdmin) can edit
    if (movement.bloqueado === 'Sim' && movement.entregueTesouraria === 'Sim') {
      if (!isAdmin || isSubAdmin) {
        toast.error('Movimentos bloqueados e entregues à tesouraria só podem ser editados por Admin');
        return;
      }
    }
    // Only CA/CAA/Programer can edit blocked movements
    else if (movement.bloqueado === 'Sim' && !hasAdminPermissions) {
      toast.error('Este movimento está bloqueado. Apenas administradores podem editá-lo');
      return;
    }
    // Check section-level edit permission
    const isAgrEdit = !!(movement.movAgrupamento);
    if (!perms.canEditRecord(movement.seccao || '', isAgrEdit)) {
      toast.error('Não tem permissão para editar este movimento');
      return;
    }
    setEditingMovement(movement);
    setMovementDialogOpen(true);
  };

  const handleNewMovement = () => {
    setEditingMovement(undefined);
    setMovementDialogOpen(true);
  };

  const handleSaveCategory = async (categoria: string, subCategoria: string, seccao: string) => {
    try {
      if (editingCategory) {
        await updateCategory({
          id: editingCategory.id,
          categoria,
          subCategoria,
          seccao
        });
        toast.success('Categoria atualizada com sucesso');
      } else {
        await createCategory({
          categoria,
          subCategoria,
          seccao
        });
        toast.success('Categoria criada com sucesso');
      }
      await loadData(false);
      setEditingCategory(undefined);
    } catch (error) {
      toast.error(editingCategory ? 'Erro ao atualizar categoria' : 'Erro ao criar categoria');
      console.error(error);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Tem a certeza que deseja eliminar esta categoria?')) return;
    try {
      await deleteCategory({ id });
      toast.success('Categoria eliminada com sucesso');
      await loadData(false);
    } catch (error) {
      toast.error('Erro ao eliminar categoria');
      console.error(error);
    }
  };

  const handleTransferMovements = async () => {
    try {
      if (selectedMovements.size === 0) {
        toast.error('Nenhum movimento selecionado');
        return;
      }

      // Get the selected movements data
      const selectedMovementsData = movements.filter(m => selectedMovements.has(m.id));
      
      if (selectedMovementsData.length === 0) {
        toast.error('Movimentos selecionados não encontrados');
        return;
      }

      // Get common values
      const firstMovement = selectedMovementsData[0];
      const categoria = firstMovement.categoria || '';
      const subCategoria = firstMovement.subCategoria || '';
      const seccao = firstMovement.seccao || '';

      // Calculate total value
      const totalValue = selectedMovementsData.reduce((sum, m) => sum + parseValor(m.valor), 0);

      // Show loading overlay
      setTransferring(true);

      // Step 1: Create the transfer movement
      const transferResult = await createTransferMovement({
        userName: user?.nome || '',
        categoria: categoria,
        subCategoria: subCategoria,
        seccao: seccao,
        totalValue: totalValue
      });

      const transferId = transferResult.transferMovementId;

      // Step 2: Process each selected movement
      for (const movement of selectedMovementsData) {
        await processMovementTransfer({
          movementId: movement.id,
          transferId: transferId,
          movementData: {
            valor: parseValor(movement.valor),
            seccao: movement.seccao,
            categoria: movement.categoria,
            subCategoria: movement.subCategoria,
            descricao: movement.descricao,
            tipoPagamento: movement.tipoPagamento,
            pendenteSeccao: movement.pendenteSeccao,
            utilizador: movement.utilizador,
            foto: movement.foto,
            movAgrupamento: movement.movAgrupamento,
            seccaoTransferencia: movement.seccaoTransferencia
          }
        });
      }

      toast.success('Transferência realizada com sucesso');
      setMultiSelectMode(false);
      setSelectedMovements(new Set());
      await loadData(true);
    } catch (error) {
      toast.error('Erro ao transferir movimentos');
      console.error(error);
    } finally {
      setTransferring(false);
    }
  };
// Modulo de exportação de movimentos para CSV //
  const handleExportMovements = () => {
    try {
      // Create CSV header
      const headers = ['Data', 'Tipo', 'Descrição', 'Secção', 'Categoria', 'SubCategoria', 'Valor', 'Tipo Pagamento', 'Entregue Tesouraria', 'Pendente Secção', 'Bloqueado', 'Nº Transferencia', 'Elemento', 'Atividade'];
      
      // Create CSV rows
      const rows = filteredMovements.map(m => [
        m.data || '',
        m.tipo || '',
        m.descricao || '',
        m.seccao || '',
        m.categoria || '',
        m.subCategoria || '',
        m.valor || '',
        m.tipoPagamento || '',
        m.entregueTesouraria || '',
        m.pendenteSeccao || '',
        m.bloqueado || '',
        m.transferido || '',
        m.elemento || '',
        m.atividade || ''
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

      // Create blob and download
    //  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `movimentos_${getTodayInputDate()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Movimentos exportados com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar movimentos');
      console.error(error);
    }
  };

  const handleSaveBudgetEntry = async (entry: any) => {
    try {
      setSyncing(true);

      // 1. Normalização dos dados para garantir que enviamos números e strings limpas
      const payload = {
        id: entry.id, // O ID que veio do BudgetAnualView
        ano: String(entry.ano),
        seccao: entry.seccao,
        categoria: entry.categoria,
        tipo: entry.tipo,
        descricao: entry.descricao,
        participantes: Number(entry.participantes),
        custoUnitario: Number(entry.custoUnitario),
        custoTotal: Number(entry.custoTotal)
      };

      // 2. Lógica de decisão: Criar ou Atualizar?
      // Se o ID for muito grande (criado pelo Date.now()) ou não existir, é NOVO.
      // Se for um ID pequeno/sequencial ou UUID vindo da Sheet, é UPDATE.
      const isNew = !entry.id || (typeof entry.id === 'number' && entry.id > 1000000000000);

      if (isNew) {
        // 1. Criar na Sheet
        const response = await createOrcamento(payload);
        
        // 2. IMPORTANTE: Usar o ID real que vem da Sheet para evitar duplicados
        const novoItem = { ...payload, id: response?.record?.id || entry.id };
        
        // 3. ATUALIZAR O ESTADO LOCAL (A magia acontece aqui)
        setOrcamentoAnual((prev) => [...prev, novoItem]);
        
        toast.success('Novo registo adicionado!');
      } else {
        // 1. Atualizar na Sheet
        await updateOrcamento(payload);
        
        // 2. ATUALIZAR O ESTADO LOCAL
        setOrcamentoAnual((prev) => 
          prev.map(item => item.id === entry.id ? payload : item)
        );
        
        toast.success('Orçamento atualizado!');
      }

      // REMOVE ou COMENTA esta linha se ela estiver a causar o refresh:
      // await loadData(false); 

    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao comunicar com a Google Sheet');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteBudgetEntry = async (id: number | string) => {
    // 1. Confirmação de segurança
    if (!confirm('Tem a certeza que deseja eliminar este registo do orçamento?')) return;

    try {
      setSyncing(true);
      
      // 2. Chamada à API
      await deleteOrcamento({ id: Number(id) });
      
      // 3. Feedback e Refresh
      setOrcamentoAnual((prev) => prev.filter(item => item.id !== id));
      toast.success('Registo eliminado com sucesso');
      await loadData(false); // Atualiza os dados na tabela local
    } catch (error) {
      console.error('Erro ao eliminar orçamento:', error);
      toast.error('Erro ao eliminar registo na Sheet');
    } finally {
      setSyncing(false);
    }
  };

  const handleBudgetRefresh = async () => {
    try {
      setSyncing(true);
      await loadData(false);
      toast.success('Dados atualizados!');
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateSaldo = async (seccao: string, novoValor: number) => {
    try {
      setSyncing(true);
      
      // Chamada real ao serviço da Zite
      await updateNSaldos({ seccao, novoValor });
      
      console.log('Update efetuado na Google Sheet para:', seccao);
      toast.success(`${seccao} atualizado com sucesso!`);
      
      // O loadData(false) garante que os valores no ecrã 
      // refrescam sem dar "flash" na página toda
      await loadData(false); 
      
    } catch (error) {
      console.error('Erro ao atualizar saldo:', error);
      toast.error('Erro ao comunicar com a folha NSaldos');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddInventario = async (novoItem: any) => {
    try {
      await createInventario(novoItem);
    } catch (error) {
      console.error("Erro ao gravar na Sheet:", error);
      throw error;
    }
  };

  const handleDeleteInventario = async (id: number) => {
    await deleteInventario({ id });
  };

  const handleUpdateQty = async (id: number, newQty: number) => {
    await updateInventario({ id, quantidade: newQty });
  };

  const handleRefreshInventario = useCallback(async () => {
    try {
      const data = await retryWithBackoff(() => getInventario({}));
      setInventario((data as any)?.records || []);
    } catch (error) {
      console.error("Erro ao atualizar inventário:", error);
    }
  }, []);

  const [showMobileMenu, setShowMobileMenu] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      if (window.scrollY < lastScrollY) { 
        // Se desceu mais de 100px, esconde o botão
        setShowMobileMenu(true);
      } else {
        // Se voltou ao topo, mostra o botão
        setShowMobileMenu(false);
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  useEffect(() => {
    const checkVersionSilently = async () => {
      try {
        // Substitui pelo teu endpoint de versão ou lógica da Zite
        const response = await fetch('/version.json'); 
        const data = await response.json();
        const currentVersion = localStorage.getItem('app_version');

        if (currentVersion && data.version !== currentVersion) {
          localStorage.setItem('app_version', data.version);
          // Faz refresh apenas se o utilizador não estiver a meio de uma edição
          if (!editingMovement && !transferring) {
            window.location.reload();
          }
        }
      } catch (e) {
        console.log('Erro na verificação silenciosa');
      }
    };

    // Verifica a cada 30 minutos
    const interval = setInterval(checkVersionSilently, 1000 * 60 * 30);
    return () => clearInterval(interval);
  }, [editingMovement, transferring]);

  // --- CONTROLO MANUAL DE MANUTENÇÃO ---
  // Muda para false para veres o Login e trabalhares. 
  // Muda para true para bloquear toda a gente (incluindo tu).
  const MANUTENCAO_ATIVA = false; 

  // FORÇAR MANUTENÇÃO (Mesmo para quem já tem login feito)
  if (MANUTENCAO_ATIVA) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <ThemeInitializer />
        <div className="max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <img 
            src="https://images.fillout.com/orgid-488337/flowpublicid-5ipoddzhpg/widgetid-default/1d6HSLZAvpzehbf7BtSEm9/pasted-image-1761781303231.png" 
            alt="Agrupamento 1280" 
            className="h-24 w-24 mx-auto object-contain mb-4 grayscale opacity-50"
          />
          <h1 className="text-3xl font-bold tracking-tight">Plataforma Indisponível</h1>
          <p className="text-muted-foreground italic text-sm">
            "Sempre Alerta para servir, mas de momento estamos em manutenção."
          </p>
          <div className="p-4 bg-muted border rounded-lg">
            <p className="text-sm font-medium">
              O acesso à plataforma de gestão está temporariamente suspenso.
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest pt-4 text-center w-full">CNE - Agrupamento 1280</p>
        </div>
      </div>
    );
  }

  // Só depois disto é que vem a lógica de login normal
  if (!user) {
    return (
      <>
        <ThemeInitializer />
        <Toaster />
        <LoginPage onLoginSuccess={setUser} />
      </>
    );
  }

  if (loading || loadError) {
    return (
      <>
        <ThemeInitializer />
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
          <div className="max-w-md w-full space-y-8 text-center animate-in fade-in zoom-in-95 duration-300">
            
            {!loadError ? (
              // --- ESTADO DE CARREGAMENTO (LOADING) ---
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="space-y-1">
                  <p className="text-lg font-medium">A carregar o Agrupamento 1280</p>
                  <p className="text-sm text-muted-foreground animate-pulse">Sincronizando dados da Zite...</p>
                </div>
              </div>
            ) : (
              // --- ECRÃ DE ERRO DE CONEXÃO / ENDPOINT ---
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-4 bg-destructive/10 rounded-full">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">Falha na Comunicação</h1>
                  <p className="text-muted-foreground">
                    Não foi possível estabelecer ligação com os serviços de backend.
                  </p>
                </div>

                {/* Caixa de Detalhes Técnicos */}
                <div className="bg-muted/50 border rounded-lg p-4 text-left shadow-inner">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 tracking-widest">
                    Detalhes Técnicos:
                  </p>
                  <code className="text-xs text-destructive break-all font-mono">
                    Erro desconhecido nos endpoints
                  </code>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => {
                      setLoadError(false); // Limpa o erro antes de tentar
                      loadData(true);
                    }} 
                    className="w-full shadow-md"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => window.location.reload()}>
                      Forçar Refresh
                    </Button>
                    <Button variant="ghost" onClick={handleLogout}>
                      Sair
                    </Button>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Verifica se as permissões de rede ou se as Zite Functions estão ativas.
                </p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return <div className="min-h-screen bg-background">
      <ThemeInitializer />
      <Toaster />
      {/* <VersionChecker /> */}
      
      {/* Transfer Loading Overlay */}
      {transferring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg bg-card p-8 shadow-lg border">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-semibold">A processar transferência...</p>
            <p className="text-sm text-muted-foreground">Por favor aguarde</p>
          </div>
        </div>
      )}
      <div className="w-full px-4 py-8">
        <div className="mb-8">
          {/* Mobile Menu Button - Fixed Top Left */}
          {hasAnyAccess && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="lg"
                  className={`
                    md:hidden fixed top-3 left-3 z-[60] h-14 w-14 p-0 shadow-lg border-2 border-primary/20 rounded-xl
                    transition-all duration-300 ease-in-out
                    ${showMobileMenu ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none -translate-y-20'}
                  `}
                >
                  <Menu className="h-8 w-8 text-primary" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {hasFinancasAccess && (
                    <Accordion key="financas" type="single" collapsible className="w-full border-none">
                      <AccordionItem value="financas" className="border-none">
                        <AccordionTrigger 
                          className={`py-2 px-4 hover:no-underline rounded-md ${activeTab === 'financas' ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
                          onClick={() => setActiveTab('financas')} // Mantém a aba principal ativa ao clicar
                        >
                          <span className="flex items-center gap-2">Finanças</span>
                        </AccordionTrigger>
                        <AccordionContent className="pl-6 flex flex-col gap-1 mt-1 pb-2">
                          {[
                            { id: 'n_relatorios', label: 'N Relatório' },
                            { id: 'n_movimentos', label: 'N Movimentos' },
                            { id: 'n_transferencias', label: 'N Transferências', adminOrSubAdmin: true },
                            { id: 'dashboard', label: 'Dashboard', hide: true }, 
                            { id: 'movements', label: 'Movimentos', hide: true },
                            { id: 'orcamento', label: 'Orçamentos' },
                            { id: 'categories', label: 'Categorias', hide: true },
                            { id: 'reports', label: 'Resultados' },
                            { id: 'transferencias', label: 'Transferências', hide: true },
                            { id: 'view', label: 'Análise Financeira' },
                            { id: 'n_categorias', label: 'N Categorias', adminOnly: true },
                            { id: 'n_saldos', label: 'N Saldos', adminOnly: true },
                            { id: 'n_relatoriogrupo', label: 'N Relatório Grupo', hide:true }
                          ]
                          .filter(sub => !sub.hide && (!sub.adminOnly || perms.isCA) && (!sub.adminOrSubAdmin || perms.isCA || perms.isTA))
                          .map((sub) => (
                            <Button
                              key={sub.id}
                              variant={financasSubTab === sub.id && activeTab === 'financas' ? 'secondary' : 'ghost'}
                              size="sm"
                              className="justify-start h-9 text-xs"
                              onClick={() => {
                                setActiveTab('financas');
                                setFinancasSubTab(sub.id);
                                setMobileMenuOpen(false); // Fecha o menu ao escolher a sub-aba
                              }}
                            >
                              {sub.label}
                            </Button>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                  {hasElementoAccess && (
                    <Button
                      key="elementos"
                      variant={activeTab === 'elementos' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => {
                        setActiveTab('elementos');
                        setMobileMenuOpen(false);
                      }}
                    >
                      Elementos
                    </Button>
                  )}
                  {hasAtividadesAccess && (
                    <Button
                      key="atividades"
                      variant={activeTab === 'atividades' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => {
                        setActiveTab('atividades');
                        setMobileMenuOpen(false);
                      }}
                    >
                      Atividades
                    </Button>
                  )}
                  {hasNoitesCampoAccess && (
                    <Button
                      key="noitescampo"
                      variant={activeTab === 'noitescampo' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => {
                        setActiveTab('noitescampo');
                        setMobileMenuOpen(false);
                      }}
                    >
                      Noites Campo
                    </Button>
                  )}
                  {hasSppAccess && (
                    <Button
                      key="spp"
                      variant={activeTab === 'spp' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => {
                        setActiveTab('spp');
                        setMobileMenuOpen(false);
                      }}
                    >
                      SPP
                    </Button>
                  )}
                  <Button
                    key="especialidades"
                    variant={activeTab === 'especialidades' ? 'default' : 'ghost'}
                    className="justify-start"
                    onClick={() => {
                      setActiveTab('especialidades');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Especialidades
                  </Button>
                  {hasInventarioAccess && (
                    <Button
                      key="inventario"
                      variant={activeTab === 'inventario' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => {
                        setActiveTab('inventario');
                        setMobileMenuOpen(false);
                      }}
                    >
                      Inventario
                    </Button>
                  )}
                  {perms.hasAdminAccess && (
                    <Button
                      key="admin"
                      variant={activeTab === 'admin' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => {
                        setActiveTab('admin');
                        setMobileMenuOpen(false);
                      }}
                    >
                      Admin
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          )}
          
          {/* Header Content */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 flex-1 md:flex-none md:justify-start justify-center md:ml-0 ml-12">
              <img 
                src="https://images.fillout.com/orgid-488337/flowpublicid-5ipoddzhpg/widgetid-default/1d6HSLZAvpzehbf7BtSEm9/pasted-image-1761781303231.png" 
                alt="Agrupamento 1280" 
                className="h-16 w-16 object-contain"
              />
              <div>
                <h1 className='font-bold mb-2 text-3xl'>Agrupamento 1280</h1>
                <p className='text-muted-foreground text-sm'>
                  Bem-vindo, <span className="font-semibold">{user.nome}</span> - {user.seccao}
                  {perms.isProgramer && <span className="ml-2 text-xs bg-accent text-accent-foreground px-2 py-1 rounded">Programer</span>}
                  {!perms.isProgramer && perms.isCA && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">CA/CAA</span>}
                  {perms.isTA && <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">TA</span>}
                  {perms.isTAS && <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-1 rounded">TAS</span>}
                  {perms.isCU && <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-1 rounded">CU</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
            {syncing && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">A sincronizar...</span>
              </div>
            )}
            {lastSyncTime && !syncing && (
              <div className="text-xs text-muted-foreground hidden sm:block">
                Última sync: {lastSyncTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
            </div>
          </div>
        </div>

        {!hasAnyAccess ? (
          <div className="border rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Sem Permissões</h2>
            <p className="text-muted-foreground">
              Não tem permissões para aceder a nenhum menu. Por favor, contacte o administrador.
            </p>
          </div>
        ) : (
          <div className="flex bg-background">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-row w-full"
            >
              {/* SIDEBAR - Compacta e Expansível */}
              <aside className="hidden md:flex w-16 hover:w-52 border-r bg-muted/10 flex-col min-h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out group z-50 overflow-hidden">
                
                {/* Header com Ícone de Menu */}
                <div className="p-4 border-b h-[57px] flex items-center gap-4">
                  <div className="flex shrink-0 items-center justify-center w-6">
                    <Menu className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h1 className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Menu
                  </h1>
                </div>

                <TabsList className="flex flex-col h-auto bg-transparent space-y-1 p-2 justify-start">
                  {[
                    { access: hasFinancasAccess, value: "financas", icon: <CircleDollarSign className="h-5 w-5" />, label: "Finanças" },
                    { access: hasElementoAccess, value: "elementos", icon: <Users className="h-5 w-5" />, label: "Elementos" },
                    { access: hasAtividadesAccess, value: "atividades", icon: <CalendarDays className="h-5 w-5" />, label: "Atividades" },
                    { access: hasNoitesCampoAccess, value: "noitescampo", icon: <Tent className="h-5 w-5" />, label: "Noites Campo" },
                    { access: hasSppAccess, value: "spp", icon: <LineChart className="h-5 w-5" />, label: "SPP" },
                    { access: true, value: "especialidades", icon: <Award className="h-5 w-5" />, label: "Especialidades" },
                    { access: hasInventarioAccess, value: "inventario", icon: <Package className="h-5 w-5" />, label: "Inventário" },
                    { access: perms.hasAdminAccess, value: "admin", icon: <Settings className="h-5 w-5" />, label: "Admin" },
                  ].map((item) => item.access && (
                    <TabsTrigger 
                      key={item.value}
                      value={item.value} 
                      className="w-full justify-start gap-4 px-2 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200"
                    >
                      <div className="flex shrink-0 items-center justify-center w-6">
                        {item.icon}
                      </div>
                      
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap text-sm font-medium">
                        {item.label}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </aside>

              {/* MAIN CONTENT */}
              <main className="flex-1 min-w-0 p-4">
                {hasFinancasAccess && (
                  <TabsContent value="financas" className="mt-0 space-y-4">
                    <header className="mb-4">
                      <h2 className="text-3xl font-bold">Finanças</h2>
                      <p className="text-muted-foreground">Gestão financeira e relatórios.</p>
                    </header>
                    <Tabs value={financasSubTab} onValueChange={setFinancasSubTab} className="space-y-4">
                      <div className="overflow-x-auto">
                        <TabsList className="inline-flex w-max h-9 p-0.5 bg-muted/50">
                          <TabsTrigger value="n_relatorios" className="text-sm h-8">N Relatório</TabsTrigger>
                          <TabsTrigger value="n_movimentos" className="text-sm h-8">N Movimentos</TabsTrigger>
                          {(perms.isCA || perms.isTA || perms.isTAS) && <TabsTrigger value="n_transferencias" className="text-sm h-8">N Transferências</TabsTrigger>}
                          <TabsTrigger value="orcamento" className="text-sm h-8">Orçamentos</TabsTrigger>
                          <TabsTrigger value="reports" className="text-sm h-8">Resultados</TabsTrigger>
                          <TabsTrigger value="view" className="text-sm h-8">Análise Financeira</TabsTrigger>
                          {perms.isCA && <TabsTrigger value="n_categorias" className="text-sm h-8">N Categorias</TabsTrigger>}
                          {perms.isCA && <TabsTrigger value="n_saldos" className="text-sm h-8">Saldos</TabsTrigger>}
                        </TabsList>
                      </div>

                      <TabsContent value="n_relatorios" className="space-y-4 mt-4">
                        <NRelatoriosView perms={perms} />
                      </TabsContent>

                      <TabsContent value="n_movimentos" className="space-y-4 mt-4">
                        <h2 className="text-2xl font-semibold">Gestão Movimentos</h2>
                        <NMovimentosView perms={perms} />
                      </TabsContent>

                      {(perms.isCA || perms.isTA || perms.isTAS) && (
                        <TabsContent value="n_transferencias" className="space-y-4 mt-4">
                          <h2 className="text-2xl font-semibold">N Transferências</h2>
                          <NTransferenciasView perms={perms} />
                        </TabsContent>
                      )}

                      <TabsContent value="orcamento" className="space-y-4 mt-4">
                        <BudgetAnualView
                          orcamentoAnual={orcamentoAnual}
                          movimentos={movements}
                          userSeccao={seccaoVisualizada}
                          isAdmin={isAdmin}
                          onSeccaoChange={setSeccaoVisualizada}
                          onAddEntry={handleSaveBudgetEntry}
                          onEditEntry={handleSaveBudgetEntry}
                          onDeleteEntry={handleDeleteBudgetEntry}
                          onRefresh={handleBudgetRefresh}
                        />
                      </TabsContent>

                      <TabsContent value="reports" className="space-y-4 mt-4">
                        <ReportsView movimentos={movements} userSection={user?.seccao} isAdmin={isAdmin} />
                      </TabsContent>

                      <TabsContent value="view" className="space-y-4 mt-4">
                        <DashboardView atividades={atividades} userSeccao={user?.seccao} />
                      </TabsContent>

                      {perms.isCA && (
                        <>
                          <TabsContent value="n_categorias" className="space-y-4 mt-4">
                            <h2 className="text-2xl font-semibold">Configuração Categorias</h2>
                            <div className="border rounded-lg p-4">
                              <p className="text-muted-foreground">Total de categorias: {nCategorias.length}</p>
                            </div>
                          </TabsContent>
                          <TabsContent value="n_saldos" className="space-y-4 mt-4">
                            <SaldosView nsaldos={nSaldos} onRefresh={() => loadData(true)} onUpdateValue={handleUpdateSaldo} />
                          </TabsContent>
                        </>
                      )}
                    </Tabs>
                  </TabsContent>
                )}

                {hasElementoAccess && (
                  <TabsContent value="elementos" className="mt-0 space-y-6">
                    <h2 className="text-2xl font-semibold">Gestão de Elementos</h2>
                    <ElementosView perms={perms} />
                  </TabsContent>
                )}

                {hasAtividadesAccess && (
                  <TabsContent value="atividades" className="mt-0 space-y-6">
                    <h2 className="text-2xl font-semibold">Gestão de Atividades</h2>
                    <AtividadesView userSection={user?.seccao} isAdmin={isAdmin} isProgramer={isProgramer} />
                  </TabsContent>
                )}

                {hasNoitesCampoAccess && (
                  <TabsContent value="noitescampo" className="mt-0 space-y-6">
                    <h2 className="text-2xl font-semibold">Noites de Campo</h2>
                    <NoitesCampoView userSection={user?.seccao} userCategoria={user?.categoria} userName={user?.nome} isAdmin={isAdmin} isProgramer={isProgramer} />
                  </TabsContent>
                )}

                {hasSppAccess && (
                  <TabsContent value="spp" className="mt-0 space-y-6">
                    <h2 className="text-2xl font-semibold">Sistema de Progressão Pessoal</h2>
                    <SPPView perms={perms} />
                  </TabsContent>
                )}

                <TabsContent value="especialidades" className="mt-0 space-y-6">
                  <header className="mb-4">
                    <h2 className="text-3xl font-bold">Especialidades</h2>
                    <p className="text-muted-foreground">Galeria de especialidades do escutismo.</p>
                  </header>
                  <EspecialidadesView perms={perms} />
                </TabsContent>

                {hasInventarioAccess && (
                  <TabsContent value="inventario" className="mt-0 space-y-6">
                    <InventarioView userSection={user?.seccao} userName={user?.nome} isAdmin={isAdmin} isProgramer={isProgramer} items={inventario} onRefresh={handleRefreshInventario} onAddProduct={handleAddInventario} onDeleteProduct={handleDeleteInventario} onUpdateQuantity={handleUpdateQty} />
                  </TabsContent>
                )}

                {perms.hasAdminAccess && (
                  <TabsContent value="admin" className="mt-0 space-y-4">
                    <Tabs defaultValue="utilizadores" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="utilizadores">Utilizadores</TabsTrigger>
                        <TabsTrigger value="anos_escutistas">Anos Escutistas</TabsTrigger>
                      </TabsList>
                      <TabsContent value="utilizadores">
                        <UserManagement users={users} perms={perms} onRefresh={loadUsers} onUpdateUser={handleUpdateUser} onCreateUser={handleCreateUser} onDeleteUser={handleDeleteUser} />
                      </TabsContent>
                      <TabsContent value="anos_escutistas">
                        <AnoEscutistaView />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                )}
              </main>
            </Tabs>
          </div>
        )}
      </div>

      <MovementDialog open={movementDialogOpen} onClose={() => {
      setMovementDialogOpen(false);
      setEditingMovement(undefined);
    }} onSave={handleSaveMovement} movement={editingMovement} categories={categories} sections={sections} onCreateCategory={handleSaveCategory} perms={perms} />

      <CategoryDialog open={categoryDialogOpen} onClose={() => {
      setCategoryDialogOpen(false);
      setEditingCategory(undefined);
    }} onSave={handleSaveCategory} category={editingCategory} perms={perms} />
    </div>;
}
