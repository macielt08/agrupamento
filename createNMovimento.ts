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
  description: 'Creates a new movement entry in the NMovimentos sheet with financial transaction details',
  authenticated: false,
  inputSchema: z.object({
    tipo: z.string(),
    categoria: z.string().optional().default(''),
    subCategoria: z.string().optional().default(''),
    descricao: z.string().optional().default(''),
    observacoes: z.string().optional().default(''),
    data: z.string(),
    valor: z.number(),
    tipoPagamento: z.string().optional().default(''),
    seccao: z.string().optional().default(''),
    elemento: z.string().optional().default(''),
    atividade: z.string().optional().default(''),
    utilizador: z.string().optional().default(''),
    dataEdicao: z.string().optional().default(''),
    ano: z.string().optional().default(''),
    estadoMovimento: z.string().optional().default('Concluído'),
    link: z.string().optional().default(''),
    agr: z.string().optional().default(''),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {

    const record = await NMovimentos.create({
      row: {
        tipo: input.tipo,
        categoria: input.categoria,
        descricao: input.descricao,
        observacoes: input.observacoes,
        data: convertToISODate(input.data),
        valor: input.valor,
        tipoPagamento: input.tipoPagamento,
        seccao: input.seccao,
        elemento: input.elemento,
        atividade: input.atividade,
        utilizador: input.utilizador,
        tempo: input.ano,
        dataEdicao: convertToISODate(input.dataEdicao) || convertToISODate(new Date().toISOString().split('T')[0]),
        estadoMovimento: input.estadoMovimento,
        link: input.link,
        agr: input.agr === 'true' ? true : undefined,
      }
    });
    return { movement: record as any };
  },
});
