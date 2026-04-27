import { z } from 'zod';
import { Elementos, ElementosRowType, createEndpoint } from 'zite-integrations-backend-sdk';

// Convert YYYY-MM-DD to DD/MM/YYYY for frontend display
function convertFromISODate(dateString?: string): string | undefined {
  if (!dateString || dateString === '') return undefined;
  
  // If already in DD/MM/YYYY format, return as is
  if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return dateString;
  }
  
  // Convert YYYY-MM-DD to DD/MM/YYYY
  if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = dateString.split(/[-T]/);
    return `${day}/${month}/${year}`;
  }
  
  return dateString;
}

export default createEndpoint({
  description: 'Retrieves all records from the Elementos sheet',
  authenticated: false,
  inputSchema: z.object({}).optional(),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const findAllElementos = await Elementos.findAll({});

    const computeformatOutput = () => {
      // Convert dates from ISO to DD/MM/YYYY
      const elementosWithConvertedDates = (findAllElementos || []).map(elemento => ({
        ...elemento,
        promessa: convertFromISODate(elemento.promessa),
        entradaSeccao: convertFromISODate(elemento.entradaSeccao),
        saidaSeccao: convertFromISODate(elemento.saidaSeccao)
      }));

      return {
        records: elementosWithConvertedDates
      };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
