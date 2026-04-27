import { z } from 'zod';
import { Utilizadores, UtilizadoresRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Retrieves all users from the Utilizadores sheet',
  authenticated: false,
  inputSchema: z.object({}).optional(),
  outputSchema: z.any(),
  execute: async ({ input }) => {
  const findAllUsers = await Utilizadores.findAll({});

    const computeformatOutput = () => {
      return {
        users: findAllUsers || []
      };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
