/**
 * Modal d'inspection détaillée d'un répertoire spécifique
 * Présente la répartition des types de fichiers, les plus gros fichiers et les sous-dossiers
 */

import React, { useEffect } from 'react';
import { X, Folder, File, Check, ExternalLink } from 'lucide-react';
import { DirectoryNode } from '../types/analyzer';
import { formatBytes, formatPercent, formatDate, getExtensionColor } from '../utils/formatters';

interface DirectoryDetailModalProps {
  node: DirectoryNode | null;
  totalTreeSize: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClose: () => void;
  onNavigateToChild?: (childNode: DirectoryNode) => void;
  directoriesById: Record<string, DirectoryNode>;
}

export const DirectoryDetailModal: React.FC<DirectoryDetailModalProps> = ({
  node,
  totalTreeSize,
  isSelected,
  onToggleSelect,
  onClose,
  onNavigateToChild,
  directoriesById,
}) => {
  // Fermer la modal avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  const childNodes = node.childDirectoryIds
    .map((id) => directoriesById[id])
    .filter(Boolean)
    .sort((a, b) => b.totalSize - a.totalSize);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-directory-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* En-tête de la modal */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Folder className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-directory-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{node.name}/</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  (Niveau {node.depth})
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-mono truncate max-w-md" title={node.path}>
                {node.path}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleSelect}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isSelected ? 'Sélectionné' : 'Sélectionner'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Fermer la fenêtre de détail"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Corps de la modal */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm">
          {/* Métriques globales du dossier */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Poids total cumulé</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {formatBytes(node.totalSize)}
              </span>
              <span className="text-[11px] text-slate-500 block font-mono">
                {formatPercent(node.totalSize, totalTreeSize)} du projet
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Fichiers directs</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {formatBytes(node.ownSize)}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {node.ownFiles} fichier{node.ownFiles > 1 ? 's' : ''}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Total fichiers</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {node.totalFiles}
              </span>
              <span className="text-[11px] text-slate-500 block">
                avec sous-dossiers
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Sous-répertoires</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {node.childDirectoryIds.length}
              </span>
              <span className="text-[11px] text-slate-500 block">immédiats</span>
            </div>
          </div>

          {/* Répartition par type de fichier (extensions) */}
          {node.extensionStats.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Répartition par extension de fichier
              </h3>
              {/* Barre multicolore segmentée */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-3">
                {node.extensionStats.map((stat) => {
                  const pct = node.totalSize > 0 ? (stat.totalSize / node.totalSize) * 100 : 0;
                  if (pct < 1) return null;
                  const color = getExtensionColor(stat.extension);
                  return (
                    <div
                      key={stat.extension}
                      style={{ width: `${pct}%`, backgroundColor: color }}
                      title={`${stat.extension}: ${formatBytes(stat.totalSize)} (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>

              {/* Liste des extensions principales */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {node.extensionStats.slice(0, 6).map((stat) => {
                  const color = getExtensionColor(stat.extension);
                  return (
                    <div
                      key={stat.extension}
                      className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-mono font-medium text-slate-800 truncate">
                          {stat.extension}
                        </span>
                      </div>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {formatBytes(stat.totalSize)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fichiers les plus volumineux */}
          {node.largestFiles.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Fichiers les plus volumineux
              </h3>
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
                {node.largestFiles.slice(0, 5).map((file) => (
                  <li key={file.id} className="p-2.5 flex items-center justify-between gap-3 bg-white hover:bg-slate-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="font-medium text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                      {formatBytes(file.size)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sous-dossiers immédiats */}
          {childNodes.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Sous-dossiers immédiats ({childNodes.length})
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {childNodes.map((child) => (
                  <div
                    key={child.id}
                    className="p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-50 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" aria-hidden="true" />
                      <span className="font-medium text-slate-900 truncate">
                        {child.name}/
                      </span>
                      <span className="text-slate-400 font-mono">({child.totalFiles} fich.)</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatBytes(child.totalSize)}
                      </span>
                      {onNavigateToChild && (
                        <button
                          type="button"
                          onClick={() => onNavigateToChild(child)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Naviguer vers ce sous-dossier"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pied de modal */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
