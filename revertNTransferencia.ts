import { z } from 'zod';
import { createEndpoint, NTransferencias, NMovimentos } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Reverts NTransferencias records and resets corresponding NMovimentos to Caixa',
  inputSchema: z.object({
    items: z.array(z.object({
      transferId: z.number(),
      movimentoId: z.number(),
    })),
    utilizador: z.string(),
  }),
  outputSchema: z.object({ success: z.boolean(), reverted: z.number() }),
  execute: async ({ input }) => {
    const dataAtual = new Date().toISOString().split('T')[0];

    for (const item of input.items) {
      // Mark NTransferencias record as DELETED
      await NTransferencias.update({
        rowId: item.transferId,
        row: {
          tipo: 'DELETED',
          utilizador: input.utilizador,
          dataEdicao: dataAtual,
        },
      });

      // Reset NMovimentos: estadoMovimento = Caixa, subCategoria = 0
      if (item.movimentoId > 0) {
        await NMovimentos.update({
          rowId: item.movimentoId,
          row: {
            estadoMovimento: 'Caixa',
            subCategoria: 0,
            utilizador: input.utilizador,
            dataEdicao: dataAtual,
          },
        });
      }
    }

    return { success: true, reverted: input.items.length };
  },
});
