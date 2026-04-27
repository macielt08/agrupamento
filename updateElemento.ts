import { z } from 'zod';
import { createEndpoint, Elementos, NoitesCampo } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Atualiza dados de um elemento e recalcula noites de campo',
  inputSchema: z.object({
    id: z.number(),
    nome: z.string().optional(),
    seccao: z.string().optional(),
    estado: z.string().optional(),
    saldoInicialNoites: z.number().optional(),
    dataSaldoInicial: z.string().optional(),
    bandoPatrulhaEquipa: z.string().optional(),
    promessa: z.string().optional(),
    categoria: z.string().optional(),
    etapa: z.string().optional(),
    entradaSeccao: z.string().optional(),
    saidaSeccao: z.string().optional(),
    noitesCampo: z.number().optional()
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const { id, ...updates } = input;

    // Convert saldoInicialNoites to string (as per Google Sheets schema)
    const formattedUpdates: any = { ...updates };
    if (formattedUpdates.saldoInicialNoites !== undefined) {
      formattedUpdates.saldoInicialNoites = String(formattedUpdates.saldoInicialNoites);
    }

    // 1. Atualizar os dados básicos e o saldo no perfil
    await Elementos.update({
      rowId: id,
      row: formattedUpdates
    });

    // 2. Recalcular o Total de Noites de Campo
    const todosElementos = await Elementos.findAll({});
    const elemento = todosElementos?.find(e => e.id === id);
    
    if (!elemento) {
      throw new Error('Elemento não encontrado');
    }

    const todasParticipacoes = await NoitesCampo.findAll({});
    const participacoesElemento = todasParticipacoes?.filter(p => 
      p.elemento === elemento.nome && p.atividade !== 'DELETED'
    ) || [];
    
    const noitesAtividades = participacoesElemento.reduce((acc, p) => {
      return acc + (Number(p.totalNoites) || 0);
    }, 0);

    const novoTotal = (Number(elemento.saldoInicialNoites) || 0) + noitesAtividades;

    // 3. Gravar o total final na coluna noitesCampo da BD (as number)
    return await Elementos.update({
      rowId: id,
      row: {
        noitesCampo: novoTotal
      }
    });
  }
});
