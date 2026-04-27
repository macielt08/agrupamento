import { z } from 'zod';
import { ConsumoInventario, Inventario, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Finalizes a cart: creates ConsumoInventario records and updates Inventario stock',
  authenticated: false,
  inputSchema: z.object({
    items: z.array(z.object({
      id: z.number(),
      produto: z.string(),
      quantidade: z.number(),
      marca: z.string().optional(),
    })),
    seccao: z.string(),
    utilizador: z.string(),
    atividade: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean(), numeroConsumo: z.number() }),
  execute: async ({ input }) => {
    // Get last numero consumo
    const allConsumos = await ConsumoInventario.findAll({ limit: 10000 }) || [];
    const validNums = allConsumos
      .map(r => Number(r.numeroConsumo) || 0)
      .filter(n => !isNaN(n) && n > 0);
    const lastNum = validNums.length > 0 ? Math.max(...validNums) : 0;
    const nextNum = lastNum + 1;

    const today = new Date().toISOString().split('T')[0];

    // Fetch all inventario rows once
    const allInventario = await Inventario.findAll({ limit: 10000 }) || [];

    for (const item of input.items) {
      // Create ConsumoInventario row
      await ConsumoInventario.create({
        row: {
          numeroConsumo: nextNum,
          data: today,
          produto: item.produto,
          quantidade: item.quantidade,
          marca: item.marca || '',
          seccao: input.seccao,
          utilizador: input.utilizador,
          atividade: input.atividade || '',
        }
      });

      // Update Inventario stock
      const invRow = allInventario.find(r => r.id === item.id);
      if (invRow) {
        const newQty = (invRow.quantidade || 0) - item.quantidade;
        if (newQty <= 0) {
          await Inventario.update({
            rowId: item.id,
            row: { produto: 'DELETED', estado: 'DELETED' }
          });
        } else {
          await Inventario.update({
            rowId: item.id,
            row: { quantidade: newQty }
          });
        }
      }
    }

    return { success: true, numeroConsumo: nextNum };
  },
});
