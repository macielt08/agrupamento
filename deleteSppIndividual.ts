import { z } from 'zod';
import { SppIndividual, SppIndividualRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Deletes an SPP Individual entry by marking it as DELETED',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const updateSppIndividual = await SppIndividual.update({
      row: {
        area: `DELETED`,
        objetivo: `DELETED`,
        elemento: `DELETED`
      },
      rowId: input.id
    });

    const computereturnSuccess = () => {
      return { success: true };
    }
  
    const returnSuccess = computereturnSuccess();

    return returnSuccess;
  },
});
