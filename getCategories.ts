import { z } from 'zod';
import { Categorias, CategoriasRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Retrieves all categories from the Categorias sheet',
  inputSchema: z.object({}).optional(),
  outputSchema: z.any(),
  execute: async ({ input }) => {
  const findAllCategories = await Categorias.findAll({});

    const computeformatOutput = () => {
      return {
        categories: findAllCategories || []
      };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
