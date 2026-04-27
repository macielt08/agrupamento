import { z } from 'zod';
import { createEndpoint, Especialidades } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Fetches all rows from the Especialidades sheet',
  inputSchema: z.object({}),
  outputSchema: z.object({
    rows: z.array(z.object({
      id: z.number(),
      especialidade: z.string().optional(),
      descricao: z.string().optional(),
      seccao: z.string().optional(),
      base: z.string().optional(),
      avancado: z.string().optional(),
    })),
  }),
  execute: async () => {
    const rows = await Especialidades.findAll({ limit: 2000 });
    return {
      rows: (rows ?? []).map(r => ({
        id: r.id,
        especialidade: r.especialidade,
        descricao: r.descricao,
        seccao: r.seccao,
        base: r.base,
        avancado: r.avancado,
      })),
    };
  },
});
