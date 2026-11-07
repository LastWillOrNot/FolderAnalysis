/**
 * Fonctions de formatage pour les tailles de fichiers, pourcentages et dates
 */

/**
 * Formate un nombre d'octets en unité lisible (o, Ko, Mo, Go, To)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 o';
  if (!Number.isFinite(bytes) || bytes < 0) return '-';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To', 'Po'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);
  const value = bytes / Math.pow(k, index);

  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: index === 0 ? 0 : Math.min(dm, 2),
    maximumFractionDigits: index === 0 ? 0 : dm,
  })} ${sizes[index]}`;
}

/**
 * Formate un nombre entier d'octets avec séparateurs de milliers (ex: 1 542 390 octets)
 */
export function formatRawBytes(bytes: number): string {
  return `${bytes.toLocaleString('fr-FR')} octets`;
}

/**
 * Formate un pourcentage avec une décimale
 */
export function formatPercent(value: number, total: number): string {
  if (total <= 0 || !Number.isFinite(value)) return '0 %';
  const pct = (value / total) * 100;
  return `${pct.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

/**
 * Formate un timestamp en date/heure lisible en français
 */
export function formatDate(timestamp?: number): string {
  if (!timestamp) return 'Non disponible';
  const date = new Date(timestamp);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Palette de couleurs harmonieuses pour les types d'extensions
 */
export function getExtensionColor(ext: string): string {
  const cleanExt = ext.toLowerCase().replace(/^\./, '');
  
  // Code & Web
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'scss', 'vue', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'php'].includes(cleanExt)) {
    return '#3B82F6'; // Bleu
  }
  // Images
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'ico', 'bmp', 'tiff'].includes(cleanExt)) {
    return '#10B981'; // Émeraude
  }
  // Documents
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv'].includes(cleanExt)) {
    return '#F59E0B'; // Ambre
  }
  // Audio & Vidéo
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'flac', 'aac', 'ogg'].includes(cleanExt)) {
    return '#8B5CF6'; // Violet
  }
  // Archives
  if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(cleanExt)) {
    return '#EC4899'; // Rose
  }
  // Config & Binaire
  if (['yaml', 'yml', 'toml', 'env', 'lock', 'bin', 'exe', 'dll', 'so'].includes(cleanExt)) {
    return '#64748B'; // Ardoise
  }
  
  return '#94A3B8'; // Neutre par défaut
}
