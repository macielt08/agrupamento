import { z } from 'zod';
import { createEndpoint, AnoEscutista } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Creates a new AnoEscutista record',
  inputSchema: z.object({
    ano: z.string(),
    estado: z.string().optional(),
  }),
  outputSchema: z.object({
    id: z.number(),
    ano: z.string().optional(),
    estado: z.string().optional(),
  }),
  execute: async ({ input }) => {
    const record = await AnoEscutista.create({
      row: {
        ano: input.ano,
        estado: input.estado || 'Aberto',
      },
    });
    return {
      id: record.id,
      ano: record.ano,
      estado: record.estado,
    };
  },
});
