import { z } from 'zod';
import { SppIndividual, SppIndividualRowType, createEndpoint } from 'zite-integrations-backend-sdk';

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
  description: 'Updates an existing row in the SPP Individual sheet with the provided information',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
    area: z.string().optional(),
    sigla: z.string().optional(),
    estado: z.string().optional(),
    seccao: z.string().optional(),
    elemento: z.string().optional(),
    objetivo: z.string().optional(),
    descricao: z.string().optional(),
    observacoes: z.string().optional(),
    dataProposta: z.string().optional(),
    dataConcluido: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const updateSppIndividualRow = await SppIndividual.update({
      row: {
        area: input.area,
        dataProposta: convertToISODate(input.dataProposta),
        estado: input.estado,
        sigla: input.sigla,
        objetivo: input.objetivo,
        dataConcluido: convertToISODate(input.dataConcluido),
        descricao: input.descricao,
        observacoes: input.observacoes,
        elemento: input.elemento,
        seccao: input.seccao
      },
      rowId: input.id
    });

    return { success: true };
  },
});
