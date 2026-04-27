import { z } from 'zod';
import { Elementos, ElementosRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Marks an elemento as deleted by updating its name and state to \'DELETED\'',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const updateElementoRow = await Elementos.update({
      row: {
        nome: `DELETED`,
        estado: `DELETED`
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
