import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, Landmark, TrendingUp, TrendingDown, LayoutGrid } from 'lucide-react';
import { GetNMovimentosOutputType } from 'zite-endpoints-sdk';

type NMovimento = GetNMovimentosOutputType['records'][0];

const SECCOES = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Agrupamento'];
const fmt = (v: number) => v === 0 ? null : `${v.toFixed(2)}€`;

// ─── 1. Receitas por Tipo de Pagamento ───────────────────────────────────────
export function ReceitasPorPagamento({ data }: { data: NMovimento[] }) {
  const receitas = data.filter(r => r.tipo === 'Receita');
  const dinheiro = receitas.filter(r => r.tipoPagamento === 'Dinheiro').reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const transferencia = receitas.filter(r => r.tipoPagamento === 'Transferencia').reduce((s, r) => s + (Number(r.valor) || 0), 0);

  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-emerald-500" /> Receitas por Tipo de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-100">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Banknote className="h-3.5 w-3.5 text-emerald-600" /> Dinheiro</span>
          <span className="font-mono font-bold text-emerald-700">{dinheiro.toFixed(2)}€</span>
        </div>
        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-blue-50 border border-blue-100">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Landmark className="h-3.5 w-3.5 text-blue-600" /> Transferência</span>
          <span className="font-mono font-bold text-blue-700">{transferencia.toFixed(2)}€</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 2. Receitas por Tipo de Pagamento e Secção ───────────────────────────────
export function ReceitasPorPagamentoSeccao({ data }: { data: NMovimento[] }) {
  const receitas = data.filter(r => r.tipo === 'Receita');
  const rows = useMemo(() => SECCOES.map(sec => {
    const secData = receitas.filter(r => r.seccao === sec);
    return {
      sec,
      dinheiro: secData.filter(r => r.tipoPagamento === 'Dinheiro').reduce((s, r) => s + (Number(r.valor) || 0), 0),
      transferencia: secData.filter(r => r.tipoPagamento === 'Transferencia').reduce((s, r) => s + (Number(r.valor) || 0), 0),
    };
  }).filter(r => r.dinheiro > 0 || r.transferencia > 0), [receitas]);

  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-blue-500" /> Receitas por Pagamento e Secção
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-[11px] font-bold uppercase">Secção</TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase">Dinheiro</TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase">Transferência</TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-xs italic text-muted-foreground">Sem dados</TableCell></TableRow>
            ) : rows.map(r => (
              <TableRow key={r.sec}>
                <TableCell className="text-sm font-medium">{r.sec}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(r.dinheiro) ?? <span className="text-slate-300">—</span>}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(r.transferencia) ?? <span className="text-slate-300">—</span>}</TableCell>
                <TableCell className="text-right font-mono font-bold text-sm text-emerald-700">{(r.dinheiro + r.transferencia).toFixed(2)}€</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── 3 & 4. Receita/Despesa por Categoria ────────────────────────────────────
export function TotalPorCategoria({ data, tipo }: { data: NMovimento[]; tipo: 'Receita' | 'Despesa' }) {
  const isReceita = tipo === 'Receita';
  const filtered = data.filter(r => r.tipo === tipo);
  const cats = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => { const k = r.categoria || 'Sem Categoria'; map[k] = (map[k] || 0) + (Number(r.valor) || 0); });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [filtered]);

  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <CardTitle className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isReceita ? 'text-emerald-600' : 'text-red-600'}`}>
          {isReceita ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {tipo}s por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-[11px] font-bold uppercase">Categoria</TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cats.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center text-xs italic text-muted-foreground">Sem dados</TableCell></TableRow>
            ) : cats.map(([cat, total]) => (
              <TableRow key={cat}>
                <TableCell className="text-sm">{cat}</TableCell>
                <TableCell className={`text-right font-mono font-bold text-sm ${isReceita ? 'text-emerald-700' : 'text-red-700'}`}>{total.toFixed(2)}€</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── 5 & 6. Receita/Despesa por Categoria e Secção ───────────────────────────
export function TotalPorCategoriaSeccao({ data, tipo }: { data: NMovimento[]; tipo: 'Receita' | 'Despesa' }) {
  const isReceita = tipo === 'Receita';
  const filtered = data.filter(r => r.tipo === tipo);

  const { cats, matrix } = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filtered.forEach(r => {
      const cat = r.categoria || 'Sem Categoria';
      const sec = r.seccao || 'Outro';
      if (!map[cat]) map[cat] = {};
      map[cat][sec] = (map[cat][sec] || 0) + (Number(r.valor) || 0);
    });
    const catList = Object.entries(map)
      .map(([cat, secs]) => ({ cat, total: Object.values(secs).reduce((s, v) => s + v, 0), secs }))
      .sort((a, b) => b.total - a.total);
    return { cats: catList, matrix: map };
  }, [filtered]);

  const activeSecs = SECCOES.filter(s => filtered.some(r => r.seccao === s));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 pb-2">
        <CardTitle className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isReceita ? 'text-emerald-600' : 'text-red-600'}`}>
          {isReceita ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {tipo}s por Categoria e Secção
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-[11px] font-bold uppercase min-w-[120px]">Categoria</TableHead>
              {activeSecs.map(s => <TableHead key={s} className="text-right text-[11px] font-bold uppercase whitespace-nowrap">{s}</TableHead>)}
              <TableHead className="text-right text-[11px] font-bold uppercase">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cats.length === 0 ? (
              <TableRow><TableCell colSpan={activeSecs.length + 2} className="text-center text-xs italic text-muted-foreground">Sem dados</TableCell></TableRow>
            ) : cats.map(({ cat, total, secs }) => (
              <TableRow key={cat}>
                <TableCell className="text-sm font-medium">{cat}</TableCell>
                {activeSecs.map(s => {
                  const v = secs[s] || 0;
                  return <TableCell key={s} className="text-right font-mono text-sm">{v > 0 ? `${v.toFixed(2)}€` : <span className="text-slate-300">—</span>}</TableCell>;
                })}
                <TableCell className={`text-right font-mono font-bold text-sm ${isReceita ? 'text-emerald-700' : 'text-red-700'}`}>{total.toFixed(2)}€</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
