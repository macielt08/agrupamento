const IMAGENS_MAP: Record<string, string> = {
  'Escutismo': 'https://escutismo.pt/wp-content/uploads/2023/10/novo-logo-cne-01.png',
};

export function getImageUrl(logo?: string): string | null {
  if (!logo) return null;
  return IMAGENS_MAP[logo] || null;
}
