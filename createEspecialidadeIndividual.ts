import { z } from 'zod';
import { EspecialidadesIndividual, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Creates a new record in the EspecialidadesIndividual sheet',
  inputSchema: z.object({
    elemento: z.string(),
    seccao: z.string(),
    especialidade: z.string(),
    dataInicio: z.string().optional(),
    dataConcluido: z.string().optional(),
    req1: z.string().optional(),
    req2: z.string().optional(),
    req3: z.string().optional(),
    req4: z.string().optional(),
    req5: z.string().optional(),
    req6: z.string().optional(),
    observacoes: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const record = await EspecialidadesIndividual.create({ row: input });
    return record;
  },
});
