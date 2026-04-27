import { z } from 'zod';
import { ConsumoInventario, Inventario, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Updates an existing consumo: handles removals, qty updates, and additions',
  authenticated: false,
  inputSchema: z.object({
    // Items to fully remove from consumo (returns qty to inventario)
    removals: z.array(z.object({
      consumoRowId: z.number(),
      produto: z.string(),
      quantidadeDevolver: z.number(),
      marca: z.string().optional(),
    })),
    // Items whose quantity was reduced (returns difference to inventario)
    updates: z.array(z.object({
      consumoRowId: z.number(),
      produto: z.string(),
      newQty: z.number(),
      qtyToReturn: z.number(), // oldQty - newQty
      marca: z.string().optional(),
    })),
    // New items to add to consumo (reduces inventario stock)
    additions: z.array(z.object({
      inventarioId: z.number(),
      produto: z.string(),
      quantidade: z.number(),
      marca: z.string().optional(),
      numeroConsumo: z.number(),
      seccao: z.string(),
      utilizador: z.string(),
      atividade: z.string().optional(),
    })),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    const hasStockOps = input.removals.length > 0 || input.updates.length > 0;
    const hasInventarioOps = input.additions.length > 0;

    // Fetch inventario once if needed
    let allInventario: Awaited<ReturnType<typeof Inventario.findAll>> = [];
    if (hasStockOps || hasInventarioOps) {
      allInventario = await Inventario.findAll({ limit: 10000 }) || [];
    }

    // Helper: return quantity to inventario (find by produto+marca, add stock)
    const returnToStock = async (produto: string, marca: string | undefined, qty: number) => {
      const matches = (allInventario || []).filter(r =>
        r.produto !== 'DELETED' &&
        r.produto?.toLowerCase() === produto.toLowerCase() &&
        (marca ? r.marca?.toLowerCase() === (marca || '').toLowerCase() : true)
      );
      if (matches.length > 0) {
        const target = matches[0];
        await Inventario.update({
          rowId: target.id,
          row: { quantidade: (target.quantidade || 0) + qty }
        });
        // Update local cache
        (allInventario || []).forEach(r => {
          if (r.id === target.id) r.quantidade = (r.quantidade || 0) + qty;
        });
      } else {
        // All rows deleted — create a new one to restore stock
        await Inventario.create({
          row: {
            produto,
            marca: marca || '',
            quantidade: qty,
            estado: 'Disponível',
          }
        });
      }
    };

    // Process removals: mark DELETED in ConsumoInventario, return stock
    for (const removal of input.removals) {
      await ConsumoInventario.update({
        rowId: removal.consumoRowId,
        row: { produto: 'DELETED' }
      });
      if (removal.quantidadeDevolver > 0) {
        await returnToStock(removal.produto, removal.marca, removal.quantidadeDevolver);
      }
    }

    // Process qty updates: update ConsumoInventario row, return difference to stock
    for (const upd of input.updates) {
      await ConsumoInventario.update({
        rowId: upd.consumoRowId,
        row: { quantidade: upd.newQty }
      });
      if (upd.qtyToReturn > 0) {
        await returnToStock(upd.produto, upd.marca, upd.qtyToReturn);
      }
    }

    // Process additions: reduce inventario stock, create ConsumoInventario row
    for (const add of input.additions) {
      const today = new Date().toISOString().split('T')[0];
      await ConsumoInventario.create({
        row: {
          numeroConsumo: add.numeroConsumo,
          data: today,
          produto: add.produto,
          quantidade: add.quantidade,
          marca: add.marca || '',
          seccao: add.seccao,
          utilizador: add.utilizador,
          atividade: add.atividade || '',
        }
      });

      // Reduce inventario stock
      const invRow = (allInventario || []).find(r => r.id === add.inventarioId);
      if (invRow) {
        const newQty = (invRow.quantidade || 0) - add.quantidade;
        if (newQty <= 0) {
          await Inventario.update({
            rowId: add.inventarioId,
            row: { produto: 'DELETED', estado: 'DELETED' }
          });
        } else {
          await Inventario.update({
            rowId: add.inventarioId,
            row: { quantidade: newQty }
          });
        }
      }
    }

    return { success: true };
  },
});
