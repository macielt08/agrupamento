import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, BarChart3, PieChart as PieIcon, ChevronRight, Filter, FilterX, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LabelList } from 'recharts';
import { getNMovimentos, GetNMovimentosOutputType, getNTransferencias, GetNTransferenciasOutputType } from 'zite-endpoints-sdk';

type NMovimento = GetNMovimentosOutputType['records'][0];

export function DashboardView({ atividades = [], userSeccao }: { atividades?: any[], userSeccao?: string }) {
  
  // 1. ESTADOS
  const [movimentos, setMovimentos] = useState<NMovimento[]>([]);
  const [transferencias, setTransferencias] = useState<GetNTransferenciasOutputType['records']>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(() => {
    const anoAtual = new Date().getFullYear();
    return `${anoAtual - 1}-09-01`; 
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [mostrarPendentes, setMostrarPendentes] = useState(false);

  const euroFormat = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

  // Fetch NMovimentos data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [data, transData] = await Promise.all([getNMovimentos({}), getNTransferencias({})]);
        setMovimentos(data?.records || []);
        setTransferencias(transData?.records || []);
      } catch (e) {
        console.error('Erro ao carregar movimentos:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Transferências de Censos convertidas em despesas (igual ao NRelatoriosView)
  const transferenciasConvertidas = useMemo(() => {
    return transferencias
      .filter(t => t.estadoMovimento !== 'DELETED' && (t.categoria || '').toLowerCase() === 'censos')
      .map(t => ({
        id: `trans-${t.id}`,
        seccao: t.seccao,
        descricao: t.descricao || 'Transferência para Agrupamento',
        elemento: t.elemento,
        data: t.data,
        valor: t.valor,
        tipo: 'Despesa' as const,
        categoria: t.categoria,
        agr: 'true',
        estadoMovimento: t.estadoMovimento,
        atividade: undefined,
        ano: t.ano,
      } as any));
  }, [transferencias]);

  // 2. FILTRAGEM UNIFICADA
  const dadosFiltrados = useMemo(() => {
    const normalizeDate = (dateVal: any) => {
      if (!dateVal) return "";
      let d = String(dateVal).trim().split('T')[0];
      if (d.includes('/')) {
        const [day, month, year] = d.split('/');
        d = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return d;
    };

    const isAuthorized = (itemSeccao: string) => {
      if (!userSeccao) return true;
      if (userSeccao === "Agrupamento" || userSeccao === "Admin") return true;
      return itemSeccao?.trim().toLowerCase() === userSeccao.trim().toLowerCase();
    };

    return {
      movements: [...movimentos, ...transferenciasConvertidas].filter(m => {
        const d = normalizeDate(m.data);
        const dentroData = d >= dataInicio && d <= dataFim;
        const autorizado = isAuthorized(m.seccao || '');
        const filtroPendente = mostrarPendentes ? true : m.estadoMovimento !== 'Caixa';
        const isAgr = m.agr === 'true' || m.agr === 'TRUE';
        const isSpecificSection = userSeccao && userSeccao !== 'Agrupamento' && userSeccao !== 'Admin';
        if (isSpecificSection && isAgr) return false;
        return dentroData && autorizado && filtroPendente;
      }),
      atividades: atividades.filter(a => {
        const d = normalizeDate(a.data || `${a.ano}-01-01`);
        return d >= dataInicio && d <= dataFim && isAuthorized(a.seccao);
      })
    };
  }, [movimentos, atividades, dataInicio, dataFim, userSeccao, mostrarPendentes]);

  // 3. CONFIGURAÇÃO DE SECÇÕES
  const seccoesVisiveis = useMemo(() => {
    const config = [
      { name: 'Lobitos', color: '#facc15' },
      { name: 'Exploradores', color: '#16a34a' },
      { name: 'Pioneiros', color: '#2563eb' },
      { name: 'Caminheiros', color: '#dc2626' },
      { name: 'Agrupamento', color: '#94a3b8' }
    ];
    if (!userSeccao || userSeccao === "Agrupamento" || userSeccao === "Admin") return config;
    return config.filter(s => s.name.trim().toLowerCase() === userSeccao.trim().toLowerCase());
  }, [userSeccao]);

  // 4. CÁLCULOS
  const stats = useMemo(() => {
    const receitas = dadosFiltrados.movements.filter(m => m.tipo === 'Receita' && m.categoria !== 'Lucros Atividades').reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
    const pagamentos = dadosFiltrados.movements.filter(m => m.tipo === 'Despesa').reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
    const noites = dadosFiltrados.atividades.reduce((acc, at) => acc + (Number(at.totalNoites) || Number(at["Total Noites"]) || 0), 0);
    
    const pendentesCount = movimentos.filter(m => {
      const auth = (!userSeccao || userSeccao === "Agrupamento" || userSeccao === "Admin") || 
                   (m.seccao?.trim().toLowerCase() === userSeccao.trim().toLowerCase());
      const isAgr = m.agr === 'true' || m.agr === 'TRUE';
      const isSpecificSection = userSeccao && userSeccao !== 'Agrupamento' && userSeccao !== 'Admin';
      if (isSpecificSection && isAgr) return false;
      return auth && m.estadoMovimento === 'Caixa';
    }).length;

    return { saldo: receitas - pagamentos, receitas, pagamentos, noites, pendentesCount };
  }, [dadosFiltrados, movimentos, userSeccao]);

  // Gráficos
  const dadosSaldoSeccao = useMemo(() => seccoesVisiveis.map(sec => ({
    name: sec.name,
    valor: dadosFiltrados.movements.filter(m => m.seccao === sec.name).reduce((acc, m) => acc + (m.tipo === 'Receita' ? Number(m.valor) : -Number(m.valor)), 0),
    color: sec.color
  })), [dadosFiltrados, seccoesVisiveis]);

  const dadosDespesaSeccao = useMemo(() => seccoesVisiveis.map(sec => ({
    name: sec.name,
    valor: dadosFiltrados.movements.filter(m => m.seccao === sec.name && m.tipo === 'Despesa').reduce((acc, m) => acc + (Number(m.valor) || 0), 0),
    color: sec.color
  })), [dadosFiltrados, seccoesVisiveis]);

  const dadosReceitasSeccao = useMemo(() => seccoesVisiveis.map(sec => ({
    name: sec.name,
    valor: dadosFiltrados.movements.filter(m => m.seccao === sec.name && m.tipo === 'Receita').reduce((acc, m) => acc + (Number(m.valor) || 0), 0),
    color: sec.color
  })), [dadosFiltrados, seccoesVisiveis]);

  const gastosPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    dadosFiltrados.movements.filter(m => m.tipo === 'Despesa').forEach(m => {
      const cat = m.categoria || 'Outros';
      map[cat] = (map[cat] || 0) + (Number(m.valor) || 0);
    });
    const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] })).sort((a, b) => b.value - a.value);
  }, [dadosFiltrados.movements]);

  const receitaPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    dadosFiltrados.movements.filter(m => m.tipo === 'Receita').forEach(m => {
      const cat = m.categoria || 'Outros';
      map[cat] = (map[cat] || 0) + (Number(m.valor) || 0);
    });
    const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] })).sort((a, b) => b.value - a.value);
  }, [dadosFiltrados.movements]);

  const buscarCor = (nomeSeccao: string | undefined) => {
    return seccoesVisiveis.find(s => s.name.trim() === nomeSeccao?.trim())?.color || '#94a3b8';
  };

  const dadosFinanceiroAtividades = useMemo(() => {
    const resumo: Record<string, { name: string, custo: number, receita: number, seccao: string }> = {};
    dadosFiltrados.movements.forEach(m => {
      if (!m.atividade || m.atividade.trim() === "") return;
      const nomeAtiv = m.atividade.trim();
      if (!resumo[nomeAtiv]) resumo[nomeAtiv] = { name: nomeAtiv, custo: 0, receita: 0, seccao: m.seccao?.trim() || '' };
      if (m.tipo === 'Despesa') resumo[nomeAtiv].custo += (Number(m.valor) || 0);
      else if (m.tipo === 'Receita') resumo[nomeAtiv].receita += (Number(m.valor) || 0);
    });
    return Object.values(resumo).filter(at => at.custo > 0 || at.receita > 0).sort((a, b) => b.custo - a.custo).slice(0, 10);
  }, [dadosFiltrados.movements]);

  const renderLabel = (entry: any) => `${entry.value.toFixed(2)}€`;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 bg-slate-50/20 dark:bg-slate-950/0p-4 rounded-xl">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground text-center md:text-left">Análise Financeira</h2>
          <div className="flex items-center justify-center md:justify-start gap-2 mt-1 font-medium text-xs">
            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded uppercase tracking-wider">{userSeccao || "Agrupamento"}</span>
            <span className="text-muted-foreground">| {mostrarPendentes ? "Histórico Total" : "Apenas Validados"}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <button
            onClick={() => setMostrarPendentes(!mostrarPendentes)}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 h-10 px-4 rounded-lg border text-[11px] font-bold transition-all shadow-sm ${
              mostrarPendentes ? 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400' : 'bg-card border-border text-muted-foreground hover:border-border/80'
            }`}
          >
            {mostrarPendentes ? <Filter className="h-3.5 w-3.5" /> : <FilterX className="h-3.5 w-3.5" />}
            {mostrarPendentes ? "COM CAIXA" : "SEM CAIXA"}
          </button>

          <div className="h-10 flex items-center bg-card rounded-lg border border-border shadow-sm overflow-hidden w-full sm:w-auto focus-within:ring-2 focus-within:ring-blue-500/20">
            <div className="px-3 bg-muted/50 border-r border-border/50 h-full flex items-center">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="text-[11px] font-bold px-2 outline-none flex-1 bg-transparent" />
            <ChevronRight className="h-3 w-3 text-border" />
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="text-[11px] font-bold px-2 outline-none flex-1 bg-transparent" />
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm border-y-0 border-r-0">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[9px] font-bold uppercase text-muted-foreground">Saldo</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className={`text-lg sm:text-2xl font-bold truncate ${stats.saldo < 0 ? 'text-red-500' : 'text-foreground'}`}>{euroFormat.format(stats.saldo)}</div></CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500 shadow-sm border-y-0 border-r-0">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[9px] font-bold uppercase text-muted-foreground">Despesas</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-lg sm:text-2xl font-bold text-foreground truncate">{euroFormat.format(stats.pagamentos)}</div></CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400 shadow-sm border-y-0 border-r-0">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[9px] font-bold uppercase text-muted-foreground">Receitas</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-lg sm:text-2xl font-bold text-foreground truncate">{euroFormat.format(stats.receitas)}</div></CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500 shadow-sm border-y-0 border-r-0 max-w-[150px]">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[9px] font-bold uppercase text-muted-foreground">Noites Campo</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-lg sm:text-2xl font-bold text-foreground">{stats.noites}</div></CardContent>
        </Card>
        
        <Card className={`border-l-4 shadow-sm border-y-0 border-r-0 ${stats.pendentesCount > 0 ? 'border-l-orange-500 bg-orange-50/20' : 'border-l-slate-200'}`}>
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[9px] font-bold uppercase text-muted-foreground">Caixa</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className={`text-lg sm:text-2xl font-bold ${stats.pendentesCount > 0 ? 'text-orange-600' : 'text-foreground'}`}>{stats.pendentesCount}</div></CardContent>
        </Card>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <Card className="col-span-1 lg:col-span-4 shadow-sm border-none ring-1 ring-border">
          <CardHeader className="border-b border-border/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600" /> Saldo por Secção</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-6 px-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosSaldoSeccao}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} />
                <Tooltip cursor={{fill: '#f8fafc'}} formatter={(v: number) => [euroFormat.format(v), 'Saldo']} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={30}>
                  {dadosSaldoSeccao.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  <LabelList dataKey="valor" position="top" formatter={(v: number) => `${v.toFixed(2)}€`} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b'}} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3 shadow-sm border-none ring-1 ring-border">
          <CardHeader className="border-b border-border/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><PieIcon className="h-4 w-4 text-blue-600" /> Distribuição Gastos</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gastosPorCategoria} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={renderLabel} labelLine={true}>
                  {gastosPorCategoria.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => euroFormat.format(v)} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3 shadow-sm border-none ring-1 ring-border">
          <CardHeader className="border-b border-border/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><PieIcon className="h-4 w-4 text-blue-600" /> Distribuição Receitas</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={receitaPorCategoria} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={renderLabel} labelLine={true}>
                  {receitaPorCategoria.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => euroFormat.format(v)} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3 shadow-sm border-none ring-1 ring-border">
          <CardHeader className="border-b border-border/20">
            <CardTitle className="text-sm font-bold text-red-600">Total Despesas</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosDespesaSeccao} layout="vertical" margin={{ right: 50 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={10} width={80} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => euroFormat.format(v)} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={15}>
                  <LabelList dataKey="valor" position="right" formatter={(v: any) => v > 0 ? euroFormat.format(v) : ''} style={{fontSize: '10px', fill: '#64748b', fontWeight: 'bold'}} offset={10} />
                  {dadosDespesaSeccao.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-4 shadow-sm border-none ring-1 ring-border">
          <CardHeader className="border-b border-border/20">
            <CardTitle className="text-sm font-bold text-green-600">Total Receitas</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosReceitasSeccao} layout="vertical" margin={{ right: 50 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={10} width={80} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => euroFormat.format(v)} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={15}>
                  <LabelList dataKey="valor" position="right" formatter={(v: any) => v > 0 ? euroFormat.format(v) : ''} style={{fontSize: '10px', fill: '#64748b', fontWeight: 'bold'}} offset={10} />
                  {dadosReceitasSeccao.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-7 shadow-sm border-none ring-1 ring-border">
          <CardHeader className="border-b border-border/20 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" /> Balanço Financeiro por Atividade
            </CardTitle>
            <div className="flex gap-4 text-[10px] font-bold uppercase text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted-foreground" /> Receitas</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted-foreground opacity-40" /> Custos</span>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosFinanceiroAtividades} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} />
                <Tooltip cursor={{fill: '#f8fafc'}} formatter={(v: number, name: string) => [euroFormat.format(v), name === 'custo' ? 'Custo' : 'Receita']} />
                <Bar dataKey="receita" name="receita" radius={[4, 4, 0, 0]} barSize={25}>
                  {dadosFinanceiroAtividades.map((entry, index) => <Cell key={`cell-rec-${index}`} fill={buscarCor(entry.seccao)} />)}
                  <LabelList dataKey="receita" position="top" formatter={(v: any) => v > 0 ? `${v.toFixed(0)}€` : ''} style={{ fontSize: '9px', fill: '#64748b' }} />
                </Bar>
                <Bar dataKey="custo" name="custo" radius={[4, 4, 0, 0]} barSize={25}>
                  {dadosFinanceiroAtividades.map((entry, index) => <Cell key={`cell-custo-${index}`} fill={buscarCor(entry.seccao)} fillOpacity={0.4} />)}
                  <LabelList dataKey="custo" position="top" formatter={(v: any) => v > 0 ? `${v.toFixed(0)}€` : ''} style={{ fontSize: '9px', fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
