import { z } from 'zod';
import { Utilizadores, createEndpoint } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Authenticates a user by validating their email and PIN against the Utilizadores sheet and returns user information if successful',
  authenticated: false,
  inputSchema: z.object({
    pin: z.string(),
    email: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    user: z.any().optional(),
  }),
  execute: async ({ input }) => {
    try {
      const getAllUsers = await Utilizadores.findAll({});

      if (!getAllUsers || getAllUsers.length === 0) {
        return {
          success: false,
          message: 'Erro ao carregar utilizadores. Tente novamente.'
        };
      }

      const user = getAllUsers.find(u =>
        u.email?.toLowerCase() === input.email.toLowerCase() &&
        u.pin?.toString() === input.pin
      );

      if (!user) {
        return {
          success: false,
          message: 'Email ou PIN incorretos'
        };
      }

      if (user.estado !== 'Ativo') {
        return {
          success: false,
          message: 'Utilizador inativo. Contacte o administrador.'
        };
      }

      return {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          nome: user.nome,
          pin: user.pin,
          email: user.email,
          seccao: user.seccao,
          categoria: user.categoria,
          // Legacy fields (kept for backward compat)
          admin: user.admin,
          subAdmin: user.subAdmin,
          programer: user.programer,
          estado: user.estado,
          // Menu access flags
          menuFinancas: user.menuFinancas,
          menuElemento: user.menuElemento,
          menuSpp: user.menuSpp,
          menuAtividades: user.menuAtividades,
          menuNoitesCampo: user.menuNoitesCampo,
          menuInventario: user.menuInventario,
          menuAdmin: user.menuAdmin,
          // New role fields
          ca: Number(user.ca || 0),
          caa: Number(user.caa || 0),
          ta: Number(user.ta || 0),
          tas: Number(user.tas || 0),
          cu: Number(user.cu || 0),
          dirigente: Number(user.dirigente || 0),
          escuteiro: Number(user.escuteiro || 0),
        }
      };
    } catch (error) {
      console.error('Login endpoint error:', error);
      return {
        success: false,
        message: 'Erro ao processar login. Por favor, tente novamente.'
      };
    }
  },
});
