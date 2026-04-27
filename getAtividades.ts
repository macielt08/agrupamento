import { z } from 'zod';
import { Atividades, createEndpoint } from 'zite-integrations-backend-sdk';

// Converte YYYY-MM-DD para DD/MM/YYYY
function convertFromISODate(dateString?: string): string | undefined {
  if (!dateString || dateString === '') return undefined;
  if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateString;
  
  if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = dateString.split(/[-T]/);
    return `${day}/${month}/${year}`;
  }
  return dateString;
}

export default createEndpoint({
  description: 'Retrieves all activities from Google Sheets',
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async () => {
    const findAllAtividades = await Atividades.findAll({});

    const computeformatOutput = () => {
      function ensureDisplayFormat(dateVal?: any): string | undefined {
        if (!dateVal) return undefined;
        const s = dateVal.toString();
        // Se a Sheet devolver ISO (ex: 2024-12-31), mudamos para DD/MM/YYYY
        if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
          const [y, m, d] = s.split(/[-T]/);
          return `${d}/${m}/${y}`;
        }
        return s; // Se já for DD/MM/YYYY, mantém
      }

      // No execute da listagem:
      const atividadesFormatadas = (findAllAtividades || []).map(atv => ({
        ...atv,
        ano: (atv as any).ano?.toString() || "",
        dataInicio: ensureDisplayFormat(atv.dataInicio),
        dataFim: ensureDisplayFormat(atv.dataFim)
      }));

      return { atividades: atividadesFormatadas };
    };

    return computeformatOutput();
  },
});
