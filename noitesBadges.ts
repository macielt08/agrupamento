const NOITES_BADGE_MAP: Record<number, string> = {
  '25': 'https://dmf.escutismo.pt/wp-content/uploads/sites/26/2016/04/473.jpg',
  '50': 'https://dmf.escutismo.pt/wp-content/uploads/sites/26/2016/04/475.jpg',
  '75': 'https://dmf.escutismo.pt/wp-content/uploads/sites/26/2016/04/477.jpg',
  '100': 'https://dmf.escutismo.pt/wp-content/uploads/sites/26/2016/04/471_1.jpg',
  '200': 'https://dmf.escutismo.pt/wp-content/uploads/sites/26/2016/04/472.jpg'
};

export function getNoitesBadgeUrl(noites?: number): string | null {
  if (!noites) return null;

  const n = Number(noites);
  if (isNaN(n)) return null;

  if (n >= 200) return NOITES_BADGE_MAP['200'];
  if (n >= 100) return NOITES_BADGE_MAP['100'];
  if (n >= 75) return NOITES_BADGE_MAP['75'];
  if (n >= 50) return NOITES_BADGE_MAP['50'];
  if (n >= 25) return NOITES_BADGE_MAP['25'];

  return null;
}
