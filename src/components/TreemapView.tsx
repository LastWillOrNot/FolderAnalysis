/**
 * Vue de répartition visuelle proportionnelle des sous-répertoires
 * Permet de visualiser en un coup d'œil les répertoires les plus gourmands en espace
 */

import React from 'react';
import { DirectoryNode } from '../types/analyzer';
import { formatBytes, formatPercent } from '../utils/formatters';
import { Folder, Check } from 'lucide-react';

interface TreemapViewProps {
  rootNode: DirectoryNode;
  directoriesById: Record<string, DirectoryNode>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onInspectDirectory: (node: DirectoryNode) => void;
}

export const TreemapView: React.FC<TreemapViewProps> = ({
  rootNode,
  directoriesById,
  selectedIds,
  onToggleSelect,
  onInspectDirectory,
}) => {
  // Récupérer les sous-dossiers directs du nœud racine analysé
  const directChildren = rootNode.childDirectoryIds
    .map((id) => directoriesById[id])
    .filter(Boolean)
    .sort((a, b) => b.totalSize - a.totalSize);

  if (directChildren.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
        <Folder className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
        <p className="font-medium text-slate-700">Aucun sous-répertoire direct</p>
        <p className="text-xs text-slate-500 mt-1">
          Tous les fichiers de ce dossier sont situés directement à la racine ({formatBytes(rootNode.ownSize)}).
        </p>
      </div>
    );
  }

  const rootTotal = rootNode.totalSize > 0 ? rootNode.totalSize : 1;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Répartition des sous-répertoires de premier niveau
          </h3>
          <p className="text-xs text-slate-500">
            Poids respectif des dossiers comparé au volume total ({formatBytes(rootNode.totalSize)})
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500">
          {directChildren.length} sous-dossier{directChildren.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Barre proportionnelle segmentée globale */}
      <div className="w-full h-4 bg-slate-100 rounded-lg overflow-hidden flex mb-6 shadow-inner">
        {directChildren.map((child, index) => {
          const pct = (child.totalSize / rootTotal) * 100;
          if (pct < 0.5) return null;
          // Couleurs alternées harmonieuses
          const colors = [
            'bg-blue-600',
            'bg-indigo-500',
            'bg-sky-500',
            'bg-emerald-500',
            'bg-amber-500',
            'bg-violet-500',
            'bg-rose-500',
            'bg-teal-500',
          ];
          const color = colors[index % colors.length];

          return (
            <div
              key={child.id}
              className={`${color} hover:brightness-110 transition-all cursor-pointer relative group`}
              style={{ width: `${pct}%` }}
              onClick={() => onInspectDirectory(child)}
              title={`${child.name} : ${formatBytes(child.totalSize)} (${pct.toFixed(1)} %)`}
            />
          );
        })}
      </div>

      {/* Grille des sous-dossiers sous forme de cartes d'analyse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {directChildren.map((child, index) => {
          const isSelected = selectedIds.has(child.id);
          const share = (child.totalSize / rootTotal) * 100;

          return (
            <div
              key={child.id}
              className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleSelect(child.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                      aria-label={`Sélectionner ${child.name}`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <span className="font-semibold text-xs text-slate-900 truncate" title={child.name}>
                      {child.name}/
                    </span>
                  </div>

                  <span className="text-xs font-mono tabular-nums font-bold text-slate-900 shrink-0">
                    {formatBytes(child.totalSize)}
                  </span>
                </div>

                {/* Barre de part du volume */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${isSelected ? 'bg-blue-600' : 'bg-slate-500'}`}
                    style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 mt-1">
                <span>{child.totalFiles} fichiers · {child.childDirectoryIds.length} ss-dossiers</span>
                <button
                  type="button"
                  onClick={() => onInspectDirectory(child)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Détails
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
