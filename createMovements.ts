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
  description: 'Creates a new movement entry in the Movimentos sheet with financial transaction details',
  authenticated: false,
  inputSchema: z.object({
    data: z.string(),
    foto: z.string().optional(),
    tipo: z.string(),
    valor: z.number(),
    seccao: z.string(),
    elemento: z.string().optional(),
    atividade: z.string().optional(),
    bloqueado: z.string().optional(),
    categoria: z.string(),
    descricao: z.string(),
    utilizador: z.string().optional(),
    subCategoria: z.string(),
    tipoPagamento: z.string(),
    movAgrupamento: z.string().optional(),
    pendenteSeccao: z.string().optional(),
    pagamentoRecebido: z.string().optional(),
    entregueTesouraria: z.string().optional(),
    seccaoTransferencia: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const computeformatValor = () => {
      const valorString = input.valor.toFixed(2);
      
      return { valorString };
    }
  
    const formatValor = computeformatValor();

    const createMovimentosRecord = await Movimentos.create({
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
      return { movement: createMovimentosRecord as any };
    }
  
    const formatOutput = computeformatOutput();

    return formatOutput;
  },
});
