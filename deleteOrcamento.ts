import { z } from 'zod';
import { OrcamentoAnual, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Elimina um registo da folha de Orçamento Anual marcando-o como DELETED',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ input }) => {
    await OrcamentoAnual.update({
      rowId: input.id,
      row: {
        ano: 'DELETED',
      }
    });

    return { success: true };
  },
});
