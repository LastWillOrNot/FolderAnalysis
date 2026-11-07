/**
 * Tableau arborescent interactif des répertoires et sous-répertoires
 * Permet l'exploration hiérarchique, le filtrage, le tri et la multi-sélection
 */

import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  FileText,
  SlidersHorizontal,
  ExternalLink,
  Check,
  Minus
} from 'lucide-react';
import { DirectoryNode, SortField, SortOrder } from '../types/analyzer';
import { formatBytes, formatPercent } from '../utils/formatters';

interface TreeViewTableProps {
  rootId: string;
  directoriesById: Record<string, DirectoryNode>;
  totalTreeSize: number;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInspectDirectory: (node: DirectoryNode) => void;
}

export const TreeViewTable: React.FC<TreeViewTableProps> = ({
  rootId,
  directoriesById,
  totalTreeSize,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onInspectDirectory,
}) => {
  // Gestion de l'état d'expansion des dossiers
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Par défaut, déplier la racine et les répertoires de niveau 1
    const initial = new Set<string>();
    for (const node of Object.values(directoriesById)) {
      if (node.depth <= 1) {
        initial.add(node.id);
      }
    }
    return initial;
  });

  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [minSizeFilter, setMinSizeFilter] = useState<number>(0);
  const [depthFilter, setDepthFilter] = useState<number | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('totalSize');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Basculer l'état d'expansion d'un dossier
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Tout déplier
  const handleExpandAll = () => {
    const all = new Set(Object.keys(directoriesById));
    setExpandedIds(all);
  };

  // Tout replier sauf la racine
  const handleCollapseAll = () => {
    const rootOnly = new Set([rootId]);
    setExpandedIds(rootOnly);
  };

  // Changement de tri
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Filtrage et aplatissement de l'arbre pour l'affichage
  const visibleNodes = useMemo(() => {
    const isSearching = searchQuery.trim().length > 0 || minSizeFilter > 0 || depthFilter !== 'all';

    // Si recherche active, filtrer directement sur la liste globale
    if (isSearching) {
      const query = searchQuery.trim().toLowerCase();
      const list = Object.values(directoriesById).filter((node) => {
        const matchesQuery = !query || node.name.toLowerCase().includes(query) || node.path.toLowerCase().includes(query);
        const matchesSize = node.totalSize >= minSizeFilter;
        const matchesDepth = depthFilter === 'all' || node.depth === depthFilter;
        return matchesQuery && matchesSize && matchesDepth;
      });

      // Trier
      list.sort((a, b) => {
        let diff = 0;
        if (sortField === 'totalSize') diff = a.totalSize - b.totalSize;
        else if (sortField === 'name') diff = a.name.localeCompare(b.name);
        else if (sortField === 'totalFiles') diff = a.totalFiles - b.totalFiles;
        else if (sortField === 'depth') diff = a.depth - b.depth;
        return sortOrder === 'asc' ? diff : -diff;
      });

      return list;
    }

    // Affichage arborescent normal selon l'expansion des parents
    const result: DirectoryNode[] = [];

    function traverse(nodeId: string) {
      const node = directoriesById[nodeId];
      if (!node) return;

      result.push(node);

      if (expandedIds.has(nodeId) && node.childDirectoryIds.length > 0) {
        // Trier les enfants selon le critère de tri actuel
        const children = node.childDirectoryIds
          .map((id) => directoriesById[id])
          .filter(Boolean);

        children.sort((a, b) => {
          let diff = 0;
          if (sortField === 'totalSize') diff = a.totalSize - b.totalSize;
          else if (sortField === 'name') diff = a.name.localeCompare(b.name);
          else if (sortField === 'totalFiles') diff = a.totalFiles - b.totalFiles;
          else if (sortField === 'depth') diff = a.depth - b.depth;
          return sortOrder === 'asc' ? diff : -diff;
        });

        for (const child of children) {
          traverse(child.id);
        }
      }
    }

    if (directoriesById[rootId]) {
      traverse(rootId);
    }

    return result;
  }, [
    directoriesById,
    rootId,
    expandedIds,
    searchQuery,
    minSizeFilter,
    depthFilter,
    sortField,
    sortOrder,
  ]);

  const allVisibleSelected = visibleNodes.length > 0 && visibleNodes.every((n) => selectedIds.has(n.id));
  const someVisibleSelected = visibleNodes.some((n) => selectedIds.has(n.id));

  const handleMasterCheckboxToggle = () => {
    if (allVisibleSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Barre d'outils et de filtres */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        {/* Recherche textuelle */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un dossier par nom ou chemin..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            aria-label="Rechercher un dossier"
          />
        </div>

        {/* Filtres de taille et niveau */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtre taille minimale */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-slate-500">Taille :</span>
            <select
              value={minSizeFilter}
              onChange={(e) => setMinSizeFilter(Number(e.target.value))}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
              aria-label="Filtrer par taille minimale"
            >
              <option value={0}>Toutes les tailles</option>
              <option value={1024 * 1024}>&gt; 1 Mo</option>
              <option value={10 * 1024 * 1024}>&gt; 10 Mo</option>
              <option value={100 * 1024 * 1024}>&gt; 100 Mo</option>
              <option value={1024 * 1024 * 1024}>&gt; 1 Go</option>
            </select>
          </div>

          {/* Filtre niveau de profondeur */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-500">Niveau :</span>
            <select
              value={depthFilter}
              onChange={(e) => setDepthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
              aria-label="Filtrer par niveau de profondeur"
            >
              <option value="all">Tous niveaux</option>
              <option value={0}>Racine (Niv. 0)</option>
              <option value={1}>Niveau 1</option>
              <option value={2}>Niveau 2</option>
              <option value={3}>Niveau 3+</option>
            </select>
          </div>

          {/* Boutons d'expansion rapide */}
          <button
            type="button"
            onClick={handleExpandAll}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Tout déplier"
            aria-label="Déplier tous les sous-dossiers"
          >
            <Maximize2 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Tout replier"
            aria-label="Replier tous les sous-dossiers"
          >
            <Minimize2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Tableau interactif */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse" role="treegrid">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {/* Colonne Sélection */}
              <th scope="col" className="w-12 py-3 px-3 text-center">
                <button
                  type="button"
                  onClick={handleMasterCheckboxToggle}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                    allVisibleSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : someVisibleSelected
                      ? 'bg-blue-100 border-blue-600 text-blue-600'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                  aria-label={allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                >
                  {allVisibleSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  {!allVisibleSelected && someVisibleSelected && <Minus className="w-3 h-3 stroke-[3]" />}
                </button>
              </th>

              {/* Colonne Répertoire / Nom */}
              <th scope="col" className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleSortChange('name')}
                  className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-semibold focus-visible:outline-hidden"
                >
                  <span>Nom du Répertoire</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                </button>
              </th>

              {/* Colonne Poids Calculé (Cumulé) */}
              <th scope="col" className="py-3 px-4 text-right">
                <button
                  type="button"
                  onClick={() => handleSortChange('totalSize')}
                  className="flex items-center gap-1.5 ml-auto text-slate-700 hover:text-slate-900 font-semibold focus-visible:outline-hidden"
                >
                  <span>Poids Calculé</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                </button>
              </th>

              {/* Colonne Répartition / Proportion */}
              <th scope="col" className="py-3 px-4 w-36 hidden sm:table-cell text-left">
                <span>Part du Total</span>
              </th>

              {/* Colonne Nombre de fichiers */}
              <th scope="col" className="py-3 px-4 text-right hidden md:table-cell">
                <button
                  type="button"
                  onClick={() => handleSortChange('totalFiles')}
                  className="flex items-center gap-1.5 ml-auto text-slate-700 hover:text-slate-900 font-semibold focus-visible:outline-hidden"
                >
                  <span>Fichiers</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                </button>
              </th>

              {/* Colonne Sous-dossiers */}
              <th scope="col" className="py-3 px-4 text-right hidden lg:table-cell">
                <span>Sous-dossiers</span>
              </th>

              {/* Actions d'inspection */}
              <th scope="col" className="py-3 px-3 text-right w-16">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleNodes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <Folder className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                  <p className="font-medium text-slate-700">Aucun répertoire correspondant aux filtres</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Essayez de modifier votre recherche ou de réinitialiser les filtres de taille.
                  </p>
                </td>
              </tr>
            ) : (
              visibleNodes.map((node) => {
                const isSelected = selectedIds.has(node.id);
                const hasChildren = node.childDirectoryIds.length > 0;
                const isExpanded = expandedIds.has(node.id);
                const shareOfTotal = totalTreeSize > 0 ? (node.totalSize / totalTreeSize) * 100 : 0;
                const paddingLeftPx = 16 + node.depth * 24;

                return (
                  <tr
                    key={node.id}
                    role="row"
                    aria-selected={isSelected}
                    className={`transition-colors group ${
                      isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Case à cocher de sélection */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleSelect(node.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white hover:border-slate-400'
                        }`}
                        aria-label={`Sélectionner ${node.name}`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    </td>

                    {/* Arborescence et nom */}
                    <td className="py-2.5 px-4 font-sans">
                      <div className="flex items-center" style={{ paddingLeft: `${paddingLeftPx}px` }}>
                        {/* Bouton de déploiement si enfants */}
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(node.id)}
                            className="p-1 -ml-6 mr-1 text-slate-400 hover:text-slate-800 rounded transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                            aria-label={isExpanded ? `Replier ${node.name}` : `Déplier ${node.name}`}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          <span className="w-4 h-4 -ml-6 mr-1 inline-block" aria-hidden="true" />
                        )}

                        {/* Icône de dossier */}
                        {isExpanded ? (
                          <FolderOpen className="w-4 h-4 text-blue-500 mr-2 shrink-0" aria-hidden="true" />
                        ) : (
                          <Folder className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mr-2 shrink-0 transition-colors" aria-hidden="true" />
                        )}

                        {/* Nom du dossier */}
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors truncate block">
                            {node.name}
                          </span>
                          {node.depth > 0 && (
                            <span className="text-[11px] text-slate-400 font-mono block truncate" title={node.path}>
                              {node.path}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Poids calculé */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                      <span className="font-bold text-slate-950 text-sm">
                        {formatBytes(node.totalSize)}
                      </span>
                      {node.ownSize > 0 && node.ownSize !== node.totalSize && (
                        <span className="block text-[11px] text-slate-400 font-sans">
                          dont {formatBytes(node.ownSize)} directs
                        </span>
                      )}
                    </td>

                    {/* Barre de part du total */}
                    <td className="py-2.5 px-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isSelected ? 'bg-blue-600' : 'bg-slate-400 group-hover:bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(1, shareOfTotal))}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono tabular-nums text-slate-600 w-12 text-right">
                          {formatPercent(node.totalSize, totalTreeSize)}
                        </span>
                      </div>
                    </td>

                    {/* Nombre total de fichiers */}
                    <td className="py-2.5 px-4 text-right hidden md:table-cell whitespace-nowrap font-mono tabular-nums text-xs text-slate-700">
                      <span>{node.totalFiles}</span>
                      {node.ownFiles > 0 && node.ownFiles !== node.totalFiles && (
                        <span className="text-slate-400 ml-1">({node.ownFiles})</span>
                      )}
                    </td>

                    {/* Nombre de sous-dossiers */}
                    <td className="py-2.5 px-4 text-right hidden lg:table-cell whitespace-nowrap font-mono tabular-nums text-xs text-slate-700">
                      {node.childDirectoryIds.length}
                    </td>

                    {/* Bouton d'inspection détaillée */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectDirectory(node)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title={`Analyser en détail ${node.name}`}
                        aria-label={`Analyser en détail ${node.name}`}
                      >
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
