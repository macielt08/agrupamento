import { z } from 'zod';
import { createEndpoint, Elementos, NoitesCampo } from 'zite-integrations-backend-sdk';

/**
 * Regista a participação de um elemento numa atividade 
 * e atualiza o total acumulado de noites de campo do elemento.
 * Se a atividade for anterior à data de corte do elemento, apenas regista sem atualizar o total.
 */
export default createEndpoint({
  description: 'Regista participação numa atividade e atualiza total de noites',
  inputSchema: z.object({
    atividade: z.string(),
    elementoId: z.number(),
    totalNoites: z.number(),
    seccao: z.string(),
    elemento: z.string().optional(),
    dataInicioAtividade: z.string().optional() // Data de início da atividade
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const { atividade, elementoId, totalNoites, seccao, elemento, dataInicioAtividade } = input;

    // 1. Procurar os dados atuais do Elemento
    const todosElementos = await Elementos.findAll({});
    const elementoRecord = todosElementos?.find(e => e.id === elementoId);
    
    if (!elementoRecord) {
      throw new Error('Elemento não encontrado');
    }

    // 2. Inserir o novo registo de participação na tabela NoitesCampo
    await NoitesCampo.create({
      row: {
        atividade,
        elemento: elementoRecord.nome || elemento || '',
        totalNoites,
        seccao
      }
    });

    // 3. Verificar se a atividade é anterior à data de corte
    const dataCorte = elementoRecord.dataSaldoInicial ? new Date(elementoRecord.dataSaldoInicial) : null;
    const dataAtividade = dataInicioAtividade ? new Date(dataInicioAtividade) : null;
    
    // Se a atividade for ANTERIOR à data de corte, NÃO atualiza o total
    // (essas noites já estão incluídas no saldo inicial)
    if (dataCorte && dataAtividade && dataAtividade <= dataCorte) {
      // Apenas criou o registo, não atualiza o total
      return { message: 'Participação registada (anterior à data de corte)' };
    }

    // 4. Recalcular o Total Real do Elemento (apenas atividades APÓS a data de corte)
    const todasParticipacoes = await NoitesCampo.findAll({});
    const participacoesElemento = todasParticipacoes?.filter(p => 
      p.elemento === (elementoRecord.nome || elemento) && p.atividade !== 'DELETED'
    ) || [];

    const somaAtividades = participacoesElemento.reduce((acc, p) => {
      return acc + (Number(p.totalNoites) || 0);
    }, 0);

    const saldoInicial = Number(elementoRecord.saldoInicialNoites) || 0;
    const novoTotalAcumulado = saldoInicial + somaAtividades;

    // 5. Atualizar a folha "Elementos" com o novo valor total
    return await Elementos.update({
      rowId: elementoId,
      row: {
        noitesCampo: novoTotalAcumulado
      }
    });
  }
});
