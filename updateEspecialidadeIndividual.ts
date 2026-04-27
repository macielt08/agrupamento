import { z } from 'zod';
import { EspecialidadesIndividual, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Updates an existing record in the EspecialidadesIndividual sheet',
  inputSchema: z.object({
    id: z.number(),
    req1: z.string().optional(),
    req2: z.string().optional(),
    req3: z.string().optional(),
    req4: z.string().optional(),
    req5: z.string().optional(),
    req6: z.string().optional(),
    dataConcluido: z.string().optional(),
    observacoes: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const { id, ...fields } = input;
    const result = await EspecialidadesIndividual.update({ rowId: id, row: fields });
    return result;
  },
});
