import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Landmark, TrendingUp, RefreshCw, Edit2, Check, X } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Interface flexível para a tua sheet
interface NSaldoItem {
  id?: string;
  Seccao: string;
  Valor: number | string;
  Estado?: number | string;
}

interface SaldosViewProps {
  nsaldos: NSaldoItem[];
  onRefresh: () => Promise<void>;
  onUpdateValue?: (seccao: string, novoValor: number) => Promise<void>;
}

const getSeccaoColor = (seccao: string | undefined) => {
  if (!seccao) return 'from-orange-500 to-orange-600';
  const s = seccao.toLowerCase().trim();
  if (s.includes('lobitos') || s.includes('alcateia')) return 'from-yellow-500 to-yellow-600';
  if (s.includes('exploradores') || s.includes('expedição')) return 'from-green-600 to-green-700';
  if (s.includes('pioneiros') || s.includes('comunidade')) return 'from-blue-600 to-blue-700';
  if (s.includes('caminheiros') || s.includes('clã')) return 'from-red-600 to-red-700';
  if (s.includes('agrupamento')) return 'from-slate-700 to-slate-800';
  if (s.includes('caixa')) return 'from-emerald-600 to-emerald-700';
  return 'from-orange-500 to-orange-600';
};

export function SaldosView({ nsaldos, onRefresh, onUpdateValue }: SaldosViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingSeccao, setEditingSeccao] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const startEditing = (item: NSaldoItem) => {
    setEditingSeccao(item.Seccao);
    setTempValue(String(item.Valor));
  };

  const saveEdit = async (seccao: string) => {
    if (onUpdateValue) {
      setIsRefreshing(true);
      try {
        await onUpdateValue(seccao, parseFloat(tempValue));
        setEditingSeccao(null);
        await onRefresh();
      } catch (err) {
        console.error("Erro ao atualizar:", err);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // 1. Filtrar para o grid (exclui apenas a linha "Total" se ela vier da sheet para não duplicar)
  const cardsParaExibir = useMemo(() => {
    return nsaldos.filter(item => {
      const nome = (item.Seccao || "").trim().toLowerCase();
      return nome !== 'total' && nome !== "";
    });
  }, [nsaldos]);

  // 2. SOMA REAL de todos os cards exibidos (Agrupamento, Caixa e Secções)
  const totalGeral = useMemo(() => {
    return cardsParaExibir.reduce((acc, item) => {
      const valor = Number(item.Valor) || 0;
      return acc + valor;
    }, 0);
  }, [cardsParaExibir]);

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">Gestão de Saldos</h2>
          <p className="text-muted-foreground italic">Dados sincronizados com a folha NSaldos</p>
        </div>
        
        <Button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            variant="outline"
            className="rounded-full shadow-sm bg-white dark:bg-slate-800 border-slate-200"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'A sincronizar...' : 'Sincronizar Agora'}
        </Button>
      </div>

      {/* Card Saldo Total - Soma de Agrupamento, Caixa e Secções */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
        {isRefreshing && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-pulse" />}
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
            <Wallet className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Total em Caixa</h2>
            <p className="text-muted-foreground text-sm font-medium italic tracking-tight">Consolidado Geral de Agrupamento</p>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 rounded-2xl border text-center md:text-right">
          <span className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-widest">Saldo Disponível</span>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalGeral.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cardsParaExibir.map((item, index) => {
          const isEditing = editingSeccao === item.Seccao;
          const corCard = getSeccaoColor(item.Seccao);
          const valor = Number(item.Valor) || 0;

          return (
            <Card 
              key={index} 
              className={`border-none shadow-lg overflow-hidden bg-gradient-to-br ${corCard} text-white transition-all hover:shadow-2xl`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                    <Landmark className="h-5 w-5 text-white" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <button 
                        onClick={() => startEditing(item)}
                        className="bg-white/10 hover:bg-white/30 p-1.5 rounded-md transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(item.Seccao)} className="bg-emerald-500 p-1.5 rounded-md shadow-lg">
                          <Check className="h-4 w-4 text-white" />
                        </button>
                        <button onClick={() => setEditingSeccao(null)} className="bg-red-500 p-1.5 rounded-md shadow-lg">
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-black uppercase tracking-tighter mb-1">
                  {item.Seccao}
                </h3>
                
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="bg-white/20 border-white/30 text-white text-2xl font-black h-12"
                    autoFocus
                  />
                ) : (
                  <div className="text-4xl font-black tracking-tighter">
                    {valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-white/70">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Saldo Atual</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
