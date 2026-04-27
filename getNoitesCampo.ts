import { z } from 'zod';
import { NoitesCampo, NoitesCampoRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Retrieves all records from the Noites Campo sheet',
  authenticated: false,
  inputSchema: z.object({}).optional(),
  outputSchema: z.any(),
  execute: async ({ input }) => {
  const findAllNoitesCampo = await NoitesCampo.findAll({});

    const computeformatOutput = () => {
      return {
        records: findAllNoitesCampo || []
      };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
