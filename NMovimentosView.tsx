import { useEffect, useState, useMemo, Fragment, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AtividadesTabView from '@/components/AtividadesTabView';
import { Permissions } from '@/utils/permissions';
import { uploadFile } from 'zite-file-upload-sdk';
import { getNMovimentos, getNCategorias, getAtividades, getElementos, createNMovimento, updateNMovimento, deleteNMovimentos, getAnoEscutista, createDeposito, getNDepositos,
  GetNMovimentosOutputType, GetNCategoriasOutputType, GetAtividadesOutputType, GetElementosOutputType, GetAnoEscutistaOutputType, GetNDepositosOutputType } from 'zite-endpoints-sdk';
import { transferNMovimentos } from 'zite-endpoints-sdk';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Plus, Edit2, Loader2, ChevronsUpDown, Check, Trash2, Search, X, Lock, Clock, CreditCard, CheckCircle2, ArrowRightLeft, Banknote, Landmark, Wallet, Paperclip, FileSpreadsheet, Filter, QrCode, RefreshCw, Tag } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDateForDisplay, formatCurrency, parseValor, getTodayInputDate } from '@/utils/dateUtils';
import { retryWithBackoff } from '@/utils/retryUtils';
import { toast } from 'sonner';

// Tipagem baseada na SDK do Zite
type NMovimento = GetNMovimentosOutputType['records'][0];
type NCategoria = GetNCategoriasOutputType['records'][0];
type Atividade = GetAtividadesOutputType['atividades'][0];
type Elemento = GetElementosOutputType['records'][0];
type AnoEscutista = GetAnoEscutistaOutputType['records'][0];
type OrderDirection = 'asc' | 'desc';

const SECCOES = ["Lobitos", "Exploradores", "Pioneiros", "Caminheiros", "Agrupamento"];
const TIPOS = ["Despesa", "Receita", "Depósito"];
const TIPOSPAGAMENTOS = ["Dinheiro", "Transferencia"];
const ESTADOS = ["Caixa", "Bloqueado", "Para Pagamento", "Concluido", "Transferido", "Por Confirmar"];
const TIPODEPOSITOS = ["Depósito no Banco", "Levantamento do Banco"]

const CORES_SECCOES: Record<string, string> = {
  "Lobitos": "bg-yellow-400",
  "Exploradores": "bg-green-600",
  "Pioneiros": "bg-blue-600",
  "Caminheiros": "bg-red-600",
  "Agrupamento": "bg-purple-600",
  "Todos": "bg-black-600"
};

interface NMovimentosViewProps {
  perms: Permissions;
}

// Função utilitária para pesquisa insensível a acentos
const normalizeString = (str: string) => 
  str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

export default function NMovimentosView({ perms }: NMovimentosViewProps) {

  // Derivado do sistema central de permissões
  const isAdmin = perms.isCA;
  const isSubAdmin = perms.isTA;
  const isTAS = perms.isTAS;
  const canViewAll = perms.canViewAllSections;
  const canEdit = (r: NMovimento) => perms.canEditRecord(r.seccao || '', r.agr === 'true' || r.agr === 'TRUE');
  const userSeccao = perms.userSeccao;
  const loggedUser = perms.userName || 'Sistema';
  const propUserCategoria = perms.userCategoria;

  // Estados de Dados
  const [records, setRecords] = useState<NMovimento[]>([]);
  const [depositosRecords, setDepositosRecords] = useState<GetNDepositosOutputType['records']>([]);
  const [todasCategorias, setTodasCategorias] = useState<NCategoria[]>([]);
  const [todasAtividades, setTodasAtividades] = useState<Atividade[]>([]);
  const [todosElementos, setTodosElementos] = useState<Elemento[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tentouGuardar, setTentouGuardar] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [seccaoAtiva, setSeccaoAtiva] = useState<string>("");
  const [buscaTexto, setBuscaTexto] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [isTransferMode, setIsTransferMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isUploading, setUploadingFile] = useState(false);
  const [anosAbertos, setAnosAbertos] = useState<string[]>([]);
  const [isLoadingAnos, setIsLoadingAnos] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: OrderDirection } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [itensPorPagina, setItensPorPagina] = useState(10); // Valor por defeito de movimentos
  const [anoSelecionado, setAnoSelecionado] = useState<string>('');
  const [mainTab, setMainTab] = useState<string>('movimentos');

  // Estados do Formulário/Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedMovimento, setSelectedMovimento] = useState<Partial<NMovimento> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  // Estados de UI (Combos e Checkboxes)
  const [openCombobox, setOpenCombobox] = useState(false);
  const [openElementoCombo, setOpenElementoCombo] = useState(false);
  const [adicionarElemento, setAdicionarElemento] = useState(false);
  const [selecionarVarios, setSelecionarVarios] = useState(false);
  const [mostrarOutrasAtividades, setMostrarOutrasAtividades] = useState(false);

  console.log("DEBUG PERMISSÕES:", { isAdmin, userSeccao, totalRecords: records.length });

  // Função para obter a cor com base na secção
  const getSecçãoColor = (seccao?: string) => {
    return CORES_SECCOES[seccao || ""] || "bg-gray-300";
  };

  const errClass = (val?: string) =>
    tentouGuardar && (!val || val.trim() === "") ? "border-destructive focus-visible:ring-destructive" : "";

  useEffect(() => {
    loadData();
  }, [isAdmin, userSeccao]);
  
  useEffect(() => {
    if (canViewAll) {
      setSeccaoAtiva("Todos");
    } else if (userSeccao) {
      setSeccaoAtiva(userSeccao);
    }
  }, [canViewAll, userSeccao]);

  useEffect(() => {
    // Opcional: Resetar filtros de dropdown ao mudar a Secção (Tabs)
    setFiltroCategoria("Todas");
    setFiltroEstado("Todos");
  }, [seccaoAtiva]);

  useEffect(() => {
    async function carregarAnos() {
      try {
        setIsLoadingAnos(true);
        const response = await retryWithBackoff(() => getAnoEscutista({}));
        
        const records = response?.records || [];
        const filtrados = records
          .filter((a: any) => a.estado === "Aberto")
          .map((a: any) => a.ano);

        setAnosAbertos(filtrados);
      } catch (error) {
        console.error("Erro ao carregar anos escutistas:", error);
      } finally {
        setIsLoadingAnos(false);
      }
    }

    carregarAnos();
  }, []); // O array vazio [] garante que só corre 1 vez ao abrir a página

  // Preenche o ano por defeito quando os anos carregam depois do dialog abrir
  useEffect(() => {
    if (isDialogOpen && selectedMovimento && !selectedMovimento.id && !selectedMovimento.ano && anosAbertos.length > 0) {
      const anoAtual = new Date().getFullYear().toString();
      const anoDefault = anosAbertos.find(a => a.includes(anoAtual)) || anosAbertos[0] || '';
      if (anoDefault) {
        setSelectedMovimento(prev => prev ? { ...prev, ano: anoDefault } : prev);
      }
    }
  }, [anosAbertos, isDialogOpen]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [movData, catData, ativData, elemData, depData] = await retryWithBackoff(() =>
        Promise.all([
          getNMovimentos({}),
          getNCategorias({}),
          getAtividades({}),
          getElementos({}),
          getNDepositos({}),
        ])
      );
      setRecords(movData?.records || []);
      setTodasCategorias(catData?.records || []);
      setTodasAtividades(ativData?.atividades || []);
      setTodosElementos(elemData?.records || []);
      setDepositosRecords(depData?.records || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (anosAbertos.length > 0 && !anoSelecionado) {
      const anoAtual = new Date().getFullYear().toString();
      const anoDefault = anosAbertos.find(a => a.includes(anoAtual)) || anosAbertos[0];
      setAnoSelecionado(anoDefault);
    }
  }, [anosAbertos]);

  const categoriasFiltradas = useMemo(() => {
    if (!selectedMovimento?.tipo) return [];
    return todasCategorias.filter(cat => cat.tipo === selectedMovimento.tipo);
  }, [todasCategorias, selectedMovimento?.tipo]);

  const atividadesFiltradas = useMemo(() => {
    if (!selectedMovimento?.seccao) return [];
    return todasAtividades.filter(ativ =>
    ativ.nome !== 'DELETED' &&
    (ativ.seccao === selectedMovimento.seccao || ativ.seccao === "Agrupamento") &&
    (mostrarOutrasAtividades || !selectedMovimento?.ano || !ativ.ano || selectedMovimento.ano.includes(String(ativ.ano)))
    );
  }, [todasAtividades, selectedMovimento?.seccao, selectedMovimento?.ano, mostrarOutrasAtividades]);

  const elementosFiltrados = useMemo(() => {
    if (!selectedMovimento?.seccao) return [];

    if (selectedMovimento.seccao === "Agrupamento") {
      return todosElementos.filter(elem => elem.nome !== 'DELETED');
    }
    
    return todosElementos.filter(elem => {
      // 1. Elementos que pertencem diretamente à secção (ex: Lobitos)
      const pertenceASeccao = elem.seccao === selectedMovimento.seccao;
      
      // 2. Dirigentes que pertencem àquela secção específica
      // (A coluna 'categoria' na folha Elementos indica se é Dirigente)
      const eDirigenteDaSeccao = 
        elem.seccao === "Dirigentes" && 
        elem.categoria === selectedMovimento.seccao;

      return pertenceASeccao || eDirigenteDaSeccao;
    });
  }, [todosElementos, selectedMovimento?.seccao]);

  // Validação de saldo de caixa para depósito no banco
  const saldoCaixaInfo = useMemo(() => {
    const isDepositoBanco = selectedMovimento?.tipo === 'Depósito' && selectedMovimento?.tipoPagamento === 'Depósito no Banco' && !selectedMovimento?.id;
    if (!isDepositoBanco) return { saldo: 0, insuficiente: false };

    const seccao = (selectedMovimento?.seccao || '').toLowerCase();
    const valor = parseValor(selectedMovimento?.valor);
    if (!seccao || !valor) return { saldo: 0, insuficiente: false };

    const totalReceitas = records
      .filter(r => {
        if (r.tipo !== 'Receita' || r.estadoMovimento !== 'Caixa') return false;
        if ((r.seccao || '').toLowerCase() !== seccao) return false;
        // Excluir movimentos de Agrupamento (como nos Relatórios)
        if (seccao !== 'agrupamento' && (r.agr === 'true' || r.agr === 'TRUE')) return false;
        return true;
      })
      .reduce((acc, r) => acc + (Number(r.valor) || 0), 0);

    const totalEntradas = depositosRecords
      .filter(d => d.tipo === 'Entrada' && (d.seccao || '').toLowerCase() === seccao)
      .reduce((acc, d) => acc + (Number(d.valor) || 0), 0);

    const totalSaidas = depositosRecords
      .filter(d => d.tipo === 'Saida' && (d.seccao || '').toLowerCase() === seccao)
      .reduce((acc, d) => acc + (Number(d.valor) || 0), 0);

    const saldo = totalReceitas - (totalEntradas - totalSaidas);
    return { saldo, insuficiente: valor > saldo };
  }, [selectedMovimento?.tipo, selectedMovimento?.tipoPagamento, selectedMovimento?.id, selectedMovimento?.seccao, selectedMovimento?.valor, records, depositosRecords]);

  // 1. Lógica de Ordenação e Filtragem
  const sortedAndFilteredRecords = useMemo(() => {
    if (!records) return [];
    
    // FILTRAGEM (Mantém a tua lógica atual)
    let resultado = records.filter(r => r.tipo !== "DELETED");

    if (seccaoAtiva !== "Todos") {
      resultado = resultado.filter(r => {
        const seccaoRegisto = (r.seccao || "").trim().toLowerCase();
        const seccaoFiltro = (seccaoAtiva || "").trim().toLowerCase();
        const isAgr = r.agr === 'true' || r.agr === 'TRUE';
        return seccaoRegisto === seccaoFiltro || (seccaoFiltro === 'agrupamento' && isAgr);
      });
    }

    if (anoSelecionado) {
      resultado = resultado.filter(r => r.ano === anoSelecionado);
    }

    // NOVO: Filtro por Categoria (Dropdown)
    if (filtroCategoria !== "Todas") {
      resultado = resultado.filter(r => r.categoria === filtroCategoria);
    }

    // NOVO: Filtro por Estado (Dropdown)
    if (filtroEstado !== "Todos") {
      resultado = resultado.filter(r => r.estadoMovimento === filtroEstado);
    }

    if (buscaTexto.trim() !== "") {
      const termoNorm = normalizeString(buscaTexto);
      resultado = resultado.filter(r => 
        normalizeString(r.descricao || "").includes(termoNorm) ||
        normalizeString(r.elemento || "").includes(termoNorm) ||
        normalizeString(r.categoria || "").includes(termoNorm) ||
        normalizeString(r.atividade || "").includes(termoNorm) ||
        normalizeString(String(r.valor || "")).includes(termoNorm)
      );
    }

    // ORDENAÇÃO DINÂMICA
    return resultado.sort((a, b) => {
      // Se não houver config, ordena por data decrescente (comportamento original)
      const key = sortConfig?.key || 'data';
      const direction = sortConfig?.direction || 'desc';

      let valA = a[key as keyof NMovimento];
      let valB = b[key as keyof NMovimento];

      // Tratamento especial para DATAS
      if (key === 'data') {
        const timeA = valA ? new Date(valA as string).getTime() : 0;
        const timeB = valB ? new Date(valB as string).getTime() : 0;
        return direction === 'asc' ? timeA - timeB : timeB - timeA;
      }

      // Tratamento especial para VALORES (Numérico)
      if (key === 'valor') {
        const numA = parseValor(valA as string | number);
        const numB = parseValor(valB as string | number);
        return direction === 'asc' ? numA - numB : numB - numA;
      }

      // Ordenação de Texto Padrão (Strings)
      const strA = normalizeString(String(valA || ""));
      const strB = normalizeString(String(valB || ""));
      
      if (strA < strB) return direction === 'asc' ? -1 : 1;
      if (strA > strB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, seccaoAtiva, buscaTexto, sortConfig, filtroCategoria, filtroEstado, anoSelecionado]);

  // 2. Paginação baseada nos dados já ordenados
  const recordsPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return sortedAndFilteredRecords.slice(inicio, inicio + itensPorPagina);
  }, [sortedAndFilteredRecords, paginaAtual, itensPorPagina]);

  // 3. Reset da página ao ordenar
  useEffect(() => {
    setPaginaAtual(1);
  }, [sortConfig, seccaoAtiva, buscaTexto, anoSelecionado]);

  const handleOpenDialog = (movimento?: NMovimento) => {
    setTentouGuardar(false);
    if (movimento) {
      // EDITAR
      setSelectedMovimento({ ...movimento, valor: movimento.valor ?? undefined });
      setAdicionarElemento(!!movimento.elemento);
      setSelecionarVarios(movimento.elemento?.includes(',') || false);
      setMostrarOutrasAtividades(false);
    } else {
      // NOVO REGISTO - RESET COMPLETO
      const anoAtual = new Date().getFullYear().toString();
      const anoDefault = anosAbertos.find(a => a.includes(anoAtual)) || '';
      setSelectedMovimento({
        data: new Date().toISOString().split('T')[0],
        tipo: '',
        // Se for "Todos", fica vazio. Se for uma secção, seleciona-a logo.
        seccao: seccaoAtiva === "Todos" ? '' : seccaoAtiva,
        categoria: '',
        atividade: '',
        valor: undefined,
        tipoPagamento: '',
        descricao: '',
        ano: anoDefault,
        elemento: '',
        estadoMovimento: '',
        observacoes: '',
        utilizador: '',
        dataEdicao: '',
        link: '',
        agr: '',
      });
      setAdicionarElemento(false);
      setSelecionarVarios(false);
      setMostrarOutrasAtividades(false);
    }
    setOpenCombobox(false);
    setOpenElementoCombo(false);
    setIsDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      let filename = file.name;
      
      // Lógica de detecção de captura de câmara
      const isCameraCapture = file.name.startsWith('image') || 
                              file.name.includes('tmp') || 
                              file.name.includes('camera') ||
                              !file.name.includes('.');
      
      if (isCameraCapture || e.target.accept === 'image/*') {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:T]/g, '').split('.')[0];
        
        let extension = 'jpg';
        if (file.type) {
          extension = file.type.split('/')[1] || 'jpg';
        } else if (file.name.includes('.')) {
          extension = file.name.split('.').pop() || 'jpg';
        }
        
        filename = `movimento_${timestamp}.${extension}`;
      }
      
      // Chamada à SDK do Zite para upload
      const { fileUrl } = await uploadFile({
        data: file,
        filename: filename
      });

      // ATENÇÃO: Aqui usamos o teu estado selectedMovimento
      setSelectedMovimento(prev => ({
        ...prev,
        link: fileUrl // Certifica-te que a coluna na folha se chama 'foto'
      }));
      
      toast.success('Ficheiro carregado com sucesso');
    } catch (error) {
      toast.error('Erro ao carregar ficheiro');
      console.error(error);
    } finally {
      setUploadingFile(false);
    }
  };

  const removePhoto = () => {
    setSelectedMovimento(prev => ({
      ...prev,
      link: ''
    }));
  };

  const handleSave = async () => {
    setTentouGuardar(true);
    if (selectedMovimento?.id) {
      const isAgr = selectedMovimento.agr === 'true' || selectedMovimento.agr === 'TRUE';
      if (!perms.canEditRecord(selectedMovimento.seccao || '', isAgr)) {
        toast.error("Não tem permissão para editar este movimento");
        return;
      }
    }
    const isDeposito = selectedMovimento?.tipo === 'Depósito';
    // Guarda de segurança: impede gravação mesmo que o botão esteja ativo
    if (saldoCaixaInfo.insuficiente) {
      toast.error(`Saldo em caixa insuficiente (${saldoCaixaInfo.saldo.toFixed(2)}€). Não é possível realizar o depósito.`);
      return;
    }
    if (!selectedMovimento?.tipo || !selectedMovimento?.categoria || !selectedMovimento?.data || !selectedMovimento?.seccao || (!isDeposito && !selectedMovimento?.estadoMovimento) || (!isDeposito && !selectedMovimento?.ano) || (isDeposito && !selectedMovimento?.tipoPagamento)) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setIsSaving(true);
    try {
      const valorNum = parseValor(selectedMovimento.valor);
      const dataAtual = new Date().toISOString().split('T')[0];

      // Lógica especial para Depósito
      if (isDeposito && !selectedMovimento.id) {
        await createDeposito({
          tipoDeposito: selectedMovimento.tipoPagamento || '',
          seccao: selectedMovimento.seccao || '',
          data: selectedMovimento.data || '',
          valor: valorNum,
          categoria: selectedMovimento.categoria || '',
          utilizador: loggedUser,
        });
        toast.success("Depósito registado com sucesso");
        setIsDialogOpen(false);
        await loadData();
        return;
      }

      const basePayload = {
        tipo: selectedMovimento.tipo,
        categoria: selectedMovimento.categoria || '',
        subCategoria: '',
        atividade: selectedMovimento.atividade || '',
        descricao: selectedMovimento.descricao || '',
        seccao: selectedMovimento.seccao || '',
        data: selectedMovimento.data,
        valor: valorNum,
        tipoPagamento: selectedMovimento.tipoPagamento || '',
        estadoMovimento: selectedMovimento.estadoMovimento || '',
        observacoes: selectedMovimento.observacoes || '',
        utilizador: loggedUser,
        ano: selectedMovimento.ano || '',
        dataEdicao: dataAtual,
        link: selectedMovimento.link || '',
        agr: selectedMovimento.agr || '',
      };

      if (selectedMovimento.id) {
        // Edição: atualiza o registo existente
        await updateNMovimento({ id: selectedMovimento.id, ...basePayload, elemento: selectedMovimento.elemento || '' });
        toast.success("Registo atualizado");
      } else if (selecionarVarios && selectedMovimento.elemento) {
        // Criação em massa: um registo por elemento
        const elementos = selectedMovimento.elemento.split(', ').map(e => e.trim()).filter(Boolean);
        if (elementos.length > 1) {
          await Promise.all(
            elementos.map(elem => createNMovimento({ ...basePayload, elemento: elem }))
          );
          toast.success(`${elementos.length} registos criados com sucesso`);
        } else {
          await createNMovimento({ ...basePayload, elemento: elementos[0] || '' });
          toast.success("Novo registo criado");
        }
      } else {
        await createNMovimento({ ...basePayload, elemento: selectedMovimento.elemento || '' });
        toast.success("Novo registo criado");
      }

      setIsDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar o movimento");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkTransfer = async (ids: number[]) => {
    if (ids.length === 0) return;
    setIsTransferring(true);
    try {
      const result = await transferNMovimentos({ ids, utilizador: loggedUser });
      toast.success(
        `${result.transferidos} movimento(s) transferido(s) com sucesso`
      );
      setSelectedIds([]);
      setIsTransferMode(false);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao executar transferência");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleOpenDeleteDialog = (id: number) => {
    setIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!idToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteNMovimentos({ id: idToDelete! });
      toast.success("Movimento eliminado com sucesso");
      setIsDeleteDialogOpen(false);
      await loadData(); // Recarrega a tabela
    } catch (error) {
      console.error(error);
      toast.error("Erro ao eliminar o movimento");
    } finally {
      setIsDeleting(false);
      setIdToDelete(null);
    }
  };

  // OBTER O SIMBOLO DO ESTADO
  const getEstadoIcon: Record<string, { icon: any, color: string, label: string }> = {
    "Caixa": { icon: Banknote, color: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800", label: "Caixa" },
    "Bloqueado": { icon: Lock, color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800", label: "Bloqueado" },
    "Para Pagamento": { icon: CreditCard, color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800", label: "Para Pagamento" },
    "Concluido": { icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800", label: "Concluído" },
    "Transferido": { icon: ArrowRightLeft, color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800", label: "Transferido" },
    "Por Confirmar": { icon: Clock, color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800", label: "Por Confirmar" },
  };
  const renderEstado = (estado?: string) => {
    const config = getEstadoIcon[estado || ""] || { icon: Clock, color: "text-muted-foreground bg-muted/50 border-border", label: estado || "---" };
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={cn("flex items-center gap-1.5 w-fit font-medium px-2 py-0.5", config.color)}>
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </Badge>
    );
  };

  const ICONES_PAGAMENTO: Record<string, any> = {
    "Dinheiro": Banknote,
    "Transferencia": Landmark,
  };

  const handleSort = (key: string) => {
    let direction: OrderDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUpCircle className="ml-1 h-3 w-3 text-primary" /> 
      : <ArrowDownCircle className="ml-1 h-3 w-3 text-primary" />;
  };

  // Modulo de exportação de movimentos para CSV //
  const handleExportMovements = () => {
    try {
      // Create CSV header
      const headers = ['Data', 'Tipo', 'Secção', 'Categoria', 'Descrição', 'Observações', 'Valor', 'Tipo Pagamento', 'Estado Movimento', 'Nº Transferencia', 'Elemento', 'Atividade', 'Estado Movimento', 'Agrupamento'];
      
      // Create CSV rows
      const rows = sortedAndFilteredRecords.map(m => [
        m.data || '',
        m.tipo || '',
        m.seccao || '',
        m.categoria || '',
        m.descricao || '',
        m.observacoes || '',
        m.valor || '',
        m.tipoPagamento || '',
        m.estadoMovimento || '',
        m.subCategoria || '',
        m.elemento || '',
        m.atividade || '',
        m.estadoMovimento || '',
        m.agr || ''
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

  const filtrosAtivosContagem = [
    filtroCategoria !== "Todas",
    filtroEstado !== "Todos"
  ].filter(Boolean).length;

  const parseQRCodeAT = (data) => {
    // Transforma a string "A:val*B:val" num objeto {A: "val", B: "val"}
    const fields = {};
    data.split('*').forEach(item => {
      const [key, ...value] = item.split(':');
      fields[key] = value.join(':');
    });

    return {
      data: fields['F'] ? `${fields['F'].substring(0,4)}-${fields['F'].substring(4,6)}-${fields['F'].substring(6,8)}` : null,
      valor: fields['O'] ? parseFloat(fields['O']) : (fields['O'] ? parseFloat(fields['O']) : 0),
      nifFornecedor: fields['A'],
      documento: fields['G']
    };
  };

  const handleQRSuccess = (decodedText: string) => {
    try {
      const extracted = parseQRCodeAT(decodedText);
      
      setSelectedMovimento(prev => ({
        ...prev,
        data: extracted.data || prev?.data,
        valor: extracted.valor || prev?.valor,
        descricao: `Fatura ${extracted.documento} (NIF: ${extracted.nifFornecedor})`,
        tipo: "Despesa",
        estadoMovimento: "Caixa"
      }));
      
      setScannerOpen(false);
      toast.success("Dados da fatura importados!");
    } catch (err) {
      toast.error("Erro ao processar QR Code");
      console.error(err);
    }
  };

  return (
    <div className="p-1 sm:p-4 space-y-2 sm:space-y-4 w-full overflow-x-hidden">

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <div className="flex justify-end mb-4">
          <div className="inline-flex p-1 bg-muted rounded-lg shadow-sm border border-border">
            <button
              onClick={() => setMainTab('movimentos')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide ${
                mainTab === 'movimentos'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Banknote className="h-3.5 w-3.5" />
              Movimentos
            </button>
            <button
              onClick={() => setMainTab('atividades')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide ${
                mainTab === 'atividades'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              Atividades
            </button>
          </div>
        </div>

        <TabsContent value="atividades" className="mt-0">
          <AtividadesTabView
            records={records}
            anosAbertos={anosAbertos}
            canViewAll={canViewAll}
            userSeccao={userSeccao}
            perms={perms}
          />
        </TabsContent>

        <TabsContent value="movimentos" className="mt-0">
      {/* 2. Removi bordas laterais no mobile (border-x-0) para ganhar largura real */}
      <Card className="border-x-0 sm:border-2 shadow-none border-t-2 border-b-2 sm:rounded-xl">
        
        {/* 3. Padding do Header reduzido de 6 para 3 no mobile */}
        <CardHeader className="space-y-3 p-3 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            <CardTitle className="text-lg sm:text-xl font-bold">
              Movimentos Financeiros
            </CardTitle>

            <div className="flex flex-col gap-2 w-full sm:flex-1 sm:flex-row sm:justify-end">
              
              {/* Container de Pesquisa e Filtro mais compacto */}
              <div className="flex items-center gap-1.5 flex-1">
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 sm:h-9 px-2 relative" // h-8 é ideal para mobile
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline ml-1 text-xs">Filtros</span>
                  {filtrosAtivosContagem > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] text-white">
                      {filtrosAtivosContagem}
                    </span>
                  )}
                </Button>

                <div className="relative flex-1 sm:max-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Pesquisar..." 
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                    className="pl-8 h-8 sm:h-9 text-sm"
                  />
                </div>
              </div>

              {/* Botões de Ação: Grid de 3 colunas para não empilhar verticalmente */}
              <div className="grid grid-cols-4 sm:flex gap-1.5 pt-2 sm:pt-0 border-t sm:border-0">
                {/* Dropdown Ano Escutista */}
                {anosAbertos.length > 0 && (
                  <select
                    className="col-span-2 sm:col-span-1 h-8 sm:h-9 px-2 border rounded-lg text-sm font-bold bg-slate-50 dark:bg-slate-800 border-border"
                    value={anoSelecionado}
                    onChange={(e) => setAnoSelecionado(e.target.value)}
                  >
                    {anosAbertos.map(ano => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))}
                  </select>
                )}
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 px-1 sm:px-3 text-xs" 
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">
                    {isRefreshing ? 'A atualizar...' : 'Atualizar'}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 px-1 sm:px-3 text-xs"
                  onClick={handleExportMovements}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 sm:mr-1" />
                  <span>Exportar</span>
                </Button>

                {(isAdmin || isSubAdmin || isTAS) && (
                  <Button
                    variant={isTransferMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsTransferMode(!isTransferMode);
                      setSelectedIds([]); 
                    }}
                    className={cn(
                      "h-8 sm:h-9 px-1 sm:px-3 text-xs",
                      isTransferMode ? "bg-blue-600" : "text-blue-600 border-blue-100"
                    )}
                  >
                    {isTransferMode ? <X className="h-3.5 w-3.5" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
                    <span className="ml-1">{isTransferMode ? "Sair" : "Transf."}</span>
                  </Button>
                )}

                <Button 
                  size="sm"
                  onClick={() => handleOpenDialog()} 
                  className="h-8 sm:h-9 px-1 sm:px-3 text-xs bg-blue-600"
                >
                  <Plus className="h-3.5 w-3.5 sm:mr-1" /> 
                  <span>Novo</span>
                </Button>
              </div>
              
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          {/* ÁREA DE FILTROS EXPANSÍVEL */}
          {showFilters && (
            <div className="mx-6 mb-6 p-4 border rounded-lg bg-muted/20 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Filtro por Categoria */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Filtrar por Categoria</Label>
                  <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas">Todas as Categorias</SelectItem>
                      {/* Filtramos duplicados e valores nulos antes de renderizar */}
                      {Array.from(new Set(todasCategorias.map(cat => cat.categoria)))
                        .filter((c): c is string => !!c) // Remove valores nulos ou vazios
                        .sort() // Opcional: coloca por ordem alfabética
                        .map((categoriaNome) => (
                          <SelectItem key={categoriaNome} value={categoriaNome}>
                            {categoriaNome}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Estado */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Filtrar por Estado</Label>
                  <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos os estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos os Estados</SelectItem>
                      <SelectItem value="Caixa">Pendente</SelectItem>
                      <SelectItem value="Concluido">Concluido</SelectItem>
                      <SelectItem value="Transferido">Transferido</SelectItem>
                      <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                      <SelectItem value="Para Pagamento">Para Pagamento</SelectItem>
                      <SelectItem value="Por Confirmar">Por Confirmar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
              
              {/* Botão para limpar filtros rápida */}
              {(filtroCategoria !== "Todas" || filtroEstado !== "Todos") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setFiltroCategoria("Todas"); setFiltroEstado("Todos"); }}
                  className="mt-3 h-7 text-[11px] text-muted-foreground hover:text-primary"
                >
                  <X className="mr-1 h-3 w-3" /> Limpar Filtros
                </Button>
              )}
            </div>
          )}
          <CardContent>
            {/* SEPARADORES DE SECÇÃO */}
            <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
              {["Todos", ...SECCOES].map((s) => {
                const isLocked = !canViewAll && s !== userSeccao;
                return (
                  <Button
                    key={s}
                    variant={seccaoAtiva === s ? "default" : "ghost"}
                    size="sm"
                    onClick={() => { if (!isLocked) setSeccaoAtiva(s); }}
                    disabled={isLocked}
                    className={cn(
                      "relative h-8 rounded-full px-4 text-[13px] font-medium transition-all",
                      seccaoAtiva === s
                        ? "shadow-sm"
                        : "text-muted-foreground hover:bg-muted",
                      isLocked && "opacity-40 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    {s !== "Todos" && (
                      <span className={cn(
                        "mr-2 h-2 w-2 rounded-full md:mr-2",
                        getSecçãoColor(s),
                        seccaoAtiva !== s && "opacity-40"
                      )} />
                    )}
                    <span className={cn(s === "Todos" ? "inline" : "hidden md:inline")}>
                      {s}
                    </span>
                    <span className="ml-2 opacity-50 text-[10px]">
                      ({s === "Todos" ? records.length : records.filter(r => r.seccao === s).length})
                    </span>
                    {isLocked && <Lock className="ml-1.5 h-3 w-3 opacity-60" />}
                  </Button>
                );
              })}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground uppercase text-[11px] font-bold">
                    <th className="w-10 py-3 px-1 text-center">
                      {isTransferMode && (
                        <Checkbox 
                          checked={selectedIds.length === recordsPaginados.filter(r => r.estadoMovimento !== "Bloqueado" && r.estadoMovimento !== "Transferido").length && selectedIds.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const validIds = recordsPaginados
                                .filter(r => r.estadoMovimento !== "Bloqueado" && r.estadoMovimento !== "Transferido")
                                .map(r => r.id);
                              setSelectedIds(validIds);
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                        />
                      )}
                    </th>
                    
                    {/* Cabeçalhos com Ordenação */}
                    <th 
                      className="text-left py-3 px-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('data')}
                    >
                      <div className="flex items-center">Data {renderSortIcon('data')}</div>
                    </th>
                    <th 
                      className="text-left py-3 px-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('seccao')}
                    >
                      <div className="flex items-center">Secção {renderSortIcon('seccao')}</div>
                    </th>
                    <th 
                      className="text-left py-3 px-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('elemento')}
                    >
                      <div className="flex items-center">Elemento {renderSortIcon('elemento')}</div>
                    </th>
                    <th 
                      className="text-left py-3 px-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('categoria')}
                    >
                      <div className="flex items-center">Categoria {renderSortIcon('categoria')}</div>
                    </th>
                    <th className="text-left py-3 px-3">Descrição</th>
                    <th 
                      className="text-left py-3 px-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('atividade')}
                    >
                      <div className="flex items-center">Atividade {renderSortIcon('atividade')}</div>
                    </th>
                    <th 
                      className="text-left py-3 px-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('estadoMovimento')}
                    >
                      <div className="flex items-center">Estado {renderSortIcon('estadoMovimento')}</div>
                    </th>
                    <th 
                      className="text-right py-3 px-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('valor')}
                    >
                      <div className="flex items-center justify-end">Valor {renderSortIcon('valor')}</div>
                    </th>
                    <th className="w-12 py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10">
                        <Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground"/>
                      </td>
                    </tr>
                  ) : recordsPaginados.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-muted-foreground italic">
                        Nenhum movimento encontrado para {seccaoAtiva === "Todos" ? "o Agrupamento" : seccaoAtiva}.
                      </td>
                    </tr>
                  ) : recordsPaginados.map((r) => (
                    <Fragment key={r.id}>
                        {/* Linha Principal */}
                        <tr className="border-b-0 hover:bg-muted/30 transition-colors group">
                          <td className="py-3 px-2 text-center">
                            {isTransferMode ? (
                              (r.estadoMovimento !== "Bloqueado" && r.estadoMovimento !== "Transferido") ? (
                                <Checkbox
                                  checked={selectedIds.includes(r.id)}
                                  onCheckedChange={() => toggleSelection(r.id)}
                                />
                              ) : (
                                <Lock className="h-3 w-3 mx-auto opacity-20" />
                              )
                            ) : (
                              <>
                                {r.tipo === 'Receita' && <ArrowUpCircle className="h-4 w-4 text-green-600 mx-auto" />}
                                {r.tipo === 'Despesa' && <ArrowDownCircle className="h-4 w-4 text-red-600 mx-auto" />}
                                {r.tipo === 'Transferencia' && <ArrowLeftRight className="h-4 w-4 text-blue-600 mx-auto" />}
                              </>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">{formatDateForDisplay(r.data)}</td>
                          <td className="py-3 px-3">
                            <span className={cn("h-3.5 w-3.5 rounded-full inline-block shrink-0 shadow-sm", getSecçãoColor(r.seccao))} />
                          </td>
                          <td className="py-3 px-3 truncate max-w-[150px]">{r.elemento || '—'}</td>
                          <td className="py-3 px-3 truncate max-w-[150px]">{r.categoria || '—'}</td>
                          <td className="py-3 px-3 font-medium">{r.descricao || '—'}</td>
                          <td className="py-3 px-3 truncate max-w-[150px]">{r.atividade || '—'}</td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {renderEstado(r.estadoMovimento)}
                              {r.link && (
                                <a href={r.link} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                  <Paperclip className="h-3.5 w-3.5 text-blue-500/70" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            <div className="flex items-center justify-end gap-2">
                              <span className={cn(
                                r.tipo === 'Receita' ? 'text-green-600' : r.tipo === 'Despesa' ? 'text-red-600' : 'text-blue-600'
                              )}>
                                {r.valor != null ? `${formatCurrency(parseValor(r.valor))} €` : '—'}
                              </span>
                              {r.tipoPagamento && (
                                <div title={r.tipoPagamento}>
                                  {(() => {
                                    const Icon = ICONES_PAGAMENTO[r.tipoPagamento] || Wallet;
                                    return <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />;
                                  })()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleOpenDialog(r)} 
                                className="h-8 w-8"
                                disabled={!canEdit(r) || (r.estadoMovimento === "Bloqueado" && !isAdmin) || (r.estadoMovimento === "Transferido" && (!isAdmin || !!r.subCategoria))}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleOpenDeleteDialog(r.id)} 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                disabled={!canEdit(r) || (r.estadoMovimento === "Bloqueado" && !isAdmin) || (r.estadoMovimento === "Transferido" && (!isAdmin || !!r.subCategoria))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {/* Linha de Info Secundária */}
                        <tr className="border-b hover:bg-muted/30 transition-colors">
                          <td colSpan={10} className="py-1 px-3">
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 italic pb-2">
                              <span className="flex items-center gap-1">
                                Registado por: <span className="font-semibold">{r.utilizador || 'Sistema'}</span>
                              </span>
                              <span>•</span>
                              <span>em: {r.dataEdicao ? formatDateForDisplay(r.dataEdicao) : '---'}</span>
                            </div>
                          </td>
                        </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="md:hidden flex flex-col gap-3 mt-4 px-3"> {/* gap-3 cria espaço entre cards, px-3 cria o respiro lateral */}
              {loading ? (
                <div className="py-10 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground"/></div>
              ) : recordsPaginados.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground italic text-sm">Nenhum movimento encontrado.</p>
              ) : recordsPaginados.map((r) => {
                const canSelect = r.estadoMovimento !== "Bloqueado" && r.estadoMovimento !== "Transferido";
                const isSel = selectedIds.includes(r.id);

                return (
                  <div 
                    key={r.id} 
                    className={cn(
                      "p-4 space-y-3 rounded-xl border shadow-sm transition-all active:scale-[0.98]", // Adicionado arredondamento, borda e efeito de clique
                      isSel 
                        ? "bg-blue-50/80 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800" 
                        : "bg-card border-border"
                    )}
                    onClick={() => {
                      if (isTransferMode && canSelect) {
                        toggleSelection(r.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isTransferMode ? (
                          canSelect ? (
                            <Checkbox 
                              checked={isSel} 
                              className="h-5 w-5 mr-1" 
                              onCheckedChange={() => toggleSelection(r.id)}
                              onClick={(e) => e.stopPropagation()} 
                            />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground/30 mr-1" />
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            {r.tipo === 'Receita' && <ArrowUpCircle className="h-5 w-5 text-green-600 shrink-0" />}
                            {r.tipo === 'Despesa' && <ArrowDownCircle className="h-5 w-5 text-red-600 shrink-0" />}
                            {r.tipo === 'Transferencia' && <ArrowLeftRight className="h-5 w-5 text-blue-600 shrink-0" />}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{formatDateForDisplay(r.data)}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={cn("h-2 w-2 rounded-full", getSecçãoColor(r.seccao))} />
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{r.seccao}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={cn(
                          "text-lg font-bold font-mono leading-none",
                          r.tipo === 'Receita' ? 'text-green-600' : r.tipo === 'Despesa' ? 'text-red-600' : 'text-blue-600'
                        )}>
                          {r.valor != null ? `${formatCurrency(parseValor(r.valor))}€` : '—'}
                        </span>
                        {renderEstado(r.estadoMovimento)} {/* Reutilizando a tua função de badges para o mobile ficar igual ao desktop */}
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-dashed">
                      {/* Lógica Condicional: Atividade vs Categoria */}
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold leading-snug">
                          {r.atividade ? (
                            <span className="text-primary">{r.atividade}</span>
                          ) : (
                            <span className="text-muted-foreground/80">{r.categoria}</span>
                          )}
                        </p>
                        <p className="text-sm font-medium text-muted-foreground leading-snug">
                          {r.descricao || <span className="italic opacity-50">Sem descrição</span>}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          {r.elemento && <p className="text-xs text-muted-foreground font-medium">👤 {r.elemento}</p>}
                          {r.link && (
                            <a 
                              href={r.link} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-[11px] text-blue-500 font-medium mt-1"
                            >
                              <Paperclip className="h-3 w-3" /> Ver Anexo
                            </a>
                          )}
                        </div>

                        {!isTransferMode && (
                          <div className="flex gap-2">
                            <Button 
                              variant="secondary" size="sm" 
                              onClick={(e) => { e.stopPropagation(); handleOpenDialog(r); }} 
                              className="h-9 w-9 p-0 rounded-full shadow-sm border border-border/50"
                              disabled={!canEdit(r) || (r.estadoMovimento === "Bloqueado" && !isAdmin) || (r.estadoMovimento === "Transferido" && (!isAdmin || !!r.subCategoria))}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="secondary" size="sm" 
                              onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(r.id); }} 
                              className="h-9 w-9 p-0 rounded-full text-destructive shadow-sm border border-border/50"
                              disabled={!canEdit(r) || (r.estadoMovimento === "Bloqueado" && !isAdmin) || (r.estadoMovimento === "Transferido" && (!isAdmin || !!r.subCategoria))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BARRA FLUTUANTE PARA TRANSFERÊNCIA EM MASSA */}
            {isTransferMode && selectedIds.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-6 z-[60] animate-in slide-in-from-bottom-4">
                <span className="text-sm font-bold tracking-tight">{selectedIds.length} selecionados</span>
                <Button size="sm" variant="secondary" className="font-bold text-blue-700 bg-white dark:bg-slate-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30" onClick={() => handleExecuteBulkTransfer(selectedIds)} disabled={isTransferring}>
                  {isTransferring ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Executar Transferência
                </Button>
              </div>
            )}

            {/* PAGINAÇÃO */}
            <div className="flex items-center justify-between py-4 border-t px-2 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Mostrar</span>
                <Select value={String(itensPorPagina)} onValueChange={(v) => setItensPorPagina(Number(v))}>
                  <SelectTrigger className="h-8 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                  Página {paginaAtual} de {Math.ceil(sortedAndFilteredRecords.length / itensPorPagina) || 1}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1}>Anterior</Button>
                  <Button variant="outline" size="sm" onClick={() => setPaginaAtual(p => p + 1)} disabled={paginaAtual >= Math.ceil(sortedAndFilteredRecords.length / itensPorPagina)}>Próximo</Button>
                </div>
              </div>
            </div>
        </CardContent>
        </CardContent>
      </Card>

        </TabsContent>
      </Tabs>

      {/* RENDERIZAÇÃO DO SCANNER */}
      {scannerOpen && (
        <QRScannerContainer 
          onScanSuccess={handleQRSuccess} 
          onClose={() => setScannerOpen(false)} 
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center justify-between border-b pb-2 pr-8">
              <DialogTitle className="text-lg border-b pb-2">
                {selectedMovimento?.id ? 'Editar Registo' : 'Novo Movimento Financeiro'}
              </DialogTitle>
              {/* Botão de Atalho QR Code - Lado Direito Superior */}
              {!selectedMovimento?.id && selectedMovimento?.tipo !== 'Depósito' && (
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-2 border-primary text-primary hover:bg-primary/5 transition-all animate-in fade-in slide-in-from-right-4"
                  onClick={() => setScannerOpen(true)}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Ler Fatura</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto px-1">
            {/* Tipo */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground">Tipo</Label>
              <Select value={selectedMovimento?.tipo} onValueChange={(v) => setSelectedMovimento({...selectedMovimento, tipo: v, categoria: '', atividade: ''})}>
                <SelectTrigger className={cn("col-span-3", errClass(selectedMovimento?.tipo))}><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>{TIPOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Deposito */}
            {selectedMovimento?.tipo === 'Depósito' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground">Tipo Depósito</Label>
              <Select value={selectedMovimento?.tipoPagamento} onValueChange={(v) => setSelectedMovimento({...selectedMovimento, tipoPagamento: v})}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione o tipo de depósito" /></SelectTrigger>
                <SelectContent>{TIPODEPOSITOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            )}

            {/* Data e Ano Escutista */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground">
                Data
              </Label>
              <div className="col-span-3 flex gap-2">
                {/* Campo Data */}
                <Input 
                  type="date" 
                  className={cn("flex-1", errClass(selectedMovimento?.data))} 
                  value={selectedMovimento?.data?.split('T')[0] || ''} 
                  onChange={(e) => setSelectedMovimento({...selectedMovimento, data: e.target.value})} 
                />
                {/* Dropdown Ano Escutista */}
                {selectedMovimento?.tipo !== 'Depósito' && (
                <Select
                  value={selectedMovimento?.ano}
                  onValueChange={(v) => setSelectedMovimento({...selectedMovimento, ano: v})}
                  disabled={isLoadingAnos}
                >
                  <SelectTrigger className={cn("w-[180px] font-mono text-[11px]", errClass(selectedMovimento?.ano))}>
                    <SelectValue placeholder={isLoadingAnos ? "A carregar..." : "Ano Escutista"} />
                  </SelectTrigger>
                  <SelectContent>
                    {anosAbertos.length > 0 ? (
                      anosAbertos.map((ano) => (
                        <SelectItem key={ano} value={ano} className="text-[11px]">
                          {ano}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="vazio" disabled className="text-[10px]">
                        Nenhum ano "Aberto" na Sheet
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                )}
              </div>
            </div>

            {/* Secção */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground">Secção</Label>
              <Select value={selectedMovimento?.seccao} onValueChange={(v) => setSelectedMovimento({...selectedMovimento, seccao: v, atividade: ''})}>
                <SelectTrigger className={cn("col-span-3", errClass(selectedMovimento?.seccao))}><SelectValue placeholder="Escolha a secção" /></SelectTrigger>
                <SelectContent>{SECCOES.filter((s) => { if (seccaoAtiva === "Todos") return true; return s === seccaoAtiva || s === "Agrupamento";}).map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground">Categoria</Label>
              <Select value={selectedMovimento?.categoria} onValueChange={(v) => setSelectedMovimento({...selectedMovimento, categoria: v, atividade: ''})}>
                <SelectTrigger className={cn("col-span-3", errClass(selectedMovimento?.categoria))}><SelectValue placeholder="Escolha a categoria" /></SelectTrigger>
                <SelectContent>
                  {categoriasFiltradas.map((cat) => <SelectItem key={cat.id} value={cat.categoria!}>{cat.categoria}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Atividade (Combobox) */}
            {selectedMovimento?.categoria === "Atividades" && (
              <div className="grid grid-cols-4 items-center gap-4 animate-in fade-in zoom-in-95">
                <Label className="text-right text-[10px] font-bold uppercase text-primary">Atividade</Label>
                <div className="col-span-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id="outras-atividades"
                      checked={mostrarOutrasAtividades}
                      onCheckedChange={(c) => setMostrarOutrasAtividades(!!c)}
                    />
                    <Label htmlFor="outras-atividades" className="text-[10px] font-medium cursor-pointer">
                      Mostrar atividades de outros anos
                    </Label>
                  </div>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal" type="button">
                        {selectedMovimento.atividade || "Pesquisar atividade..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command filter={(value, search) => normalizeString(value).includes(normalizeString(search)) ? 1 : 0}>
                        <CommandInput placeholder="Nome ou local..." />
                        <CommandList className="max-h-[200px] overflow-y-auto overflow-x-hidden">
                          <CommandEmpty>Não encontrado.</CommandEmpty>
                          <CommandGroup>
                            {atividadesFiltradas.map((ativ) => (
                              <CommandItem 
                                key={ativ.id} 
                                value={`${ativ.nome} ${ativ.local}`} 
                                onSelect={() => { 
                                  setSelectedMovimento({ ...selectedMovimento, atividade: ativ.nome }); 
                                  setOpenCombobox(false); 
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedMovimento.atividade === ativ.nome ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span>{ativ.nome}</span>
                                  <span className="text-[10px] text-muted-foreground">{ativ.local}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Descrição */}
            {selectedMovimento?.tipo !== 'Depósito' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground">Descrição</Label>
              <Input className="col-span-3" value={selectedMovimento?.descricao || ''} onChange={(e) => setSelectedMovimento({...selectedMovimento, descricao: e.target.value})} />
            </div>
            )}

            {/* Valor e Toggle Agrupamento */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground">
                Valor (€)
              </Label>
              <div className="col-span-3 flex items-center gap-4">
                {/* Campo Valor */}
                <Input 
                  type="number" 
                  step="0.01" 
                  className="flex-1 font-mono font-bold" 
                  value={selectedMovimento?.valor ?? ''} 
                  onChange={(e) => setSelectedMovimento({
                    ...selectedMovimento, 
                    valor: e.target.value === '' ? undefined : parseFloat(e.target.value)
                  })} 
                />

                {/* Toggle Movimento Agrupamento */}
                {selectedMovimento?.tipo !== 'Depósito' && (
                <div className="flex items-center space-x-2 bg-muted/30 px-3 py-2 rounded-lg border border-transparent hover:border-border transition-colors">
                  <Switch
                    id="mov-agrup"
                    checked={selectedMovimento?.agr === 'true'}
                    onCheckedChange={(checked) => setSelectedMovimento({
                      ...selectedMovimento, 
                      agr: checked ? 'true' : 'false'
                    })}
                  />
                  <Label htmlFor="mov-agrup" className="text-[10px] font-bold uppercase cursor-pointer leading-none">
                    Agrupamento
                  </Label>
                </div>
                )}
              </div>
            </div>

            {/* Aviso saldo caixa insuficiente */}
            {saldoCaixaInfo.insuficiente && (
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-start-2 col-span-3">
                  <p className="text-xs text-destructive font-medium bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    ⚠️ Valor superior ao saldo em caixa ({saldoCaixaInfo.saldo.toFixed(2)}€). Não é possível realizar o depósito.
                  </p>
                </div>
              </div>
            )}

            {/* Tipo Pagamento */}
            {selectedMovimento?.tipo !== 'Depósito' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground">Pagamento</Label>
              <Select value={selectedMovimento?.tipoPagamento} onValueChange={(v) => setSelectedMovimento({...selectedMovimento, tipoPagamento: v})}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Escolha..." /></SelectTrigger>
                <SelectContent>{TIPOSPAGAMENTOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            )}

            {/* CHECKBOXES DE ELEMENTOS */}
            {selectedMovimento?.tipo !== 'Depósito' && (
            <div className="grid grid-cols-4 items-center gap-4 pt-2 border-t">
              <div className="col-start-2 col-span-3 flex items-center space-x-6">
                {/* Checkbox Adicionar Elemento sempre visivel */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="add-elem" 
                    checked={adicionarElemento} 
                    onCheckedChange={(c) => { 
                      setAdicionarElemento(!!c); 
                      if(!c) { setSelectedMovimento({...selectedMovimento, elemento: ''}); setSelecionarVarios(false); }
                    }} 
                  />
                  <Label htmlFor="add-elem" className="text-[11px] font-medium">Adicionar Elemento?</Label>
                </div>

                {/* Checkbox Varios só visivel para novos lançamentos */}
                {adicionarElemento && !selectedMovimento?.id && (
                  <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2">
                    <Checkbox id="multi" checked={selecionarVarios} onCheckedChange={(c) => setSelecionarVarios(!!c)} />
                    <Label htmlFor="multi" className="text-[11px] font-medium">Vários (Cria um registo por elemento)</Label>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* COMBOBOX DE ELEMENTO */}
            {adicionarElemento && (
              <div className="grid grid-cols-4 items-center gap-4 animate-in zoom-in-95">
                <Label className="text-right text-[10px] font-bold uppercase text-orange-600">
                  {selecionarVarios ? "Elementos" : "Elemento"}
                </Label>
                <div className="col-span-3">
                  <Popover open={openElementoCombo} onOpenChange={setOpenElementoCombo}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn("w-full justify-between font-normal border-orange-200 bg-orange-50/10 min-h-[40px] h-auto", errClass(selectedMovimento?.elemento))}
                        type="button"
                      >
                        <div className="flex flex-wrap gap-1 text-left truncate">
                          {selectedMovimento?.elemento || "Pesquisar nome..."}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command filter={(value, search) => normalizeString(value).includes(normalizeString(search)) ? 1 : 0}>
                        <CommandInput placeholder="Nome do escuteiro..." />
                        <CommandList className="max-h-[200px] overflow-y-auto"> {/* Correção de Scroll */}
                          <CommandEmpty>Não encontrado.</CommandEmpty>
                          <CommandGroup>
                            {elementosFiltrados.map((elem) => {
                              const listaAtual = selectedMovimento?.elemento ? selectedMovimento.elemento.split(', ') : [];
                              const isSelected = listaAtual.includes(elem.nome);
                              return (
                                <CommandItem key={elem.id} value={elem.nome} onSelect={() => {
                                  if (selecionarVarios) {
                                    const novaLista = isSelected ? listaAtual.filter(n => n !== elem.nome) : [...listaAtual, elem.nome];
                                    setSelectedMovimento({ ...selectedMovimento, elemento: novaLista.filter(Boolean).join(', ') });
                                  } else {
                                    setSelectedMovimento({ ...selectedMovimento, elemento: elem.nome });
                                    setOpenElementoCombo(false);
                                  }
                                }}>
                                  <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                  <div className="flex flex-col">
                                    <span>{elem.nome}</span>
                                    <span className="text-[10px] text-muted-foreground">{elem.seccao === "Dirigentes" ? `Dirigente - ${elem.categoria}` : elem.seccao}</span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Comprovativo / Foto */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground mt-2">Comprovativo</Label>
              <div className="col-span-3 space-y-2">
                {!selectedMovimento?.link ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="text-xs"
                    />
                    {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                ) : (
                  <div className="relative w-fit group">
                    {selectedMovimento.link.endsWith('.pdf') ? (
                      <div className="flex items-center gap-2 p-2 border rounded bg-muted">
                        <span className="text-xs">📄 PDF Anexado</span>
                      </div>
                    ) : (
                      <img 
                        src={selectedMovimento.link} 
                        alt="Recibo" 
                        className="h-24 w-24 object-cover rounded-md border" 
                      />
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={removePhoto}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Observações */}
            {selectedMovimento?.tipo !== 'Depósito' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground">Observações</Label>
              <Input className="col-span-3" value={selectedMovimento?.observacoes || ''} onChange={(e) => setSelectedMovimento({...selectedMovimento, observacoes: e.target.value})} />
            </div>
            )}

            {/* Estado */}
            {selectedMovimento?.tipo !== 'Depósito' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase text-muted-foreground">Estado</Label>
              <Select 
                value={selectedMovimento?.estadoMovimento} 
                onValueChange={(v) => setSelectedMovimento({...selectedMovimento, estadoMovimento: v})}
              >
                <SelectTrigger className={cn("col-span-3", errClass(selectedMovimento?.estadoMovimento))}>
                  <SelectValue placeholder="Definir Estado">
                    {selectedMovimento?.estadoMovimento && (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const config = getEstadoIcon[selectedMovimento.estadoMovimento];
                          if (!config) return null;
                          const Icon = config.icon;
                          const textColor = config.color.split(' ')[0];
                          return <Icon className={cn("h-4 w-4", textColor)} />;
                        })()}
                        <span>{selectedMovimento.estadoMovimento}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(getEstadoIcon)
                    .filter(([nome]) => {
                      // 1. Remove sempre o estado "Transferido"
                      if (nome === "Transferido") return false;

                      // 2. Se for "User", remove "Concluido" e "Bloqueado"
                      // Nota: Verifica se a variável do teu user é 'user.categoria' ou similar
                      if (propUserCategoria === "User") {
                        return nome !== "Concluido" && nome !== "Bloqueado" && nome !== "Caixa";
                      }

                      return true;
                    }) 
                    .map(([nome, config]) => {
                      const Icon = config.icon;
                      const textColor = config.color.split(' ')[0];
                      return (
                        <SelectItem key={nome} value={nome}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", textColor)} />
                            <span>{nome}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
            )}

          </div>

          <DialogFooter className="border-t pt-4">
            {selectedMovimento?.estadoMovimento === "Bloqueado" && !isAdmin && (
              <p className="text-[10px] text-destructive font-medium mr-auto self-center">
                Este registo está bloqueado. Apenas administradores podem editar.
              </p>
            )}
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || saldoCaixaInfo.insuficiente} className="min-w-[100px]">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (selectedMovimento?.id ? 'Atualizar' : 'Criar Registo')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Eliminação */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar Registo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Tem a certeza que deseja eliminar este movimento? Esta ação não pode ser revertida.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function QRScannerContainer({ onScanSuccess, onClose }: { onScanSuccess: (text: string) => void, onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
  };

  const handleClose = () => { stopCamera(); onClose(); };

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      if (!('BarcodeDetector' in window)) {
        setError('O seu browser não suporta leitura de QR Code nativamente. Use Chrome ou Edge.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Importante: esperar o play() antes de iniciar o detector
          await videoRef.current.play();

          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          
          const detect = async () => {
            // VERIFICAÇÃO CRÍTICA: Se a câmara foi parada, interrompe o loop
            if (!isMounted || !streamRef.current || !videoRef.current) return;

            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0 && isMounted) {
                const code = barcodes[0].rawValue;
                stopCamera(); // Para a câmara antes de disparar o sucesso
                onScanSuccess(code);
                return;
              }
            } catch (e) {
              // Silenciar erros de detecção frame-a-frame
            }
            
            // Reagenda apenas se ainda estivermos ativos
            animFrameRef.current = requestAnimationFrame(detect);
          };

          animFrameRef.current = requestAnimationFrame(detect);
        }
      } catch (err) {
        if (isMounted) setError('Não foi possível aceder à câmara. Verifique as permissões.');
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl overflow-hidden w-full max-w-md shadow-2xl border border-border">
        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-xs uppercase tracking-tighter text-black">Scanner de Fatura AT</h3>
          </div>
          {/* O onClick aqui agora chama handleClose que executa stopCamera() corretamente */}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-black" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="w-full bg-black relative min-h-[280px] flex items-center justify-center">
          {error
            ? <p className="text-white text-xs text-center p-6">{error}</p>
            : <video ref={videoRef} className="w-full object-cover" playsInline muted autoPlay />
          }
          {/* Overlay visual para ajudar o utilizador a centrar o QR */}
          {!error && (
             <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-blue-500 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
             </div>
          )}
        </div>

        <div className="p-4 bg-muted/10">
          <Button 
            variant="outline" 
            className="w-full text-xs font-semibold uppercase border-red-200 text-red-600 hover:bg-red-50" 
            onClick={handleClose}
          >
            Cancelar Leitura
          </Button>
        </div>
      </div>
    </div>
  );
}
