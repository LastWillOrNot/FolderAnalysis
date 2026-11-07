/**
 * Scanner de répertoire côté client
 * Analyse récursivement les fichiers et sous-répertoires,
 * calcule les tailles cumulées et prépare l'arborescence.
 */

import { AnalysisResult, DirectoryNode, ExtensionStat, FileItem } from '../types/analyzer';

/**
 * Normalise un chemin de dossier en utilisant des barres obliques simples sans slash final
 */
function normalizePath(rawPath: string): string {
  const cleaned = rawPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  return cleaned;
}

/**
 * Extrait l'extension d'un nom de fichier
 */
function getExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1 && parts[0] !== '') {
    return '.' + parts[parts.length - 1].toLowerCase();
  }
  return '(sans extension)';
}

/**
 * Construit le graphe arborescent complet à partir d'une liste brute de fichiers avec chemins relatifs
 */
export function buildAnalysisFromFiles(
  files: Array<{ name: string; relativePath: string; size: number; lastModified?: number }>,
  customRootName?: string,
  startTimeMs: number = Date.now()
): AnalysisResult {
  if (files.length === 0) {
    throw new Error('Le répertoire sélectionné est vide ou ne contient aucun fichier.');
  }

  // Déterminer le nom du répertoire racine
  const firstPath = normalizePath(files[0].relativePath);
  const detectedRootName = firstPath.split('/')[0] || 'Dossier_Racine';
  const rootName = customRootName || detectedRootName;

  // Dictionnaire temporaire pour regrouper les fichiers directs de chaque répertoire
  const dirFilesMap = new Map<string, FileItem[]>();
  // Ensemble de tous les répertoires rencontrés
  const allDirPaths = new Set<string>();

  // La racine est représentée par son chemin de base (ex: 'mon-projet')
  allDirPaths.add(rootName);

  for (const f of files) {
    const normalized = normalizePath(f.relativePath);
    const parts = normalized.split('/');

    // Si le premier segment n'est pas le rootName, on ajuste
    let dirPath: string;
    if (parts.length > 1) {
      // Le chemin du dossier est tout sauf le nom du fichier
      dirPath = parts.slice(0, parts.length - 1).join('/');
    } else {
      dirPath = rootName;
    }

    // Enregistrer tous les dossiers parents dans l'arborescence
    const dirSegments = dirPath.split('/');
    let currentAcc = '';
    for (let i = 0; i < dirSegments.length; i++) {
      currentAcc = i === 0 ? dirSegments[0] : `${currentAcc}/${dirSegments[i]}`;
      allDirPaths.add(currentAcc);
    }

    // Ajouter le fichier au dossier direct
    if (!dirFilesMap.has(dirPath)) {
      dirFilesMap.set(dirPath, []);
    }

    const fileItem: FileItem = {
      id: `${dirPath}/${f.name}`,
      name: f.name,
      path: `${dirPath}/${f.name}`,
      size: f.size,
      lastModified: f.lastModified,
      extension: getExtension(f.name),
    };

    dirFilesMap.get(dirPath)!.push(fileItem);
  }

  // Initialiser les nœuds de répertoires
  const directoriesById: Record<string, DirectoryNode> = {};

  for (const path of allDirPaths) {
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : null;
    const depth = parts.length - 1;
    const directFiles = dirFilesMap.get(path) || [];

    const ownSize = directFiles.reduce((acc, file) => acc + file.size, 0);

    directoriesById[path] = {
      id: path,
      name,
      path,
      parentPath,
      depth,
      totalSize: ownSize, // Sera mis à jour récursivement
      ownSize,
      totalFiles: directFiles.length, // Sera mis à jour récursivement
      ownFiles: directFiles.length,
      childDirectoryIds: [],
      directFiles,
      extensionStats: [],
      largestFiles: [...directFiles].sort((a, b) => b.size - a.size).slice(0, 5),
      lastModified: directFiles.reduce<number | undefined>((max, file) => {
        if (!file.lastModified) return max;
        return max ? Math.max(max, file.lastModified) : file.lastModified;
      }, undefined),
    };
  }

  // Lier les enfants directs à leurs parents
  for (const path of allDirPaths) {
    const node = directoriesById[path];
    if (node.parentPath && directoriesById[node.parentPath]) {
      directoriesById[node.parentPath].childDirectoryIds.push(path);
    }
  }

  // Trier les sous-dossiers par nom pour la cohérence
  for (const node of Object.values(directoriesById)) {
    node.childDirectoryIds.sort();
  }

  // Calcul récursif ascendant (post-order traversal) pour propager les tailles, fichiers, stats d'extensions
  const rootNode = directoriesById[rootName] || Object.values(directoriesById).find((n) => n.depth === 0);
  if (!rootNode) {
    throw new Error("Impossible d'identifier le répertoire racine.");
  }

  function computeAggregates(dirId: string): {
    totalSize: number;
    totalFiles: number;
    extensionMap: Map<string, { count: number; size: number }>;
    largestFiles: FileItem[];
    lastModified?: number;
  } {
    const node = directoriesById[dirId];
    let totalSize = node.ownSize;
    let totalFiles = node.ownFiles;
    let maxModified = node.lastModified;
    const extMap = new Map<string, { count: number; size: number }>();
    let allLargest: FileItem[] = [...node.directFiles];

    // Ajouter les stats des fichiers directs
    for (const f of node.directFiles) {
      const current = extMap.get(f.extension) || { count: 0, size: 0 };
      current.count += 1;
      current.size += f.size;
      extMap.set(f.extension, current);
    }

    // Récursion sur chaque sous-répertoire
    for (const childId of node.childDirectoryIds) {
      const childAgg = computeAggregates(childId);
      totalSize += childAgg.totalSize;
      totalFiles += childAgg.totalFiles;
      allLargest.push(...childAgg.largestFiles);

      if (childAgg.lastModified) {
        maxModified = maxModified ? Math.max(maxModified, childAgg.lastModified) : childAgg.lastModified;
      }

      for (const [ext, stat] of childAgg.extensionMap.entries()) {
        const cur = extMap.get(ext) || { count: 0, size: 0 };
        cur.count += stat.count;
        cur.size += stat.size;
        extMap.set(ext, cur);
      }
    }

    // Conserver les 10 fichiers les plus lourds
    allLargest.sort((a, b) => b.size - a.size);
    node.largestFiles = allLargest.slice(0, 10);

    // Convertir les stats d'extension en tableau trié par taille
    const extensionStats: ExtensionStat[] = Array.from(extMap.entries())
      .map(([extension, data]) => ({
        extension,
        count: data.count,
        totalSize: data.size,
      }))
      .sort((a, b) => b.totalSize - a.totalSize);

    node.totalSize = totalSize;
    node.totalFiles = totalFiles;
    node.extensionStats = extensionStats;
    node.lastModified = maxModified;

    return {
      totalSize,
      totalFiles,
      extensionMap: extMap,
      largestFiles: node.largestFiles,
      lastModified: maxModified,
    };
  }

  computeAggregates(rootNode.id);

  const scanDurationMs = Date.now() - startTimeMs;

  return {
    rootId: rootNode.id,
    rootName: rootNode.name,
    totalSize: rootNode.totalSize,
    totalFiles: rootNode.totalFiles,
    totalDirectories: Object.keys(directoriesById).length,
    directoriesById,
    analyzedAt: new Date().toISOString(),
    scanDurationMs,
  };
}

/**
 * Scanne un FileSystemDirectoryHandle (API moderne window.showDirectoryPicker)
 */
export async function scanDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  onProgress?: (scannedCount: number) => void
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const fileList: Array<{ name: string; relativePath: string; size: number; lastModified?: number }> = [];

  async function walk(dirHandle: FileSystemDirectoryHandle, currentPath: string) {
    // Utiliser les itérateurs asynchrones de FileSystemDirectoryHandle
    for await (const [name, entry] of dirHandle.entries()) {
      const childPath = `${currentPath}/${name}`;
      if (entry.kind === 'file') {
        try {
          const file = await (entry as FileSystemFileHandle).getFile();
          fileList.push({
            name: file.name,
            relativePath: childPath,
            size: file.size,
            lastModified: file.lastModified,
          });
          if (onProgress && fileList.length % 50 === 0) {
            onProgress(fileList.length);
          }
        } catch (err) {
          console.warn(`Impossible de lire le fichier ${childPath}`, err);
        }
      } else if (entry.kind === 'directory') {
        await walk(entry as FileSystemDirectoryHandle, childPath);
      }
    }
  }

  await walk(handle, handle.name);

  return buildAnalysisFromFiles(fileList, handle.name, startTime);
}

/**
 * Scanne une liste de File issue d'un input HTML <input webkitdirectory />
 */
export function scanFileList(files: FileList | File[]): AnalysisResult {
  const startTime = Date.now();
  const rawList: Array<{ name: string; relativePath: string; size: number; lastModified?: number }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // webkitRelativePath est rempli par les navigateurs supportant webkitdirectory
    const relativePath = file.webkitRelativePath || file.name;
    rawList.push({
      name: file.name,
      relativePath,
      size: file.size,
      lastModified: file.lastModified,
    });
  }

  return buildAnalysisFromFiles(rawList, undefined, startTime);
}

/**
 * Génère un projet d'exemple riche et réaliste pour tester instantanément l'application
 */
export function generateDemoProject(): AnalysisResult {
  const demoFiles: Array<{ name: string; relativePath: string; size: number; lastModified: number }> = [
    // Racine
    { name: 'package.json', relativePath: 'mon-application-web/package.json', size: 3450, lastModified: 1718000000000 },
    { name: 'README.md', relativePath: 'mon-application-web/README.md', size: 8120, lastModified: 1717900000000 },
    { name: 'tsconfig.json', relativePath: 'mon-application-web/tsconfig.json', size: 1240, lastModified: 1717800000000 },
    { name: 'vite.config.ts', relativePath: 'mon-application-web/vite.config.ts', size: 2100, lastModified: 1717700000000 },
    { name: '.gitignore', relativePath: 'mon-application-web/.gitignore', size: 450, lastModified: 1717600000000 },

    // src/
    { name: 'main.tsx', relativePath: 'mon-application-web/src/main.tsx', size: 1850, lastModified: 1718010000000 },
    { name: 'App.tsx', relativePath: 'mon-application-web/src/App.tsx', size: 6840, lastModified: 1718015000000 },
    { name: 'index.css', relativePath: 'mon-application-web/src/index.css', size: 4210, lastModified: 1718005000000 },

    // src/components
    { name: 'Header.tsx', relativePath: 'mon-application-web/src/components/Header.tsx', size: 12400, lastModified: 1717950000000 },
    { name: 'Sidebar.tsx', relativePath: 'mon-application-web/src/components/Sidebar.tsx', size: 8900, lastModified: 1717920000000 },
    { name: 'DataTable.tsx', relativePath: 'mon-application-web/src/components/DataTable.tsx', size: 24500, lastModified: 1717980000000 },
    { name: 'ChartModal.tsx', relativePath: 'mon-application-web/src/components/ChartModal.tsx', size: 18200, lastModified: 1717970000000 },
    { name: 'Button.tsx', relativePath: 'mon-application-web/src/components/Button.tsx', size: 3800, lastModified: 1717890000000 },

    // src/components/ui
    { name: 'dropdown.tsx', relativePath: 'mon-application-web/src/components/ui/dropdown.tsx', size: 7600, lastModified: 1717800000000 },
    { name: 'tooltip.tsx', relativePath: 'mon-application-web/src/components/ui/tooltip.tsx', size: 4100, lastModified: 1717810000000 },
    { name: 'modal.tsx', relativePath: 'mon-application-web/src/components/ui/modal.tsx', size: 9300, lastModified: 1717820000000 },
    { name: 'badge.tsx', relativePath: 'mon-application-web/src/components/ui/badge.tsx', size: 2800, lastModified: 1717830000000 },

    // src/services
    { name: 'api.ts', relativePath: 'mon-application-web/src/services/api.ts', size: 15400, lastModified: 1717910000000 },
    { name: 'auth.ts', relativePath: 'mon-application-web/src/services/auth.ts', size: 11200, lastModified: 1717880000000 },
    { name: 'storage.ts', relativePath: 'mon-application-web/src/services/storage.ts', size: 7500, lastModified: 1717870000000 },

    // assets/
    { name: 'logo-brand.svg', relativePath: 'mon-application-web/assets/logo-brand.svg', size: 34200, lastModified: 1717500000000 },
    { name: 'favicon.ico', relativePath: 'mon-application-web/assets/favicon.ico', size: 15400, lastModified: 1717510000000 },

    // assets/images
    { name: 'hero-banner.jpg', relativePath: 'mon-application-web/assets/images/hero-banner.jpg', size: 2840000, lastModified: 1717520000000 },
    { name: 'architecture-diagram.png', relativePath: 'mon-application-web/assets/images/architecture-diagram.png', size: 1450000, lastModified: 1717530000000 },
    { name: 'product-preview-1.png', relativePath: 'mon-application-web/assets/images/product-preview-1.png', size: 1890000, lastModified: 1717540000000 },
    { name: 'product-preview-2.png', relativePath: 'mon-application-web/assets/images/product-preview-2.png', size: 2120000, lastModified: 1717550000000 },
    { name: 'team-photo.jpg', relativePath: 'mon-application-web/assets/images/team-photo.jpg', size: 4200000, lastModified: 1717560000000 },

    // assets/videos
    { name: 'demo-walkthrough.mp4', relativePath: 'mon-application-web/assets/videos/demo-walkthrough.mp4', size: 48900000, lastModified: 1717600000000 },
    { name: 'intro-animation.webm', relativePath: 'mon-application-web/assets/videos/intro-animation.webm', size: 12400000, lastModified: 1717610000000 },

    // docs/
    { name: 'guide-utilisateur.pdf', relativePath: 'mon-application-web/docs/guide-utilisateur.pdf', size: 3850000, lastModified: 1717700000000 },
    { name: 'specification-technique.docx', relativePath: 'mon-application-web/docs/specification-technique.docx', size: 1980000, lastModified: 1717710000000 },
    { name: 'api-spec.yaml', relativePath: 'mon-application-web/docs/api-spec.yaml', size: 84000, lastModified: 1717720000000 },

    // docs/archive
    { name: 'cahier-des-charges-v1.pdf', relativePath: 'mon-application-web/docs/archive/cahier-des-charges-v1.pdf', size: 5400000, lastModified: 1710000000000 },
    { name: 'reunion-kickoff.notes.txt', relativePath: 'mon-application-web/docs/archive/reunion-kickoff.notes.txt', size: 14200, lastModified: 1709900000000 },

    // node_modules/react
    { name: 'index.js', relativePath: 'mon-application-web/node_modules/react/index.js', size: 12400, lastModified: 1716000000000 },
    { name: 'package.json', relativePath: 'mon-application-web/node_modules/react/package.json', size: 2100, lastModified: 1716000000000 },

    // node_modules/typescript
    { name: 'typescript.js', relativePath: 'mon-application-web/node_modules/typescript/typescript.js', size: 8450000, lastModified: 1716000000000 },
    { name: 'tsc.js', relativePath: 'mon-application-web/node_modules/typescript/tsc.js', size: 1250000, lastModified: 1716000000000 },

    // dist/ (bundle généré)
    { name: 'index.html', relativePath: 'mon-application-web/dist/index.html', size: 1400, lastModified: 1718020000000 },
    { name: 'assets/index-B7f9x.js', relativePath: 'mon-application-web/dist/assets/index-B7f9x.js', size: 345000, lastModified: 1718020000000 },
    { name: 'assets/index-D8y1z.css', relativePath: 'mon-application-web/dist/assets/index-D8y1z.css', size: 48900, lastModified: 1718020000000 },
    { name: 'assets/vendor-K3j2a.js', relativePath: 'mon-application-web/dist/assets/vendor-K3j2a.js', size: 890000, lastModified: 1718020000000 },

    // backups/
    { name: 'backup-database-2026-05.sql.gz', relativePath: 'mon-application-web/backups/backup-database-2026-05.sql.gz', size: 34500000, lastModified: 1717000000000 },
    { name: 'backup-config.tar.gz', relativePath: 'mon-application-web/backups/backup-config.tar.gz', size: 2100000, lastModified: 1716500000000 },
  ];

  return buildAnalysisFromFiles(demoFiles, 'mon-application-web', Date.now());
}
