import { z } from 'zod';
import { Movimentos, MovimentosRowType, createEndpoint } from 'zite-integrations-backend-sdk';

// Convert DD/MM/YYYY to YYYY-MM-DD for Google Sheets storage
function convertToISODate(dateString?: string): string | undefined {
  if (!dateString || dateString === '') return undefined;
  
  // If already in YYYY-MM-DD format, return as is
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // Convert DD/MM/YYYY to YYYY-MM-DD
  if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }
  
  return undefined;
}

export default createEndpoint({
  description: 'Processes a movement transfer by creating a new payment movement and updating the original movement with transfer information',
  authenticated: false,
  inputSchema: z.object({
    movementId: z.number(),
    transferId: z.number(),
    movementData: z.any(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const computeprepareMovementData = () => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      
      const valorString = input.movementData.valor !== undefined ? input.movementData.valor.toFixed(2) : undefined;
      
      return {
        formattedDate,
        valorString,
        categoria: input.movementData.categoria,
        tipoPagamento: input.movementData.tipoPagamento,
        seccaoTransferencia: input.movementData.seccaoTransferencia,
        seccao: input.movementData.seccao,
        subCategoria: input.movementData.subCategoria,
        foto: input.movementData.foto,
        movAgrupamento: input.movementData.movAgrupamento,
        utilizador: input.movementData.utilizador,
        pendenteSeccao: input.movementData.pendenteSeccao,
        descricao: input.movementData.descricao
      };
    }
  
    const prepareMovementData = computeprepareMovementData();

    const createNewMovement = await Movimentos.create({
      row: {
        categoria: prepareMovementData?.categoria,
        bloqueado: `Sim`,
        tipoPagamento: prepareMovementData?.tipoPagamento,
        entregueTesouraria: `Sim`,
        seccaoTransferencia: prepareMovementData?.seccaoTransferencia,
        seccao: prepareMovementData?.seccao,
        subCategoria: prepareMovementData?.subCategoria,
        data: convertToISODate(prepareMovementData?.formattedDate),
        tipo: `Pagamento`,
        valor: prepareMovementData?.valorString,
        foto: prepareMovementData?.foto,
        movAgrupamento: prepareMovementData?.movAgrupamento,
        utilizador: prepareMovementData?.utilizador,
        pendenteSeccao: prepareMovementData?.pendenteSeccao,
        descricao: prepareMovementData?.descricao
      }
    });

    const updateOriginalMovement = await Movimentos.update({
      row: {
        bloqueado: `Sim`,
        entregueTesouraria: `Sim`,
        transferido: input.transferId
      },
      rowId: input.movementId
    });

    return { success: true };
  },
});
