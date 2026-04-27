import { z } from 'zod';
import { Inventario, InventarioRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Updates an existing row in the Inventario sheet with the provided information',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
    produto: z.string().optional(),
    mesValidade: z.string().optional(),
    anoValidade: z.string().optional(),
    quantidade: z.number(),
    estado: z.string().optional(),
    obs: z.string().optional(),
}),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const updateInventarioRow = await Inventario.update({
      row: {
        quantidade: input.quantidade
      },
      rowId: input.id
    });

    return { success: true };
  },
});
