import { z } from 'zod';
import { NMovimentos, createEndpoint } from 'zite-integrations-backend-sdk';

function convertToISODate(dateString?: string): string | undefined {
  if (!dateString || dateString === '') return undefined;
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
  if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }
  return undefined;
}

export default createEndpoint({
  description: 'Updates an existing movement entry in the NMovimentos sheet',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
    tipo: z.string().optional(),
    categoria: z.string().optional(),
    subCategoria: z.string().optional(),
    descricao: z.string().optional(),
    observacoes: z.string().optional(),
    data: z.string().optional(),
    valor: z.number().optional(),
    tipoPagamento: z.string().optional(),
    seccao: z.string().optional(),
    elemento: z.string().optional(),
    atividade: z.string().optional(),
    utilizador: z.string().optional(),
    dataEdicao: z.string().optional(),
    ano: z.string().optional(),
    estadoMovimento: z.string().optional(),
    link: z.string().optional(),
    agr: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const { id, valor, data, ano, agr, subCategoria: _subCategoria, ...rest } = input;
  
    const result = await NMovimentos.update({
      rowId: id,
      row: {
        ...rest,
        ...(agr !== undefined ? { agr: agr === 'true' ? true : false } : {}),
        ...(ano !== undefined ? { tempo: ano } : {}),
        ...(data ? { data: convertToISODate(data) } : {}),
        ...(valor !== undefined ? { valor: valor } : {}),
        dataEdicao: convertToISODate(new Date().toISOString().split('T')[0]),
      }
    });
    return result;
  },
});
