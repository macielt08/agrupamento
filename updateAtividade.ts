import { z } from 'zod';
import { Atividades, createEndpoint } from 'zite-integrations-backend-sdk';

// Convert DD/MM/YYYY to YYYY-MM-DD for Google Sheets storage
function formatToSheetDate(dateString?: string): string | undefined {
  if (!dateString || dateString.trim() === '') return undefined;
  // Se o frontend enviar YYYY-MM-DD (raro mas possível), corrigimos para DD/MM/YYYY
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateString; // Já deve vir como DD/MM/YYYY
}

export default createEndpoint({
  description: 'Updates an existing activity (Atividade) in the Google Sheets database',
  inputSchema: z.object({
    id: z.number(),
    nome: z.string().optional(),
    local: z.string().optional(),
    seccao: z.string().optional(),
    dataFim: z.string().optional(),
    dataInicio: z.string().optional(),
    contaNoites: z.string().optional(),
    totalNoites: z.number().optional(),
    ano: z.string().optional(),
    lat: z.string().optional(),
    lng: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    // Calculate year as fallback if not provided
    let anoParaGravar = input.ano;
    if (!anoParaGravar && input.dataFim) {
      const partes = input.dataFim.split(/[-\/]/);
      anoParaGravar = partes[0].length === 4 ? partes[0] : partes[2];
    }

    // Create the row data
    const rowData: any = {
      nome: input.nome,
      local: input.local,
      seccao: input.seccao,
      dataInicio: formatToSheetDate(input.dataInicio),
      dataFim: formatToSheetDate(input.dataFim),
      totalNoites: input.totalNoites,
      contaNoites: input.contaNoites,
      ano: anoParaGravar,
      lat: input.lat,
      lng: input.lng,
    };

    console.log("Updating activity with data:", rowData);

    const updateAtividadeRecord = await Atividades.update({
      rowId: input.id,
      row: rowData
    });

    return { atividade: updateAtividadeRecord };
  },
});
