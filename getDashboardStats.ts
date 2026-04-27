import { z } from 'zod';
import { Movimentos, Atividades, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Obtém estatísticas consolidadas para o Dashboard',
  authenticated: false,
  inputSchema: z.object({
    ano: z.number().optional().default(new Date().getFullYear()),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    // 1. Procurar todos os dados necessários
    const [allMovimentos, allAtividades] = await Promise.all([
      Movimentos.findAll({}),
      Atividades.findAll({})
    ]);

    // 2. Calcular Saldo Global e por Secção
    const saldosPorSeccao: Record<string, number> = {
      'Alcateia': 0,
      'Expedição': 0,
      'Comunidade': 0,
      'Clã': 0,
      'Agrupamento': 0
    };

    let saldoGlobal = 0;

    allMovimentos?.forEach(mov => {
      const valor = mov.valor || 0;
      const isReceita = mov.tipo === 'Receita';
      const montante = isReceita ? valor : -valor;

      saldoGlobal += montante;
      
      if (mov.seccao && saldosPorSeccao[mov.seccao] !== undefined) {
        saldosPorSeccao[mov.seccao] += montante;
      }
    });

    // 3. Calcular Noites de Campo (Somar a coluna 'totalNoites' de todas as atividades do ano)
    const noitesTotal = allAtividades?.reduce((acc, ativ) => {
      // Filtrar por ano se a data existir
      const dataAtiv = ativ.dataInicio ? new Date(ativ.dataInicio) : null;
      if (dataAtiv && dataAtiv.getFullYear() === input.ano) {
        return acc + (ativ.totalNoites || 0);
      }
      return acc;
    }, 0);

    // 4. Formatar para o Gráfico do Recharts
    const chartData = Object.keys(saldosPorSeccao).map(seccao => ({
      name: seccao,
      saldo: parseFloat(saldosPorSeccao[seccao].toFixed(2)),
      // Cores oficiais do CNE
      color: seccao === 'Alcateia' ? '#fde047' : 
             seccao === 'Expedição' ? '#3b82f6' : 
             seccao === 'Comunidade' ? '#ef4444' : 
             seccao === 'Clã' ? '#22c55e' : '#64748b'
    }));

    return {
      stats: {
        saldoGlobal: parseFloat(saldoGlobal.toFixed(2)),
        noitesTotal,
        chartData
      }
    };
  },
});
