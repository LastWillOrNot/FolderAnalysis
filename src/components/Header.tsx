/**
 * En-tête de l'application respectant le contrat strict Top Bar
 */

import React from 'react';
import { HardDrive, Download, FolderOpen } from 'lucide-react';

interface HeaderProps {
  onOpenDirectory: () => void;
  onOpenExport: () => void;
  hasAnalysis: boolean;
  selectedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDirectory,
  onOpenExport,
  hasAnalysis,
  selectedCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1 : Marque et Titre principal */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <HardDrive className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block">
              DossierScope
            </span>
          </div>
        </div>

        {/* Zone 2 : Liens / Indicateurs discrets */}
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
          <span className="text-slate-500 whitespace-nowrap">
            Analyseur de structure & poids de dossiers
          </span>
          {hasAnalysis && (
            <>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-slate-700 font-medium whitespace-nowrap">
                {selectedCount > 0
                  ? `${selectedCount} dossier${selectedCount > 1 ? 's' : ''} sélectionné${selectedCount > 1 ? 's' : ''}`
                  : 'Aucune sélection active'}
              </span>
            </>
          )}
        </div>

        {/* Zone 3 : Action principale */}
        <div className="flex items-center gap-3 shrink-0">
          {hasAnalysis && (
            <button
              type="button"
              onClick={onOpenExport}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors whitespace-nowrap shadow-xs"
              aria-label="Exporter les données analysées"
            >
              <Download className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Exporter</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenDirectory}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors whitespace-nowrap shadow-xs"
            aria-label="Sélectionner un nouveau répertoire"
          >
            <FolderOpen className="w-4 h-4" aria-hidden="true" />
            <span>Sélectionner un dossier</span>
          </button>
        </div>
      </div>
    </header>
  );
};
