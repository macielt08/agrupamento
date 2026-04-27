/**
 * ============================================================
 * CENTRAL DE PERMISSÕES — Agrupamento 1280
 * ============================================================
 *
 * Hierarquia (maior para menor):
 *   Programer > CA/CAA > TA > TAS > CU > Dirigente > Escuteiro
 *
 * Campos da sheet Utilizadores:
 *   programer (string "Sim")  — acesso total, sem restrições
 *   ca / caa   (number > 0)  — ex-Admin: vê e edita tudo
 *   ta         (number > 0)  — ex-SubAdmin: vê tudo, edita só Agrupamento
 *   tas        (number > 0)  — vê/edita só a sua secção (+ pode criar para Agrupamento)
 *   cu         (number > 0)  — vê tudo, edita só a sua secção ou Agrupamento
 *   dirigente  (number > 0)  — vê/edita só a sua secção
 *   escuteiro  (number > 0)  — vê só os seus registos, não edita
 *
 * Menu Admin:
 *   Programer / CA / CAA   → acesso total (ver/editar/criar/eliminar todos)
 *   CU com menuAdmin=Sim   → acesso restrito à sua secção
 * ============================================================
 */

export interface AppUser {
  id: number;
  nome?: string;
  pin?: number;
  email?: string;
  seccao?: string;
  categoria?: string;
  // Legacy fields (kept for backward compat during migration)
  admin?: string;
  subAdmin?: string;
  programer?: string;
  estado?: string;
  // Menu flags (controlled independently via sheet)
  menuFinancas?: string;
  menuElemento?: string;
  menuSpp?: string;
  menuAtividades?: string;
  menuNoitesCampo?: string;
  menuInventario?: string;
  menuAdmin?: string;
  // New role columns
  ca?: number;
  caa?: number;
  ta?: number;
  tas?: number;
  cu?: number;
  dirigente?: number;
  escuteiro?: number;
}

export type UserRole =
  | 'programer'
  | 'ca_caa'
  | 'ta'
  | 'tas'
  | 'cu'
  | 'dirigente'
  | 'escuteiro'
  | 'none';

/** Returns the highest role for a user. */
export function getUserRole(user: AppUser | null): UserRole {
  if (!user) return 'none';
  if (user.programer === 'Sim') return 'programer';
  if ((user.ca ?? 0) > 0 || (user.caa ?? 0) > 0) return 'ca_caa';
  // Legacy admin → treated as ca_caa
  if (user.admin === 'Sim') return 'ca_caa';
  if ((user.ta ?? 0) > 0) return 'ta';
  // Legacy subAdmin → treated as ta
  if (user.subAdmin === 'Sim') return 'ta';
  if ((user.tas ?? 0) > 0) return 'tas';
  if ((user.cu ?? 0) > 0) return 'cu';
  if ((user.dirigente ?? 0) > 0) return 'dirigente';
  if ((user.escuteiro ?? 0) > 0) return 'escuteiro';
  return 'none';
}

/**
 * Returns a fully-typed permissions object for the given user.
 * All methods are pure functions — safe to call in render.
 */
export function getPermissions(user: AppUser | null) {
  const role = getUserRole(user);
  const userSeccao = user?.seccao || '';
  const userName = user?.nome || '';

  // ── Role booleans ─────────────────────────────────────────
  const isProgramer = role === 'programer';
  const isCA = isProgramer || role === 'ca_caa';
  const isTA = role === 'ta';
  const isTAS = role === 'tas';
  const isCU = role === 'cu';
  const isDirigente = role === 'dirigente';
  const isEscuteiro = role === 'escuteiro';

  // ── Visibility scope ──────────────────────────────────────
  /** Can see records from ALL sections */
  const canViewAllSections = isProgramer || isCA || isTA || isCU;
  /** Can only see records from own section */
  const canViewOwnSectionOnly = isTAS || isDirigente;
  /** Can only see records that mention their own name */
  const canViewOnlyOwnRecords = isEscuteiro;

  // ── Edit / Delete ─────────────────────────────────────────
  /**
   * Can this user edit (or delete) a record?
   * @param recordSeccao - the "Seccao" field of the record
   * @param isAgrupamento - true when the record's agr flag is truthy
   */
  const canEditRecord = (recordSeccao: string, isAgrupamento: boolean): boolean => {
    if (isProgramer || isCA) return true;
    if (isTA) return recordSeccao === 'Agrupamento' || isAgrupamento;
    if (isTAS || isCU) return recordSeccao === userSeccao || recordSeccao === 'Agrupamento' || isAgrupamento;
    if (isDirigente) return recordSeccao === userSeccao;
    return false; // escuteiro, none
  };

  const canDeleteRecord = canEditRecord; // same rules

  // ── Create ────────────────────────────────────────────────
  /**
   * Can this user create a record targeting a specific section?
   * @param targetSeccao - the section the new record would belong to
   */
  const canCreateForSection = (targetSeccao: string): boolean => {
    if (isProgramer || isCA) return true;
    if (isTA) return targetSeccao === 'Agrupamento';
    if (isTAS || isCU) return targetSeccao === userSeccao || targetSeccao === 'Agrupamento';
    if (isDirigente) return targetSeccao === userSeccao;
    return false;
  };

  // ── Menu access (controlled independently by sheet flags) ─
  const hasFinancasAccess = user?.menuFinancas === 'Sim';
  const hasElementoAccess = user?.menuElemento === 'Sim';
  const hasSppAccess = user?.menuSpp === 'Sim';
  const hasAtividadesAccess = user?.menuAtividades === 'Sim';
  const hasNoitesCampoAccess = user?.menuNoitesCampo === 'Sim';
  const hasInventarioAccess =
    user?.menuInventario === 'Sim' || isCA || isProgramer;

  // ── Admin panel access ────────────────────────────────────
  /** Full admin access: Programer or CA/CAA — can manage all users across all sections */
  const isAdminFullAccess = isProgramer || isCA;
  /** Section-restricted admin access: CU with menuAdmin flag — can only manage their own section */
  const isAdminSectionOnly = !isProgramer && !isCA && user?.menuAdmin === 'Sim';
  /** Has any access to the admin panel */
  const hasAdminAccess = isAdminFullAccess || isAdminSectionOnly;

  const hasAnyAccess =
    hasFinancasAccess ||
    hasElementoAccess ||
    hasSppAccess ||
    hasAtividadesAccess ||
    hasNoitesCampoAccess ||
    hasInventarioAccess ||
    hasAdminAccess ||
    isCA;

  return {
    // Meta
    role,
    userSeccao,
    userName,
    // Role booleans
    isProgramer,
    isCA,
    isTA,
    isTAS,
    isCU,
    isDirigente,
    isEscuteiro,
    // Visibility
    canViewAllSections,
    canViewOwnSectionOnly,
    canViewOnlyOwnRecords,
    // CRUD helpers
    canEditRecord,
    canDeleteRecord,
    canCreateForSection,
    // Menu access
    hasFinancasAccess,
    hasElementoAccess,
    hasSppAccess,
    hasAtividadesAccess,
    hasNoitesCampoAccess,
    hasInventarioAccess,
    // Admin access
    isAdminFullAccess,
    isAdminSectionOnly,
    hasAdminAccess,
    hasAnyAccess,
    // ── Extra user data ────────────────────────────────────────
    /** Raw "categoria" field from the users sheet (e.g. "Dirigente", "User") */
    userCategoria: user?.categoria || '',
    // ── Legacy aliases (kept for components not yet migrated) ──
    isAdmin: isCA,
    isSubAdmin: isTA,
  };
}

export type Permissions = ReturnType<typeof getPermissions>;
