import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Permissions } from '@/utils/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getNMovimentos, GetNMovimentosOutputType } from 'zite-endpoints-sdk';
import { getNTransferencias, GetNTransferenciasOutputType } from 'zite-endpoints-sdk';
import { getNDepositos, GetNDepositosOutputType } from 'zite-endpoints-sdk';

type NDeposito = GetNDepositosOutputType['records'][0];
import { TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, FileText, ChevronRight, RefreshCw, Loader2, Building2, Users, Tag, LayoutGrid, FileBarChart, Banknote, Landmark } from "lucide-react";
import { ReceitasPorPagamento, ReceitasPorPagamentoSeccao, TotalPorCategoria, TotalPorCategoriaSeccao } from '@/components/NRelatoriosGrelhaExtras';
import { formatDateForDisplay } from '@/utils/dateUtils';
import { toast } from 'sonner';

type NMovimento = GetNMovimentosOutputType['records'][0];

interface NRelatoriosViewProps {
  perms: Permissions;
}

const loadScript = (src: string): Promise<void> => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve(undefined);
  const s = document.createElement('script');
  s.src = src; s.onload = () => resolve(undefined); s.onerror = reject;
  document.head.appendChild(s);
});

// ─── Module-level row renderer ───────────────────────────────────────────────
const MovimentoRow = ({ r, type }: { r: NMovimento; type: 'Receita' | 'Despesa' }) => (
  <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
    <TableCell className="py-2 text-xs text-muted-foreground">{r.seccao || '—'}</TableCell>
    <TableCell className="pl-4 py-2 font-medium text-sm">{r.descricao || '—'}</TableCell>
    <TableCell className="py-2 text-xs text-muted-foreground">{r.elemento || '—'}</TableCell>
    <TableCell className="py-2 text-xs">{formatDateForDisplay(r.data)}</TableCell>
    <TableCell className={`text-right py-2 font-mono font-bold ${type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
      {(Number(r.valor) || 0).toFixed(2)}€
    </TableCell>
    <TableCell className="text-right pr-4 py-2">
      <Badge variant="outline" className="text-[9px]">{r.estadoMovimento || '—'}</Badge>
    </TableCell>
  </TableRow>
);

// ─── Sub-component: Expandable activity groups within a category ─────────────
const AtividadeGroupRows = ({ groups, type }: {
  groups: [string, NMovimento[]][];
  type: 'Receita' | 'Despesa';
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      {groups.map(([key, rows]) => {
        const groupTotal = rows.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
        const label = key === '__geral__' ? 'Geral' : key;
        const isOpen = !!expanded[key];
        return (
          <React.Fragment key={key}>
            <TableRow
              className="bg-amber-50/80 dark:bg-amber-900/10 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 border-t border-amber-200/60 dark:border-amber-800/40 cursor-pointer select-none"
              onClick={() => toggle(key)}
            >
              <TableCell colSpan={6} className="py-1.5 px-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                    <Tag className="h-3 w-3" />{label}
                  </span>
                  <span className={`text-[11px] font-mono font-bold ${type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {groupTotal.toFixed(2)}€
                  </span>
                </div>
              </TableCell>
            </TableRow>
            {isOpen && rows.map(r => <MovimentoRow key={r.id} r={r} type={type} />)}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ─── Sub-component: Expandable table per category ───────────────────────────
const ReportTable = ({ title, data, type }: { title: string; data: NMovimento[]; type: 'Receita' | 'Despesa' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const total = data.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);

  // Group by atividade when any record has it filled
  const atividadeGroups = useMemo(() => {
    const hasAtividade = data.some(r => r.atividade);
    if (!hasAtividade) return null;
    const groups: Record<string, NMovimento[]> = {};
    for (const r of data) {
      const key = r.atividade || '__geral__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === '__geral__') return 1;
      if (b === '__geral__') return -1;
      return a.localeCompare(b);
    });
  }, [data]);

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
      <CardHeader
        className={`py-3 flex flex-row items-center justify-between space-y-0 cursor-pointer ${type === 'Receita' ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            {type === 'Receita' ? <ArrowUpCircle className="h-4 w-4 text-green-600" /> : <ArrowDownCircle className="h-4 w-4 text-red-600" />}
            {title}
          </CardTitle>
        </div>
        <div className={`text-xs font-mono font-bold px-2 py-1 rounded-md bg-white/50 dark:bg-slate-900/50 border shadow-sm ${type === 'Receita' ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'}`}>
          {total.toFixed(2)}€
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-transparent">
                <TableHead className="h-9 text-[11px] uppercase font-bold text-muted-foreground">Secção</TableHead>
                <TableHead className="pl-4 h-9 text-[11px] uppercase font-bold text-muted-foreground">Descrição</TableHead>
                <TableHead className="h-9 text-[11px] uppercase font-bold text-muted-foreground">Elemento</TableHead>
                <TableHead className="h-9 text-[11px] uppercase font-bold text-muted-foreground">Data</TableHead>
                <TableHead className="text-right h-9 text-[11px] uppercase font-bold text-muted-foreground">Valor</TableHead>
                <TableHead className="text-right pr-4 h-9 text-[11px] uppercase font-bold text-muted-foreground">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-16 text-center text-muted-foreground text-xs italic">Sem registos.</TableCell></TableRow>
              ) : atividadeGroups ? (
                <AtividadeGroupRows groups={atividadeGroups} type={type} />
              ) : data.map(r => <MovimentoRow key={r.id} r={r} type={type} />)}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
};

// ─── Sub-component: Agr group header + categories ────────────────────────────
const AgrGroup = ({ agrLabel, categorias, data, type }: {
  agrLabel: 'Agrupamento' | 'Secção';
  categorias: string[];
  data: NMovimento[];
  type: 'Receita' | 'Despesa';
}) => {
  const [isOpen, setIsOpen] = useState(true); 
  
  const total = data.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
  const isAgr = agrLabel === 'Agrupamento';

  return (
    <div className="space-y-2">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer select-none transition-all active:scale-[0.99] ${
          isAgr 
            ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800' 
            : 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${isAgr ? 'text-purple-600' : 'text-blue-600'}`} />
          {isAgr ? <Building2 className="h-4 w-4 text-purple-600" /> : <Users className="h-4 w-4 text-blue-600" />}
          <span className={`text-xs font-bold uppercase tracking-wider ${isAgr ? 'text-purple-700 dark:text-purple-400' : 'text-blue-700 dark:text-blue-400'}`}>
            {agrLabel}
          </span>
        </div>
        <span className={`text-xs font-mono font-bold ${type === 'Receita' ? 'text-green-700' : 'text-red-700'}`}>
          {total.toFixed(2)}€
        </span>
      </div>

      {isOpen && (
        <div className="space-y-2 pl-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {categorias.map(cat => (
            <ReportTable
              key={cat}
              title={cat}
              data={data.filter(r => (r.categoria || 'Sem Categoria') === cat)}
              type={type}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Sub-component: Full column (Receitas or Despesas) ───────────────────────
const TipoColumn = ({ tipo, data }: { tipo: 'Receita' | 'Despesa'; data: NMovimento[] }) => {
  const grouped = useMemo(() => {
    const result: { label: 'Agrupamento' | 'Secção'; categorias: string[]; records: NMovimento[] }[] = [];
    const agrOrder: ('Agrupamento' | 'Secção')[] = ['Agrupamento', 'Secção'];

    for (const agrLabel of agrOrder) {
      const filtered = data.filter(r => agrLabel === 'Agrupamento' ? r.agr === 'true' : r.agr !== 'true');
      if (filtered.length === 0) continue;
      const cats = [...new Set(filtered.map(r => r.categoria || 'Sem Categoria'))] as string[];
      result.push({ label: agrLabel, categorias: cats, records: filtered });
    }
    return result;
  }, [data]);

  const isReceita = tipo === 'Receita';
  const total = data.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);

  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${isReceita ? 'bg-green-600 border-green-700' : 'bg-red-600 border-red-700'} text-white`}>
        <div className="flex items-center gap-2">
          {isReceita ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
          <span className="font-bold text-sm uppercase tracking-wide">{isReceita ? 'Receitas' : 'Despesas'}</span>
        </div>
        <span className="font-mono font-bold text-sm">{total.toFixed(2)}€</span>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs italic">Sem registos.</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(g => (
            <AgrGroup key={g.label} agrLabel={g.label} categorias={g.categorias} data={g.records} type={tipo} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function NRelatoriosView({ perms }: NRelatoriosViewProps) {
  const isAdmin = perms.isCA;
  const userSeccao = perms.userSeccao;

  const [records, setRecords] = useState<NMovimento[]>([]);
  const [depositosRecords, setDepositosRecords] = useState<NDeposito[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [seccaoAtiva, setSeccaoAtiva] = useState<string>('');
  const [anoSelecionado, setAnoSelecionado] = useState<string>('');
  const [view, setView] = useState<'Grelha' | 'Relatorio'>('Grelha');
  const [transRecords, setTransRecords] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [movData, transData, depData] = await Promise.all([
        getNMovimentos({}),
        getNTransferencias({}),
        getNDepositos({}),
      ]);
      setRecords(movData?.records || []);
      setTransRecords(transData?.records || []);
      setDepositosRecords(depData?.records || []);
    } catch (e) {
      // FIX 5: Log o erro real para facilitar debug
      console.error('Erro ao carregar dados do NRelatoriosView:', e);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const transferenciasConvertidas = useMemo(() => {
    return transRecords
      .filter(t => {
        if (t.estado === 'DELETED') return false;
        const matchesAno = !anoSelecionado || t.ano === anoSelecionado;
        if (!matchesAno) return false;
        const matchesSeccao = seccaoAtiva === 'Todas' || 
                              (t.seccao || '').toLowerCase() === seccaoAtiva.toLowerCase();
        if (!matchesSeccao) return false;
        return (t.categoria || '').toLowerCase() === 'censos';
      })
      .map(t => ({
        ...t,
        id: `trans-${t.id}`,
        seccao: t.seccao,
        descricao: t.motivo || `Transferência para Agrupamento`,
        elemento: t.elemento,
        data: t.data,
        valor: t.valor,
        tipo: 'Despesa',
        categoria: t.categoria,
        agr: 'true',
        estadoMovimento: t.estado
      }));
  }, [transRecords, seccaoAtiva, anoSelecionado]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setSeccaoAtiva(isAdmin ? 'Todas' : userSeccao); }, [isAdmin, userSeccao]);

  const anosDisponiveis = useMemo(() =>
    ([...new Set(records.map(r => r.ano).filter(Boolean))] as string[]).sort().reverse()
  , [records]);

  // FIX 3: Adicionar anoSelecionado às dependências para evitar stale closure
  useEffect(() => {
    if (anosDisponiveis.length > 0 && !anoSelecionado) setAnoSelecionado(anosDisponiveis[0]);
  }, [anosDisponiveis, anoSelecionado]);

  const seccoesDisponiveis = useMemo(() => {
    const base = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Agrupamento'];
    return isAdmin ? ['Todas', ...base] : base.filter(s => s === userSeccao);
  }, [isAdmin, userSeccao]);

  const dadosFiltrados = useMemo(() => {
    const movs = records.filter(r => {
      if (!r.tipo || r.tipo === 'DELETED') return false;
      const isTransferido = r.estadoMovimento === 'Transferido';
      const matchesSeccao = seccaoAtiva === 'Todas' || (r.seccao || '').toLowerCase() === seccaoAtiva.toLowerCase() || (isTransferido && seccaoAtiva === 'Agrupamento');
      const matchesAno = !anoSelecionado || r.ano === anoSelecionado;
      return matchesSeccao && matchesAno;
    });
    return [...movs, ...transferenciasConvertidas];
  }, [records, transferenciasConvertidas, seccaoAtiva, anoSelecionado]);

  const dadosFiltradosCard = useMemo(() => records.filter(r => {
    if (!r.tipo || r.tipo === 'DELETED') return false;
    const isAgr = r.agr === 'true' || r.agr === 'TRUE';
    if (seccaoAtiva !== 'Todas' && isAgr) return false;
    const matchesSeccao = seccaoAtiva === 'Todas' || (r.seccao || '').toLowerCase() === seccaoAtiva.toLowerCase();
    const matchesAno = !anoSelecionado || r.ano === anoSelecionado;
    return matchesSeccao && matchesAno;
  }), [records, seccaoAtiva, anoSelecionado]);

  const totalReceita = useMemo(() => dadosFiltrados.filter(r => r.tipo === 'Receita').reduce((acc, r) => acc + (Number(r.valor) || 0), 0), [dadosFiltrados]);
  const totalReceitaCard = useMemo(() => dadosFiltradosCard.filter(r => r.tipo === 'Receita' && r.categoria !== 'Lucros Atividades').reduce((acc, r) => acc + (Number(r.valor) || 0), 0), [dadosFiltradosCard]);
  const totalDespesa = useMemo(() => dadosFiltrados.filter(r => r.tipo === 'Despesa').reduce((acc, r) => acc + (Number(r.valor) || 0), 0), [dadosFiltrados]);
  const totalDespesaCard = useMemo(() => dadosFiltradosCard.filter(r => r.tipo === 'Despesa').reduce((acc, r) => acc + (Number(r.valor) || 0), 0), [dadosFiltradosCard]);
  const totalPendentesCard = useMemo(() => dadosFiltradosCard.filter(r => r.tipo === 'Receita' && r.estadoMovimento === 'Caixa').reduce((acc, r) => acc + (Number(r.valor) || 0), 0), [dadosFiltradosCard]);
  const totalTransferidoCard = useMemo(() => dadosFiltrados.filter(r => r.estadoMovimento === 'Transferido').reduce((acc, r) => acc + (Number(r.valor) || 0), 0), [dadosFiltrados]);

  const totalDepositos = useMemo(() => {
    const filtered = depositosRecords.filter(d =>
      seccaoAtiva === 'Todas' || (d.seccao || '').toLowerCase() === seccaoAtiva.toLowerCase()
    );
    return filtered.reduce((acc, d) => {
      const val = parseFloat(d.valor || '0') || 0;
      return d.tipo === 'Entrada' ? acc + val : acc - val;
    }, 0);
  }, [depositosRecords, seccaoAtiva]);

  const receitasData = useMemo(() => dadosFiltrados.filter(r => r.tipo === 'Receita'), [dadosFiltrados]);
  const despesasData = useMemo(() => dadosFiltrados.filter(r => r.tipo === 'Despesa'), [dadosFiltrados]);

  const handleRefresh = async () => { setIsRefreshing(true); await loadData(); };

  // FIX 4: useCallback para evitar recriar a função em cada render
  const gerarPDF = useCallback(async () => {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js');
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();

      doc.setFont("helvetica", "bold"); doc.setFontSize(18);
      doc.text("N Relatório Financeiro", 105, 20, { align: 'center' });
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`${seccaoAtiva}  |  Ano: ${anoSelecionado}`, 105, 28, { align: 'center' });
      doc.text(`Gerado em: ${new Date().toLocaleString()}`, 105, 34, { align: 'center' });

      (doc as any).autoTable({
        startY: 42,
        head: [['Total Receitas', 'Total Despesas', 'Saldo']],
        body: [[`${totalReceitaCard.toFixed(2)}€`, `${totalDespesaCard.toFixed(2)}€`, `${(totalReceitaCard - totalDespesaCard).toFixed(2)}€`]],
        theme: 'grid', headStyles: { fillColor: [51, 65, 85], halign: 'center' }, styles: { halign: 'center' }
      });

      const ensureSpace = (needed: number) => {
        const pageH = doc.internal.pageSize.getHeight();
        const usedY = (doc as any).lastAutoTable?.finalY ?? 60;
        if (usedY + needed > pageH - 15) doc.addPage();
      };

      const sectionTitle = (text: string, color: [number, number, number] = [51, 65, 85]) => {
        ensureSpace(18);
        const y = ((doc as any).lastAutoTable?.finalY ?? 42) + 10;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, 14, y);
        doc.setTextColor(0, 0, 0);
        (doc as any).lastAutoTable = { finalY: y };
      };

      const receitasCard = dadosFiltradosCard.filter(r => r.tipo === 'Receita');
      const dinheiroTotal = receitasCard.filter(r => r.tipoPagamento === 'Dinheiro').reduce((s, r) => s + (Number(r.valor) || 0), 0);
      const transferenciaTotal = receitasCard.filter(r => r.tipoPagamento === 'Transferencia').reduce((s, r) => s + (Number(r.valor) || 0), 0);

      sectionTitle('Receitas por Tipo de Pagamento', [22, 101, 52]);
      ensureSpace(30);
      (doc as any).autoTable({
        startY: ((doc as any).lastAutoTable?.finalY ?? 60) + 2,
        head: [['Tipo de Pagamento', 'Total']],
        body: [
          ['Dinheiro', `${dinheiroTotal.toFixed(2)}€`],
          ['Transferência', `${transferenciaTotal.toFixed(2)}€`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [22, 101, 52], fontSize: 8 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' } },
      });

      const SECCOES_PDF = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Agrupamento'];
      const rowsPagSec = SECCOES_PDF.map(sec => {
        const secData = receitasCard.filter(r => r.seccao === sec);
        const din = secData.filter(r => r.tipoPagamento === 'Dinheiro').reduce((s, r) => s + (Number(r.valor) || 0), 0);
        const tra = secData.filter(r => r.tipoPagamento === 'Transferencia').reduce((s, r) => s + (Number(r.valor) || 0), 0);
        return [sec, din > 0 ? `${din.toFixed(2)}€` : '—', tra > 0 ? `${tra.toFixed(2)}€` : '—', `${(din + tra).toFixed(2)}€`];
      }).filter(r => r[1] !== '—' || r[2] !== '—');

      sectionTitle('Receitas por Pagamento e Secção', [22, 101, 52]);
      ensureSpace(30);
      (doc as any).autoTable({
        startY: ((doc as any).lastAutoTable?.finalY ?? 60) + 2,
        head: [['Secção', 'Dinheiro', 'Transferência', 'Total']],
        body: rowsPagSec.length > 0 ? rowsPagSec : [['Sem dados', '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [22, 101, 52], fontSize: 8 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      });

      const catMapReceita: Record<string, number> = {};
      receitasCard.forEach(r => { const k = r.categoria || 'Sem Categoria'; catMapReceita[k] = (catMapReceita[k] || 0) + (Number(r.valor) || 0); });
      const catRowsReceita = Object.entries(catMapReceita).sort(([, a], [, b]) => b - a).map(([cat, tot]) => [cat, `${tot.toFixed(2)}€`]);

      sectionTitle('Receitas por Categoria', [22, 101, 52]);
      ensureSpace(30);
      (doc as any).autoTable({
        startY: ((doc as any).lastAutoTable?.finalY ?? 60) + 2,
        head: [['Categoria', 'Total']],
        body: catRowsReceita.length > 0 ? catRowsReceita : [['Sem dados', '']],
        theme: 'striped',
        headStyles: { fillColor: [22, 101, 52], fontSize: 8 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      });

      const despesasCard = dadosFiltradosCard.filter(r => r.tipo === 'Despesa');
      const catMapDespesa: Record<string, number> = {};
      despesasCard.forEach(r => { const k = r.categoria || 'Sem Categoria'; catMapDespesa[k] = (catMapDespesa[k] || 0) + (Number(r.valor) || 0); });
      const catRowsDespesa = Object.entries(catMapDespesa).sort(([, a], [, b]) => b - a).map(([cat, tot]) => [cat, `${tot.toFixed(2)}€`]);

      sectionTitle('Despesas por Categoria', [185, 28, 28]);
      ensureSpace(30);
      (doc as any).autoTable({
        startY: ((doc as any).lastAutoTable?.finalY ?? 60) + 2,
        head: [['Categoria', 'Total']],
        body: catRowsDespesa.length > 0 ? catRowsDespesa : [['Sem dados', '']],
        theme: 'striped',
        headStyles: { fillColor: [185, 28, 28], fontSize: 8 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      });

      if (seccaoAtiva === 'Todas') {
        const activeSecs = SECCOES_PDF.filter(s => dadosFiltradosCard.some(r => r.seccao === s));

        for (const tipoCs of ['Receita', 'Despesa'] as const) {
          const corCs: [number, number, number] = tipoCs === 'Receita' ? [22, 101, 52] : [185, 28, 28];
          const filteredCs = dadosFiltradosCard.filter(r => r.tipo === tipoCs);
          const mapCs: Record<string, Record<string, number>> = {};
          filteredCs.forEach(r => {
            const cat = r.categoria || 'Sem Categoria';
            const sec = r.seccao || 'Outro';
            if (!mapCs[cat]) mapCs[cat] = {};
            mapCs[cat][sec] = (mapCs[cat][sec] || 0) + (Number(r.valor) || 0);
          });
          const catListCs = Object.entries(mapCs)
            .map(([cat, secs]) => ({ cat, total: Object.values(secs).reduce((s, v) => s + v, 0), secs }))
            .sort((a, b) => b.total - a.total);

          sectionTitle(`${tipoCs}s por Categoria e Secção`, corCs);
          ensureSpace(40);
          (doc as any).autoTable({
            startY: ((doc as any).lastAutoTable?.finalY ?? 60) + 2,
            head: [['Categoria', ...activeSecs, 'Total']],
            body: catListCs.length > 0
              ? catListCs.map(({ cat, total, secs }) => [
                  cat,
                  ...activeSecs.map(s => (secs[s] || 0) > 0 ? `${(secs[s] || 0).toFixed(2)}€` : '—'),
                  `${total.toFixed(2)}€`,
                ])
              : [['Sem dados', ...activeSecs.map(() => ''), '']],
            theme: 'striped',
            headStyles: { fillColor: corCs, fontSize: 7 },
            styles: { fontSize: 7 },
            columnStyles: {
              0: { cellWidth: 40 },
              [activeSecs.length + 1]: { halign: 'right', fontStyle: 'bold' },
              ...Object.fromEntries(activeSecs.map((_, i) => [i + 1, { halign: 'right' }])),
            },
          });
        }
      }

      doc.addPage();
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Detalhe dos Movimentos', 14, 15);
      (doc as any).lastAutoTable = { finalY: 15 };

      const renderRows = (data: NMovimento[], cor: number[]) => {
        if (!data.length) return;
        (doc as any).autoTable({
          startY: (doc as any).lastAutoTable?.finalY + 2 || 60,
          head: [['Secção', 'Descrição', 'Elemento', 'Data', 'Valor', 'Estado']],
          body: data.map(r => [r.seccao || '—', r.descricao || '—', r.elemento || '—', r.data ? r.data.split('T')[0] : '—', `${(Number(r.valor) || 0).toFixed(2)}€`, r.estadoMovimento || '—']),
          theme: 'striped', headStyles: { fillColor: cor, fontSize: 8 }, styles: { fontSize: 8 }, columnStyles: { 4: { halign: 'right' } }
        });
      };

      const renderAtividadeGroups = (catData: NMovimento[], cor: number[], corLight: number[]) => {
        const hasAtividade = catData.some(r => r.atividade);
        if (!hasAtividade) { renderRows(catData, cor); return; }
        const groups: Record<string, NMovimento[]> = {};
        for (const r of catData) { const k = r.atividade || '__geral__'; if (!groups[k]) groups[k] = []; groups[k].push(r); }
        const entries = Object.entries(groups).sort(([a], [b]) => a === '__geral__' ? 1 : b === '__geral__' ? -1 : a.localeCompare(b));
        for (const [key, rows] of entries) {
          const label = key === '__geral__' ? 'Geral' : key;
          const subtotal = rows.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
          const lastY = (doc as any).lastAutoTable?.finalY ?? 60;
          doc.setFontSize(9); doc.setFont("helvetica", "bolditalic");
          (doc as any).autoTable({
            startY: lastY + 2,
            body: [[`  ▸ Atividade: ${label}`, `${subtotal.toFixed(2)}€`]],
            theme: 'plain',
            styles: { fontSize: 9, fontStyle: 'bold', fillColor: corLight, textColor: [120, 80, 0] },
            columnStyles: { 1: { halign: 'right' } },
          });
          renderRows(rows, cor);
        }
      };

      const agrOrder: ('Agrupamento' | 'Secção')[] = ['Agrupamento', 'Secção'];
      for (const tipo of ['Receita', 'Despesa'] as const) {
        const cor = tipo === 'Receita' ? [22, 101, 52] : [185, 28, 28];
        const corLight = tipo === 'Receita' ? [220, 252, 231] : [254, 226, 226];
        for (const agr of agrOrder) {
          const filtered = dadosFiltrados.filter(r => r.tipo === tipo && (agr === 'Agrupamento' ? r.agr === 'true' : r.agr !== 'true'));
          if (!filtered.length) continue;
          const cats = [...new Set(filtered.map(r => r.categoria || 'Sem Categoria'))];
          for (const cat of cats) {
            const catData = filtered.filter(r => (r.categoria || 'Sem Categoria') === cat);
            const catTotal = catData.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
            const lastY = (doc as any).lastAutoTable?.finalY || 60;
            doc.setFontSize(11); doc.setFont("helvetica", "bold");
            doc.text(`${tipo}s — ${agr} — ${cat}  (${catTotal.toFixed(2)}€)`, 14, lastY + 10);
            (doc as any).lastAutoTable = { finalY: lastY + 10 };
            renderAtividadeGroups(catData, cor, corLight);
          }
        }
      }

      doc.save(`NRelatorio_${seccaoAtiva}_${anoSelecionado.replace('/', '-')}.pdf`);
    } catch (e) {
      // FIX 5: Log o erro real para facilitar debug
      console.error('Erro ao gerar PDF:', e);
      toast.error('Erro ao gerar PDF');
    }
  }, [seccaoAtiva, anoSelecionado, dadosFiltrados, dadosFiltradosCard, totalReceitaCard, totalDespesaCard]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-xl font-bold tracking-tight">N Relatório Financeiro</h3>
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20">{seccaoAtiva}</Badge>
            <Badge variant="outline" className="text-xs font-mono">{anoSelecionado}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="h-10 px-4 gap-2" disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'A atualizar...' : 'Atualizar'}</span>
          </Button>
          <Button onClick={gerarPDF} variant="outline" size="sm" className="h-10 px-4 gap-2">
            <FileText className="h-4 w-4 text-red-600" />
            <span className="sm:inline">Exportar PDF</span>
          </Button>
          {isAdmin && (
            <select className="flex-1 md:w-48 p-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-800" value={seccaoAtiva} onChange={(e) => setSeccaoAtiva(e.target.value)}>
              {seccoesDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select className="flex-1 md:w-32 p-2 border rounded-lg text-sm font-bold bg-slate-50 dark:bg-slate-800" value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)}>
            {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
          </select>
        </div>
      </div>
      {/* Seletor de Vista */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setView('Grelha')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              view === 'Grelha' 
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            GRELHA
          </button>
          <button
            onClick={() => setView('Relatorio')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              view === 'Relatorio' 
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileBarChart className="h-3.5 w-3.5" />
            RELATÓRIO
          </button>
        </div>
      </div>
      {view === 'Grelha' ? (
        <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
          {/* Cartão 1: Total Receitas */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalReceitaCard.toFixed(2)}€
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Total Recebido</p>
            </CardContent>
          </Card>

          {/* Cartão 2: Total Despesas */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {totalDespesaCard.toFixed(2)}€
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Total Gasto</p>
            </CardContent>
          </Card>

          {/* Cartão 3: Saldo Atual */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Resultado</CardTitle>
              <Banknote className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${(totalReceitaCard - totalDespesaCard) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                {(totalReceitaCard - totalDespesaCard).toFixed(2)}€
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Resultado</p>
            </CardContent>
          </Card>

          {/* Cartão 4: Transferido */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Transferido</CardTitle>
              <Banknote className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {totalTransferidoCard.toFixed(2)}€
              </div>
              {/* FIX 2: Corrigido typo "Trasnferido" → "Transferido" */}
              <p className="text-[10px] text-muted-foreground mt-1">Transferido</p>
            </CardContent>
          </Card>
          
          {/* Cartão 5: Caixa */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Caixa</CardTitle>
              <Banknote className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {/* FIX 1: Corrigida condição de cor — usa o valor da Caixa, não do Resultado */}
              <div className={`text-xl font-bold ${(totalPendentesCard - totalDepositos) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                {(totalPendentesCard - totalDepositos).toFixed(2)}€
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Caixa</p>
            </CardContent>
          </Card>

          {/* Cartão 6: Depositos */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Depósitos</CardTitle>
              <Landmark className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${totalDepositos >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                {totalDepositos.toFixed(2)}€
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Saldo Banco</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <ReceitasPorPagamento data={dadosFiltradosCard} />
          <ReceitasPorPagamentoSeccao data={dadosFiltradosCard} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TotalPorCategoria data={dadosFiltradosCard} tipo="Receita" />
          <TotalPorCategoria data={dadosFiltradosCard} tipo="Despesa" />
        </div>
        {seccaoAtiva === 'Todas' && (
        <div className="grid grid-cols-1 gap-4">
          <TotalPorCategoriaSeccao data={dadosFiltradosCard} tipo="Receita" />
          <TotalPorCategoriaSeccao data={dadosFiltradosCard} tipo="Despesa" />
        </div>
        )}
        </div>

      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1.5fr_1fr] gap-2 sm:gap-4">
            
            <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white border-none shadow-md">
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
                <div className="flex justify-between items-center opacity-70">
                  <span className="text-[10px] md:text-xs uppercase font-bold">Receitas</span>
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                </div>
                <div className="text-lg md:text-2xl font-bold mt-1 leading-none">
                  {totalReceitaCard.toFixed(2)}€
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none shadow-md">
              <CardContent className="pt-4 md:pt-6 px-2 flex flex-col items-center justify-center text-center h-full">
                <div className="opacity-70">
                  <span className="text-[10px] md:text-xs uppercase font-bold">Resultado</span>
                </div>
                <div className="text-lg md:text-2xl font-bold mt-1 leading-none">
                  {(totalReceitaCard - totalDespesaCard).toFixed(2)}€
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-600 to-red-700 text-white border-none shadow-md">
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
                <div className="flex justify-between items-center opacity-70">
                  <span className="text-[10px] md:text-xs uppercase font-bold">Despesas</span>
                  <TrendingDown className="h-3 w-3 md:h-4 md:w-4" />
                </div>
                <div className="text-lg md:text-2xl font-bold mt-1 leading-none">
                  {totalDespesaCard.toFixed(2)}€
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none shadow-md">
              <CardContent className="pt-4 md:pt-6 px-2 flex flex-col items-center justify-center text-center h-full">
                <div className="opacity-70">
                  <span className="text-[10px] md:text-xs uppercase font-bold">Caixa</span>
                </div>
                <div className="text-lg md:text-2xl font-bold mt-1 leading-none">
                  {(totalPendentesCard - totalDepositos).toFixed(2)}€
                </div>
              </CardContent>
            </Card>
          </div>

          {dadosFiltrados.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground italic text-sm">
              Nenhum registo encontrado para {seccaoAtiva} — {anoSelecionado}.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <TipoColumn tipo="Receita" data={receitasData} />
              <TipoColumn tipo="Despesa" data={despesasData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
