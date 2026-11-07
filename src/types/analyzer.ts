/**
 * Définition des structures de données pour l'analyse des répertoires et fichiers
 */

export interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified?: number;
  extension: string;
}

export interface ExtensionStat {
  extension: string;
  count: number;
  totalSize: number;
  color?: string;
}

export interface DirectoryNode {
  /** Identifiant unique (chemin relatif canonique) */
  id: string;
  /** Nom du dossier */
  name: string;
  /** Chemin relatif depuis la racine */
  path: string;
  /** Chemin du dossier parent ou null pour la racine */
  parentPath: string | null;
  /** Niveau de profondeur dans l'arborescence (0 = racine) */
  depth: number;
  /** Taille totale cumulée (fichiers directs + tous les sous-dossiers) en octets */
  totalSize: number;
  /** Taille des fichiers directement contenus dans ce dossier en octets */
  ownSize: number;
  /** Nombre total de fichiers (directs + sous-dossiers) */
  totalFiles: number;
  /** Nombre de fichiers directement contenus */
  ownFiles: number;
  /** Liste des identifiants des sous-dossiers immédiats */
  childDirectoryIds: string[];
  /** Fichiers directs dans ce dossier */
  directFiles: FileItem[];
  /** Répartition des extensions dans ce dossier et ses descendants */
  extensionStats: ExtensionStat[];
  /** Fichiers les plus volumineux */
  largestFiles: FileItem[];
  /** Date de dernière modification la plus récente parmi les fichiers */
  lastModified?: number;
}

export interface AnalysisResult {
  rootId: string;
  rootName: string;
  totalSize: number;
  totalFiles: number;
  totalDirectories: number;
  directoriesById: Record<string, DirectoryNode>;
  analyzedAt: string;
  scanDurationMs: number;
}

export interface SelectionMetrics {
  /** Nombre de répertoires sélectionnés */
  count: number;
  /** Poids cumulé simple de tous les répertoires sélectionnés (somme directe) */
  cumulativeSize: number;
  /** Poids net non redondant (en évitant le double comptage si un dossier et son parent sont sélectionnés) */
  deduplicatedSize: number;
  /** Nombre de répertoires parents racines de la sélection */
  rootSelectionCount: number;
  /** Ratio par rapport au poids total du répertoire racine (%) */
  percentageOfTotal: number;
  /** Répertoires sélectionnés */
  selectedNodes: DirectoryNode[];
}

export type SortField = 'totalSize' | 'name' | 'totalFiles' | 'depth';
export type SortOrder = 'asc' | 'desc';

export type ExportFormat = 'csv' | 'json' | 'txt';
export type ExportScope = 'all' | 'selected';
