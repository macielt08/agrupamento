import { z } from 'zod';
import { Utilizadores, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Creates a new user in the Utilizadores sheet with provided information and default values for optional fields',
  authenticated: false,
  inputSchema: z.object({
    nin: z.string().optional(),
    pin: z.number(),
    nome: z.string(),
    admin: z.string().optional(),
    email: z.string().optional(),
    estado: z.string().optional(),
    seccao: z.string(),
    menuSpp: z.string().optional(),
    subAdmin: z.string().optional(),
    categoria: z.string().optional(),
    programer: z.string().optional(),
    menuElemento: z.string().optional(),
    menuFinancas: z.string().optional(),
    menuAtividades: z.string().optional(),
    menuNoitesCampo: z.string().optional(),
    menuInventario: z.string().optional(),
    menuAdmin: z.string().optional(),
    ca: z.number().optional(),
    caa: z.number().optional(),
    ta: z.number().optional(),
    tas: z.number().optional(),
    cu: z.number().optional(),
    dirigente: z.number().optional(),
    escuteiro: z.number().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const createUserRecord = await Utilizadores.create({
      row: {
        nome: input.nome,
        pin: input.pin,
        email: input.email,
        seccao: input.seccao,
        admin: input.admin || 'Não',
        subAdmin: input.subAdmin || 'Não',
        programer: input.programer || 'Não',
        estado: input.estado || 'Ativo',
        categoria: input.categoria || 'User',
        nin: input.nin,
        menuFinancas: input.menuFinancas || 'Não',
        menuElemento: input.menuElemento || 'Não',
        menuSpp: input.menuSpp || 'Não',
        menuAtividades: input.menuAtividades || 'Não',
        menuNoitesCampo: input.menuNoitesCampo || 'Não',
        menuInventario: input.menuInventario || 'Não',
        menuAdmin: input.menuAdmin || 'Não',
        ca: input.ca,
        caa: input.caa,
        ta: input.ta,
        tas: input.tas,
        cu: input.cu,
        dirigente: input.dirigente,
        escuteiro: input.escuteiro,
      }
    });

    return { user: createUserRecord };
  },
});
