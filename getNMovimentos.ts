import { z } from 'zod';
import { createEndpoint, NMovimentos } from 'zite-integrations-backend-sdk';

/** Converte valor da sheet para número, tratando strings formatadas como "1,250.00" */
function parseSheetValor(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/,/g, ''); // remove separadores de milhares
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export default createEndpoint({
  description: 'Fetches all NMovimentos records',
  inputSchema: z.object({}),
  outputSchema: z.object({
    records: z.array(z.object({
      id: z.number(),
      categoria: z.string().optional(),
      subCategoria: z.number().optional(),
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
      data: z.string().optional(),
      valor: z.number().optional(),
      tipoPagamento: z.string().optional(),
      seccao: z.string().optional(),
      tipo: z.string().optional(),
      elemento: z.string().optional(),
      atividade: z.string().optional(),
      utilizador: z.string().optional(),
      dataEdicao: z.string().optional(),
      ano: z.string().optional(),
      estadoMovimento: z.string().optional(),
      link: z.string().optional(),
      agr: z.string().optional(),
    }))
  }),
  execute: async () => {
    const records = await NMovimentos.findAll({});
    // DEBUG: log raw valor values from sheet to diagnose formatting issues
    const sample = (records || []).slice(0, 3);
    sample.forEach(r => console.log(`[DEBUG valor] id=${r.id} raw=${JSON.stringify(r.valor)} type=${typeof r.valor}`));
    return {
      records: (records || []).map(r => ({
        id: r.id,
        tipo: r.tipo,
        categoria: r.categoria,
        subCategoria: r.subCategoria,
        descricao: r.descricao,
        observacoes: r.observacoes,
        data: r.data,
        valor: parseSheetValor(r.valor),
        tipoPagamento: r.tipoPagamento,
        seccao: r.seccao,
        elemento: r.elemento,
        atividade: r.atividade,
        utilizador: r.utilizador,
        dataEdicao: r.dataEdicao,
        ano: r.tempo,
        estadoMovimento: r.estadoMovimento,
        link: r.link,
        agr: (r.agr === true || String(r.agr).toLowerCase() === 'true') ? 'true' : '',
      }))
    };
  },
});
