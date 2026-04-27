import { z } from 'zod';
import { Elementos, ElementosRowType, createEndpoint } from 'zite-integrations-backend-sdk';

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
  description: 'Creates a new elemento (element) record in the Elementos sheet with the provided information',
  authenticated: false,
  inputSchema: z.object({
    nome: z.string(),
    etapa: z.string().optional(),
    estado: z.string().optional(),
    seccao: z.string(),
    promessa: z.string().optional(),
    categoria: z.string().optional(),
    noitesCampo: z.number().optional(),
    saidaSeccao: z.string().optional(),
    entradaSeccao: z.string().optional(),
    bandoPatrulhaEquipa: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const createElementoRecord = await Elementos.create({
      row: {
        nome: input.nome,
        promessa: convertToISODate(input.promessa),
        noitesCampo: input.noitesCampo || 0,
        estado: input.estado || 'Ativo',
        categoria: input.categoria || '',
        seccao: input.seccao,
        entradaSeccao: convertToISODate(input.entradaSeccao),
        etapa: input.etapa || '',
        bandoPatrulhaEquipa: input.bandoPatrulhaEquipa || '',
        saidaSeccao: convertToISODate(input.saidaSeccao)
      }
    });

    return { elemento: createElementoRecord };
  },
});
