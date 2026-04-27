import { z } from 'zod';
import { Utilizadores, UtilizadoresRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Registers a new user by checking if PIN exists and creating a user record in Utilizadores sheet',
  authenticated: false,
  inputSchema: z.object({
    nin: z.string().optional(),
    pin: z.string(),
    nome: z.string(),
    email: z.string(),
    seccao: z.string(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
  const getAllUsers = await Utilizadores.findAll({});

    const computecheckPinExists = () => {
      const pinNumber = parseInt(input.pin);
      const existingUser = getAllUsers?.find(user => user.pin === pinNumber);
      const pinExists = !!existingUser;
      
      return { pinExists, pinNumber };
    }
  
    const checkPinExists = computecheckPinExists();

    let branchOnPinExists;
    if ((checkPinExists.pinExists)) {
      const computereturnPinExistsError = () => {
        return {
          success: false,
          message: 'Este PIN já está em uso'
        };
      }
  
      const returnPinExistsError = computereturnPinExistsError();
      branchOnPinExists = returnPinExistsError;
    } else {
      const createNewUser = await Utilizadores.create({
        row: {
          nome: input.nome,
          nin: input.nin,
          admin: `Não`,
          email: input.email,
          estado: `Inativo`,
          seccao: input.seccao,
          pin: checkPinExists?.pinNumber
        }
      });
      const computereturnSuccess = () => {
        return {
          success: true,
          user: createNewUser
        };
      }
  
      const returnSuccess = computereturnSuccess();
      branchOnPinExists = returnSuccess;
    }

    return branchOnPinExists;
  },
});
