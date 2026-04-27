const PROGRESSION_BADGE_MAP: Record<string, Record<string, string>> = {
  'Lobitos': {
    'Pata Tenra': 'https://i.postimg.cc/nrsDqzRm/lobitos-0.png',
    'Lobo Valente': 'https://i.postimg.cc/j2W7y5gn/lobitos-1.png',
    'Lobo Cortês': 'https://i.postimg.cc/4yK9pdL9/lobitos-2.png',
    'Lobo Amigo': 'https://i.postimg.cc/j2W7y5gL/lobitos-3.png'
  },
  'Exploradores': {
    'Apelo': 'https://i.postimg.cc/fLz7SMQK/exploradores-0.png',
    'Aliança': 'https://i.postimg.cc/bJy0Sqfm/exploradores-1.png',
    'Rumo': 'https://i.postimg.cc/85pdfTg4/exploradores-2.png',
    'Descoberta': 'https://i.postimg.cc/LX9kgmFk/exploradores-3.png'
  },
  'Pioneiros': {
    'Desprendimento': 'https://i.postimg.cc/KYXJjXYn/pioneiros-0.png',
    'Conhecimento': 'https://i.postimg.cc/zfm0vmfw/pioneiros-1.png',
    'Vontade': 'https://i.postimg.cc/W4RXzR4G/pioneiros-2.png',
    'Construção': 'https://i.postimg.cc/d0M43M0d/pioneiros-3.png'
  },
  'Caminheiros': {
    'Caminho': 'https://i.postimg.cc/MKxPbJ0L/caminheiros-0.png',
    'Comunidade': 'https://i.postimg.cc/HxqKCJyL/caminheiros-1.png',
    'Serviço': 'https://i.postimg.cc/Jz0QPrs6/caminheiros-2.png',
    'Partida': 'https://i.postimg.cc/rFn1dBfj/caminheiros-3.png'
  }
};

export function getProgressionBadgeUrl(seccao?: string, etapa?: string): string | null {
  if (!seccao || !etapa) return null;
  return PROGRESSION_BADGE_MAP[seccao]?.[etapa] || null;
}
