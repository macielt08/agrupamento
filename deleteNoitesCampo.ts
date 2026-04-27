import { z } from 'zod';
import { createEndpoint, NoitesCampo, Elementos } from 'zite-integrations-backend-sdk';

/**
 * Remove um registo de participação e recalcula o total do elemento
 * garantindo que o Saldo Inicial é preservado.
 */
export default createEndpoint({
  description: 'Remove um registo de participação e recalcula totais',
  inputSchema: z.object({
    id: z.number(),
    elementoId: z.number(),
    elemento: z.string()
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const { id, elementoId, elemento: nomeElemento } = input;

    // 1. Marcar o registo como apagado
    await NoitesCampo.update({
      rowId: id,
      row: {
        atividade: 'DELETED',
        totalNoites: 0
      }
    });

    // 2. Obter os dados do Elemento para recuperar o Saldo Inicial
    const todosElementos = await Elementos.findAll({});
    const elemento = todosElementos?.find(e => e.id === elementoId);
    
    if (!elemento) {
      throw new Error('Elemento não encontrado para recalcular totais.');
    }

    // 3. Recalcular o Total Real
    // Procuramos todos os registos ativos deste elemento
    const todasParticipacoes = await NoitesCampo.findAll({});
    const participacoesRestantes = todasParticipacoes?.filter(p => 
      p.elemento === nomeElemento && p.atividade !== 'DELETED'
    ) || [];

    const somaAtividadesRestantes = participacoesRestantes.reduce((acc, p) => 
      acc + (Number(p.totalNoites) || 0), 0
    );

    const saldoInicial = Number(elemento.saldoInicialNoites) || 0;
    const novoTotalAcumulado = saldoInicial + somaAtividadesRestantes;

    // 4. Atualizar a ficha do Elemento com o valor corrigido
    return await Elementos.update({
      rowId: elementoId,
      row: {
        noitesCampo: novoTotalAcumulado
      }
    });
  }
});
