import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Edit, Trash2, Loader2, ChevronRight, ChevronDown, Sparkles, List, LayoutGrid, BookOpen, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import SPPDialog from '@/components/SPPDialog';
import SPPMatrixView from '@/components/SPPMatrixView';
import { getSppIndividual, createSppIndividual, updateSppIndividual, deleteSppIndividual, GetSppIndividualOutputType, getElementos, GetElementosOutputType } from 'zite-endpoints-sdk';
import { getProgressionBadgeUrl } from '@/utils/progressionBadges';
import { getAreaBadgeUrl } from '@/utils/areaBadges';
import { formatDateForDisplay } from '@/utils/dateUtils';
import SPPMatrixObjetivosView from '@/components/SPPMatrixObjetivosView';
import { Permissions } from '@/utils/permissions';

type SPPRecord = GetSppIndividualOutputType['records'][0];
type ElementoRecord = GetElementosOutputType['records'][0] & {
  etapa?: string;
};

const SECTIONS = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros'];

type SPPViewProps = {
  perms: Permissions;
};

export default function SPPView({ perms }: SPPViewProps) {
  // Derivado do sistema central de permissões
  const isAdmin = perms.isCA;
  const isProgramer = perms.isProgramer;
  const userSection = perms.userSeccao;
  const userCategoria = perms.userCategoria;
  const userName = perms.userName;

  const [records, setRecords] = useState<SPPRecord[]>([]);
  const [elementos, setElementos] = useState<ElementoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>(!isAdmin ? userSection || '' : '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SPPRecord | undefined>();
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'matrix' | 'reference'>('list');

  // Admins e Dirigentes têm acesso de gestão
  const isManagement = isAdmin || userCategoria === 'Dirigente';
  const canEditRecords = isManagement;
  const canCreateRecords = !!selectedSection;

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const [sppData, elementosData] = await Promise.all([
        getSppIndividual({}),
        getElementos({})
      ]);
      setRecords(sppData.records);
      setElementos(elementosData.records);
    } catch (error) {
      toast.error('Erro ao carregar registos SPP');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!selectedSection) return [];
    
    let filtered = records.filter(r => 
      r.seccao === selectedSection && 
      r.elemento !== 'DELETED' && 
      r.area !== 'DELETED' && 
      r.objetivo !== 'DELETED'
    );
    
    // Utilizadores sem gestão só vêem os seus próprios registos
    if (!isManagement) {
      filtered = filtered.filter(r => r.elemento === userName);
    }
    
    return filtered;
  }, [records, selectedSection, isManagement, userName]);

  const groupedByElement = useMemo(() => {
    const groups = new Map<string, SPPRecord[]>();
    
    filteredRecords.forEach(record => {
      const elemento = record.elemento || 'Sem elemento';
      if (!groups.has(elemento)) {
        groups.set(elemento, []);
      }
      groups.get(elemento)!.push(record);
    });
    
    return Array.from(groups.entries()).map(([elemento, records]) => {
      const areaGroups = new Map<string, SPPRecord[]>();
      records.forEach(record => {
        const area = record.area || 'Sem área';
        if (!areaGroups.has(area)) {
          areaGroups.set(area, []);
        }
        areaGroups.get(area)!.push(record);
      });

      const areas = Array.from(areaGroups.entries()).map(([area, areaRecords]) => ({
        area,
        records: areaRecords,
        count: areaRecords.length
      }));

      return {
        elemento,
        areas,
        totalCount: records.length
      };
    });
  }, [filteredRecords]);

  const handleSave = async (record: Partial<SPPRecord>) => {
    try {
      if (editingRecord?.id && editingRecord.id > 0) {
        await updateSppIndividual({
          id: editingRecord.id,
          ...record
        });
        toast.success('Registo atualizado com sucesso');
      } else {
        await createSppIndividual({
          seccao: record.seccao!,
          elemento: record.elemento!,
          area: record.area!,
          sigla: record.sigla,
          objetivo: record.objetivo!,
          descricao: record.descricao,
          estado: record.estado,
          dataProposta: record.dataProposta,
          dataConcluido: record.dataConcluido
        });
        toast.success('Registo criado com sucesso');
      }
      await loadRecords();
      setEditingRecord(undefined);
    } catch (error) {
      toast.error('Erro ao guardar registo');
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem a certeza que deseja eliminar este registo?')) return;
    try {
      await deleteSppIndividual({ id });
      toast.success('Registo eliminado com sucesso');
      await loadRecords();
    } catch (error) {
      toast.error('Erro ao eliminar registo');
      console.error(error);
    }
  };

  const handleEdit = (record: SPPRecord) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingRecord(undefined);
    setDialogOpen(true);
  };

  const toggleElement = (elemento: string) => {
    setExpandedElements(prev => {
      const next = new Set(prev);
      if (next.has(elemento)) {
        next.delete(elemento);
      } else {
        next.add(elemento);
      }
      return next;
    });
  };

  const toggleArea = (elemento: string, area: string) => {
    const key = `${elemento}-${area}`;
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getEstadoBadge = (estado?: string) => {
    const variants: Record<string, string> = {
      'Proposto': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      'Em Progresso': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      'Concluído': 'bg-green-500/10 text-green-600 dark:text-green-400',
      'Cancelado': 'bg-red-500/10 text-red-600 dark:text-red-400'
    };
    
    return (
      <Badge variant="outline" className={variants[estado || 'Proposto']}>
        {estado || 'Proposto'}
      </Badge>
    );
  };

  const getAreaIcon = (area: string) => {
    const imageUrl = getAreaBadgeUrl(area);
    
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={area} 
          className="w-8 h-8 object-contain"
          title={area}
        />
      );
    }
    
    return <Sparkles className="h-8 w-8 text-primary" />;
  };

  const getElementoEtapa = (elementoNome: string): string | undefined => {
    const elemento = elementos.find(e => 
      e.nome === elementoNome && 
      e.seccao === selectedSection && 
      e.estado === 'Ativo'
    );
    return elemento?.etapa;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* CABEÇALHO E CONTROLOS */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label>Secção</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!isAdmin}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma secção" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSection && (
              <div className="space-y-2">
                <Label>Vista</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Lista
                  </Button>
                  <Button
                    variant={viewMode === 'matrix' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('matrix')}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Matriz
                  </Button>
                  <Button
                    variant={viewMode === 'reference' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('reference')}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Objetivos
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadRecords} disabled={loading} title="Atualizar dados">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {canCreateRecords && viewMode !== 'reference' && (
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Registo
              </Button>
            )}
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO */}
        {!selectedSection ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            Selecione uma secção para visualizar os dados
          </div>
        ) : (
          <div className="w-full">
            {/* 1. VISTA REFERENCIAL */}
            {viewMode === 'reference' && (
              <SPPMatrixObjetivosView selectedSection={selectedSection} />
            )}

            {/* 2. VISTA MATRIZ DE JOVENS */}
            {viewMode === 'matrix' && (
              <SPPMatrixView
                records={filteredRecords}
                selectedSection={selectedSection}
                canEdit={true}
                onCellClick={(record, prefill) => {
                  if (record) {
                    setEditingRecord(record);
                  } else if (prefill) {
                    setEditingRecord({
                      id: 0,
                      seccao: selectedSection,
                      elemento: prefill.elemento,
                      area: prefill.area,
                      objetivo: prefill.objetivo,
                      estado: 'Proposto'
                    } as SPPRecord);
                  }
                  setDialogOpen(true);
                }}
              />
            )}

            {/* 3. VISTA DE LISTA (ACORDEÕES) */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {groupedByElement.length === 0 ? (
                  <div className="border rounded-lg p-8 text-center text-muted-foreground">
                    Nenhum registo encontrado para esta secção
                  </div>
                ) : (
                  groupedByElement.map(({ elemento, areas, totalCount }) => {
                    const isElementExpanded = expandedElements.has(elemento);
                    const elementoEtapa = getElementoEtapa(elemento);
                    const badgeUrl = getProgressionBadgeUrl(selectedSection, elementoEtapa);
                    
                    return (
                      <Card key={elemento}>
                        <CardHeader 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleElement(elemento)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {isElementExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                              <div>
                                <h3 className="font-semibold text-lg">{elemento}</h3>
                                <p className="text-sm text-muted-foreground">{totalCount} trilhos</p>
                              </div>
                            </div>
                            {badgeUrl && <img src={badgeUrl} alt="Badge" className="w-12 h-12 object-contain" />}
                          </div>
                        </CardHeader>
                        
                        {isElementExpanded && (
                          <CardContent className="pt-0 space-y-3">
                            {areas.map(({ area, records: areaRecords, count }) => {
                              const areaKey = `${elemento}-${area}`;
                              const isAreaExpanded = expandedAreas.has(areaKey);
                              return (
                                <Card key={areaKey} className="bg-muted/30">
                                  <CardHeader className="py-3" onClick={() => toggleArea(elemento, area)}>
                                    <div className="flex items-center justify-between cursor-pointer">
                                      <div className="flex items-center gap-3">
                                        {isAreaExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        {getAreaIcon(area)}
                                        <h4 className="font-medium">{area} ({count})</h4>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  {isAreaExpanded && (
                                    <CardContent className="pt-0 space-y-3">
                                      {areaRecords.map(record => (
                                        <Card key={record.id} className="bg-background">
                                          <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                              <div className="space-y-1">
                                                <p className="text-xs font-mono text-muted-foreground">{record.sigla}</p>
                                                <p className="font-medium">{record.objetivo}</p>
                                                <p className="text-sm text-muted-foreground">{record.observacoes}</p>
                                              </div>
                                              <div className="flex flex-col items-end gap-2">
                                                {getEstadoBadge(record.estado)}
                                                <div className="flex gap-1">
                                                  <Button size="sm" variant="ghost" onClick={() => handleEdit(record)}><Edit className="h-4 w-4" /></Button>
                                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(record.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                              </div>
                                            </div>
                                            {(record.dataProposta || record.dataConcluido) && (
                                              <div className="flex items-center gap-4 mt-2 pt-2 border-t text-[11px] text-muted-foreground">
                                                {record.dataProposta && (
                                                  <span>Proposta: <span className="font-semibold text-foreground">{formatDateForDisplay(record.dataProposta)}</span></span>
                                                )}
                                                {record.dataConcluido && (
                                                  <span>Concluído: <span className="font-semibold text-foreground">{formatDateForDisplay(record.dataConcluido)}</span></span>
                                                )}
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </CardContent>
                                  )}
                                </Card>
                              );
                            })}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <SPPDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingRecord(undefined); }}
        onSave={handleSave}
        record={editingRecord}
        selectedSection={selectedSection}
        userSection={userSection}
        isAdmin={isAdmin}
        isProgramer={isProgramer}
        userName={userName}
        userCategoria={userCategoria}
      />
    </>
  );
}
