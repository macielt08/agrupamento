import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getImageUrl } from '@/utils/logocne';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus,
  Save,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  FileText,
  ChevronRight,
  RefreshCw
} from "lucide-react";

interface BudgetAnualViewProps {
  orcamentoAnual: any[];
  movimentos: any[];
  userSeccao: string;
  isAdmin: boolean;
  onSeccaoChange: (seccao: string) => void;
  onAddEntry?: (newData: any) => void;
  onEditEntry?: (updatedData: any) => void;
  onDeleteEntry?: (id: string | number) => void;
  onRefresh?: () => void;
}

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(undefined);
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(undefined);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const getBase64ImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = error => reject(error);
    img.src = url;
  });
};

// Subcomponente de Tabela com Ações
const BudgetTable = ({ 
  title, 
  data, 
  type, 
  onAdd,
  onEdit,
  onDelete,
  showSeccaoColumn
}: { 
  title: string, 
  data: any[], 
  type: 'Receita' | 'Despesa', 
  onAdd: () => void,
  onEdit: (item: any) => void,
  onDelete: (item: any) => void,
  showSeccaoColumn: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalTable = useMemo(() =>
    data.reduce((acc, curr) => acc + (Number(curr.custoTotal) || 0), 0)
  , [data]);
  
  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
      <CardHeader 
        className={`py-3 flex flex-row items-center justify-between space-y-0 cursor-pointer ${
          type === 'Receita' ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            {type === 'Receita' ? <ArrowUpCircle className="h-4 w-4 text-green-600" /> : <ArrowDownCircle className="h-4 w-4 text-red-600" />}
            {title}
          </CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-xs font-mono font-bold px-2 py-1 rounded-md bg-white/50 dark:bg-slate-900/50 border shadow-sm ${
            type === 'Receita' ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'
          }`}>
            Total: {totalTable.toFixed(2)}€
          </div>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAdd(); }} className="h-7 px-2 text-xs gap-1 bg-white dark:bg-slate-950 shadow-sm">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-transparent">
                <TableHead className="pl-4 h-9 text-[11px] uppercase font-bold text-slate-500">Descrição</TableHead>
                {showSeccaoColumn && (
                  <TableHead className="h-9 text-[10px] uppercase font-bold text-center">Secção</TableHead>
                )}
                <TableHead className="text-center h-9 text-[11px] uppercase font-bold text-slate-500">Part.</TableHead>
                <TableHead className="text-center h-9 text-[11px] uppercase font-bold text-slate-500">Custo</TableHead>
                <TableHead className="text-right h-9 text-[11px] uppercase font-bold text-slate-500">Total</TableHead>
                <TableHead className="text-right pr-4 h-9 text-[11px] uppercase font-bold text-slate-500">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground text-xs italic">
                    Sem registos encontrados.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => (
                  <TableRow key={item.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group">
                    <TableCell className="pl-4 py-2 font-medium text-sm">{item.descricao}</TableCell>
                    {showSeccaoColumn && (
                      <TableCell className="text-center py-2">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal">
                          {item.seccao}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-center py-2 text-xs text-muted-foreground">{item.participantes || '-'}</TableCell>
                    <TableCell className="text-center py-2 text-xs font-mono">{Number(item.custoUnitario || 0).toFixed(2)}€</TableCell>
                    <TableCell className={`text-right py-2 font-mono font-bold ${type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(item.custoTotal || 0).toFixed(2)}€
                    </TableCell>
                    <TableCell className="text-right pr-4 py-2">
                      <div className="flex justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(item)}>
                          <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => onDelete(item)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
};

export function BudgetAnualView({ 
  orcamentoAnual,
  movimentos,
  userSeccao, 
  isAdmin, 
  onSeccaoChange, 
  onAddEntry, 
  onEditEntry, 
  onDeleteEntry,
  onRefresh
}: BudgetAnualViewProps) {
  
  const [anoSelecionado, setAnoSelecionado] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemParaEliminar, setItemParaEliminar] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [ showDifferences, setShowDifferences] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);


  
  const [formData, setFormData] = useState({
    id: '',
    descricao: '',
    custoUnitario: '',
    participantes: '',
    categoria: '',
    tipo: '',
    seccao: '',
    ano: '',
    custoTotal: ''
  });

  const seccoesDisponiveis = useMemo(() => {
    const baseSeccoes = [...new Set(orcamentoAnual.map(item => item.seccao))].filter(Boolean).sort();
    return isAdmin ? ["Todas", ...baseSeccoes] : baseSeccoes;
  }, [orcamentoAnual, isAdmin]);

  const anosDisponiveis = useMemo(() => 
    [...new Set(orcamentoAnual.map(item => item.ano))].filter(Boolean).sort().reverse() as string[]
  , [orcamentoAnual]);

  useEffect(() => {
    if (isAdmin && seccoesDisponiveis.length > 0 && !seccoesDisponiveis.includes(userSeccao)) {
      onSeccaoChange(seccoesDisponiveis[0]);
    }
    if (anosDisponiveis.length > 0 && !anoSelecionado) {
      setAnoSelecionado(anosDisponiveis[0]);
    }
  }, [anosDisponiveis, seccoesDisponiveis, userSeccao, isAdmin]);

  const dadosFiltrados = useMemo(() => {
    return orcamentoAnual.filter(item => {
      // Limpa espaços e garante que comparamos strings
      const itemSeccao = item.seccao?.trim().toLowerCase() || "";
      const selectedSeccao = userSeccao?.trim().toLowerCase() || "";
      
      // Compara o ano de forma flexível (ex: "2025/2026" inclui "2025")
      const itemAno = String(item.ano || "").trim();
      const selectedAno = String(anoSelecionado || "").trim();

      const matchesSeccao = selectedSeccao === "todas" || itemSeccao === selectedSeccao;
      const matchesAno = itemAno.includes(selectedAno);

      return matchesSeccao && matchesAno;
    });
  }, [orcamentoAnual, userSeccao, anoSelecionado]);

  // Cálculo do total baseado nos inputs do modal
  const totalCalculado = useMemo(() => {
    const unit = parseFloat(formData.custoUnitario) || 0;
    const parts = parseInt(formData.participantes) || 0;
    return unit * parts;
  }, [formData.custoUnitario, formData.participantes]);

  const openAddModal = (categoria: string, tipo: string) => {
    setIsEditing(false);
    setFormData({ 
      id: '', 
      descricao: '', 
      custoUnitario: '', 
      participantes: '1', 
      categoria, 
      tipo, 
      seccao: userSeccao, 
      ano: anoSelecionado,
      custoTotal: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setIsEditing(true);
    const total = Number(item.custoTotal) || 0;
    const parts = Number(item.participantes) || 0;
    const unitarioCalculado = item.custoUnitario ?? (total / parts);
    setFormData({ 
      ...item, 
      id: item.id,
      custoUnitario: unitarioCalculado.toString(), 
      participantes: parts.toString() 
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.descricao || !formData.custoUnitario) return;
    
    const custoU = parseFloat(Number(String(formData.custoUnitario).replace(',','.')).toString());
    const parts = Number(String(formData.participantes)) || 0;
    const total = parseFloat((custoU * parts).toString());
    const dataToSend = { 
      ...formData,
      id: isEditing ? formData.id : undefined, 
      custoUnitario: custoU,
      participantes: parts,
      custoTotal: total,
    };
    
    if (isEditing) {
      onEditEntry?.(dataToSend);
    } else {
      onAddEntry?.({ ...dataToSend, id: undefined });
    }
    setIsModalOpen(false);
  };

  const handleRefreshClick = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    await onRefresh(); // Chama a função que vem do App.tsx
    
    // Pequeno delay para a animação ser visível se a rede for muito rápida
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const somaRealizada = useMemo(() => {
    // 1. Normalizamos a secção selecionada para comparação
    const seccaoAlvo = (userSeccao || "").trim().toLowerCase();

    // 2. Filtramos os movimentos
    const filtrados = (movimentos || []).filter((mov) => {
      // Normalizamos os dados do movimento
      const movSeccao = (mov.seccao || "").trim().toLowerCase();
      const pendenteSeccao = (mov['Caixa Secção'] || "").trim().toLowerCase();
      const isReceita = mov.tipo === "Receita";

      // Filtro de Ano
      const partesData = mov.data?.split('/');
      const anoMov = partesData?.[2];
      const matchesAno = anoMov && anoSelecionado.includes(anoMov);

      // Verificamos se pertence à secção (na coluna normal ou na de caixa)
      const matchesSeccao = seccaoAlvo === "todas" || 
                            movSeccao === seccaoAlvo || 
                            pendenteSeccao === seccaoAlvo;

      return matchesSeccao && isReceita && matchesAno;
    });

    // 3. Somamos os valores
    return filtrados.reduce((acc, mov) => acc + (Number(mov.valor) || 0), 0);
  }, [movimentos, anoSelecionado, userSeccao]); // Adicionada a dependência userSeccao

  const diferencaRealizada = useMemo(() => {
    // 1. Normalizamos a secção selecionada para comparação
    const seccaoAlvo = (userSeccao || "").trim().toLowerCase();

    // 2. Filtramos os movimentos
    const filtrados = (movimentos || []).filter((mov) => {
      // Normalizamos os dados do movimento
      const movSeccao = (mov.seccao || "").trim().toLowerCase();
      const pendenteSeccao = (mov['Caixa Secção'] || "").trim().toLowerCase();
      const isReceita = mov.tipo === "Pagamento";

      // Filtro de Ano
      const partesData = mov.data?.split('/');
      const anoMov = partesData?.[2];
      const matchesAno = anoMov && anoSelecionado.includes(anoMov);

      // Verificamos se pertence à secção (na coluna normal ou na de caixa)
      const matchesSeccao = seccaoAlvo === "todas" || 
                            movSeccao === seccaoAlvo || 
                            pendenteSeccao === seccaoAlvo;

      return matchesSeccao && isReceita && matchesAno;
    });

    // 3. Somamos os valores
    return filtrados.reduce((acc, mov) => acc + (Number(mov.valor) || 0), 0);
  }, [movimentos, anoSelecionado, userSeccao]); // Adicionada a dependência userSeccao


  const totalReceita = useMemo(() => 
    dadosFiltrados.filter(i => i.tipo === 'Receita' && !i.categoria?.toLowerCase().includes("saldo inicial")).reduce((acc, curr) => acc + (Number(curr.custoTotal) || 0), 0)
  , [dadosFiltrados]);

  const totalDespesa = useMemo(() => 
    dadosFiltrados.filter(i => i.tipo === 'Despesa').reduce((acc, curr) => acc + (Number(curr.custoTotal) || 0), 0)
  , [dadosFiltrados]);

  const totaisReais = useMemo(() => {
    const selecionado = (userSeccao || "").trim().toLowerCase();
    
    return (movimentos || []).reduce((acc, mov) => {
      // 1. Filtro de Secção
      const movSeccao = (mov.seccao || "").trim().toLowerCase();
      const pendenteSeccao = (mov['Caixa Secção'] || "").trim().toLowerCase();
      const matchesSeccao = selecionado === "todas" || movSeccao === selecionado || pendenteSeccao === selecionado;

      // 2. Filtro de Ano (O mov.data está em DD/MM/YYYY)
      const partesData = mov.data?.split('/');
      const anoMov = partesData?.[2]; // Pega o YYYY
      const matchesAno = anoMov && anoSelecionado.includes(anoMov);

      if (matchesSeccao && matchesAno) {
        const valor = Number(mov.valor) || 0;
        if (mov.tipo === 'Receita') acc.receita += valor;
        if (mov.tipo === 'Despesa') acc.despesa += valor;
      }
      return acc;
    }, { receita: 0, despesa: 0 });
  }, [movimentos, userSeccao, anoSelecionado]);

  const difReceitas = totalReceita - totaisReais.receita;
  const difDespesas = totalDespesa - totaisReais.despesa;

  const valorSaldoInicial = useMemo(() => {
    if (!orcamentoAnual || orcamentoAnual.length === 0) return 0;

    // 1. Procuramos no array ORIGINAL (orcamentoAnual) para evitar filtros intermédios
    const registro = orcamentoAnual.find(item => {
      // Normalização das strings (remove espaços e põe em minúsculas)
      const desc = (item.categoria || "").trim().toLowerCase();
      const itemAno = String(item.ano || "").trim();
      const selAno = String(anoSelecionado || "").trim();
      const itemSeccao = (item.seccao || "").trim().toLowerCase();
      const selSeccao = (userSeccao || "").trim().toLowerCase();

      // CONDIÇÃO:
      // Deve conter "saldo inicial" 
      // E o ano deve coincidir (ou o item estar contido no ano selecionado)
      // E a secção deve coincidir
      return desc.includes("saldo inicial") && 
            (itemAno === selAno || itemAno.includes(selAno)) && 
            itemSeccao === selSeccao;
    });

    if (!registro) return 0;

    // 2. Extração do valor tentando todas as variantes de nomes de colunas
    const valor = registro.custoTotal || 
                  registro.total || 
                  registro.custo || 
                  (Number(registro.custoUnitario || 0) * Number(registro.participantes || 1));

    return Number(valor) || 0;
  }, [orcamentoAnual, anoSelecionado, userSeccao]);

  const gerarPDF = async () => {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js');

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();
      
      // 1. IMAGEM (Reduzida em 20% e Centrada)
      const logoBase64 = getImageUrl('Escutismo');
      let yPos = 10; 

      if (logoBase64) {
        // Largura: 210 * 0.8 = 168mm
        // Altura: 30 * 0.8 = 24mm
        // Margem esquerda para centrar: (210 - 168) / 2 = 21mm
        doc.addImage(logoBase64, 'PNG', 31.5, 5, 147, 21); 
        yPos = 35; // O texto começa logo abaixo da imagem
      }

      // 2. TÍTULOS CENTRADOS
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text("Orçamento Anual", 105, yPos, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`${userSeccao}  |  Ano: ${anoSelecionado}`, 105, yPos + 7, { align: 'center' });
      doc.text(`Gerado em: ${new Date().toLocaleString()}`, 105, yPos + 12, { align: 'center' });

      // 3. TABELA DE RESUMO
      const saldoFinalCalculado = valorSaldoInicial + totalReceita - totalDespesa;

      (doc as any).autoTable({
        startY: yPos + 20,
        head: [['Saldo Inicial', 'Total Receitas', 'Total Despesas', 'SALDO FINAL']],
        body: [[
          `${valorSaldoInicial.toFixed(2)}€`,
          `${totalReceita.toFixed(2)}€`,
          `${totalDespesa.toFixed(2)}€`,
          { 
            content: `${saldoFinalCalculado.toFixed(2)}€`, 
            styles: { fontStyle: 'bold', textColor: saldoFinalCalculado >= 0 ? [22, 101, 52] : [185, 28, 28] } 
          }
        ]],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], halign: 'center' },
        styles: { halign: 'center' }
      });

      // 4. FUNÇÃO PARA TABELAS DE DETALHES
      const cores = { despesa: [185, 28, 28], receita: [22, 101, 52] };

      const renderDetalhe = (titulo, cat, tipo, cor) => {
        const itemsFiltrados = dadosFiltrados.filter(item => item.tipo === tipo && item.categoria === cat);
        
        const rows = itemsFiltrados.map(item => [
            item.descricao,
            item.participantes || '1',
            `${Number(item.custoUnitario || 0).toFixed(2)}€`,
            `${Number(item.custoTotal || 0).toFixed(2)}€`
          ]);

        if (rows.length === 0) return;

        const totalCategoria = itemsFiltrados.reduce(
          (acc, curr) => acc + (Number(curr.custoTotal) || 0), 0
        );

        const lastY = (doc as any).lastAutoTable.finalY || yPos + 40;
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(titulo, 14, lastY + 15);

        (doc as any).autoTable({
          startY: lastY + 18,
          head: [['Descrição', 'Part.', 'Unit.', 'Total']],
          body: rows,
          foot: [[
            { content: `TOTAL ${titulo.toUpperCase()}`, colSpan: 3, styles: { halign: 'right' } },
            { content: `${totalCategoria.toFixed(2)}€`, styles: { halign: 'right' } }
          ]],
          theme: 'striped',
          headStyles: { fillColor: cor },
          footStyles: { fillColor: [241, 245, 249], textColor: cor, fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200]},
          columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } }
        });
      };

      // 5. EXECUTAR TABELAS
      renderDetalhe("Despesas de Agrupamento", "Agrupamento", "Despesa", cores.despesa);
      renderDetalhe("Receitas de Agrupamento", "Agrupamento", "Receita", cores.receita);
      renderDetalhe("Despesas de Secção", "Secção", "Despesa", cores.despesa);
      renderDetalhe("Receitas de Secção", "Secção", "Receita", cores.receita);

      // 6. RODAPÉ
      const totalPages = doc.internal.getNumberOfPages();
      for(let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Página ${i} de ${totalPages} - Orçamento ${userSeccao}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
      }

      doc.save(`Orcamento_${userSeccao}_${anoSelecionado.replace('/', '-')}.pdf`);

    } catch (error) {
      console.error("Erro PDF:", error);
      alert("Erro ao gerar o PDF.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-xl font-bold tracking-tight">Orçamento Anual</h3>
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20">{userSeccao}</Badge>
            <Badge variant="outline" className="text-xs font-mono">{anoSelecionado}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
          <Button
            onClick={() => setShowDifferences(!showDifferences)}
            variant={showDifferences ? "default" : "outline"}
            size="sm"
            className={`h-10 px-4 gap-2 font-medium transition-all ${
              showDifferences
                ? "bg-slate-800 text-white hover:bg-slate-700"
                : "border-slate-200 text-slate-700"
            }`}
          >
            {showDifferences ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {showDifferences ? "Ocultar Diferenças" : "Ver Diferenças"}
            </span>
          </Button>
          <Button
            onClick={handleRefreshClick}
            variant="outline"
            size="sm"
            className="h-10 px-4 border-slate-200 hover:bg-slate-50 text-slate-700 gap-2 font-medium"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isRefreshing ? "A atualizar..." : "Atualizar"}
            </span>
          </Button>
          <Button
            onClick={gerarPDF}
            variant="outline"
            size="sm"
            className="h-10 px-4 border-slate-200 hover:bg-slate-50 text-slate-700 gap-2 font-medium"
          >
            <FileText className="h-4 w-4 text-red-600" />
            <span className="sm:inline">Exportar PDF</span>
          </Button>

          {isAdmin && (
            <select 
              className="flex-1 md:w-48 p-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-800"
              value={userSeccao}
              onChange={(e) => onSeccaoChange(e.target.value)}>
              {seccoesDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select className="flex-1 md:w-32 p-2 border rounded-lg text-sm font-bold bg-slate-50 dark:bg-slate-800" value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)}>
            {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-600 to-orange-700 text-white border-none shadow-md relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center opacity-70">
              <span className="text-xs uppercase font-bold">Saldo Inicial</span>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-xl md:text-2xl font-bold mt-1">
              {valorSaldoInicial.toFixed(2)}€
            </div>

            {/* Botão de Ação */}
            <div className="absolute bottom-2 right-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors"
                onClick={() => {
                  // 1. Tentar encontrar o item existente
                  const itemExistente = orcamentoAnual.find(i => 
                    i.categoria?.toLowerCase().includes("saldo inicial") && 
                    String(i.ano).includes(anoSelecionado) &&
                    i.seccao === userSeccao
                  );

                  if (itemExistente) {
                    // Se existe, abre edição
                    openEditModal(itemExistente);
                  } else {
                    // Se não existe, abre criação forçando os dados do Saldo Inicial
                    setIsEditing(false);
                    setFormData({
                      id: '',
                      descricao: 'Saldo Inicial',
                      custoUnitario: '0',
                      participantes: '1',
                      categoria: 'Saldo Inicial', // Ajusta se necessário
                      tipo: 'Receita',
                      seccao: userSeccao,
                      ano: anoSelecionado,
                      custoTotal: '0'
                    });
                    setIsModalOpen(true);
                  }
                }}
              >
                {valorSaldoInicial === 0 ? <Plus className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center opacity-70"><span className="text-xs uppercase font-bold">Receitas</span><TrendingUp className="h-4 w-4" /></div>
            <div className="text-xl md:text-2xl font-bold mt-1">{totalReceita.toFixed(2)}€</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-600 to-red-700 text-white border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center opacity-70"><span className="text-xs uppercase font-bold">Despesas</span><TrendingDown className="h-4 w-4" /></div>
            <div className="text-xl md:text-2xl font-bold mt-1">{totalDespesa.toFixed(2)}€</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center opacity-70"><span className="text-xs uppercase font-bold">Saldo Bruto</span><Wallet className="h-4 w-4" /></div>
            <div className="text-xl md:text-2xl font-bold mt-1">{(valorSaldoInicial + totalReceita - totalDespesa).toFixed(2)}€</div>
          </CardContent>
        </Card>
        {showDifferences && (
          <>
            <Card className="bg-gradient-to-br from-green-600 to-green-600 text-white border-none shadow-md">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center opacity-70"><span className="text-xs uppercase font-bold">Diferença Receitas</span><Wallet className="h-4 w-4" /></div>
                <div className="text-xl md:text-2xl font-bold mt-1">{(somaRealizada - totalReceita).toFixed(2)}€</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-600 to-red-600 text-white border-none shadow-md">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center opacity-70"><span className="text-xs uppercase font-bold">Diferença Despesas</span><Wallet className="h-4 w-4" /></div>
                <div className="text-xl md:text-2xl font-bold mt-1">{(diferencaRealizada - totalDespesa).toFixed(2)}€</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetTable title="Despesas de Agrupamento" data={dadosFiltrados.filter(i => i.categoria === 'Agrupamento' && i.tipo === 'Despesa')} type="Despesa" onAdd={() => openAddModal('Agrupamento', 'Despesa')} onEdit={openEditModal} onDelete={(i) => { setItemParaEliminar(i); setIsDeleteModalOpen(true); }} showSeccaoColumn={false} />
        <BudgetTable title="Receitas de Agrupamento" data={dadosFiltrados.filter(i => i.categoria === 'Agrupamento' && i.tipo === 'Receita')} type="Receita" onAdd={() => openAddModal('Agrupamento', 'Receita')} onEdit={openEditModal} onDelete={(i) => { setItemParaEliminar(i); setIsDeleteModalOpen(true); }} showSeccaoColumn={false} />
        <BudgetTable title="Despesas de Secção" data={dadosFiltrados.filter(i => i.categoria === 'Secção' && i.tipo === 'Despesa')} type="Despesa" onAdd={() => openAddModal('Secção', 'Despesa')} onEdit={openEditModal} onDelete={(i) => { setItemParaEliminar(i); setIsDeleteModalOpen(true); }} showSeccaoColumn={true} />
        <BudgetTable title="Receitas de Secção" data={dadosFiltrados.filter(i => i.categoria === 'Secção' && i.tipo === 'Receita')} type="Receita" onAdd={() => openAddModal('Secção', 'Receita')} onEdit={openEditModal} onDelete={(i) => { setItemParaEliminar(i); setIsDeleteModalOpen(true); }} showSeccaoColumn={true} />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-bold text-xl">{isEditing ? 'Editar Registo' : 'Novo Registo Orçamental'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Edite os valores do registo orçamental.' : 'Insira os dados para criar um novo registo orçamental.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Secção</Label>
                <Input value={formData.seccao} readOnly className="h-9 bg-slate-50 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-ano" className="text-[10px] uppercase font-bold text-blue-600">Ano Orçamental</Label>
                <Input id="edit-ano" value={formData.ano} onChange={(e) => setFormData({...formData, ano: e.target.value})} className="h-9 border-blue-200" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Categoria</Label>
                <Input value={formData.categoria} readOnly className="h-9 bg-slate-50 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo</Label>
                <Input value={formData.tipo} readOnly className="h-9 bg-slate-50 cursor-not-allowed" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="desc" className="text-[10px] uppercase font-bold text-blue-600">Descrição</Label>
              <Input id="desc" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} placeholder="Ex: Venda de Bolos" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="custoUnitario" className="text-[10px] uppercase font-bold text-blue-600">Custo Unitário (€)</Label>
                <Input id="custoUnitario" type="number" step="0.01" value={formData.custoUnitario} onChange={(e) => setFormData({...formData, custoUnitario: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="part" className="text-[10px] uppercase font-bold text-blue-600">Participantes</Label>
                <Input id="part" type="number" value={formData.participantes} onChange={(e) => setFormData({...formData, participantes: e.target.value})} />
              </div>
            </div>

            <div className="pt-3 border-t mt-2">
              <div className="bg-slate-900 text-white p-3 rounded-lg flex justify-between items-center shadow-inner">
                <span className="text-[10px] uppercase font-bold opacity-60">Valor Total Estimado:</span>
                <span className="font-mono font-bold text-lg">
                  {totalCalculado.toFixed(2)}€
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.descricao || !formData.custoUnitario} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Save className="h-4 w-4" /> Guardar Dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[350px]" aria-describedby={undefined}>
          <div className="flex flex-col items-center text-center p-2">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg">Confirmar Eliminação</h3>
            <p className="text-sm text-slate-500 mt-2">
              Desejas realmente apagar o registo: <br/>
              <span className="font-bold text-slate-900">"{itemParaEliminar?.descricao}"</span>?
            </p>
          </div>
          <DialogFooter className="sm:justify-center gap-2 mt-4">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (itemParaEliminar) onDeleteEntry?.(itemParaEliminar.id); setIsDeleteModalOpen(false); }} className="px-8">
              Sim, Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
