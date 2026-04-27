import { z } from 'zod';
import { SppIndividual, SppIndividualRowType, createEndpoint } from 'zite-integrations-backend-sdk';

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
  description: 'Retrieves all records from the SPP Individual sheet',
  authenticated: false,
  inputSchema: z.object({}).optional(),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const findAllRecords = await SppIndividual.findAll({});

    const computeformatOutput = () => {
      // Convert dates from ISO to DD/MM/YYYY
      const recordsWithConvertedDates = (findAllRecords || []).map(record => ({
        ...record,
        dataProposta: convertFromISODate(record.dataProposta),
        dataConcluido: convertFromISODate(record.dataConcluido)
      }));

      return {
        records: recordsWithConvertedDates
      };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
