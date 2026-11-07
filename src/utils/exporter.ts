/**
 * Utilitaire d'exportation de données dans des fichiers externes
 * Prend en charge les formats CSV (avec BOM UTF-8 pour Excel), JSON et TXT
 */

import { AnalysisResult, DirectoryNode, ExportFormat, ExportScope } from '../types/analyzer';
import { formatBytes } from './formatters';

/**
 * Télécharge un fichier généré côté client
 */
function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Échappe une valeur pour le format CSV
 */
function escapeCsvValue(val: string | number | boolean): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(';') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exporte l'analyse au format CSV
 */
export function exportToCsv(
  analysis: AnalysisResult,
  selectedIds: Set<string>,
  scope: ExportScope = 'all',
  delimiter: string = ';'
): void {
  const headers = [
    'Chemin',
    'Nom Répertoire',
    'Niveau Profondeur',
    'Poids Total (Octets)',
    'Poids Total (Lisible)',
    'Poids Fichiers Directs (Octets)',
    'Poids Fichiers Directs (Lisible)',
    'Nombre Total Fichiers',
    'Nombre Fichiers Directs',
    'Nombre Sous-Dossiers Immédiats',
    'Extension Principale',
    'Sélectionné'
  ];

  const rows: string[] = [];
  rows.push(headers.map(escapeCsvValue).join(delimiter));

  // Récupérer les nœuds selon le périmètre
  const allNodes = Object.values(analysis.directoriesById).sort((a, b) => a.path.localeCompare(b.path));
  const targetNodes = scope === 'selected' ? allNodes.filter((n) => selectedIds.has(n.id)) : allNodes;

  for (const node of targetNodes) {
    const dominantExt = node.extensionStats[0]?.extension || 'N/A';
    const isSelected = selectedIds.has(node.id) ? 'Oui' : 'Non';

    const row = [
      escapeCsvValue(node.path),
      escapeCsvValue(node.name),
      node.depth,
      node.totalSize,
      escapeCsvValue(formatBytes(node.totalSize)),
      node.ownSize,
      escapeCsvValue(formatBytes(node.ownSize)),
      node.totalFiles,
      node.ownFiles,
      node.childDirectoryIds.length,
      escapeCsvValue(dominantExt),
      escapeCsvValue(isSelected),
    ];
    rows.push(row.join(delimiter));
  }

  // BOM UTF-8 (\uFEFF) pour forcer Microsoft Excel à reconnaître l'encodage UTF-8 (accents)
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const scopeSuffix = scope === 'selected' ? '_selection' : '_complet';
  const filename = `analyse_poids_${analysis.rootName}${scopeSuffix}_${timestamp}.csv`;

  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Exporte l'analyse au format JSON
 */
export function exportToJson(
  analysis: AnalysisResult,
  selectedIds: Set<string>,
  scope: ExportScope = 'all'
): void {
  let exportData: unknown;

  if (scope === 'selected') {
    const selectedNodes = Object.values(analysis.directoriesById)
      .filter((n) => selectedIds.has(n.id))
      .map((n) => ({
        id: n.id,
        name: n.name,
        path: n.path,
        depth: n.depth,
        parentPath: n.parentPath,
        totalSizeBytes: n.totalSize,
        totalSizeReadable: formatBytes(n.totalSize),
        ownSizeBytes: n.ownSize,
        ownSizeReadable: formatBytes(n.ownSize),
        totalFiles: n.totalFiles,
        ownFiles: n.ownFiles,
        subfoldersCount: n.childDirectoryIds.length,
        extensionStats: n.extensionStats,
        directFiles: n.directFiles,
      }));

    exportData = {
      meta: {
        rootName: analysis.rootName,
        analyzedAt: analysis.analyzedAt,
        exportScope: 'selected',
        selectedCount: selectedNodes.length,
        totalAnalyzedSize: analysis.totalSize,
        totalAnalyzedFiles: analysis.totalFiles,
      },
      selectedDirectories: selectedNodes,
    };
  } else {
    exportData = {
      meta: {
        rootName: analysis.rootName,
        analyzedAt: analysis.analyzedAt,
        scanDurationMs: analysis.scanDurationMs,
        exportScope: 'all',
        totalSize: analysis.totalSize,
        totalSizeReadable: formatBytes(analysis.totalSize),
        totalFiles: analysis.totalFiles,
        totalDirectories: analysis.totalDirectories,
      },
      directories: Object.values(analysis.directoriesById).map((n) => ({
        id: n.id,
        name: n.name,
        path: n.path,
        depth: n.depth,
        parentPath: n.parentPath,
        totalSizeBytes: n.totalSize,
        totalSizeReadable: formatBytes(n.totalSize),
        ownSizeBytes: n.ownSize,
        ownSizeReadable: formatBytes(n.ownSize),
        totalFiles: n.totalFiles,
        ownFiles: n.ownFiles,
        childDirectories: n.childDirectoryIds,
        extensionStats: n.extensionStats,
        directFiles: n.directFiles,
        isSelected: selectedIds.has(n.id),
      })),
    };
  }

  const jsonContent = JSON.stringify(exportData, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const scopeSuffix = scope === 'selected' ? '_selection' : '_complet';
  const filename = `analyse_poids_${analysis.rootName}${scopeSuffix}_${timestamp}.json`;

  triggerDownload(jsonContent, filename, 'application/json;charset=utf-8;');
}

/**
 * Exporte un rapport textuel arborescent style console 'tree'
 */
export function exportToTextTree(
  analysis: AnalysisResult,
  selectedIds: Set<string>,
  scope: ExportScope = 'all'
): void {
  const lines: string[] = [];

  lines.push('================================================================');
  lines.push(`RAPPORT D'ANALYSE D'ARBORESCENCE ET DE POIDS`);
  lines.push(`Répertoire analysé : ${analysis.rootName}`);
  lines.push(`Date d'analyse     : ${new Date(analysis.analyzedAt).toLocaleString('fr-FR')}`);
  lines.push(`Poids total        : ${formatBytes(analysis.totalSize)} (${analysis.totalSize.toLocaleString('fr-FR')} octets)`);
  lines.push(`Total répertoires  : ${analysis.totalDirectories}`);
  lines.push(`Total fichiers     : ${analysis.totalFiles}`);
  lines.push(`Périmètre export   : ${scope === 'selected' ? 'Répertoires sélectionnés uniquement' : 'Arborescence complète'}`);
  lines.push('================================================================');
  lines.push('');

  const root = analysis.directoriesById[analysis.rootId];

  function printBranch(dirId: string, prefix: string = '', isLast: boolean = true) {
    const node = analysis.directoriesById[dirId];
    if (!node) return;

    const isSelected = selectedIds.has(node.id);
    const shouldPrint = scope === 'all' || isSelected;

    if (shouldPrint) {
      const marker = isSelected ? '[✓ SÉLECTIONNÉ]' : '';
      const sizeStr = `[${formatBytes(node.totalSize).padEnd(9)}]`;
      const fileCountStr = `(${node.totalFiles} fich.)`;
      const connector = node.depth === 0 ? '' : isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${connector}${sizeStr} ${node.name}/ ${fileCountStr} ${marker}`.trimEnd());
    }

    const childIds = node.childDirectoryIds;
    const newPrefix = node.depth === 0 ? '' : prefix + (isLast ? '    ' : '│   ');

    for (let i = 0; i < childIds.length; i++) {
      const childIsLast = i === childIds.length - 1;
      printBranch(childIds[i], newPrefix, childIsLast);
    }
  }

  if (root) {
    printBranch(root.id, '', true);
  }

  lines.push('');
  lines.push('--- FIN DU RAPPORT ---');

  const textContent = lines.join('\r\n');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const scopeSuffix = scope === 'selected' ? '_selection' : '_complet';
  const filename = `analyse_poids_${analysis.rootName}${scopeSuffix}_${timestamp}.txt`;

  triggerDownload(textContent, filename, 'text/plain;charset=utf-8;');
}

/**
 * Fonction générique de déclenchement d'export
 */
export function executeExport(
  format: ExportFormat,
  analysis: AnalysisResult,
  selectedIds: Set<string>,
  scope: ExportScope
): void {
  if (format === 'csv') {
    exportToCsv(analysis, selectedIds, scope);
  } else if (format === 'json') {
    exportToJson(analysis, selectedIds, scope);
  } else if (format === 'txt') {
    exportToTextTree(analysis, selectedIds, scope);
  }
}
