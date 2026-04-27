const AREA_BADGE_MAP: Record<string, string> = {
  'Físico': 'https://escutismo.pt/wp-content/uploads/2025/06/programa-educativo-icon-desenvolvimento-fisico.png',
  'Afetivo': 'https://escutismo.pt/wp-content/uploads/2025/06/programa-educativo-icon-desenvolvimento-afetivo.png',
  'Caracter': 'https://escutismo.pt/wp-content/uploads/2025/06/programa-educativo-icon-desenvolvimento-do-caracter.png',
  'Espiritual': 'https://escutismo.pt/wp-content/uploads/2025/06/programa-educativo-icon-desenvolvimento-espiritual.png',
  'Intelectual': 'https://escutismo.pt/wp-content/uploads/2025/06/programa-educativo-icon-desenvolvimento-intelectual.png',
  'Social': 'https://escutismo.pt/wp-content/uploads/2025/06/programa-educativo-icon-desenvolvimento-social.png'
};

export function getAreaBadgeUrl(area?: string): string | null {
  if (!area) return null;
  return AREA_BADGE_MAP[area] || null;
}
