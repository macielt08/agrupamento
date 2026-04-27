import { z } from 'zod';
import { Categorias, CategoriasRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Updates an existing category in the Categorias sheet with the provided fields',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
    seccao: z.string().optional(),
    categoria: z.string().optional(),
    subCategoria: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const updateCategoriasRow = await Categorias.update({
      row: {
        categoria: input.categoria,
        subCategoria: input.subCategoria,
        seccao: input.seccao
      },
      rowId: input.id
    });

    const computeformatOutput = () => {
      return { success: true };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
