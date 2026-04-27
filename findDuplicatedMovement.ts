import { z } from 'zod';
import { Movimentos, MovimentosRowType, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Finds a duplicated payment movement by searching for matching categoria, subCategoria, descricao, and valor',
  authenticated: false,
  inputSchema: z.object({
    valor: z.string(),
    categoria: z.string(),
    descricao: z.string(),
    movementId: z.number(),
    transferId: z.number(),
    subCategoria: z.string(),
    seccaoTransferencia: z.string(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
  const getAllMovements = await Movimentos.findAll({});

    const computefindDuplicateAndFormatOutput = () => {
      const allMovements = getAllMovements;
      const { movementId, categoria, subCategoria, descricao, valor } = input;
      
      const duplicatedMovement = allMovements?.find(m => 
        m.id !== movementId &&
        m.tipo === 'Pagamento' &&
        m.categoria === categoria &&
        m.subCategoria === subCategoria &&
        m.descricao === descricao &&
        m.valor === parseFloat(valor)
      );
      
      return {
        duplicatedMovementId: duplicatedMovement?.id,
        found: !!duplicatedMovement
      };
    }
  
    const findDuplicateAndFormatOutput = computefindDuplicateAndFormatOutput();

    return findDuplicateAndFormatOutput;
  },
});
