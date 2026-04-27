import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, Loader2, Search, ListTree, Users, ChevronDown, History, CalendarDays, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getNoitesCampo, createNoitesCampo, deleteNoitesCampo, getAtividades, getElementos, GetNoitesCampoOutputType, GetAtividadesOutputType, GetElementosOutputType } from 'zite-endpoints-sdk';
import { formatDateForDisplay } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

type NoitesCampoRecord = GetNoitesCampoOutputType['records'][0];
type Atividade = GetAtividadesOutputType['atividades'][0];
type Elemento = GetElementosOutputType['records'][0];

const SECTIONS_ELEMENTOS = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Dirigentes'];
const SECTIONS_ATIVIDADES = ['Todas', 'Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Agrupamento'];

const normalizeText = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function NoitesCampoView({ userSection, isAdmin, isProgramer, userCategoria, userName }: any) {
  const [records, setRecords] = useState<NoitesCampoRecord[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [loading, setLoading] = useState(true);
  const canManageAtividades = isAdmin || isProgramer || userCategoria === 'Dirigente';
  const [viewMode, setViewMode] = useState<'elemento' | 'atividade'>('elemento');
  const [selectedSection, setSelectedSection] = useState<string>(() => {
    return (!canManageAtividades && userSection) ? userSection : '';
  });
  const [selectedAtividade, setSelectedAtividade] = useState<string>('');
  const [selectedElementos, setSelectedElementos] = useState<string[]>([]);
  const [selectedParticipantes, setSelectedParticipantes] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      setLoading(true);
      const [n, a, e] = await Promise.all([getNoitesCampo({}), getAtividades({}), getElementos({})]);
      setRecords(n.records || []);
      setAtividades(a.atividades || []);
      setElementos(e.records || []);
    } catch (err) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getSectionBadge = (sectionName?: string) => {
    if (!sectionName) return null;
    const colors: Record<string, string> = {
      'Lobitos': 'bg-yellow-500 text-white border-none',
      'Exploradores': 'bg-green-600 text-white border-none',
      'Pioneiros': 'bg-blue-600 text-white border-none',
      'Caminheiros': 'bg-red-600 text-white border-none',
      'Dirigentes': 'bg-slate-800 text-white border-none',
      'Agrupamento': 'bg-purple-600 text-white border-none'
    };
    return <Badge className={`${colors[sectionName] || 'bg-slate-200'} text-[10px] uppercase px-2 py-0`}>{sectionName}</Badge>;
  };

  const elementosCalculados = useMemo(() => {
    if (!selectedSection || (viewMode !== 'elemento' && canManageAtividades)) return [];
    let filtrados = elementos.filter(e => e.seccao === selectedSection && e.estado === 'Ativo' && e.nome !== 'DELETED');
    // Programadores, Admins e Dirigentes veem TODOS os elementos da secção
    // Outros utilizadores veem apenas o seu próprio elemento
    if (!canManageAtividades && !isProgramer && userName) {
      filtrados = filtrados.filter(e => e.nome?.trim().toLowerCase() === userName.trim().toLowerCase());
    }
    return filtrados.map(elemento => {
      const dataCorte = elemento.dataSaldoInicial ? new Date(elemento.dataSaldoInicial) : new Date(0);
      const historico = records.filter(r => {
        if (r.elemento !== elemento.nome || r.atividade === 'DELETED') return false;
        const ativ = atividades.find(at => at.nome === r.atividade);
        return ativ?.data ? new Date(ativ.data) > dataCorte : true;
      }).map(r => {
        const ativ = atividades.find(at => at.nome === r.atividade);
        return {
          ...r,
          seccaoAtividade: ativ?.seccao,
          dataInicio: ativ?.dataInicio,
          dataFim: ativ?.dataFim,
          local: ativ?.local
        };
      }).sort((a, b) => {
        const dA = a.dataInicio ? new Date(a.dataInicio).getTime() : 0;
        const dB = b.dataInicio ? new Date(b.dataInicio).getTime() : 0;
        return dB - dA
      });
      const total = (Number(elemento.saldoInicialNoites) || 0) + historico.reduce((acc, curr) => acc + (Number(curr.totalNoites) || 0), 0);
      return { elemento, historico, total };
    }).sort((a, b) => (a.elemento.nome || '').localeCompare(b.elemento.nome || '', 'pt-PT'));
  }, [elementos, records, atividades, selectedSection, viewMode, canManageAtividades, userName]);

  const filteredAtividades = useMemo(() => {
    if (!selectedSection || viewMode !== 'atividade' || !canManageAtividades) return [];
    return atividades
      .filter(a => {
        const isNotDeleted = a.nome !== 'DELETED' && a.contaNoites === 'Sim';
        if (selectedSection === 'Todas') return isNotDeleted; // Sem filtro de secção
        return isNotDeleted && a.seccao === selectedSection;
      })
      .sort((a, b) => {
        const anoB = Number(b.ano) || 0;
        const anoA = Number(a.ano) || 0;
        if (anoB !== anoA) return anoB - anoA;
        return new Date(b.dataInicio || 0).getTime() - new Date(a.dataInicio || 0).getTime();
      });
  }, [atividades, selectedSection, viewMode, canManageAtividades]);

  const participantesAtividade = useMemo(() => {
    if (!canManageAtividades) return [];
    return records
      .filter(r => r.atividade === selectedAtividade && r.atividade !== 'DELETED')
      // ORDENAÇÃO ALFABÉTICA DA LISTA DE PRESENÇAS
      .sort((a, b) => (a.elemento || '').localeCompare(b.elemento || '', 'pt-PT'));
  }, [records, selectedAtividade, canManageAtividades]);

  const elementosDisponiveis = useMemo(() => {
    if (!canManageAtividades) return [];
    const nomesParticipantes = participantesAtividade.map(p => p.elemento);
    const searchNormalized = normalizeText(searchText);
    return elementos
      .filter(e => {
        if (e.estado !== 'Ativo' || e.nome === 'DELETED') return false;
        if (nomesParticipantes.includes(e.nome)) return false;
        
        // Se a secção for "Todas" ou "Agrupamento", mostra todos
        if (selectedSection === 'Todas' || selectedSection === 'Agrupamento') {
          return true;
        } else {
          return e.seccao === selectedSection || e.categoria === selectedSection;
        }
      })
      .filter(e => {
        // Normaliza o nome do elemento para a comparação
        const nomeElementoNormalized = normalizeText(e.nome || '');
        return nomeElementoNormalized.includes(searchNormalized);
      })
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-PT'));
  }, [elementos, participantesAtividade, searchText, canManageAtividades, selectedSection]);

  const handleAddParticipantes = async () => {
    if (!canManageAtividades || !selectedAtividade || selectedElementos.length === 0) return;
    setAdding(true);
    try {
      const ativ = atividades.find(a => a.nome === selectedAtividade);
      for (const nome of selectedElementos) {
        const el = elementos.find(e => e.nome === nome);
        if (el) {
          await createNoitesCampo({ 
            atividade: selectedAtividade, 
            elementoId: el.id, 
            totalNoites: ativ?.totalNoites || 0, 
            // Se a secção selecionada for "Todas", usamos a secção da atividade
            seccao: selectedSection === 'Todas' ? (ativ?.seccao || 'Agrupamento') : selectedSection,
            elemento: nome,
            dataInicioAtividade: ativ?.dataInicio 
          });
        }
      }
      toast.success('Participantes adicionados');
      await loadData();
      setSelectedElementos([]);
    } catch (err) { toast.error('Erro ao adicionar'); } finally { setAdding(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!canManageAtividades) return;
    setRemoving(true);
    try {
      for (const id of selectedParticipantes) {
        const rec = records.find(r => r.id === id);
        const el = elementos.find(e => e.nome === rec?.elemento);
        if (rec && el) await deleteNoitesCampo({ id: rec.id, elementoId: el.id, elemento: rec.elemento || '' });
      }
      toast.success('Removido com sucesso');
      await loadData();
      setSelectedParticipantes([]);
      setDeleteDialogOpen(false);
    } catch (err) { toast.error('Erro ao remover'); } finally { setRemoving(false); }
  };
  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
  return (
    <>
      <div className="space-y-6">
        {canManageAtividades && (
          <div className="flex gap-2">
            <Button variant={viewMode === 'elemento' ? 'default' : 'outline'} onClick={() => { setViewMode('elemento'); setSelectedSection(''); }}>
              <Users className="h-4 w-4 mr-2"/> Elementos
            </Button>
            <Button variant={viewMode === 'atividade' ? 'default' : 'outline'} onClick={() => { setViewMode('atividade'); setSelectedSection(''); }}>
              <ListTree className="h-4 w-4 mr-2"/> Atividades
            </Button>
          </div>
        )}
        <div className="w-full sm:w-64 space-y-2">
          <Label>Secção {canManageAtividades && `para ${viewMode === 'elemento' ? 'Elementos' : 'Atividades'}`}</Label>
          <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedAtividade(''); }} disabled={!canManageAtividades}>
            <SelectTrigger className={!canManageAtividades ? "bg-slate-50 cursor-not-allowed opacity-80" : ""}>
              <SelectValue placeholder="Escolha a secção..." />
            </SelectTrigger>
            <SelectContent>
              {(viewMode === 'elemento' ? SECTIONS_ELEMENTOS : SECTIONS_ATIVIDADES).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!selectedSection ? (
          <Card><CardContent className="pt-6 text-center text-muted-foreground italic">Selecione uma secção para visualizar os dados.</CardContent></Card>
        ) : (viewMode === 'elemento' || !canManageAtividades) ? (
          <div className="grid gap-3">
            {elementosCalculados.map(({ elemento, historico, total }) => (
              <Collapsible key={elemento.id} className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 hover:bg-slate-50 flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-3">
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-700">{elemento.nome}</span>
                  </div>
                  <div className="text-sm font-bold bg-primary/10 text-primary px-4 py-1.5 rounded-full">{total} noites</div>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t bg-slate-50/30 p-4">
                  <div className="rounded-md border bg-white overflow-hidden">
                    <div
                      className={cn(
                        "overflow-y-auto",
                        // Se NÃO for o próprio elemento (ou se quiseres aplicar sempre), 
                        // limitamos a altura. 5 linhas de tabela + header ronda os 280px.
                        (!canManageAtividades && userName && elemento.nome?.trim().toLowerCase() !== userName.trim().toLowerCase()) 
                          ? "max-h-[280px]" 
                          : "max-h-[400px]" // Altura opcional maior para admins
                      )}
                    >
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-xs uppercase font-bold py-3">Atividade / Datas</TableHead>
                            <TableHead className="text-xs uppercase font-bold">Secção</TableHead>
                            <TableHead className="text-right text-xs uppercase font-bold">Noites</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="text-blue-600 italic bg-blue-50/20 border-b-2">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="flex items-center gap-2 font-medium"><History className="h-3.5 w-3.5"/> Saldo Inicial</span>
                                <span className="text-[10px] text-slate-400 ml-5">Até {elemento.dataSaldoInicial ? formatDateForDisplay(elemento.dataSaldoInicial) : '---'}</span>
                              </div>
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell className="text-right font-bold text-blue-700">{elemento.saldoInicialNoites || 0}</TableCell>
                          </TableRow>
                          {historico.map(r => (
                            <TableRow key={r.id} className="hover:bg-slate-50/50">
                              <TableCell className="py-3">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700">{r.atividade} - {r.local}</span>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <CalendarDays className="h-3 w-3 text-slate-400" />
                                    <span>{r.dataInicio ? formatDateForDisplay(r.dataInicio) : '?'}</span>
                                    {r.dataFim && r.dataFim !== r.dataInicio && (
                                      <><span className="text-slate-300 mx-0.5">→</span><span>{formatDateForDisplay(r.dataFim)}</span></>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{getSectionBadge(r.seccaoAtividade)}</TableCell>
                              <TableCell className="text-right font-bold text-slate-600">{r.totalNoites}</TableCell>
                            </TableRow>
                          ))}
                          {historico.length === 0 && (
                            <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs italic">Sem novas atividades registadas.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Gerir Participantes</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Atividade</Label>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className="w-full justify-between"
                      >
                        {selectedAtividade ? (
                          <span className="truncate">{selectedAtividade}</span>
                        ) : (
                          <span className="text-muted-foreground">Escolha a atividade...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command filter={(value, search) => {
                        const normalizedValue = normalizeText(value);
                        const normalizedSearch = normalizeText(search);
                        return normalizedValue.includes(normalizedSearch) ? 1 : 0;
                      }}>
                        <CommandInput placeholder="Pesquisar atividade..." />
                        <CommandEmpty>Nenhuma atividade encontrada.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {filteredAtividades.map((a) => (
                              <CommandItem
                                key={a.id}
                                value={`${a.nome} ${a.local} ${a.ano}`}
                                onSelect={() => {
                                  setSelectedAtividade(a.nome || '');
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedAtividade === a.nome ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{a.nome}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {a.local} • {a.ano} • {a.totalNoites} noites
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {selectedAtividade && (
                  <>
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Filtrar elementos..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" /></div>
                    <div className="border rounded-md h-64 overflow-y-auto p-2 space-y-1">
                      {elementosDisponiveis.map(e => (
                        <label key={e.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                          <Checkbox checked={selectedElementos.includes(e.nome || '')} onCheckedChange={(checked) => setSelectedElementos(prev => checked ? [...prev, e.nome || ''] : prev.filter(x => x !== e.nome))} />
                          <span className="text-sm">{e.nome}</span>
                        </label>
                      ))}
                    </div>
                    <Button className="w-full" onClick={handleAddParticipantes} disabled={adding || selectedElementos.length === 0}>
                      {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Adicionar Selecionados
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Lista de Presenças</CardTitle></CardHeader>
              <CardContent>
                {!selectedAtividade ? <div className="text-center py-12 text-muted-foreground text-sm italic">Selecione uma atividade para ver a lista.</div> : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"><Checkbox checked={participantesAtividade.length > 0 && selectedParticipantes.length === participantesAtividade.length} onCheckedChange={(c) => setSelectedParticipantes(c ? participantesAtividade.map(p => p.id) : [])} /></TableHead>
                          <TableHead>Elemento</TableHead>
                          <TableHead className="text-right">Noites</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participantesAtividade.map(p => (
                          <TableRow key={p.id}>
                            <TableCell><Checkbox checked={selectedParticipantes.includes(p.id)} onCheckedChange={(checked) => setSelectedParticipantes(prev => checked ? [...prev, p.id] : prev.filter(id => id !== p.id))} /></TableCell>
                            <TableCell className="text-sm">{p.elemento}</TableCell>
                            <TableCell className="text-right text-sm">{p.totalNoites}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button variant="destructive" className="w-full" disabled={selectedParticipantes.length === 0 || removing} onClick={() => setDeleteDialogOpen(true)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remover Selecionados
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Confirmar Remoção</AlertDialogTitle><AlertDialogDescription>Deseja remover os elementos selecionados desta atividade?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">Remover</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
