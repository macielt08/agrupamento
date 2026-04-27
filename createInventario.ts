import { z } from 'zod';
import { Inventario, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Creates a new individual Inventario record in the Inventario sheet',
  authenticated: false,
  inputSchema: z.object({
    produto: z.string(),
    mesValidade: z.string().optional(),
    anoValidade: z.union([z.string(), z.number()]).optional(),
    quantidade: z.number(),
    estado: z.string().optional(),
    marca: z.string().optional(),
    obs: z.string().optional(),
    categoria: z.string().optional(),
    seccao: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const createInventarioRecord = await Inventario.create({
      row: {
        produto: input.produto,
        mesValidade: input.mesValidade,
        anoValidade: input.anoValidade ? Number(input.anoValidade) : undefined,
        quantidade: Number(input.quantidade),
        estado: input.estado,
        marca: input.marca,
        obs: input.obs,
        categoria: input.categoria,
        seccao: input.seccao,
      }
    });

    return createInventarioRecord;
  },
});
