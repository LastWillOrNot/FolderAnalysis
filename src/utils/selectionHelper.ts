/**
 * Calcul précis des métriques de sélection des répertoires
 * Gère à la fois le poids cumulé et la déduplication hiérarchique
 */

import { AnalysisResult, DirectoryNode, SelectionMetrics } from '../types/analyzer';

/**
 * Calcule les métriques globales pour l'ensemble des répertoires sélectionnés
 */
export function calculateSelectionMetrics(
  selectedIds: Set<string>,
  analysis: AnalysisResult | null
): SelectionMetrics {
  if (!analysis || selectedIds.size === 0) {
    return {
      count: 0,
      cumulativeSize: 0,
      deduplicatedSize: 0,
      rootSelectionCount: 0,
      percentageOfTotal: 0,
      selectedNodes: [],
    };
  }

  const selectedNodes: DirectoryNode[] = [];
  let cumulativeSize = 0;

  for (const id of selectedIds) {
    const node = analysis.directoriesById[id];
    if (node) {
      selectedNodes.push(node);
      cumulativeSize += node.totalSize;
    }
  }

  // Trier les nœuds sélectionnés par profondeur croissante (du plus haut au plus profond)
  selectedNodes.sort((a, b) => a.depth - b.depth);

  // Identifier les racines de sélection (ceux qui n'ont AUCUN ancêtre également sélectionné)
  const rootSelectedNodes: DirectoryNode[] = [];
  for (const node of selectedNodes) {
    let hasSelectedAncestor = false;
    let currentParent = node.parentPath;

    while (currentParent) {
      if (selectedIds.has(currentParent)) {
        hasSelectedAncestor = true;
        break;
      }
      const parentNode = analysis.directoriesById[currentParent];
      currentParent = parentNode ? parentNode.parentPath : null;
    }

    if (!hasSelectedAncestor) {
      rootSelectedNodes.push(node);
    }
  }

  // La taille dédupliquée est la somme des répertoires racines de la sélection
  const deduplicatedSize = rootSelectedNodes.reduce((sum, n) => sum + n.totalSize, 0);

  const percentageOfTotal = analysis.totalSize > 0 ? (deduplicatedSize / analysis.totalSize) * 100 : 0;

  return {
    count: selectedNodes.length,
    cumulativeSize,
    deduplicatedSize,
    rootSelectionCount: rootSelectedNodes.length,
    percentageOfTotal,
    selectedNodes,
  };
}
