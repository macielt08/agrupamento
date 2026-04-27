import { z } from 'zod';
import { NMovimentos, MovimentosRowType, createEndpoint } from 'zite-integrations-backend-sdk';

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
  description: 'Retrieves movements from the Movimentos sheet with optional pagination',
  inputSchema: z.object({
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const findAllMovements = await NMovimentos.findAll({
      offset: input.offset,
      limit: input.limit
    });

    const computeformatOutput = () => {
      // Convert dates from ISO to DD/MM/YYYY
      const movementsWithConvertedDates = (findAllMovements || []).map(movement => ({
        ...movement,
        data: convertFromISODate(movement.data)
      }));

      return {
        movements: movementsWithConvertedDates
      };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
