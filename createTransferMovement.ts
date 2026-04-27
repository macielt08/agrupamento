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
  description: 'Creates a new transfer movement record in Movimentos sheet with formatted date and description',
  authenticated: false,
  inputSchema: z.object({
    seccao: z.string(),
    userName: z.string(),
    categoria: z.string(),
    totalValue: z.number(),
    subCategoria: z.string(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const computeprepareMovementData = () => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      const descricao = `Transferência dos ${input.seccao} de ${input.subCategoria}`;
      const valorString = input.totalValue.toFixed(2);
      
      return {
        formattedDate,
        descricao,
        valorString,
        categoria: input.categoria,
        seccaoTransferencia: input.seccao,
        subCategoria: input.subCategoria,
        userName: input.userName
      };
    }
  
    const prepareMovementData = computeprepareMovementData();

    const createMovimentosRecord = await Movimentos.create({
      row: {
        categoria: prepareMovementData?.categoria,
        bloqueado: `Sim`,
        tipoPagamento: `Transferencia`,
        entregueTesouraria: `Sim`,
        seccaoTransferencia: prepareMovementData?.seccaoTransferencia,
        seccao: `Agrupamento`,
        subCategoria: prepareMovementData?.subCategoria,
        data: convertToISODate(prepareMovementData?.formattedDate),
        tipo: `Transferencia`,
        valor: input.totalValue,
        utilizador: prepareMovementData?.userName,
        descricao: prepareMovementData?.descricao
      }
    });

    const computeformatOutput = () => {
      return {
        transferMovementId: createMovimentosRecord.id
      };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
