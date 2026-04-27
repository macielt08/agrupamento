import { z } from 'zod';
import { createEndpoint, Inventario } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Procura todos os itens no Inventário',
  inputSchema: z.object({}),
  outputSchema: z.object({
    records: z.array(z.object({
      id: z.number(),
      produto: z.string(),
      mesValidade: z.string().optional(),
      anoValidade: z.string().optional(),
      quantidade: z.number(),
      estado: z.string().optional(),
      marca: z.string().optional(),
      obs: z.string().optional(),
      categoria: z.string().optional(),
      seccao: z.string().optional(),
    }))
  }),
  execute: async () => {
    const records = await Inventario.findAll({});
    
    return {
      records: (records || []).map(r => ({
        id: Number(r.id),
        produto: r.produto || '',
        mesValidade: r.mesValidade || '',
        anoValidade: String(r.anoValidade || ''),
        quantidade: Number(r.quantidade || 0),
        estado: r.estado || '',
        marca: r.marca || '',
        obs: r.obs || '',
        categoria: r.categoria || '',
        seccao: r.seccao || '',
      }))
    };
  },
});
