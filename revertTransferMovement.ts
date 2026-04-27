import { z } from 'zod';
import { Movimentos, MovimentosRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Reverts a transfer movement by updating the transfer value, unlocking the original movement, and deleting associated movements',
  authenticated: false,
  inputSchema: z.object({
    movementId: z.number(),
    transferId: z.number(),
    movementValue: z.number(),
    duplicatedMovementId: z.number().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
  const getAllMovements = await Movimentos.findAll({});

    const computeprocessMovementsAndCalculate = () => {
      const allMovements = getAllMovements;
      const transferMovement = allMovements?.find(m => m.id === input.transferId);
      
      const associatedMovements = allMovements?.filter(m => m.transferido === input.transferId) || [];
      const isLastMovement = associatedMovements.length === 1;
      
      const currentTransferValue = transferMovement?.valor || 0;
      const newTransferValue = currentTransferValue - input.movementValue;
      const formattedValue = newTransferValue;
      
      const clearedTransferidoValue = 0;
      const dupId = input.duplicatedMovementId || 1;
      const shouldDeleteTransfer = isLastMovement ? input.transferId : 1;
      
      return {
        formattedValue,
        clearedTransferidoValue,
        dupId,
        shouldDeleteTransfer
      };
    }
  
    const processMovementsAndCalculate = computeprocessMovementsAndCalculate();

    const updateTransferValue = await Movimentos.update({
      row: {
        valor: processMovementsAndCalculate?.formattedValue as number
      },
      rowId: input.transferId
    });

    const unlockOriginalMovement = await Movimentos.update({
      row: {
        bloqueado: `Não`,
        entregueTesouraria: `Não`,
        transferido: processMovementsAndCalculate?.clearedTransferidoValue
      },
      rowId: input.movementId
    });

    const deleteDuplicatedMovement = await Movimentos.update({
      row: {
        tipo: `Eliminado`
      },
      rowId: processMovementsAndCalculate?.dupId
    });

    const deleteTransferIfLast = await Movimentos.update({
      row: {
        tipo: `Eliminado`
      },
      rowId: processMovementsAndCalculate?.shouldDeleteTransfer
    });

    const computereturnSuccess = () => {
      return {
        success: true,
        message: 'Movimento revertido com sucesso'
      };
    }
  
    const returnSuccess = computereturnSuccess();

    return returnSuccess;
  },
});
