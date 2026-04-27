import { z } from 'zod';
import { createEndpoint, NCategorias } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Fetches all NCategorias records',
  inputSchema: z.object({}),
  outputSchema: z.object({
    records: z.array(z.object({
      id: z.number(),
      tipo: z.string().optional(),
      categoria: z.string().optional(),
    }))
  }),
  execute: async () => {
    const records = await NCategorias.findAll({});
    return {
      records: (records || []).map(r => ({ id: r.id, tipo: r.tipo, categoria: r.subCategoria }))
    };
  },
});
