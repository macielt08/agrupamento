import { z } from 'zod';
import { createEndpoint, NSaldos } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Fetches all NSaldos records',
  inputSchema: z.object({}),
  outputSchema: z.object({
    records: z.array(z.object({
      id: z.number(),
      seccao: z.string().optional(),
      valor: z.number().optional(),
      anoEscutista: z.string().optional(),
      estado: z.number().optional()
    }))
  }),
  execute: async () => {
    const records = await NSaldos.findAll({});
    return {
      records: records || []
    };
  },
});
