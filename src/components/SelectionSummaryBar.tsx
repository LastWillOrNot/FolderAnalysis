/**
 * Barre et panneau de synthèse de la sélection de répertoires
 * Calcule et affiche en temps réel le poids total des éléments sélectionnés
 */

import React, { useState } from 'react';
import {
  CheckSquare,
  X,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  Trash2,
  PieChart,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { SelectionMetrics } from '../types/analyzer';
import { formatBytes, formatRawBytes, formatPercent } from '../utils/formatters';

interface SelectionSummaryBarProps {
  metrics: SelectionMetrics;
  totalTreeSize: number;
  onClearSelection: () => void;
  onSelectTopLargest: (count: number) => void;
  onSelectByDepth: (depth: number) => void;
  onInvertSelection: () => void;
  onRemoveItem: (id: string) => void;
  onOpenExportSelected: () => void;
}

export const SelectionSummaryBar: React.FC<SelectionSummaryBarProps> = ({
  metrics,
  totalTreeSize,
  onClearSelection,
  onSelectTopLargest,
  onSelectByDepth,
  onInvertSelection,
  onRemoveItem,
  onOpenExportSelected,
}) => {
  const [isExpandedList, setIsExpandedList] = useState(false);

  if (metrics.count === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <CheckSquare className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Aucun répertoire sélectionné
            </p>
            <p className="text-xs text-slate-500">
              Cochez les cases dans le tableau ci-dessous pour calculer le poids combiné de répertoires spécifiques.
            </p>
          </div>
        </div>

        {/* Raccourcis de sélection rapide */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">Sélection rapide :</span>
          <button
            type="button"
            onClick={() => onSelectTopLargest(5)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
          >
            Top 5 plus volumineux
          </button>
          <button
            type="button"
            onClick={() => onSelectByDepth(1)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
          >
            Niveau 1
          </button>
        </div>
      </div>
    );
  }

  const hasRedundancy = metrics.cumulativeSize !== metrics.deduplicatedSize;

  return (
    <section
      aria-label="Synthèse du poids des répertoires sélectionnés"
      className="bg-white border-2 border-blue-500/80 rounded-xl shadow-sm transition-all overflow-hidden"
    >
      {/* Barre principale */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Métriques clés de poids */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckSquare className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  {metrics.count} répertoire{metrics.count > 1 ? 's' : ''} sélectionné{metrics.count > 1 ? 's' : ''}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-600 font-medium">
                  {formatPercent(metrics.deduplicatedSize, totalTreeSize)} du total analysé
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
                  {formatBytes(metrics.deduplicatedSize)}
                </span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  ({formatRawBytes(metrics.deduplicatedSize)})
                </span>
              </div>
            </div>
          </div>

          {/* Indicateur de redondance si un parent et un sous-dossier sont tous les deux cochés */}
          {hasRedundancy && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span>
                Somme brute : <strong className="font-mono tabular-nums">{formatBytes(metrics.cumulativeSize)}</strong> (certains sous-dossiers sont imbriqués). Poids net unique : <strong className="font-mono tabular-nums">{formatBytes(metrics.deduplicatedSize)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Actions principales sur la sélection */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpandedList(!isExpandedList)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            aria-expanded={isExpandedList}
            aria-controls="selected-items-details"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Détail ({metrics.count})</span>
            {isExpandedList ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenExportSelected}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shadow-xs focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Exporter la sélection</span>
          </button>

          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
            title="Désélectionner tous les répertoires"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Vider</span>
          </button>
        </div>
      </div>

      {/* Barre de proportion graphique */}
      <div className="px-5 pb-3">
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-blue-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, Math.max(1, (metrics.deduplicatedSize / totalTreeSize) * 100))}%` }}
            title={`${formatPercent(metrics.deduplicatedSize, totalTreeSize)} du total`}
          />
        </div>
      </div>

      {/* Raccourcis complémentaires & actions */}
      <div className="bg-slate-50/80 px-5 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">Ajuster la sélection :</span>
          <button
            type="button"
            onClick={() => onSelectTopLargest(5)}
            className="hover:text-blue-700 underline underline-offset-2"
          >
            Top 5
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onSelectTopLargest(10)}
            className="hover:text-blue-700 underline underline-offset-2"
          >
            Top 10
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onSelectByDepth(1)}
            className="hover:text-blue-700 underline underline-offset-2"
          >
            Sous-dossiers directs (niv. 1)
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={onInvertSelection}
            className="hover:text-blue-700 underline underline-offset-2 flex items-center gap-1"
          >
            <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
            <span>Inverser</span>
          </button>
        </div>

        <div className="flex items-center gap-1 text-slate-500 font-mono tabular-nums">
          <span>{metrics.rootSelectionCount} groupe{metrics.rootSelectionCount > 1 ? 's' : ''} racine{metrics.rootSelectionCount > 1 ? 's' : ''} indépendant{metrics.rootSelectionCount > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tiroir déroulant : liste détaillée des répertoires sélectionnés */}
      {isExpandedList && (
        <div id="selected-items-details" className="border-t border-slate-200 bg-white p-4 max-h-72 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Liste des répertoires sélectionnés ({metrics.selectedNodes.length})
          </p>
          <ul className="divide-y divide-slate-100 text-sm">
            {metrics.selectedNodes.map((node) => {
              const itemShare = totalTreeSize > 0 ? (node.totalSize / totalTreeSize) * 100 : 0;
              return (
                <li
                  key={node.id}
                  className="py-2 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" aria-hidden="true" />
                    <span className="font-mono text-xs text-slate-500 shrink-0">
                      Niv.{node.depth}
                    </span>
                    <span className="font-medium text-slate-900 truncate" title={node.path}>
                      {node.path}/
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatBytes(node.totalSize)}
                      </span>
                      <span className="text-xs text-slate-500 ml-2 font-mono tabular-nums">
                        ({itemShare.toFixed(1)} %)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(node.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label={`Retirer ${node.name} de la sélection`}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};
