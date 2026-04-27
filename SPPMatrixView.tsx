import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Circle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { GetSppIndividualOutputType, getElementos, GetElementosOutputType } from 'zite-endpoints-sdk';
import { getProgressionBadgeUrl } from '@/utils/progressionBadges';
import { getAreaBadgeUrl } from '@/utils/areaBadges';

type SPPRecord = GetSppIndividualOutputType['records'][0];

type SPPMatrixViewProps = {
  records: SPPRecord[];
  selectedSection: string;
  canEdit?: boolean;
  onCellClick?: (record: SPPRecord | null, prefill?: { area: string; objetivo: string; elemento: string }) => void;
};

const AREA_COLORS: Record<string, string> = {
  'Físico': 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800',
  'Afetivo': 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800',
  'Caracter': 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800',
  'Espiritual': 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-800',
  'Intelectual': 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800',
  'Social': 'bg-yellow-100 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800'
};

export default function SPPMatrixView({ records, selectedSection, canEdit = false, onCellClick }: SPPMatrixViewProps) {
  const [elementos, setElementos] = useState<GetElementosOutputType['records']>([]);

  useEffect(() => {
    const fetchElementos = async () => {
      try {
        const result = await getElementos({});
        setElementos(result.records);
      } catch (error) {
        console.error('Error fetching elementos:', error);
      }
    };
    fetchElementos();
  }, []);

  const matrixData = useMemo(() => {
    const elementosList = Array.from(new Set(records.map(r => r.elemento))).filter(e => e).sort();
    
    const areaObjectives = new Map<string, Map<string, Map<string, SPPRecord>>>();
    
    records.forEach(record => {
      const area = record.area || '';
      const objetivo = record.objetivo || '';
      const elemento = record.elemento || '';
      
      if (!areaObjectives.has(area)) {
        areaObjectives.set(area, new Map());
      }
      const areaMap = areaObjectives.get(area)!;
      if (!areaMap.has(objetivo)) {
        areaMap.set(objetivo, new Map());
      }
      areaMap.get(objetivo)!.set(elemento, record);
    });
    
    const areas = Array.from(areaObjectives.entries()).map(([area, objectives]) => {
      const objectivesList = Array.from(objectives.entries()).map(([objetivo, elementoRecords]) => ({
        objetivo,
        elementoRecords
      }));
      return { area, objectives: objectivesList, rowspan: objectivesList.length };
    });
    
    return { elementos: elementosList, areas };
  }, [records]);

  const getStatusCell = (record?: SPPRecord, area?: string, objetivo?: string, elemento?: string) => {
    const isClickable = !!onCellClick;
    const hasRecord = !!record;

    if (!record) {
      return (
        <div className="flex items-center justify-center">
          {isClickable && canEdit ? (
            <Plus className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/40" />
          )}
        </div>
      );
    }

    switch (record.estado) {
      case 'Concluído':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'Em Progresso':
        return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'Proposto':
        return <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground/40" />;
    }
  };

  const handleCellClick = (record: SPPRecord | null, area: string, objetivo: string, elemento: string) => {
    if (!onCellClick) return;
    if (record) {
      onCellClick(record);
    } else if (canEdit) {
      onCellClick(null, { area, objetivo, elemento });
    }
  };

  if (!selectedSection) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Selecione uma secção para visualizar a matriz
      </div>
    );
  }

  if (matrixData.elementos.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Nenhum registo encontrado para esta secção
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista Matricial - {selectedSection}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-background border border-border p-2 md:p-3 text-left min-w-[40px] md:min-w-[120px]">
                  <div className="font-semibold md:block hidden">Área</div>
                  <div className="font-semibold md:hidden writing-mode-vertical transform rotate-180 text-[10px] whitespace-nowrap w-full flex items-center justify-center py-1">
                    Área
                  </div>
                </th>
                <th className="sticky left-[40px] md:left-[120px] z-20 bg-background border border-border p-3 text-left min-w-[120px] md:min-w-[200px]">
                  <div className="font-semibold text-xs md:text-sm">Trilho</div>
                </th>
                {matrixData.elementos.map((elemento) => {
                  const elementoData = elementos.find(e => e.nome === elemento && e.seccao === selectedSection);
                  const badgeUrl = elementoData ? getProgressionBadgeUrl(elementoData.seccao, elementoData.etapa) : null;
                  return (
                    <th
                      key={elemento}
                      className="border border-border p-3 text-center min-w-[80px] md:min-w-[100px] bg-muted/50"
                    >
                      <div className="flex flex-col items-center gap-2">
                        {badgeUrl && (
                          <img
                            src={badgeUrl}
                            alt={elementoData?.etapa || 'Etapa'}
                            className="w-8 h-8 md:w-10 md:h-10 object-contain"
                            title={elementoData?.etapa || ''}
                          />
                        )}
                        <div className="font-semibold text-xs md:text-sm">{elemento}</div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {matrixData.areas.map(({ area, objectives, rowspan }) => (
                objectives.map(({ objetivo, elementoRecords }, idx) => (
                  <tr key={`${area}-${objetivo}-${idx}`}>
                    {idx === 0 && (
                      <td
                        rowSpan={rowspan}
                        className={`sticky left-0 z-10 border border-border p-1 md:p-3 ${AREA_COLORS[area] || 'bg-muted/30'} align-middle`}
                      >
                        <div className="hidden md:flex md:flex-col md:items-center md:gap-2">
                          {getAreaBadgeUrl(area) && (
                            <img src={getAreaBadgeUrl(area)!} alt={area} className="w-10 h-10 object-contain" title={area} />
                          )}
                          <div className="font-semibold text-sm">{area}</div>
                        </div>
                        <div className="md:hidden flex flex-col items-center justify-center gap-1 py-1">
                          {getAreaBadgeUrl(area) && (
                            <img src={getAreaBadgeUrl(area)!} alt={area} className="w-8 h-8 object-contain" title={area} />
                          )}
                          <div className="font-semibold text-[10px] writing-mode-vertical transform rotate-180 whitespace-nowrap">
                            {area}
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="sticky left-[40px] md:left-[120px] z-10 border border-border p-2 md:p-3 bg-background">
                      <div className="text-xs md:text-sm">{objetivo}</div>
                    </td>
                    {matrixData.elementos.map((elemento) => {
                      const record = elementoRecords.get(elemento);
                      const isClickable = !!onCellClick && (!!record || canEdit);
                      return (
                        <td
                          key={`${area}-${objetivo}-${elemento}`}
                          className={`group border border-border p-2 md:p-3 text-center transition-colors
                            ${isClickable ? 'cursor-pointer hover:bg-primary/10' : 'hover:bg-muted/50'}
                            ${record ? 'bg-background' : 'bg-background'}`}
                          title={
                            record
                              ? `${record.estado} — Clique para editar`
                              : canEdit && onCellClick
                              ? 'Clique para criar registo'
                              : 'Não iniciado'
                          }
                          onClick={() => handleCellClick(record || null, area, objetivo, elemento)}
                        >
                          <div className="flex items-center justify-center">
                            {getStatusCell(record, area, objetivo, elemento)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-muted-foreground/40" />
            <span>Não iniciado</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span>Proposto</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span>Em Progresso</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span>Concluído</span>
          </div>
          {canEdit && onCellClick && (
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground/40" />
              <span>Clique para criar</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
