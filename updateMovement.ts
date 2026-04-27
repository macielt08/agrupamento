import { z } from 'zod';
import { Movimentos, createEndpoint } from 'zite-integrations-backend-sdk';

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
  description: 'Updates an existing movement in the Movimentos sheet',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
    data: z.string().optional(),
    foto: z.string().optional(),
    tipo: z.string().optional(),
    valor: z.number().optional(),
    seccao: z.string().optional(),
    elemento: z.string().optional(),
    atividade: z.string().optional(),
    bloqueado: z.string().optional(),
    categoria: z.string().optional(),
    descricao: z.string().optional(),
    utilizador: z.string().optional(),
    subCategoria: z.string().optional(),
    tipoPagamento: z.string().optional(),
    movAgrupamento: z.string().optional(),
    pendenteSeccao: z.string().optional(),
    pagamentoRecebido: z.string().optional(),
    entregueTesouraria: z.string().optional(),
    seccaoTransferencia: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const computeformatValor = () => {
      if (input.valor !== undefined) {
        const valorString = input.valor.toFixed(2);
        return { valorString };
      }
      return { valorString: undefined };
    }
  
    const formatValor = computeformatValor();

    const updateMovimentosRecord = await Movimentos.update({
      rowId: input.id,
      row: {
        categoria: input.categoria,
        elemento: input.elemento,
        bloqueado: input.bloqueado,
        tipoPagamento: input.tipoPagamento,
        atividade: input.atividade,
        entregueTesouraria: input.entregueTesouraria,
        seccaoTransferencia: input.seccaoTransferencia,
        seccao: input.seccao,
        subCategoria: input.subCategoria,
        data: convertToISODate(input.data),
        tipo: input.tipo,
        valor: input.valor,
        foto: input.foto,
        movAgrupamento: input.movAgrupamento,
        pagamentoRecebido: input.pagamentoRecebido,
        utilizador: input.utilizador,
        pendenteSeccao: input.pendenteSeccao,
        descricao: input.descricao
      }
    });

    const computeformatOutput = () => {
      return { movement: updateMovimentosRecord as any };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
