import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Paperclip, Filter, TrendingUp, TrendingDown, Layers, Tag } from 'lucide-react';
import { GetNMovimentosOutputType } from 'zite-endpoints-sdk';
type NMovimentos = GetNMovimentosOutputType['records'][0];
import { formatCurrency, parseValor, formatDateForDisplay } from '@/utils/dateUtils';
import FilePreviewDialog from '@/components/FilePreviewDialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type ReportsViewProps = {
  movimentos: NMovimentos[];
  userSection?: string;
  isAdmin: boolean;
};

// Hierarquia: Categoria → Secção → Atividade → Movimentos
interface GroupedStructure {
  [categoria: string]: {
    balance: number;
    sections: {
      [seccao: string]: {
        balance: number;
        atividades: {
          [atividade: string]: {
            balance: number;
            movimentos: NMovimentos[];
          };
        };
      };
    };
  };
}

export default function ReportsView({ movimentos, userSection, isAdmin }: ReportsViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedAtividades, setExpandedAtividades] = useState<Set<string>>(new Set());
  const [expandedTipos, setExpandedTipos] = useState<Set<string>>(new Set());
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  
  const [seccaoFiltro, setSeccaoFiltro] = useState<string>(isAdmin ? 'Todas' : (userSection || ''));
  const listaSeccoes = ['Todas', 'Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Agrupamento'];

  const groupedData = useMemo(() => {
    const data: GroupedStructure = {};

    const filtered = (movimentos || []).filter(m => {
      if (m.tipo === 'DELETED') return false;
      if (!isAdmin) return m.seccao === userSection;
      if (seccaoFiltro !== 'Todas') {
        const isAgrOnly = (m.agr as unknown) === true || m.agr === 'TRUE';
        if (seccaoFiltro === 'Agrupamento') return m.seccao === 'Agrupamento' || isAgrOnly;
        return m.seccao === seccaoFiltro;
      }
      return true;
    });
      
    filtered.forEach((m) => {
      const cat = m.categoria || 'Sem Categoria';
      const ativ = m.atividade?.trim() || 'Sem Atividade';
      const valorNumerico = parseValor(m.valor);
      const multiplicador = m.tipo === 'Receita' ? 1 : -1;
      const valorAjustado = valorNumerico * multiplicador;

      const addMovement = (targetSec: string) => {
        if (!data[cat]) data[cat] = { sections: {}, balance: 0 };
        if (!data[cat].sections[targetSec]) data[cat].sections[targetSec] = { balance: 0, atividades: {} };
        if (!data[cat].sections[targetSec].atividades[ativ]) {
          data[cat].sections[targetSec].atividades[ativ] = { balance: 0, movimentos: [] };
        }
        data[cat].sections[targetSec].atividades[ativ].movimentos.push(m);
        data[cat].sections[targetSec].atividades[ativ].balance += valorAjustado;
        data[cat].sections[targetSec].balance += valorAjustado;
        data[cat].balance += valorAjustado;
      };

      const isMarkedAsAgr = (m.agr as unknown) === true || m.agr === 'TRUE';
      addMovement(m.seccao || 'Sem Secção');
      if (isMarkedAsAgr && m.seccao !== 'Agrupamento' && (seccaoFiltro === 'Todas' || seccaoFiltro === 'Agrupamento')) {
        addMovement('Agrupamento');
      }
    });

    return data;
  }, [movimentos, seccaoFiltro, isAdmin, userSection]);

  const toggle = (set: Set<string>, key: string, updater: Function) => {
    const newSet = new Set(set);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    updater(newSet);
  };

  const getSectionStyles = (sec: string) => {
    const colors: any = {
      'Lobitos': 'border-l-yellow-500 bg-yellow-50/30 text-yellow-700',
      'Exploradores': 'border-l-green-500 bg-green-50/30 text-green-700',
      'Pioneiros': 'border-l-blue-500 bg-blue-50/30 text-blue-700',
      'Caminheiros': 'border-l-red-500 bg-red-50/30 text-red-700',
      'Agrupamento': 'border-l-purple-500 bg-purple-50/30 text-purple-700'
    };
    return colors[sec] || 'border-l-slate-300 bg-slate-50/30 text-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Header e Filtro */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-5 bg-white rounded-2xl border shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Relatório Consolidado</h2>
            <p className="text-sm text-muted-foreground">Dados provenientes de NMovimentos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border w-full sm:w-auto">
          <Filter className="h-4 w-4 ml-2 text-slate-500" />
          <select 
            value={seccaoFiltro}
            onChange={(e) => setSeccaoFiltro(e.target.value)}
            disabled={!isAdmin}
            className="text-sm font-bold bg-transparent pr-8 py-1.5 focus:outline-none cursor-pointer"
          >
            {listaSeccoes.map(sec => <option key={sec} value={sec}>{sec}</option>)}
          </select>
        </div>
      </div>

      {/* Hierarquia: Categoria → Secção → Atividade → Movimentos */}
      <div className="space-y-4">
        {Object.entries(groupedData).map(([categoria, catData]) => (
          <div key={categoria} className="border rounded-2xl bg-white shadow-sm overflow-hidden">
            {/* Nível 1: Categoria */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggle(expandedCategories, categoria, setExpandedCategories)}
            >
              <div className="flex items-center gap-3">
                <ChevronRight className={cn("h-5 w-5 text-slate-400 transition-transform", expandedCategories.has(categoria) && "rotate-90")} />
                <h3 className="text-lg font-bold text-slate-700">{categoria}</h3>
              </div>
              <div className={cn(
                "px-4 py-1.5 rounded-full font-bold text-sm",
                catData.balance >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              )}>
                {formatCurrency(catData.balance)}€
              </div>
            </div>

            {expandedCategories.has(categoria) && (
              <div className="bg-slate-50/50 p-3 space-y-3 border-t">
                {Object.entries(catData.sections).map(([seccao, secData]) => {
                  const secKey = `${categoria}-${seccao}`;
                  return (
                    // Nível 2: Secção
                    <div key={secKey} className={cn("border-l-4 border border-slate-200 rounded-r-xl bg-white", getSectionStyles(seccao))}>
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer"
                        onClick={() => toggle(expandedSections, secKey, setExpandedSections)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedSections.has(secKey) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="font-bold text-xs uppercase tracking-widest">{seccao}</span>
                        </div>
                        <span className="text-sm font-bold">{formatCurrency(secData.balance)}€</span>
                      </div>

                      {expandedSections.has(secKey) && (
                        <div className="px-3 pb-3 space-y-2">
                          {Object.entries(secData.atividades).map(([atividade, ativData]) => {
                            const ativKey = `${secKey}-${atividade}`;
                            const isSemAtividade = atividade === 'Sem Atividade';
                            return (
                              // Nível 3: Atividade
                              <div key={ativKey} className="bg-white/80 border border-slate-100 rounded-lg overflow-hidden">
                                <div 
                                  className="p-2.5 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                                  onClick={() => toggle(expandedAtividades, ativKey, setExpandedAtividades)}
                                >
                                  <div className="flex items-center gap-2">
                                    {expandedAtividades.has(ativKey) ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                                    <Tag className={cn("h-3.5 w-3.5", isSemAtividade ? "text-slate-300" : "text-primary/60")} />
                                    <span className={cn("text-xs font-semibold uppercase tracking-wide", isSemAtividade ? "text-slate-400 italic" : "text-slate-700")}>
                                      {atividade}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{ativData.movimentos.length}</Badge>
                                  </div>
                                  <span className={cn(
                                    "text-xs font-bold font-mono px-2 py-0.5 rounded-md",
                                    ativData.balance >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                  )}>
                                    {ativData.balance >= 0 ? '+' : ''}{formatCurrency(ativData.balance)}€
                                  </span>
                                </div>

                                {/* Nível 4: Movimentos agrupados por tipo */}
                                {expandedAtividades.has(ativKey) && (() => {
                                  const receitas = ativData.movimentos.filter(m => m.tipo === 'Receita');
                                  const despesas = ativData.movimentos.filter(m => m.tipo !== 'Receita');
                                  const totalReceitas = receitas.reduce((acc, m) => acc + parseValor(m.valor), 0);
                                  const totalDespesas = despesas.reduce((acc, m) => acc + parseValor(m.valor), 0);

                                  const renderMovimento = (m: NMovimentos) => (
                                    <div key={m.id} className="px-3 py-2.5 flex items-center justify-between">
                                      <div className="flex gap-3 items-center">
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold text-slate-700">
                                            {m.elemento ? `${m.elemento} — ` : ''}{m.descricao || '—'}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">{formatDateForDisplay(m.data)}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {m.link && (
                                          <button onClick={() => setPreviewFileUrl(m.link!)} className="text-primary p-1 hover:bg-slate-100 rounded transition-colors">
                                            <Paperclip className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                        <span className={cn(
                                          "text-xs font-mono font-bold",
                                          m.tipo === 'Receita' ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                          {m.tipo === 'Receita' ? '+' : '-'}{formatCurrency(parseValor(m.valor))}€
                                        </span>
                                      </div>
                                    </div>
                                  );

                                  const receitasKey = `${ativKey}-receitas`;
                                  const despesasKey = `${ativKey}-despesas`;

                                  return (
                                    <div className="border-t bg-white">
                                      {receitas.length > 0 && (
                                        <div>
                                          <div
                                            className="flex items-center justify-between px-3 py-1.5 bg-emerald-50/60 border-b border-emerald-100 cursor-pointer hover:bg-emerald-50"
                                            onClick={() => toggle(expandedTipos, receitasKey, setExpandedTipos)}
                                          >
                                            <div className="flex items-center gap-1.5">
                                              {expandedTipos.has(receitasKey) ? <ChevronDown className="h-3 w-3 text-emerald-600" /> : <ChevronRight className="h-3 w-3 text-emerald-600" />}
                                              <TrendingUp className="h-3 w-3 text-emerald-600" />
                                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Receitas</span>
                                              <span className="text-[10px] text-emerald-600 opacity-70">({receitas.length})</span>
                                            </div>
                                            <span className="text-[11px] font-bold font-mono text-emerald-700">+{formatCurrency(totalReceitas)}€</span>
                                          </div>
                                          {expandedTipos.has(receitasKey) && (
                                            <div className="divide-y divide-slate-50">{receitas.map(renderMovimento)}</div>
                                          )}
                                        </div>
                                      )}
                                      {despesas.length > 0 && (
                                        <div>
                                          <div
                                            className="flex items-center justify-between px-3 py-1.5 bg-rose-50/60 border-b border-rose-100 cursor-pointer hover:bg-rose-50"
                                            onClick={() => toggle(expandedTipos, despesasKey, setExpandedTipos)}
                                          >
                                            <div className="flex items-center gap-1.5">
                                              {expandedTipos.has(despesasKey) ? <ChevronDown className="h-3 w-3 text-rose-600" /> : <ChevronRight className="h-3 w-3 text-rose-600" />}
                                              <TrendingDown className="h-3 w-3 text-rose-600" />
                                              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700">Despesas</span>
                                              <span className="text-[10px] text-rose-600 opacity-70">({despesas.length})</span>
                                            </div>
                                            <span className="text-[11px] font-bold font-mono text-rose-700">-{formatCurrency(totalDespesas)}€</span>
                                          </div>
                                          {expandedTipos.has(despesasKey) && (
                                            <div className="divide-y divide-slate-50">{despesas.map(renderMovimento)}</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <FilePreviewDialog open={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} fileUrl={previewFileUrl || ''} />
    </div>
  );
}
