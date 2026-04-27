import { z } from 'zod';
import { createEndpoint, NTransferencias } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Fetches all NTransferencias records',
  inputSchema: z.object({}),
  outputSchema: z.object({
    records: z.array(z.object({
      id: z.number(),
      tipo: z.string().optional(),
      categoria: z.string().optional(),
      idMovimento: z.string().optional(), // subCategoria field = "ID Movimento"
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
      data: z.string().optional(),
      valor: z.string().optional(),
      tipoPagamento: z.string().optional(),
      seccao: z.string().optional(),
      elemento: z.string().optional(),
      atividade: z.string().optional(),
      utilizador: z.string().optional(),
      dataEdicao: z.string().optional(),
      ano: z.string().optional(),
      estadoMovimento: z.string().optional(),
      numeroTransferencia: z.string().optional(),
    })),
  }),
  execute: async () => {
    const records = await NTransferencias.findAll({});
    return {
      records: (records || []).map(r => ({
        id: r.id,
        tipo: r.tipo,
        categoria: r.categoria,
        idMovimento: r.subCategoria !== undefined ? String(r.subCategoria) : undefined, // "ID Movimento"
        descricao: r.descricao,
        observacoes: r.observacoes,
        data: r.data,
        valor: r.valor !== undefined ? String(r.valor) : undefined,
        tipoPagamento: r.tipoPagamento,
        seccao: r.seccao,
        elemento: r.elemento,
        atividade: r.atividade,
        utilizador: r.utilizador,
        dataEdicao: r.dataEdicao,
        ano: r.tempo,
        estadoMovimento: r.estadoMovimento,
        numeroTransferencia: r.numeroTransferencia !== undefined ? String(r.numeroTransferencia) : undefined,
      })),
    };
  },
});
