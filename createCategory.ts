import { z } from 'zod';
import { Categorias, CategoriasRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Creates a new category in the Categorias sheet with the provided categoria, subCategoria, and seccao',
  authenticated: false,
  inputSchema: z.object({
    seccao: z.string(),
    categoria: z.string(),
    subCategoria: z.string(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const createCategoryRow = await Categorias.create({
      row: {
        categoria: input.categoria,
        subCategoria: input.subCategoria,
        seccao: input.seccao
      }
    });

    const computeformatOutput = () => {
      return { category: createCategoryRow }
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
