import { z } from 'zod';
import { NDepositos, NMovimentos, createEndpoint } from 'zite-integrations-backend-sdk';

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
  description: 'Creates a deposit entry in both NDepositos and NMovimentos sheets based on deposit type',
  authenticated: false,
  inputSchema: z.object({
    tipoDeposito: z.string(), // "Depósito no Banco" or "Levantamento do Banco"
    seccao: z.string(),
    data: z.string(),
    valor: z.number(),
    categoria: z.string().optional().default(''),
    utilizador: z.string().optional().default(''),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    const dataAtual = new Date().toISOString().split('T')[0];
    const dataConvertida = convertToISODate(input.data);

    const isDeposito = input.tipoDeposito === 'Depósito no Banco';

    const tipoNDepositos = isDeposito ? 'Entrada' : 'Saida';
    const tipoNMovimentos = isDeposito ? 'Despesa' : 'Receita';
    const descricaoNMovimentos = isDeposito ? 'Depósito Bancário' : 'Levantamento Bancário';
    const estadoMovimento = 'Deposito';

    // 1. Create row in NDepositos
    await NDepositos.create({
      row: {
        tipo: tipoNDepositos,
        seccao: input.seccao,
        data: dataConvertida,
        valor: input.valor,
        utilizador: input.utilizador,
        dataEdicao: dataAtual,
      },
    });

    // 2. Create row in NMovimentos
    await NMovimentos.create({
      row: {
        tipo: tipoNMovimentos,
        categoria: input.categoria,
        descricao: descricaoNMovimentos,
        data: dataConvertida,
        valor: input.valor,
        seccao: input.seccao,
        utilizador: input.utilizador,
        dataEdicao: dataAtual,
        estadoMovimento: estadoMovimento,
      },
    });

    return { success: true };
  },
});
