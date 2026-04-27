import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getEspecialidadesIndividual, GetEspecialidadesIndividualOutputType } from 'zite-endpoints-sdk';
import { Permissions } from '@/utils/permissions';

type IndividualRecord = GetEspecialidadesIndividualOutputType['records'][0];

function isCompleted(r: IndividualRecord): boolean {
  return r.req1 === 'TRUE' && r.req2 === 'TRUE' && r.req3 === 'TRUE' &&
    r.req4 === 'TRUE' && r.req5 === 'TRUE' && r.req6 === 'TRUE';
}

interface ElementoRow {
  elemento: string;
  seccao: string;
  concluidas: number;
  emProgresso: number;
  records: IndividualRecord[];
}

interface Props {
  perms: Permissions;
}

export default function EspecialidadesPorElementoView({ perms }: Props) {
  const [allRecords, setAllRecords] = useState<IndividualRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [seccaoFilter, setSeccaoFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    getEspecialidadesIndividual({})
      .then(data => setAllRecords(data.records))
      .finally(() => setLoading(false));
  }, []);

  const visibleRecords = useMemo(() => {
    if (perms.canViewOnlyOwnRecords) {
      return allRecords.filter(r => r.elemento === perms.userName);
    }
    if (perms.canViewOwnSectionOnly) {
      return allRecords.filter(r => r.seccao === perms.userSeccao);
    }
    return allRecords;
  }, [allRecords, perms]);

  const seccoes = useMemo(() => {
    const set = new Set(visibleRecords.map(r => r.seccao).filter(Boolean));
    return Array.from(set).sort();
  }, [visibleRecords]);

  const elementoRows = useMemo(() => {
    const filtered = seccaoFilter !== 'all'
      ? visibleRecords.filter(r => r.seccao === seccaoFilter)
      : visibleRecords;

    const map = new Map<string, ElementoRow>();
    for (const r of filtered) {
      const key = `${r.elemento}__${r.seccao}`;
      if (!map.has(key)) {
        map.set(key, { elemento: r.elemento, seccao: r.seccao, concluidas: 0, emProgresso: 0, records: [] });
      }
      const row = map.get(key)!;
      row.records.push(r);
      if (isCompleted(r)) row.concluidas++;
      else row.emProgresso++;
    }

    return Array.from(map.values()).sort((a, b) => {
      const sc = a.seccao.localeCompare(b.seccao, 'pt');
      if (sc !== 0) return sc;
      return a.elemento.localeCompare(b.elemento, 'pt');
    });
  }, [visibleRecords, seccaoFilter]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Secção:</span>
        </div>
        <Select value={seccaoFilter} onValueChange={setSeccaoFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas as secções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as secções</SelectItem>
            {seccoes.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {elementoRows.length} elemento{elementoRows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {elementoRows.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          Nenhum elemento com especialidades registadas
        </div>
      ) : (
        <div className="space-y-2">
          {elementoRows.map(row => {
            const key = `${row.elemento}__${row.seccao}`;
            const isOpen = expanded.has(key);
            const total = row.concluidas + row.emProgresso;

            return (
              <div key={key} className="border rounded-lg bg-card overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <span className="text-muted-foreground">
                    {isOpen
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />
                    }
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{row.elemento}</p>
                    <p className="text-xs text-muted-foreground">{row.seccao}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {row.concluidas > 0 && (
                      <Badge variant="outline" className="border-green-500/60 text-green-600 bg-green-500/10 text-xs gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        {row.concluidas} concluída{row.concluidas !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {row.emProgresso > 0 && (
                      <Badge variant="outline" className="border-yellow-500/60 text-yellow-600 bg-yellow-500/10 text-xs gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                        {row.emProgresso} em progresso
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground pl-1">{total} total</span>
                  </div>
                </button>

                {/* Expanded especialidades */}
                {isOpen && (
                  <div className="border-t bg-muted/20 px-4 py-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {row.records
                        .slice()
                        .sort((a, b) => a.especialidade.localeCompare(b.especialidade, 'pt'))
                        .map((r, i) => {
                          const done = isCompleted(r);
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                                done
                                  ? 'border-green-500/40 bg-green-500/5'
                                  : 'border-yellow-500/40 bg-yellow-500/5'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-green-500' : 'bg-yellow-500'}`} />
                              <span className="flex-1 truncate font-medium">{r.especialidade}</span>
                              <span className={`text-xs shrink-0 ${done ? 'text-green-600' : 'text-yellow-600'}`}>
                                {done ? 'Concluída' : 'Em Progresso'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
