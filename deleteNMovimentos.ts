import { z } from 'zod';
import { NMovimentos, NMovimentosRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Marks an movimento as deleted by updating its tipo to \'DELETED\'',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const updateNMovimentosRow = await NMovimentos.update({
      row: {
        tipo: `DELETED`
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
