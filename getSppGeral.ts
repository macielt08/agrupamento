import { z } from 'zod';
import { SppGeral, SppGeralRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Retrieves all records from the SPP Geral sheet',
  authenticated: false,
  inputSchema: z.object({}).optional(),
  outputSchema: z.any(),
  execute: async ({ input }) => {
  const findAllRecords = await SppGeral.findAll({});

    const computeformatOutput = () => {
      return {
        records: findAllRecords || []
      };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
