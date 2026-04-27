import { z } from 'zod';
import { EspecialidadesIndividual, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Soft-deletes a record in the EspecialidadesIndividual sheet',
  inputSchema: z.object({
    id: z.number(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const result = await EspecialidadesIndividual.update({
      rowId: input.id,
      row: { elemento: 'DELETED' },
    });
    return result;
  },
});
