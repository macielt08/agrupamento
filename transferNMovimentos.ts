import { z } from 'zod';
import { createEndpoint, NMovimentos, NTransferencias } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Marks selected NMovimentos as Transferido and copies them to NTransferencias with a shared Transfer ID',
  inputSchema: z.object({
    ids: z.array(z.number()),
    utilizador: z.string(),
  }),
  outputSchema: z.object({
    transferidos: z.number(),
    numeroTransferencia: z.number(),
  }),
  execute: async ({ input }) => {
    const dataAtual = new Date().toISOString().split('T')[0];
    
    // 1. Obter todos os registos existentes para calcular o próximo "Numero de Transferencia"
    const todasTransferencias = await NTransferencias.findAll({});
    const ultimoNumero = (todasTransferencias || []).reduce((max, t) => {
      const num = Number(t.numeroTransferencia); // Ajusta para o nome exato da tua coluna se necessário
      return num > max ? num : max;
    }, 0);
    
    const novoNumeroTransferencia = ultimoNumero + 1;

    const allMovimentos = await NMovimentos.findAll({});
    const movimentos = (allMovimentos || []).filter(m => input.ids.includes(m.id));

    for (const mov of movimentos) {
      // 2. Update NMovimentos: Marcar como Transferido e gravar o ID do lote na SubCategoria
      await NMovimentos.update({
        rowId: mov.id,
        row: {
          estadoMovimento: 'Transferido',
          utilizador: input.utilizador,
          dataEdicao: dataAtual,
          agr: mov.agr,
          subCategoria: novoNumeroTransferencia, // Grava o ID da transferência para rastreio
        },
      });

      // 3. Create row in NTransferencias
      await NTransferencias.create({
        row: {
          numeroTransferencia: novoNumeroTransferencia, // O mesmo ID para todos os registos deste lote
          tipo: mov.tipo,
          categoria: mov.categoria,
          subCategoria: mov.id, // Mantém o ID original do movimento conforme o teu código
          descricao: mov.descricao,
          observacoes: mov.observacoes,
          data: mov.data,
          valor: mov.valor ?? undefined,
          tipoPagamento: mov.tipoPagamento,
          seccao: mov.seccao,
          elemento: mov.elemento,
          atividade: mov.atividade,
          utilizador: input.utilizador,
          dataEdicao: dataAtual,
          tempo: mov.tempo,
          estadoMovimento: 'Transferido',
        },
      });
    }

    return { 
      transferidos: movimentos.length,
      numeroTransferencia: novoNumeroTransferencia 
    };
  },
});
