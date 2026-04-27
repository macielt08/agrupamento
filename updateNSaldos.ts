import { z } from 'zod';
import { createEndpoint, NSaldos } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Updates the Valor field for a specific Seccao in NSaldos sheet',
  inputSchema: z.object({
    seccao: z.string(),
    novoValor: z.number()
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string()
  }),
  execute: async ({ input }) => {
    // First, find all rows to locate the one matching the seccao
    const allRows = await NSaldos.findAll({});
    
    // Find the row that matches the seccao (case-insensitive)
    const targetRow = allRows?.find(
      row => row.seccao?.toLowerCase() === input.seccao.toLowerCase()
    );
    
    if (!targetRow) {
      throw new Error(`Secção "${input.seccao}" não encontrada na folha NSaldos`);
    }
    
    // Update the specific row with the new value
    await NSaldos.update({
      rowId: targetRow.id,
      row: { valor: input.novoValor }
    });

    return {
      success: true,
      message: `Saldo atualizado para ${input.seccao}`
    };
  }
});
