import { z } from 'zod';
import { OrcamentoAnual, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Atualiza um registo existente no orçamento anual',
  inputSchema: z.object({
    id: z.number(),
    ano: z.string(),
    seccao: z.string(),
    categoria: z.string(),
    tipo: z.string(),
    descricao: z.string(),
    participantes: z.number(),
    custoUnitario: z.number(),
    custoTotal: z.number(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    record: z.any(),
  }),
  execute: async ({ input }) => {
    const custoArredondado = Number(input.custoUnitario.toFixed(2));
    const totalArredondado = Number(input.custoTotal.toFixed(2));
    const updateRecord = await OrcamentoAnual.update({
      rowId: input.id,
      row: {
        ano: input.ano,
        seccao: input.seccao,
        categoria: input.categoria,
        tipo: input.tipo,
        descricao: input.descricao,
        participantes: input.participantes,
        custo: custoArredondado,
        total: totalArredondado
      }
    });

    return { success: true, record: updateRecord };
  },
});
