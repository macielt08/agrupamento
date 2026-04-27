/**
 * dateUtils.ts
 * Utilitários para tratamento de datas e valores monetários
 * Versão Corrigida: Força leitura DD/MM/AAAA para evitar inversão de meses.
 */

// --- TRATAMENTO DE DATAS ---

/**
 * Formata qualquer entrada de data para o padrão de exibição DD/MM/AAAA.
 * Ignora a interpretação automática do motor JS para strings com "/"
 */
export const formatDateForDisplay = (dateValue: any): string => {
  if (!dateValue) return "--/--/----";

  // Se for objeto Date
  if (dateValue instanceof Date) {
    return dateValue.toLocaleDateString('pt-PT');
  }

  const s = String(dateValue).trim();

  // Se já estiver no formato DD/MM/YYYY, devolvemos como está para não estragar
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    return s;
  }

  // Se estiver no formato YYYY-MM-DD (ISO), convertemos para PT
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }

  return s;
};

/** Alias para compatibilidade com código existente */
export function formatToPTDate(dateInput: any): string {
  return formatDateForDisplay(dateInput);
}

/** Converte YYYY-MM-DD (do input HTML) para DD/MM/AAAA (para a Sheet) */
export function inputDateToFormattedString(dateString: string): string {
  if (!dateString) return "";
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/** Converte DD/MM/AAAA (da Sheet) para YYYY-MM-DD (para o input HTML) */
export function formattedStringToInputDate(dateValue: any): string {
  if (!dateValue || dateValue === '') return '';
  
  const dateString = String(dateValue).trim();
  
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
  
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  
  return '';
}

/** Data de hoje para inputs (YYYY-MM-DD) */
export function getTodayInputDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Data de hoje para a Sheet (DD/MM/AAAA) */
export function getTodayFormattedDate(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}


// --- TRATAMENTO DE VALORES (MOEDA) ---

/** Converte valores da Sheet para número puro.
 * Suporta formato inglês (1,250.00) e português (1.250,00).
 */
export function parseValor(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  let cleaned = String(value).replace(/\s/g, '').replace(/€/g, '');

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot   = cleaned.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    if (lastDot > lastComma) {
      // Formato inglês: 1,250.00 → vírgula é milhar, ponto é decimal
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // Formato PT: 1.250,00 → ponto é milhar, vírgula é decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (lastComma > -1) {
    const afterComma = cleaned.substring(lastComma + 1);
    // Se tem exactamente 3 dígitos após a vírgula → milhar (1,250); caso contrário → decimal (250,50)
    if (afterComma.length === 3 && /^\d+$/.test(afterComma)) {
      cleaned = cleaned.replace(',', '');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  }
  // Se só tem ponto, parseFloat trata correctamente

  const numValue = parseFloat(cleaned);
  return isNaN(numValue) ? 0 : numValue;
}

/** Formata número para string com vírgula decimal */
export function formatCurrency(value: number | string | undefined | null): string {
  const numValue = parseValor(value);
  return numValue.toFixed(2).replace('.', ',');
}

/** Prepara input do utilizador para número */
export function parseUserInput(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  
  const stringValue = String(value).replace(',', '.');
  const numValue = parseFloat(stringValue);
  
  return isNaN(numValue) ? undefined : numValue;
}
