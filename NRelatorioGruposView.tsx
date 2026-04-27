import { useState, useMemo } from 'react';
import { GetNMovimentosOutputType } from 'zite-endpoints-sdk';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, FolderTree, Search } from 'lucide-react';
import { formatCurrency, parseValor, formatDateForDisplay } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type NMovimentos = GetNMovimentosOutputType['records'][0];

type CategoriasViewProps = {
  movimentos: NMovimentos[];
  isAdmin: boolean;
  userSection?: string;
};

interface GroupedByCategoria {
  [categoria: string]: {
    total: number;
    receitas: NMovimentos[];
    despesas: NMovimentos[];
  };
}

export default function CategoriasView({ movimentos, isAdmin, userSection }: CategoriasViewProps) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const groupedData = useMemo(() => {
    const data: GroupedByCategoria = {};

    const filtered = (movimentos || []).filter(m => {
      // 1. Excluir eliminados
      if (m.tipo === 'DELETED') return false;
      
      // 2. Filtro de Segurança (Se não for admin, vê apenas a sua secção)
      if (!isAdmin && m.seccao !== userSection) return false;

      // 3. Filtro de Pesquisa (opcional para facilitar a navegação)
      if (searchTerm && !m.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !m.elemento?.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      return true;
    });

    filtered.forEach((m) => {
      const cat = m.categoria || 'Sem Categoria';
      
      if (!data[cat]) {
        data[cat] = { total: 0, receitas: [], despesas: [] };
      }

      const valorNum = parseValor(m.valor);
      
      if (m.tipo === 'Receita') {
        data[cat].receitas.push(m);
        data[cat].total += valorNum;
      } else {
        data[cat].despesas.push(m);
        data[cat].total -= valorNum;
      }
    });

    return data;
  }, [movimentos, isAdmin, userSection, searchTerm]);

  const toggleCat = (cat: string) => {
    const newSet = new Set(expandedCats);
    newSet.has(cat) ? newSet.delete(cat) : newSet.add(cat);
    setExpandedCats(newSet);
  };

  return (
    <div className="space-y-6">
      {/* Header com Pesquisa */}
      <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-white rounded-2xl border shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FolderTree className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Análise por Categoria</h2>
            <p className="text-sm text-muted-foreground">Visão consolidada de fluxos financeiros</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar categoria..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Categorias */}
      <div className="grid gap-4">
        {Object.entries(groupedData).sort().map(([catName, data]) => (
          <Card key={catName} className="overflow-hidden border-slate-200 shadow-sm">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleCat(catName)}
            >
              <div className="flex items-center gap-3">
                {expandedCats.has(catName) ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                <span className="font-bold text-slate-700">{catName}</span>
                <Badge variant="outline" className="text-[10px]">{data.receitas.length + data.despesas.length} mov.</Badge>
              </div>
              <div className={cn(
                "font-mono font-bold px-3 py-1 rounded-lg",
                data.total >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}>
                {formatCurrency(data.total)}€
              </div>
            </div>

            {expandedCats.has(catName) && (
              <CardContent className="p-0 border-t bg-slate-50/30">
                <div className="grid md:grid-cols-2 divide-x divide-slate-100">
                  
                  {/* Coluna de Receitas */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                      <TrendingUp className="h-4 w-4" /> Receitas
                    </div>
                    <div className="space-y-2">
                      {data.receitas.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhuma receita</p>}
                      {data.receitas.map(m => <MovimentoRow key={m.id} m={m} />)}
                    </div>
                  </div>

                  {/* Coluna de Despesas */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3 text-rose-600 font-bold text-xs uppercase tracking-wider">
                      <TrendingDown className="h-4 w-4" /> Despesas
                    </div>
                    <div className="space-y-2">
                      {data.despesas.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhuma despesa</p>}
                      {data.despesas.map(m => <MovimentoRow key={m.id} m={m} />)}
                    </div>
                  </div>

                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// Sub-componente para a linha do movimento para evitar repetição de código
function MovimentoRow({ m }: { m: NMovimentos }) {
  return (
    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg group hover:border-blue-200 transition-all">
      <div className="flex flex-col">
        <span className="text-xs font-bold text-slate-700">{m.elemento || 'Sem nome'}</span>
        <div className="flex gap-2 items-center">
          <span className="text-[9px] text-muted-foreground uppercase">{m.seccao}</span>
          <span className="text-[9px] text-slate-300">•</span>
          <span className="text-[9px] text-muted-foreground">{formatDateForDisplay(m.data)}</span>
        </div>
      </div>
      <span className={cn(
        "text-xs font-mono font-bold",
        m.tipo === 'Receita' ? "text-emerald-600" : "text-rose-600"
      )}>
        {m.tipo === 'Receita' ? '+' : '-'}{formatCurrency(m.valor)}€
      </span>
    </div>
  );
}
