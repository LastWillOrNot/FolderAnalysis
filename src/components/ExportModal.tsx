/**
 * Modal d'exportation externe des données d'analyse
 * Permet de choisir le format (CSV, JSON, TXT) et le périmètre (Tout vs Sélection)
 */

import React, { useState, useEffect } from 'react';
import { X, Download, FileSpreadsheet, FileCode, FileText, CheckCircle2 } from 'lucide-react';
import { AnalysisResult, ExportFormat, ExportScope } from '../types/analyzer';
import { executeExport } from '../utils/exporter';
import { formatBytes } from '../utils/formatters';

interface ExportModalProps {
  analysis: AnalysisResult | null;
  selectedIds: Set<string>;
  initialScope?: ExportScope;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  analysis,
  selectedIds,
  initialScope = 'all',
  onClose,
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>(
    initialScope === 'selected' && selectedIds.size > 0 ? 'selected' : 'all'
  );
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!analysis) return null;

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  const handleExport = () => {
    executeExport(format, analysis, selectedIds, scope);
    setDownloadSuccess(true);
    setTimeout(() => {
      setDownloadSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-export-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-export-title" className="text-base font-bold text-slate-900">
                Exporter les données d'analyse
              </h2>
              <p className="text-xs text-slate-500">
                Génération de fichier externe pour tableurs et archivage
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Fermer la modal d'export"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-5 space-y-5 text-sm">
          {/* Sélection du format */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              1. Format du fichier
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Option CSV */}
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  format === 'csv'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileSpreadsheet
                  className={`w-5 h-5 mb-2 ${format === 'csv' ? 'text-blue-600' : 'text-slate-500'}`}
                  aria-hidden="true"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">CSV (Excel)</span>
                  <span className="text-[11px] text-slate-500">Tableur avec BOM UTF-8</span>
                </div>
              </button>

              {/* Option JSON */}
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  format === 'json'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileCode
                  className={`w-5 h-5 mb-2 ${format === 'json' ? 'text-blue-600' : 'text-slate-500'}`}
                  aria-hidden="true"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">JSON</span>
                  <span className="text-[11px] text-slate-500">Données brutes complètes</span>
                </div>
              </button>

              {/* Option TXT */}
              <button
                type="button"
                onClick={() => setFormat('txt')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  format === 'txt'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileText
                  className={`w-5 h-5 mb-2 ${format === 'txt' ? 'text-blue-600' : 'text-slate-500'}`}
                  aria-hidden="true"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Arbre TXT</span>
                  <span className="text-[11px] text-slate-500">Rapport arborescent</span>
                </div>
              </button>
            </div>
          </div>

          {/* Sélection du périmètre */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              2. Périmètre à exporter
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  scope === 'all'
                    ? 'border-blue-600 bg-blue-50/40'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="export-scope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-600"
                />
                <div className="flex-1">
                  <span className="font-semibold text-xs text-slate-900 block">
                    Arborescence complète ({analysis.totalDirectories} répertoires)
                  </span>
                  <span className="text-xs text-slate-500">
                    Exporte l'intégralité du répertoire racine &quot;{analysis.rootName}&quot; ({formatBytes(analysis.totalSize)})
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  !hasSelection
                    ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                    : scope === 'selected'
                    ? 'border-blue-600 bg-blue-50/40 cursor-pointer'
                    : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="export-scope"
                  value="selected"
                  checked={scope === 'selected'}
                  disabled={!hasSelection}
                  onChange={() => setScope('selected')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-600"
                />
                <div className="flex-1">
                  <span className="font-semibold text-xs text-slate-900 block">
                    Répertoires sélectionnés uniquement ({selectedCount} dossier{selectedCount > 1 ? 's' : ''})
                  </span>
                  <span className="text-xs text-slate-500">
                    {hasSelection
                      ? 'Exporte seulement les sous-répertoires cochés dans la sélection actuelle.'
                      : 'Aucun répertoire n\'est actuellement sélectionné.'}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Pied de modal avec validation */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={downloadSuccess}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                <span>Téléchargement initié !</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Télécharger le fichier .{format}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
