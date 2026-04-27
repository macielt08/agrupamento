import { z } from 'zod';
import { Atividades, AtividadesRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Deletes an activity by updating its name and section to \'DELETED\'',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const updateAtividade = await Atividades.update({
      row: {
        nome: `DELETED`,
        seccao: `DELETED`
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
