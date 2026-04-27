import { useEffect, useState, useMemo, Fragment } from 'react';
import { Permissions } from '@/utils/permissions';
import { getNTransferencias, GetNTransferenciasOutputType, revertNTransferencia } from 'zite-endpoints-sdk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Search, X, ArrowRightLeft, ChevronDown, ChevronRight, User, Package, Undo2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateForDisplay, parseValor, formatCurrency } from '@/utils/dateUtils';
import { toast } from 'sonner';

type NTransferencia = GetNTransferenciasOutputType['records'][0];

interface GrupoTransferencia {
  numeroTransferencia: number;
  categoria: string;
  seccao: string;
  data: string;
  utilizador: string;
  totalValor: number;
  movimentos: NTransferencia[];
}

interface NTransferenciasViewProps {
  perms: Permissions;
}

const CORES_SECCOES: Record<string, string> = {
  "Lobitos": "bg-yellow-400",
  "Exploradores": "bg-green-600",
  "Pioneiros": "bg-blue-600",
  "Caminheiros": "bg-red-600",
  "Agrupamento": "bg-purple-600",
};

const normalizeString = (str: string) =>
  str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

export default function NTransferenciasView({ perms }: NTransferenciasViewProps) {

  // Derivado do sistema central de permissões
  const isAdmin = perms.isCA;
  const isSubAdmin = perms.isTA;
  const userSeccao = perms.userSeccao;
  const loggedUser = perms.userName || 'Sistema';

  const [records, setRecords] = useState<NTransferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaTexto, setBuscaTexto] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [seccaoAtiva, setSeccaoAtiva] = useState<string>("Todas");
  const [itensPorPagina, setItensPorPagina] = useState(10);

  // Revert state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [revertPending, setRevertPending] = useState<{ transferId: number; movimentoId: number }[] | null>(null);
  const [revertLabel, setRevertLabel] = useState('');
  const [isReverting, setIsReverting] = useState(false);

  useEffect(() => {
    if (!isAdmin && userSeccao) {
      // Força a secção do utilizador e não permite "Todas"
      setSeccaoAtiva(userSeccao);
    } else if (isAdmin && (seccaoAtiva === "" || !seccaoAtiva)) {
      // Apenas Admins começam com "Todas"
      setSeccaoAtiva("Todas");
    }
  }, [isAdmin, userSeccao]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = !isAdmin ? { seccao: userSeccao } : {};
      const data = await getNTransferencias(params);
      setRecords(data?.records || []);
    } catch {
      toast.error("Erro ao carregar transferências");
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (num: number) => {
    setExpandedGroups(prev => ({ ...prev, [num]: !prev[num] }));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const confirmRevert = (items: { transferId: number; movimentoId: number }[], label: string) => {
    setRevertPending(items);
    setRevertLabel(label);
  };

  const executeRevert = async () => {
    if (!revertPending) return;
    setIsReverting(true);
    try {
      await revertNTransferencia({ items: revertPending, utilizador: loggedUser });
      toast.success(`${revertPending.length} movimento(s) revertido(s) com sucesso`);
      setSelectedIds(new Set());
      setRevertPending(null);
      await loadData();
    } catch {
      toast.error('Erro ao reverter movimentos');
    } finally {
      setIsReverting(false);
    }
  };

  const gruposExibidos = useMemo(() => {
    if (!records || records.length === 0) return []; // Early return se vazio
    const termo = normalizeString(buscaTexto);
    // 1. Filtrar registos base
    let filtrados = records.filter(r => r.tipo !== 'DELETED');

    // 2. FILTRAGEM POR SECÇÃO (Lógica de permissões)
    const filtroFinal = isAdmin ? seccaoAtiva : userSeccao;
    if (filtroFinal !== "Todas") {
      filtrados = filtrados.filter(r => 
        // Usar optional chaining e trim para evitar erros de comparação
        r.seccao?.trim().toLowerCase() === seccaoAtiva.trim().toLowerCase()
      );
    }

    // 3. Filtrar por texto
    if (buscaTexto.trim()) {
      filtrados = filtrados.filter(r => 
        normalizeString(r.descricao || "").includes(termo) ||
        normalizeString(r.categoria || "").includes(termo) ||
        normalizeString(r.atividade || "").includes(termo) ||
        normalizeString(r.elemento || "").includes(termo) ||
        normalizeString(String(r.numeroTransferencia || "")).includes(termo)
      );
    };

    const grupos: Record<number, GrupoTransferencia> = {};
    filtrados.forEach(mov => {
      const num = Number(mov.numeroTransferencia) || 0;
      if (!grupos[num]) {
        grupos[num] = {
          numeroTransferencia: num,
          categoria: mov.categoria ?? '',
          seccao: mov.seccao || "",
          data: mov.data || "",
          utilizador: mov.utilizador || "",
          totalValor: 0,
          movimentos: []
        };
      }
      grupos[num].movimentos.push(mov);
      grupos[num].totalValor += parseValor(mov.valor || "0");
    });

    return Object.values(grupos).sort((a, b) => b.numeroTransferencia - a.numeroTransferencia);
  }, [records, seccaoAtiva , buscaTexto]);

  const gruposPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return gruposExibidos.slice(inicio, inicio + itensPorPagina);
  }, [gruposExibidos, paginaAtual, itensPorPagina]);

  const totalPaginas = Math.ceil(gruposExibidos.length / itensPorPagina) || 1;
  const selectedCount = selectedIds.size;

  const getItemsForGroup = (grupo: GrupoTransferencia) =>
    grupo.movimentos.map(m => ({ transferId: m.id, movimentoId: Number(m.idMovimento) || 0 }));

  const getSelectedItems = () =>
    records
      .filter(r => selectedIds.has(r.id))
      .map(r => ({ transferId: r.id, movimentoId: Number(r.idMovimento) || 0 }));

  useEffect(() => {
    setPaginaAtual(1);
  }, [seccaoAtiva, buscaTexto]);

  return (
    <div className="p-2 sm:p-4 space-y-4">
      {/* AlertDialog de Confirmação */}
      <AlertDialog open={!!revertPending} onOpenChange={(open) => !open && setRevertPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reversão</AlertDialogTitle>
            <AlertDialogDescription>
              {revertLabel} <br />
              Esta ação irá eliminar os registos de transferência e repor os movimentos como <strong>Caixa</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReverting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRevert}
              disabled={isReverting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isReverting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Undo2 className="h-4 w-4 mr-2" />}
              Reverter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-none shadow-sm sm:border sm:shadow">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 pb-4">
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Transferências
          </CardTitle>
          {/* Seletor de Secção */}
          <div className="w-full sm:w-48">
            <Select 
              value={seccaoAtiva} 
              onValueChange={(val) => {
                // Só permite mudar se for admin
                if (isAdmin) setSeccaoAtiva(val);
              }}
              // DESATIVAR se não for admin: impede o clique
              disabled={!isAdmin}
            >
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue>
                  {seccaoAtiva === "Todas" ? "Todas as Secções" : seccaoAtiva}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {/* Admins vêem tudo, Users normais só vêem a sua própria secção na lista (se conseguissem abrir) */}
                {isAdmin ? (
                  <>
                    <SelectItem value="Todas">Todas as Secções</SelectItem>
                    <SelectItem value="Lobitos">Lobitos</SelectItem>
                    <SelectItem value="Exploradores">Exploradores</SelectItem>
                    <SelectItem value="Pioneiros">Pioneiros</SelectItem>
                    <SelectItem value="Caminheiros">Caminheiros</SelectItem>
                    <SelectItem value="Agrupamento">Agrupamento</SelectItem>
                  </>
                ) : (
                  userSeccao ? <SelectItem value={userSeccao}>{userSeccao}</SelectItem> : null
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {selectedCount > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="h-9 gap-1.5 text-xs"
                onClick={() => confirmRevert(getSelectedItems(), `Reverter ${selectedCount} movimento(s) selecionado(s)?`)}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Reverter Selecionados ({selectedCount})
              </Button>
            )}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nº Lote ou descrição..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm"
              />
              {buscaTexto && (
                <button onClick={() => setBuscaTexto("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">

          {/* VIEW: DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground uppercase text-[10px] font-bold bg-muted/20">
                  <th className="w-10 py-3 px-3"></th>
                  <th className="text-left py-3 px-3">Secção</th>
                  <th className="text-left py-3 px-3">Data</th>
                  <th className="text-left py-3 px-3">Itens</th>
                  <th className="text-left py-3 px-3">Descrição</th>
                  <th className="text-left py-3 px-3">Realizado por</th>
                  <th className="text-right py-3 px-3">Valor Total</th>
                  <th className="w-24 py-3 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" /></td></tr>
                ) : gruposPaginados.map((grupo) => (
                  <Fragment key={grupo.numeroTransferencia}>
                    <tr
                      className="hover:bg-muted/50 cursor-pointer transition-colors font-medium"
                      onClick={() => toggleGroup(grupo.numeroTransferencia)}
                    >
                      <td className="py-3 px-3 text-center text-muted-foreground">
                        {expandedGroups[grupo.numeroTransferencia] ? <ChevronDown className="h-4 w-4 inline" /> : <ChevronRight className="h-4 w-4 inline" />}
                      </td>
                      <td className="py-3 px-3 text-xs flex items-center gap-1.5">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", CORES_SECCOES[grupo.seccao] || "bg-gray-300")} />
                        {grupo.seccao || '—'}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{formatDateForDisplay(grupo.data)}</td>
                      <td className="py-3 px-3 text-xs">{grupo.movimentos.length} movimentos</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{grupo.categoria}</td>
                      <td className="py-3 px-3 text-xs">{grupo.utilizador}</td>
                      <td className="py-3 px-3 text-right font-bold text-blue-600">{formatCurrency(grupo.totalValor)} €</td>
                      <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px] text-destructive hover:text-destructive gap-1"
                          onClick={() => confirmRevert(getItemsForGroup(grupo), `Reverter Transferencia #${grupo.numeroTransferencia} (${grupo.movimentos.length} movimentos)?`)}
                        >
                          <Trash2 className="h-3 w-3" /> Reverter Transferencia
                        </Button>
                      </td>
                    </tr>
                    {expandedGroups[grupo.numeroTransferencia] && (
                      <tr>
                        <td colSpan={8} className="bg-muted/10 p-4">
                          <div className="ml-8 border rounded-lg bg-white overflow-hidden animate-in fade-in duration-200">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/30 text-[9px] uppercase font-bold">
                                <tr>
                                  <th className="w-8 py-2 px-3"></th>
                                  <th className="text-left py-2 px-3">Elemento</th>
                                  <th className="text-left py-2 px-3">Categoria</th>
                                  <th className="text-left py-2 px-3">Descrição</th>
                                  <th className="text-left py-2 px-3">Atividade</th>
                                  <th className="text-right py-2 px-3">Valor</th>
                                  <th className="text-center py-2 px-3">ID Mov.</th>
                                  <th className="w-20 py-2 px-3"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {grupo.movimentos.map((m) => (
                                  <tr key={m.id} className={selectedIds.has(m.id) ? 'bg-blue-50' : ''}>
                                    <td className="py-2 px-3">
                                      <Checkbox
                                        checked={selectedIds.has(m.id)}
                                        onCheckedChange={() => toggleSelect(m.id)}
                                      />
                                    </td>
                                    <td className="py-2 px-3">{m.elemento}</td>
                                    <td className="py-2 px-3">{m.categoria}</td>
                                    <td className="py-2 px-3 font-medium">{m.descricao}</td>
                                    <td className="py-2 px-3 font-medium">{m.atividade}</td>
                                    <td className="py-2 px-3 text-right">{formatCurrency(parseValor(m.valor || "0"))} €</td>
                                    <td className="py-2 px-3 text-center text-muted-foreground">#{m.idMovimento}</td>
                                    <td className="py-2 px-3 text-right">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[10px] text-destructive hover:text-destructive gap-1"
                                        onClick={() => confirmRevert(
                                          [{ transferId: m.id, movimentoId: Number(m.idMovimento) || 0 }],
                                          `Reverter movimento "${m.descricao}"?`
                                        )}
                                      >
                                        <Undo2 className="h-3 w-3" /> Reverter
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* VIEW: MOBILE LIST */}
          <div className="md:hidden divide-y divide-border">
            {loading ? (
              <div className="py-10 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
            ) : gruposPaginados.map((grupo) => (
              <div key={grupo.numeroTransferencia} className="flex flex-col">
                <div
                  className={cn(
                    "p-4 flex items-center justify-between active:bg-muted/50 transition-colors",
                    expandedGroups[grupo.numeroTransferencia] && "bg-muted/20"
                  )}
                  onClick={() => toggleGroup(grupo.numeroTransferencia)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge className="font-mono text-[10px] h-5">#{grupo.numeroTransferencia}</Badge>
                      <span className="text-xs font-semibold">{formatDateForDisplay(grupo.data)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase tracking-tight">
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {grupo.movimentos.length} itens</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {grupo.utilizador}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 text-sm">{formatCurrency(grupo.totalValor)} €</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmRevert(getItemsForGroup(grupo), `Reverter Trasnferencia #${grupo.numeroTransferencia}?`);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {expandedGroups[grupo.numeroTransferencia] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedGroups[grupo.numeroTransferencia] && (
                  <div className="bg-muted/30 px-4 py-2 space-y-2 border-t border-b border-muted animate-in slide-in-from-top-1">
                    {grupo.movimentos.map((m) => (
                      <div key={m.id} className={cn("bg-white p-3 rounded-md border shadow-sm text-xs space-y-1", selectedIds.has(m.id) && "border-blue-400 bg-blue-50")}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Checkbox
                              checked={selectedIds.has(m.id)}
                              onCheckedChange={() => toggleSelect(m.id)}
                            />
                            <span className="font-bold truncate">{m.descricao}</span>
                          </div>
                          <span className="font-mono font-bold text-gray-700 whitespace-nowrap">{formatCurrency(parseValor(m.valor || "0"))} €</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <div className={cn("h-2 w-2 rounded-full", CORES_SECCOES[m.seccao || ""] || "bg-gray-300")} />
                            <span className="text-muted-foreground">{m.seccao} · {m.categoria}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-destructive hover:text-destructive gap-1"
                            onClick={() => confirmRevert(
                              [{ transferId: m.id, movimentoId: Number(m.idMovimento) || 0 }],
                              `Reverter "${m.descricao}"?`
                            )}
                          >
                            <Undo2 className="h-3 w-3" /> Reverter
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* PAGINAÇÃO RESPONSIVA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t px-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Lotes por página</span>
              <Select value={String(itensPorPagina)} onValueChange={(v) => setItensPorPagina(Number(v))}>
                <SelectTrigger className="h-8 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 20].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs text-muted-foreground">Página {paginaAtual} de {totalPaginas}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1}>Anterior</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPaginaAtual(p => p + 1)} disabled={paginaAtual >= totalPaginas}>Próximo</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
