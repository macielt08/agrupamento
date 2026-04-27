import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Loader2, Euro, Moon, CalendarDays, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ElementoDialog from '@/components/ElementoDialog';
import ElementoReceitasDialog from '@/components/ElementoReceitasDialog';
import { 
  getElementos, 
  createElemento, 
  updateElemento, 
  deleteElemento, 
  GetElementosOutputType, 
  getNMovimentos,
  GetNMovimentosOutputType,
  getAtividades,
  getNoitesCampo,
  GetAtividadesOutputType,
  GetNoitesCampoOutputType
} from 'zite-endpoints-sdk';
import { formatDateForDisplay } from '@/utils/dateUtils';
import { retryWithBackoff, sleep } from '@/utils/retryUtils';
import { Permissions } from '@/utils/permissions';

// --- TIPOS ---
type ElementoRecord = GetElementosOutputType['records'][0] & {
  bandoPatrulhaEquipa?: string;
  promessa?: string;
  categoria?: string;
  etapa?: string;
  entradaSeccao?: string;
  saidaSeccao?: string;
  totalNoitesCalculado?: number;
  historicoNoites?: any[];
};

type Atividade = GetAtividadesOutputType['atividades'][0];
type NoiteCampo = GetNoitesCampoOutputType['records'][0];

const SECTIONS = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Dirigentes'];

const CORES_SECCOES: Record<string, string> = {
  'Lobitos': 'bg-yellow-400',
  'Exploradores': 'bg-green-600',
  'Pioneiros': 'bg-blue-600',
  'Caminheiros': 'bg-red-600',
  'Dirigentes': 'bg-slate-500',
};

type ElementosViewProps = {
  perms: Permissions;
};

// --- COMPONENTE: DIÁLOGO DE DETALHES DE NOITES ---
function ElementoNoitesDialog({ open, onClose, record }: { open: boolean; onClose: () => void; record: ElementoRecord | null }) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-blue-600" />
            Histórico de Noites: {record.nome}
          </DialogTitle>
          <DialogDescription className="sr-only">Histórico de noites de campo do elemento {record.nome}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="max-h-[60vh] overflow-y-auto border rounded-md">
            <Table>
              <TableHeader className="bg-muted/50 text-[10px] uppercase">
                <TableRow>
                  <TableHead>Atividade</TableHead>
                  <TableHead className="text-right">Noites</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.historicoNoites && record.historicoNoites.length > 0 ? (
                  record.historicoNoites.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-2">
                        <div className="font-medium text-sm">{h.atividade}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> 
                          {h.dataAtividade ? formatDateForDisplay(h.dataAtividade) : 'Data não definida'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{h.totalNoites}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4 text-xs text-muted-foreground italic">
                      Sem atividades registadas nesta secção.
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-blue-50/50 italic border-t-2">
                  <TableCell className="text-sm">Saldo Inicial (até {record.dataSaldoInicial ? formatDateForDisplay(record.dataSaldoInicial) : 'início'})</TableCell>
                  <TableCell className="text-right font-bold">{record.saldoInicialNoites || 0}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="p-3 bg-blue-600 text-white rounded-lg flex justify-between items-center shadow-md">
            <span className="text-xs font-bold uppercase tracking-widest">Total Geral</span>
            <span className="text-xl font-black">{record.totalNoitesCalculado} noites</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function ElementosView({ perms }: ElementosViewProps) {
  // Derivado do sistema central de permissões
  const isAdmin = perms.isCA;
  const isProgramer = perms.isProgramer;
  const userSection = perms.userSeccao;
  const userCategoria = perms.userCategoria;
  const userName = perms.userName;

  const [records, setRecords] = useState<ElementoRecord[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [noitesCampoRecords, setNoitesCampoRecords] = useState<NoiteCampo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>(!isAdmin ? userSection || '' : '');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ElementoRecord | undefined>();
  const [receitasDialog, setReceitasDialog] = useState<{ open: boolean; elementoNome: string; movimentos: GetNMovimentosOutputType['records']; loading: boolean }>({ open: false, elementoNome: '', movimentos: [], loading: false });
  const [noitesDialog, setNoitesDialog] = useState<{ open: boolean; record: ElementoRecord | null }>({ open: false, record: null });

  // Pode editar se for admin/programer ou Dirigente
  const canEditRecords = isAdmin || userCategoria === 'Dirigente';

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const [elData, ativData, noitesData] = await Promise.all([
        getElementos({}), getAtividades({}), getNoitesCampo({})
      ]);
      setRecords(elData.records || []);
      setAtividades(ativData.atividades || []);
      setNoitesCampoRecords(noitesData.records || []);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!selectedSection) return [];
    let filtered = records.filter(r => r.seccao === selectedSection && r.nome !== 'DELETED' && r.estado === 'Ativo');
    if (!isAdmin && userCategoria !== 'Dirigente') {
      filtered = filtered.filter(r => r.nome === userName);
    }
    return filtered.map(elemento => {
      const dataCorte = elemento.dataSaldoInicial ? new Date(elemento.dataSaldoInicial) : new Date(0);
      const historicoValido = noitesCampoRecords
        .filter(r => {
          if (r.elemento !== elemento.nome || r.atividade === 'DELETED') return false;
          const ativ = atividades.find(at => at.nome === r.atividade);
          return ativ?.data ? new Date(ativ.data) > dataCorte : true;
        })
        .map(r => {
          const ativ = atividades.find(at => at.nome === r.atividade);
          return { ...r, dataAtividade: ativ?.data || null };
        })
        .sort((a, b) => new Date(b.dataAtividade || 0).getTime() - new Date(a.dataAtividade || 0).getTime());
      const totalHistorico = historicoValido.reduce((acc, curr) => acc + (Number(curr.totalNoites) || 0), 0);
      return { ...elemento, totalNoitesCalculado: (Number(elemento.saldoInicialNoites) || 0) + totalHistorico, historicoNoites: historicoValido };
    }).sort((a, b) => (a.nome || "").localeCompare(b.nome || "", 'pt-PT'));
  }, [records, atividades, noitesCampoRecords, selectedSection, isAdmin, userCategoria, userName]);

  const handleSave = async (record: Partial<ElementoRecord>) => {
    try {
      const sanitize = (val?: string) => val && val.trim() !== '' ? val : undefined;
      if (editingRecord) {
        await retryWithBackoff(() => updateElemento({ id: editingRecord.id, nome: record.nome, seccao: record.seccao, estado: record.estado, bandoPatrulhaEquipa: record.bandoPatrulhaEquipa, promessa: sanitize(record.promessa), categoria: record.categoria, etapa: record.etapa, entradaSeccao: sanitize(record.entradaSeccao), saidaSeccao: sanitize(record.saidaSeccao), saldoInicialNoites: record.saldoInicialNoites, dataSaldoInicial: sanitize(record.dataSaldoInicial) }));
        toast.success('Elemento atualizado');
      } else {
        await retryWithBackoff(() => createElemento({ seccao: record.seccao!, nome: record.nome!, estado: record.estado, bandoPatrulhaEquipa: record.bandoPatrulhaEquipa, promessa: sanitize(record.promessa), categoria: record.categoria, etapa: record.etapa, entradaSeccao: sanitize(record.entradaSeccao), saidaSeccao: record.saidaSeccao, noitesCampo: 0 }));
        toast.success('Elemento criado');
      }
      await sleep(1500);
      await loadRecords();
      setDialogOpen(false);
    } catch (error) { toast.error('Erro ao guardar'); }
  };

  const handleTransfer = async (current: ElementoRecord, newSection: string) => {
    try {
      await retryWithBackoff(() => updateElemento({ id: current.id, nome: current.nome, seccao: current.seccao, estado: 'Inativo' }));
      const newEl = await retryWithBackoff(() => createElemento({ seccao: newSection, nome: current.nome!, estado: 'Ativo', categoria: 'Aspirante', entradaSeccao: current.saidaSeccao, noitesCampo: current.totalNoitesCalculado || 0 }));
      if (newEl.elemento?.id) {
        await retryWithBackoff(() => updateElemento({ id: newEl.elemento.id, saldoInicialNoites: current.totalNoitesCalculado || 0, dataSaldoInicial: current.saidaSeccao }));
      }
      toast.success(`Transferido para ${newSection}`);
      await sleep(1500);
      await loadRecords();
      setDialogOpen(false);
    } catch (error) { toast.error('Erro ao transferir'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar este elemento?')) return;
    try {
      await retryWithBackoff(() => deleteElemento({ id }));
      toast.success('Eliminado');
      await sleep(1000);
      await loadRecords();
    } catch (error) { toast.error('Erro ao eliminar'); }
  };

  const handleViewReceitas = async (nome: string) => {
    setReceitasDialog({ open: true, elementoNome: nome, movimentos: [], loading: true });
    try {
      const data = await getNMovimentos({});
      const filtered = data.records.filter(m => m.tipo === 'Receita' && m.elemento === nome);
      setReceitasDialog({ open: true, elementoNome: nome, movimentos: filtered, loading: false });
    } catch (error) { toast.error('Erro ao carregar receitas'); }
  };

  const getBandoLabel = () => {
    if (selectedSection === 'Lobitos') return 'Bando';
    if (selectedSection === 'Exploradores') return 'Patrulha';
    return 'Equipa';
  };

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <>
      <Card className="border-x-0 sm:border-2 shadow-none border-t-2 border-b-2 sm:rounded-xl">
        <CardHeader className="space-y-3 p-3 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl font-bold">Elementos</CardTitle>
            {selectedSection && canEditRecords && (
              <Button
                size="sm"
                className="h-8 sm:h-9 px-3 text-xs bg-blue-600 text-white"
                onClick={() => { setEditingRecord(undefined); setDialogOpen(true); }}
              >
                <Plus className="h-3.5 w-3.5 sm:mr-1" />
                <span>Novo Elemento</span>
              </Button>
            )}
          </div>

          {/* Section tabs/pills */}
          <div className="flex flex-wrap gap-2 border-b pb-3">
            {SECTIONS.map((s) => {
              const isLocked = !isAdmin && userCategoria !== 'Dirigente' ? s !== userSection : false;
              const count = records.filter(r => r.seccao === s && r.nome !== 'DELETED' && r.estado === 'Ativo').length;
              return (
                <Button
                  key={s}
                  variant={selectedSection === s ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { if (!isLocked) setSelectedSection(s); }}
                  disabled={isLocked}
                  className={cn(
                    'relative h-8 rounded-full px-4 text-[13px] font-medium transition-all',
                    selectedSection === s ? 'shadow-sm' : 'text-muted-foreground hover:bg-muted',
                    isLocked && 'opacity-40 cursor-not-allowed pointer-events-none'
                  )}
                >
                  <span className={cn('mr-2 h-2 w-2 rounded-full inline-block shrink-0', CORES_SECCOES[s], selectedSection !== s && 'opacity-40')} />
                  <span className="hidden md:inline">{s}</span>
                  <span className="md:hidden">{s.substring(0, 3)}</span>
                  <span className="ml-1.5 opacity-50 text-[10px]">({count})</span>
                  {isLocked && <Lock className="ml-1.5 h-3 w-3 opacity-60" />}
                </Button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6 pt-0">
          {!selectedSection ? (
            <p className="text-center py-12 text-sm text-muted-foreground italic">Selecione uma secção para ver os elementos.</p>
          ) : filteredRecords.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground italic">Nenhum elemento encontrado para {selectedSection}.</p>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b text-muted-foreground uppercase text-[11px] font-bold">
                      <TableHead className="h-9 py-3 px-3">Nome</TableHead>
                      <TableHead className="h-9 py-3 px-3">{getBandoLabel()}</TableHead>
                      <TableHead className="h-9 py-3 px-3">{selectedSection === 'Dirigentes' ? 'Secção' : 'Categoria'}</TableHead>
                      <TableHead className="h-9 py-3 px-3">Promessa</TableHead>
                      <TableHead className="h-9 py-3 px-3">Noites Campo</TableHead>
                      <TableHead className="h-9 py-3 px-3">Etapa</TableHead>
                      <TableHead className="h-9 py-3 px-3">Estado</TableHead>
                      <TableHead className="h-9 py-3 px-3 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map(record => (
                      <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold py-3 px-3">{record.nome}</TableCell>
                        <TableCell className="py-3 px-3">{record.bandoPatrulhaEquipa || '—'}</TableCell>
                        <TableCell className="py-3 px-3">{record.categoria || '—'}</TableCell>
                        <TableCell className="py-3 px-3">{formatDateForDisplay(record.promessa)}</TableCell>
                        <TableCell className="py-3 px-3">
                          <Button
                            variant="ghost"
                            className="text-blue-700 dark:text-blue-400 font-black hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 h-8"
                            onClick={() => setNoitesDialog({ open: true, record })}
                          >
                            <Moon className="h-3.5 w-3.5 mr-1.5" /> {record.totalNoitesCalculado}
                          </Button>
                        </TableCell>
                        <TableCell className="py-3 px-3">{record.etapa || '—'}</TableCell>
                        <TableCell className="py-3 px-3">
                          <Badge variant="outline" className={record.estado === 'Ativo' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : ''}>
                            {record.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleViewReceitas(record.nome!)}><Euro className="h-4 w-4" /></Button>
                            {canEditRecords && (
                              <>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingRecord(record); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(record.id)}><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* MOBILE CARDS */}
              <div className="md:hidden flex flex-col gap-3 p-3">
                {filteredRecords.map(record => (
                  <div key={record.id} className="p-4 space-y-3 rounded-xl border shadow-sm bg-card active:scale-[0.98] transition-transform">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate">{record.nome}</h3>
                        <p className="text-sm text-muted-foreground">{getBandoLabel()}: {record.bandoPatrulhaEquipa || '—'}</p>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-sm font-bold text-blue-600 flex items-center"
                          onClick={() => setNoitesDialog({ open: true, record })}
                        >
                          <Moon className="h-3 w-3 mr-1" /> Noites: {record.totalNoitesCalculado}
                        </Button>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] uppercase shrink-0',
                          record.estado === 'Ativo' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400' : ''
                        )}
                      >
                        {record.estado}
                      </Badge>
                    </div>
                    {record.categoria && (
                      <p className="text-xs text-muted-foreground">Categoria: <span className="font-medium text-foreground">{record.categoria}</span></p>
                    )}
                    <div className="flex gap-2 pt-1 border-t border-dashed">
                      <Button size="sm" variant="secondary" onClick={() => handleViewReceitas(record.nome!)} className="flex-1 h-9 text-xs shadow-sm border border-border/50">
                        <Euro className="h-3.5 w-3.5 mr-1.5 text-slate-600" /> Finanças
                      </Button>
                      {canEditRecords && (
                        <Button size="sm" variant="secondary" onClick={() => { setEditingRecord(record); setDialogOpen(true); }} className="h-9 w-9 p-0 rounded-full shadow-sm border border-border/50">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ElementoDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingRecord(undefined); }} onSave={handleSave} onTransfer={handleTransfer} record={editingRecord} selectedSection={selectedSection} userSection={userSection} isAdmin={isAdmin} isProgramer={isProgramer} />
      <ElementoReceitasDialog open={receitasDialog.open} onClose={() => setReceitasDialog(p => ({ ...p, open: false }))} elementoNome={receitasDialog.elementoNome} movimentos={receitasDialog.movimentos} loading={receitasDialog.loading} />
      <ElementoNoitesDialog open={noitesDialog.open} onClose={() => setNoitesDialog({ open: false, record: null })} record={noitesDialog.record} />
    </>
  );
}
