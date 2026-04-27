import { useState, useMemo } from 'react';
import { GetNMovimentosOutputType } from 'zite-endpoints-sdk';
import { Permissions } from '@/utils/permissions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateForDisplay, formatCurrency, parseValor } from '@/utils/dateUtils';
import { ChevronDown, ChevronRight, Search, Lock, ArrowUpCircle, ArrowDownCircle, FileText, Loader2 } from 'lucide-react';

type NMovimento = GetNMovimentosOutputType['records'][0];

const SECCOES = ["Lobitos", "Exploradores", "Pioneiros", "Caminheiros", "Agrupamento"];

const CORES_SECCOES: Record<string, string> = {
  "Lobitos": "bg-yellow-400",
  "Exploradores": "bg-green-600",
  "Pioneiros": "bg-blue-600",
  "Caminheiros": "bg-red-600",
  "Agrupamento": "bg-purple-600",
};

interface AtividadesTabViewProps {
  records: NMovimento[];
  anosAbertos: string[];
  canViewAll: boolean;
  userSeccao: string;
  perms: Permissions;
}

const normalizeString = (str: string) =>
  str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

const loadScript = (src: string): Promise<void> => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve(undefined);
  const s = document.createElement('script');
  s.src = src; s.onload = () => resolve(undefined); s.onerror = reject;
  document.head.appendChild(s);
});

export default function AtividadesTabView({
  records,
  anosAbertos,
  canViewAll,
  userSeccao,
}: AtividadesTabViewProps) {
  const [seccao, setSeccao] = useState<string>(() => canViewAll ? "Todos" : userSeccao || "");
  const [ano, setAno] = useState<string>(() => {
    const anoAtual = new Date().getFullYear().toString();
    return anosAbertos.find(a => a.includes(anoAtual)) || anosAbertos[0] || '';
  });
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const toggleExpand = (nome: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  const getSecçãoColor = (s?: string) => CORES_SECCOES[s || ""] || "bg-gray-300";

  const filtered = useMemo(() => {
    let res = records.filter(r => r.tipo !== "DELETED" && r.atividade && r.atividade.trim() !== "");

    if (seccao !== "Todos") {
      res = res.filter(r => {
        const seccaoRegisto = (r.seccao || "").trim().toLowerCase();
        const seccaoFiltro = (seccao || "").trim().toLowerCase();
        const isAgr = r.agr === 'true' || r.agr === 'TRUE';
        if (seccaoFiltro !== 'agrupamento' && isAgr) return false;
        return seccaoRegisto === seccaoFiltro || (seccaoFiltro === 'agrupamento' && isAgr);
      });
    }

    if (ano) {
      res = res.filter(r => r.ano === ano);
    }

    return res;
  }, [records, seccao, ano]);

  const grouped = useMemo(() => {
    const map = new Map<string, NMovimento[]>();
    for (const r of filtered) {
      const nome = r.atividade!.trim();
      if (!map.has(nome)) map.set(nome, []);
      map.get(nome)!.push(r);
    }
    return map;
  }, [filtered]);

  const atividadesFiltradas = useMemo(() => {
    const entries = Array.from(grouped.entries());
    if (!search.trim()) return entries;
    const term = normalizeString(search);
    return entries.filter(([nome]) => normalizeString(nome).includes(term));
  }, [grouped, search]);

  const gerarPDFAtividade = async (nomeAtividade: string, movimentos: NMovimento[]) => {
    setGeneratingPdf(nomeAtividade);
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js');
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();

      const receitas = movimentos.filter(m => m.tipo === 'Receita');
      const despesas = movimentos.filter(m => m.tipo === 'Despesa');
      const totalReceitas = receitas.reduce((acc, m) => acc + parseValor(m.valor), 0);
      const totalDespesas = despesas.reduce((acc, m) => acc + parseValor(m.valor), 0);
      const resultado = totalReceitas - totalDespesas;

      // Header
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text("Relatório de Atividade", 105, 15, { align: 'center' });
      doc.setFontSize(12); doc.setFont("helvetica", "normal");
      doc.text(nomeAtividade, 105, 22, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`${seccao} | ${ano} | Gerado em: ${new Date().toLocaleDateString('pt-PT')}`, 105, 28, { align: 'center' });

      // Resumo
      (doc as any).autoTable({
        startY: 35,
        head: [['Total Receitas', 'Total Despesas', 'Resultado']],
        body: [[
          `${totalReceitas.toFixed(2)}€`,
          `${totalDespesas.toFixed(2)}€`,
          `${resultado.toFixed(2)}€`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], halign: 'center', fontSize: 9 },
        styles: { halign: 'center', fontSize: 9 },
      });

      let lastY = (doc as any).lastAutoTable?.finalY ?? 50;

      // Receitas
      if (receitas.length > 0) {
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 101, 52);
        doc.text('Receitas', 14, lastY + 8);
        doc.setTextColor(0, 0, 0);

        (doc as any).autoTable({
          startY: lastY + 10,
          head: [['Data', 'Descrição', 'Elemento', 'Valor', 'Estado']],
          body: receitas.map(r => [
            formatDateForDisplay(r.data),
            r.descricao || '—',
            r.elemento || '—',
            `${parseValor(r.valor).toFixed(2)}€`,
            r.estadoMovimento || '—'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [22, 101, 52], fontSize: 8 },
          styles: { fontSize: 8 },
          columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        });
        lastY = (doc as any).lastAutoTable?.finalY ?? lastY;
      }

      // Despesas
      if (despesas.length > 0) {
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28);
        doc.text('Despesas', 14, lastY + 8);
        doc.setTextColor(0, 0, 0);

        (doc as any).autoTable({
          startY: lastY + 10,
          head: [['Data', 'Descrição', 'Elemento', 'Valor', 'Estado']],
          body: despesas.map(r => [
            formatDateForDisplay(r.data),
            r.descricao || '—',
            r.elemento || '—',
            `${parseValor(r.valor).toFixed(2)}€`,
            r.estadoMovimento || '—'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [185, 28, 28], fontSize: 8 },
          styles: { fontSize: 8 },
          columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        });
      }

      const filename = `Atividade_${nomeAtividade.replace(/[^a-zA-Z0-9]/g, '_')}_${ano.replace('/', '-')}.pdf`;
      doc.save(filename);
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      alert('Erro ao gerar PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  return (
    <Card className="border-x-0 sm:border-2 shadow-none border-t-2 border-b-2 sm:rounded-xl">
      <CardHeader className="space-y-3 p-3 sm:p-6 pb-3">
        {/* Section tabs */}
        <div className="flex flex-wrap gap-2 border-b pb-4">
          {["Todos", ...SECCOES].map(s => {
            const isLocked = !canViewAll && s !== userSeccao;
            return (
              <Button
                key={s}
                variant={seccao === s ? "default" : "ghost"}
                size="sm"
                onClick={() => { if (!isLocked) setSeccao(s); }}
                disabled={isLocked}
                className={cn(
                  "relative h-8 rounded-full px-4 text-[13px] font-medium transition-all",
                  seccao === s ? "shadow-sm" : "text-muted-foreground hover:bg-muted",
                  isLocked && "opacity-40 cursor-not-allowed pointer-events-none"
                )}
              >
                {s !== "Todos" && (
                  <span className={cn("mr-2 h-2 w-2 rounded-full", getSecçãoColor(s), seccao !== s && "opacity-40")} />
                )}
                <span className={cn(s === "Todos" ? "inline" : "hidden md:inline")}>{s}</span>
                {isLocked && <Lock className="ml-1.5 h-3 w-3 opacity-60" />}
              </Button>
            );
          })}
        </div>

        {/* Ano + Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {anosAbertos.length > 0 && (
            <select
              className="h-9 px-2 border rounded-lg text-sm font-bold bg-muted/30 border-border"
              value={ano}
              onChange={e => setAno(e.target.value)}
            >
              {anosAbertos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar atividade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {atividadesFiltradas.length} atividade(s) · {filtered.length} movimento(s)
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
        {atividadesFiltradas.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground italic text-sm">
            Nenhuma atividade encontrada com movimentos para os filtros selecionados.
          </p>
        ) : atividadesFiltradas.map(([nome, movimentos]) => {
          const receitas = movimentos.filter(m => m.tipo === 'Receita');
          const despesas = movimentos.filter(m => m.tipo === 'Despesa');
          const totalReceitas = receitas.reduce((acc, m) => acc + parseValor(m.valor), 0);
          const totalDespesas = despesas.reduce((acc, m) => acc + parseValor(m.valor), 0);
          const resultado = totalReceitas - totalDespesas;
          const isExpanded = expanded.has(nome);

          return (
            <div key={nome} className="border rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleExpand(nome)}
                className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  }
                  <span className="font-semibold text-sm truncate">{nome}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
                    {movimentos.length} mov.
                  </Badge>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-1 text-xs text-green-600 font-medium">
                    <ArrowUpCircle className="h-3 w-3" />
                    {formatCurrency(totalReceitas)}€
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-xs text-red-600 font-medium">
                    <ArrowDownCircle className="h-3 w-3" />
                    {formatCurrency(totalDespesas)}€
                  </div>
                  <span className={cn(
                    "text-sm font-bold font-mono",
                    resultado >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {resultado >= 0 ? "+" : ""}{formatCurrency(resultado)}€
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 py-2 border-b bg-muted/20 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => gerarPDFAtividade(nome, movimentos)}
                    disabled={generatingPdf === nome}
                    className="h-8 gap-2 text-xs font-bold"
                  >
                    {generatingPdf === nome ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-red-600" />
                    )}
                    <span>Exportar PDF</span>
                  </Button>
                </div>
              )}

              {isExpanded && (
                <div className="p-4 space-y-5 border-t bg-card">
                  {receitas.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUpCircle className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-green-600">
                          Receitas
                        </span>
                      </div>
                      <MovimentosTable movimentos={receitas} tipo="Receita" />
                      <div className="text-right text-xs font-bold text-green-600 mt-1.5 pr-2">
                        Subtotal: {formatCurrency(totalReceitas)}€
                      </div>
                    </div>
                  )}

                  {despesas.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDownCircle className="h-3.5 w-3.5 text-red-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                          Despesas
                        </span>
                      </div>
                      <MovimentosTable movimentos={despesas} tipo="Despesa" />
                      <div className="text-right text-xs font-bold text-red-600 mt-1.5 pr-2">
                        Subtotal: {formatCurrency(totalDespesas)}€
                      </div>
                    </div>
                  )}

                  {/* Resultado líquido */}
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg border text-sm font-bold",
                    resultado >= 0
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                  )}>
                    <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      Resultado Líquido
                    </span>
                    <span className={cn("font-mono text-base", resultado >= 0 ? "text-green-600" : "text-red-600")}>
                      {resultado >= 0 ? "+" : ""}{formatCurrency(resultado)}€
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function MovimentosTable({ movimentos, tipo }: { movimentos: NMovimento[], tipo: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold">
            <th className="text-left py-2 px-3">Data</th>
            <th className="text-left py-2 px-3">Descrição</th>
            <th className="text-left py-2 px-3 hidden sm:table-cell">Elemento</th>
            <th className="text-left py-2 px-3 hidden sm:table-cell">Estado</th>
            <th className="text-right py-2 px-3">Valor</th>
          </tr>
        </thead>
        <tbody>
          {movimentos.map(m => (
            <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
              <td className="py-2 px-3 whitespace-nowrap">{formatDateForDisplay(m.data)}</td>
              <td className="py-2 px-3 max-w-[180px] truncate">{m.descricao || '—'}</td>
              <td className="py-2 px-3 hidden sm:table-cell max-w-[120px] truncate">{m.elemento || '—'}</td>
              <td className="py-2 px-3 hidden sm:table-cell">{m.estadoMovimento || '—'}</td>
              <td className={cn(
                "py-2 px-3 text-right font-mono font-bold",
                tipo === 'Receita' ? 'text-green-600' : 'text-red-600'
              )}>
                {formatCurrency(parseValor(m.valor))}€
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
