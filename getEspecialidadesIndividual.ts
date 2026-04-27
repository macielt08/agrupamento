import { z } from 'zod';
import { EspecialidadesIndividual, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Retrieves all records from the EspecialidadesIndividual sheet',
  inputSchema: z.object({}).optional(),
  outputSchema: z.any(),
  execute: async () => {
    const records = await EspecialidadesIndividual.findAll({});
    return { records: (records ?? []).filter(r => r.elemento !== 'DELETED') };
  },
});
