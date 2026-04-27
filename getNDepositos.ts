import { z } from 'zod';
import { NDepositos, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Fetches all records from the NDepositos sheet',
  authenticated: false,
  inputSchema: z.object({}),
  outputSchema: z.object({
    records: z.array(z.object({
      id: z.number(),
      tipo: z.string().optional(),
      seccao: z.string().optional(),
      data: z.string().optional(),
      valor: z.string().optional(),
      utilizador: z.string().optional(),
      dataEdicao: z.string().optional(),
    }))
  }),
  execute: async () => {
    const rows = await NDepositos.findAll({});
    return { records: (rows || []) as any[] };
  },
});
