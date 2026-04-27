import { z } from 'zod';
import { createEndpoint, OrcamentoAnual, OrcamentoAnualRowType } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Retrieves all records from the Orçamento Anual sheet',
  inputSchema: z.object({}).optional(),
  outputSchema: z.object({
    records: z.array(z.any())
  }),
  execute: async () => {
    const findAllRecords = await OrcamentoAnual.findAll({});

    return {
      records: findAllRecords || []
    };
  },
});
