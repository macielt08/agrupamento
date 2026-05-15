import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CalendarDays, Map as MapIcon, List, RotateCw, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { getAtividades, deleteAtividade, getNoitesCampo, GetAtividadesOutputType, GetNoitesCampoOutputType } from 'zite-endpoints-sdk';
import AtividadeDialog from './AtividadeDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatDateForDisplay } from '@/utils/dateUtils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Atividade = GetAtividadesOutputType['atividades'][0];

type AtividadesViewProps = {
  userSection?: string;
  isAdmin: boolean;
  isProgramer: boolean;
};

const AtividadesMap = lazy(() => import('./AtividadesMap'));

const openInGoogleMaps = (lat: any, lng: any) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  window.open(url, '_blank');
};

export default function AtividadesView({ userSection, isAdmin, isProgramer }: AtividadesViewProps) {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [noitesCampo, setNoitesCampo] = useState<GetNoitesCampoOutputType['records']>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeccao, setSelectedSeccao] = useState<string>(isAdmin || isProgramer ? 'Todos' : userSection || '' );
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [atividadeToDelete, setAtividadeToDelete] = useState<Atividade | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [view, setView] = useState<'table' | 'map'>('table');

  const availableYears = useMemo(() => {
    const years = atividades
      .map(a => a.ano?.toString())
      .filter((year): year is string => !!year && year !== 'DELETED');
    return Array.from(new Set(years)).sort((a, b) => b.localeCompare(a));
  }, [atividades]);

  const fetchAtividades = async () => {
    setLoading(true);
    try {
      const [atividadesResult, noitesCampoResult] = await Promise.all([
        getAtividades({}),
        getNoitesCampo({})
      ]);
      setAtividades(atividadesResult.atividades);
      setNoitesCampo(noitesCampoResult.records);
    } catch (error) {
      toast.error('Erro ao carregar atividades');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtividades();
  }, []);

  const getParticipantCount = (atividadeNome: string): number => {
    const uniqueElementos = new Set(
      noitesCampo
        .filter(nc => nc.atividade === atividadeNome && nc.elemento && nc.elemento.trim() !== '')
        .map(nc => nc.elemento)
    );
    return uniqueElementos.size;
  };

  const filteredAtividades = useMemo(() => {
    const filtered = atividades.filter((atividade) => {
      if (atividade.nome === 'DELETED') return false;
      if (selectedSeccao !== 'Todos') {
        if (selectedSeccao && (atividade.seccao !== selectedSeccao && atividade.seccao !== 'Agrupamento')) return false;
      }
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const nomeMatch = atividade.nome?.toLowerCase().includes(search);
        const localMatch = atividade.local?.toLowerCase().includes(search);
        
        if (!nomeMatch && !localMatch) return false;
      };
      if (selectedYear !== 'all' && atividade.ano?.toString() !== selectedYear) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      // Função auxiliar para converter string em timestamp comparável
      const parseDate = (dateStr: any) => {
        if (!dateStr) return 0;
        
        // Se a data já for um objeto Date ou ISO format (YYYY-MM-DD)
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.getTime();

        // Se a data vier no formato DD/MM/YYYY (comum em inputs manuais)
        if (typeof dateStr === 'string' && dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/').map(Number);
          return new Date(year, month - 1, day).getTime();
        }

        return 0;
      };

      const dateA = parseDate(a.dataInicio);
      const dateB = parseDate(b.dataInicio);

      return dateB - dateA; // Decrescente
    });
  }, [atividades, selectedSeccao, searchTerm, selectedYear]);

  const totalItems = filteredAtividades.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedAtividades = useMemo(() => {
    return filteredAtividades.slice(startIndex, endIndex);
  }, [filteredAtividades, startIndex, endIndex]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSeccao, searchTerm, selectedYear, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleEdit = (atividade: Atividade) => {
    setEditingAtividade(atividade);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingAtividade(undefined);
    setDialogOpen(true);
  };

  const handleDeleteClick = (atividade: Atividade) => {
    setAtividadeToDelete(atividade);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!atividadeToDelete) return;
    try {
      await deleteAtividade({ id: atividadeToDelete.id });
      toast.success('Atividade eliminada com sucesso');
      fetchAtividades();
    } catch (error) {
      toast.error('Erro ao eliminar atividade');
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setAtividadeToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE FILTROS E AÇÕES */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Select 
            value={selectedSeccao} 
            onValueChange={setSelectedSeccao} 
            disabled={!isAdmin && !isProgramer}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Selecione uma secção" />
            </SelectTrigger>
            <SelectContent>
              {(isAdmin || isProgramer) && <SelectItem value="Todos">Todos</SelectItem>}
              <SelectItem value="Lobitos">Lobitos</SelectItem>
              <SelectItem value="Exploradores">Exploradores</SelectItem>
              <SelectItem value="Pioneiros">Pioneiros</SelectItem>
              <SelectItem value="Caminheiros">Caminheiros</SelectItem>
              <SelectItem value="Agrupamento">Agrupamento</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Anos</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* BOTÃO DE REFRESH */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchAtividades} 
            disabled={loading}
            title="Atualizar dados"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'map')} className="w-full sm:w-[200px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table"><List className="h-4 w-4 mr-2" /> Lista</TabsTrigger>
              <TabsTrigger value="map"><MapIcon className="h-4 w-4 mr-2" /> Mapa</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button onClick={handleCreate} className="whitespace-nowrap font-bold">
            <Plus className="h-4 w-4 mr-2" /> Nova Atividade
          </Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
      ) : (
        <>
          {view === 'table' ? (
            /* VISTA DE TABELA E CARDS */
            <>
              {/* TABELA (DESKTOP) */}
              <div className="hidden md:block border rounded-lg bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Secção</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead className="flex items-center gap-1">
                        Fim <CalendarDays className="h-3 w-3" />
                      </TableHead>
                      <TableHead>Noites</TableHead>
                      <TableHead>Partic.</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAtividades.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhuma atividade encontrada</TableCell></TableRow>
                    ) : (
                      paginatedAtividades.map((atividade) => (
                        <TableRow key={atividade.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>{atividade.seccao || '-'}</TableCell>
                          <TableCell className="font-semibold text-primary">{atividade.nome}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {/* Verifica se lat e lng existem e não são strings vazias/brancas */}
                              {atividade.lat?.toString().trim() && atividade.lng?.toString().trim() && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => openInGoogleMaps(atividade.lat, atividade.lng)}
                                  title="Ver no Google Maps"
                                >
                                  <MapPin className="h-4 w-4" />
                                </Button>
                              )}
                              <span>{atividade.local || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{atividade.dataInicio ? formatDateForDisplay(atividade.dataInicio) : '-'}</TableCell>
                          <TableCell className="font-medium">{atividade.dataFim ? formatDateForDisplay(atividade.dataFim) : '-'}</TableCell>
                          <TableCell>{atividade.totalNoites || '-'}</TableCell>
                          <TableCell>{getParticipantCount(atividade.nome!)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(atividade)} className="hover:text-blue-600"><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(atividade)} className="hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* CARDS (MOBILE) */}
              <div className="md:hidden space-y-4">
                {paginatedAtividades.map((atividade) => (
                  <Card key={atividade.id} className="shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base text-primary font-bold">{atividade.nome}</CardTitle>
                        <span className="text-xs font-medium bg-muted px-2 py-1 rounded">{atividade.seccao}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="grid grid-cols-2 gap-2 border-b pb-2">
                        <p><span className="text-muted-foreground block text-xs uppercase">Fim:</span> {atividade.dataFim ? formatDateForDisplay(atividade.dataFim) : '-'}</p>
                        <p>
                          <span className="text-muted-foreground block text-xs uppercase">Local:</span> 
                          <span className="flex items-center gap-1">
                            {atividade.lat?.toString().trim() && atividade.lng?.toString().trim() && (
                              <MapPin 
                                className="h-3 w-3 text-red-500" 
                                onClick={() => openInGoogleMaps(atividade.lat, atividade.lng)}
                              />
                            )}
                            {atividade.local || '-'}
                          </span>
                        </p>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-xs text-muted-foreground">{getParticipantCount(atividade.nome!)} participantes</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(atividade)}>Editar</Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteClick(atividade)} className="text-destructive border-destructive/20">Eliminar</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* PAGINAÇÃO */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Linhas:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm font-medium">
                  {totalItems > 0 ? startIndex + 1 : 0}-{endIndex} de {totalItems}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <div className="flex items-center justify-center min-w-[80px] text-sm px-2">{currentPage} / {totalPages || 1}</div>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          ) : (
            /* VISTA DE MAPA */
            <div className="border rounded-lg bg-white p-2 min-h-[500px]">
              <Suspense fallback={<div className="h-[500px] w-full bg-muted animate-pulse rounded-lg" />}>
                <AtividadesMap atividades={filteredAtividades} onEdit={handleEdit} />
              </Suspense>
            </div>
          )}
        </>
      )}

      {/* DIÁLOGOS DE INTERAÇÃO */}
      <AtividadeDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        atividade={editingAtividade} 
        onSuccess={fetchAtividades} 
        userSection={userSection} 
        isAdmin={isAdmin} 
        isProgramer={isProgramer} 
        selectedSection={selectedSeccao} 
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Atividade</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-white hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
