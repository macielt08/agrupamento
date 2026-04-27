import { z } from 'zod';
import { Utilizadores, UtilizadoresRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Deletes a user by updating their name to \'DELETED\' in the Utilizadores sheet',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const updateUser = await Utilizadores.update({
      row: {
        nome: `DELETED`
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
