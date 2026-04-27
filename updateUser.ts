import { z } from 'zod';
import { Utilizadores, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Updates an existing user record in the Utilizadores sheet',
  authenticated: false,
  inputSchema: z.object({
    id: z.number(),
    pin: z.number().optional(),
    nome: z.string().optional(),
    admin: z.string().optional(),
    email: z.string().optional(),
    estado: z.string().optional(),
    seccao: z.string().optional(),
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
    await Utilizadores.update({
      row: {
        nome: input.nome,
        categoria: input.categoria,
        menuFinancas: input.menuFinancas,
        admin: input.admin,
        email: input.email,
        estado: input.estado,
        seccao: input.seccao,
        menuAtividades: input.menuAtividades,
        menuElemento: input.menuElemento,
        subAdmin: input.subAdmin,
        menuNoitesCampo: input.menuNoitesCampo,
        pin: input.pin,
        menuSpp: input.menuSpp,
        menuInventario: input.menuInventario,
        menuAdmin: input.menuAdmin,
        programer: input.programer,
        ca: input.ca,
        caa: input.caa,
        ta: input.ta,
        tas: input.tas,
        cu: input.cu,
        dirigente: input.dirigente,
        escuteiro: input.escuteiro,
      },
      rowId: input.id
    });

    return { success: true };
  },
});
