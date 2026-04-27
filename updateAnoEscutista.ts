import { z } from 'zod';
import { createEndpoint, AnoEscutista } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Updates an existing AnoEscutista record. To delete, set estado to "Eliminado".',
  inputSchema: z.object({
    id: z.number(),
    ano: z.string().optional(),
    estado: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    await AnoEscutista.update({
      rowId: input.id,
      row: {
        ...(input.ano !== undefined && { ano: input.ano }),
        ...(input.estado !== undefined && { estado: input.estado }),
      },
    });
    return { success: true };
  },
});
