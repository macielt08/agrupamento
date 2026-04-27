import { z } from 'zod';
import { createEndpoint, AnoEscutista } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Fetches all AnoEscutista records',
  inputSchema: z.object({}),
  outputSchema: z.object({
    records: z.array(z.object({
      id: z.number(),
      ano: z.string().optional(),
      estado: z.string().optional(),
    }))
  }),
  execute: async () => {
    const records = await AnoEscutista.findAll({});
    return {
      records: records || []
    };
  },
});
