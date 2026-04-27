import { z } from 'zod';
import { ConsumoInventario, createEndpoint } from 'zite-integrations-backend-sdk';

const consumoItemSchema = z.object({
  id: z.number(),
  produto: z.string(),
  quantidade: z.number(),
  marca: z.string(),
});

const consumoGroupSchema = z.object({
  numeroConsumo: z.string(),
  data: z.string(),
  seccao: z.string(),
  utilizador: z.string(),
  atividade: z.string(),
  items: z.array(consumoItemSchema),
});

export default createEndpoint({
  description: 'Fetches all ConsumoInventario records grouped by Numero Consumo',
  authenticated: false,
  inputSchema: z.object({}),
  outputSchema: z.object({
    consumos: z.array(consumoGroupSchema),
  }),
  execute: async () => {
    const all = await ConsumoInventario.findAll({ limit: 10000 }) || [];

    // Filter out deleted rows
    const valid = all.filter(r => r.produto && r.produto.toUpperCase() !== 'DELETED' && r.numeroConsumo);

    // Group by numeroConsumo (now a number, use string key for map)
    const map = new Map<string, typeof consumoGroupSchema._type>();
    for (const row of valid) {
      const num = String(row.numeroConsumo!);
      if (!map.has(num)) {
        map.set(num, {
          numeroConsumo: num,
          data: row.data || '',
          seccao: row.seccao || '',
          utilizador: row.utilizador || '',
          atividade: row.atividade || '',
          items: [],
        });
      }
      map.get(num)!.items.push({
        id: row.id,
        produto: row.produto || '',
        quantidade: Number(row.quantidade) || 0,
        marca: row.marca || '',
      });
    }

    // Sort by numero desc
    const consumos = Array.from(map.values()).sort((a, b) => {
      return parseInt(b.numeroConsumo) - parseInt(a.numeroConsumo);
    });

    return { consumos };
  },
});
