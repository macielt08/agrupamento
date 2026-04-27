export const AREA_ESPECIALIDADES_BADGE_MAP: Record<string, string> = {
  'Serviço e socorrismo': 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/Servic%CC%A7o-e-Socorrismo.png',
  'Natureza, ambiente e vida em campo': 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/Natureza-Ambiente-e-Vida-em-Campo.png',
  'Terra, água e ar': 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/Terra-A%CC%81gua-e-Ar.png',
  'Fé e religião': 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/Fe%CC%81-e-Religia%CC%83o.png',
  'Ciência e tecnologia': 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/Cinecias-e-tecnologia.png',
  'Habilidade e criatividade': 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/Habilidade-Cratividade-e-Vida-Profissional.png',
  'Comunicação, informação e relacionamento': 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/Comunicac%CC%A7a%CC%83o-Informac%CC%A7a%CC%83o-e-Relacionamento.png',
  'Desenvolvimento físico': 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/Desenvolvimento-Fi%CC%81sico.png'
};

export function getAreaEspecialidadesBadgeUrl(area?: string): string | null {
  if (!area) return null;
  return AREA_ESPECIALIDADES_BADGE_MAP[area] || null;
}
