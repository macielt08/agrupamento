import { z } from 'zod';
import { Utilizadores, UtilizadoresRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Resets a user\'s PIN by finding them via email and updating their PIN in the Utilizadores sheet',
  authenticated: false,
  inputSchema: z.object({
    email: z.string(),
    newPin: z.string(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
  const getAllUsers = await Utilizadores.findAll({});

    const computefindUserAndValidate = () => {
      const user = getAllUsers?.find(u => u.email === input.email);
      const userExists = !!user;
      const isInactive = user?.estado === 'Inativo';
      const newPinNumber = parseInt(input.newPin);
      
      return {
        user,
        userExists,
        isInactive,
        newPinNumber
      };
    }
  
    const findUserAndValidate = computefindUserAndValidate();

    let checkUserExists;
    if ((!(findUserAndValidate.userExists))) {
      const computereturnUserNotFound = () => {
        return {
          success: false,
          message: 'Email não encontrado no sistema'
        };
      }
  
      const returnUserNotFound = computereturnUserNotFound();
      checkUserExists = returnUserNotFound;
    } else if ((findUserAndValidate.isInactive)) {
      const computereturnUserInactive = () => {
        return {
          success: false,
          message: 'A sua conta está inativa. Contacte um administrador.'
        };
      }
  
      const returnUserInactive = computereturnUserInactive();
      checkUserExists = returnUserInactive;
    } else {
      const updateUserPin = await Utilizadores.update({
        row: {
          pin: findUserAndValidate?.newPinNumber
        },
        rowId: findUserAndValidate?.user?.id
      });
      const computereturnSuccess = () => {
        return {
          success: true,
          message: 'PIN atualizado com sucesso'
        };
      }
  
      const returnSuccess = computereturnSuccess();
      checkUserExists = returnSuccess;
    }

    return checkUserExists;
  },
});
