import { z } from 'zod';
import { Categorias, CategoriasRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Marks a category as deleted by updating its fields to \'DELETED\' in the Categorias sheet',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const updateCategoria = await Categorias.update({
      row: {
        categoria: `DELETED`,
        subCategoria: `DELETED`,
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
