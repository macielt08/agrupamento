import { z } from 'zod';
import { Inventario, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Marks line as deleted by updating its produto and estado to DELETED',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    await Inventario.update({
      row: {
        produto: 'DELETED',
        estado: 'DELETED'
      },
      rowId: input.id
    });

    return { success: true };
  },
});
