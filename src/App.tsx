/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  BarChart3,
  ListTree,
  Download,
  FolderOpen,
  CheckCircle,
  HardDrive,
  RefreshCw,
  FolderArchive,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AnalysisResult, DirectoryNode, ExportScope } from './types/analyzer';
import { calculateSelectionMetrics } from './utils/selectionHelper';
import { formatBytes, formatRawBytes } from './utils/formatters';
import { Header } from './components/Header';
import { DirectoryPicker } from './components/DirectoryPicker';
import { SelectionSummaryBar } from './components/SelectionSummaryBar';
import { TreeViewTable } from './components/TreeViewTable';
import { TreemapView } from './components/TreemapView';
import { DirectoryDetailModal } from './components/DirectoryDetailModal';
import { ExportModal } from './components/ExportModal';

export default function App() {
  // Résultat de l'analyse du répertoire sélectionné
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  // Ensemble des identifiants des répertoires sélectionnés
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Indicateur de chargement / scan
  const [isScanning, setIsScanning] = useState<boolean>(false);
  // Onglet de visualisation : tableau arborescent ou répartition graphique
  const [activeTab, setActiveTab] = useState<'tree' | 'distribution'>('tree');
  // Modal de détail d'un répertoire
  const [inspectedNode, setInspectedNode] = useState<DirectoryNode | null>(null);
  // Modal d'export
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [exportInitialScope, setExportInitialScope] = useState<ExportScope>('all');

  // Calcul dynamique et réactif des métriques de sélection
  const selectionMetrics = useMemo(() => {
    return calculateSelectionMetrics(selectedIds, analysis);
  }, [selectedIds, analysis]);

  // Réception des résultats d'analyse
  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysis(result);
    // Par défaut, ne sélectionner aucun dossier pour laisser l'utilisateur choisir
    setSelectedIds(new Set());
  };

  // Basculer la sélection d'un répertoire individuel
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Sélectionner tous les répertoires
  const handleSelectAll = () => {
    if (!analysis) return;
    const allIds = new Set(Object.keys(analysis.directoriesById));
    setSelectedIds(allIds);
  };

  // Tout désélectionner
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Sélectionner les N répertoires les plus volumineux (hors racine)
  const handleSelectTopLargest = (count: number) => {
    if (!analysis) return;
    const nonRootNodes = Object.values(analysis.directoriesById)
      .filter((n) => n.depth > 0)
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, count);

    const newSet = new Set(nonRootNodes.map((n) => n.id));
    setSelectedIds(newSet);
  };

  // Sélectionner les sous-dossiers par niveau de profondeur
  const handleSelectByDepth = (targetDepth: number) => {
    if (!analysis) return;
    const nodes = Object.values(analysis.directoriesById).filter((n) => n.depth === targetDepth);
    const newSet = new Set(nodes.map((n) => n.id));
    setSelectedIds(newSet);
  };

  // Inverser la sélection actuelle
  const handleInvertSelection = () => {
    if (!analysis) return;
    const next = new Set<string>();
    for (const id of Object.keys(analysis.directoriesById)) {
      if (!selectedIds.has(id)) {
        next.add(id);
      }
    }
    setSelectedIds(next);
  };

  // Retirer un élément de la sélection
  const handleRemoveSelectedItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Ouvrir l'export pour la sélection spécifique
  const handleOpenExportSelected = () => {
    setExportInitialScope('selected');
    setIsExportOpen(true);
  };

  // Ouvrir l'export général
  const handleOpenExportGeneral = () => {
    setExportInitialScope('all');
    setIsExportOpen(true);
  };

  const rootNode = analysis ? analysis.directoriesById[analysis.rootId] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* En-tête principal respectant le Top Bar Contract */}
      <Header
        onOpenDirectory={() => {
          // Remettre l'écran au sélecteur ou déclencher le choix de dossier
          setAnalysis(null);
        }}
        onOpenExport={handleOpenExportGeneral}
        hasAnalysis={Boolean(analysis)}
        selectedCount={selectedIds.size}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!analysis ? (
          /* Vue initiale : sélection de répertoire et présentation */
          <div className="space-y-12">
            {/* Zone de titre et explication */}
            <div className="text-center max-w-2xl mx-auto pt-4">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
                Analyse d&apos;arborescence et calcul du poids de chaque répertoire
              </h1>
              <p className="mt-3 text-base text-slate-600">
                Sélectionnez un répertoire pour analyser récursivement tous ses sous-dossiers,
                estimer leur poids exact, mesurer vos sélections multiples et exporter vos rapports.
              </p>
            </div>

            {/* Zone de sélection de dossier */}
            <div className="max-w-2xl mx-auto">
              <DirectoryPicker
                onAnalysisComplete={handleAnalysisComplete}
                isScanning={isScanning}
                setIsScanning={setIsScanning}
              />
            </div>

            {/* Cartes de fonctionnalités clés */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 max-w-5xl mx-auto">
              <div className="p-5 rounded-xl bg-white border border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <FolderTree className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Calcul récursif des sous-dossiers
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mesure le poids cumulé et le poids propre de chaque sous-répertoire à n&apos;importe quelle profondeur d&apos;arborescence.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Poids dynamique des éléments sélectionnés
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cochez plusieurs répertoires : l&apos;outil calcule instantanément leur poids combiné et gère la déduplication parent/enfant.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Download className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Export externe multiple
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Exportez l&apos;arborescence ou uniquement vos éléments sélectionnés au format CSV (Excel avec UTF-8 BOM), JSON ou texte arborescent.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Vue détaillée de l'analyse */
          <div className="space-y-6">
            {/* Bannière de synthèse du répertoire racine analysé */}
            <section
              aria-label="Synthèse du répertoire analysé"
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FolderArchive className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Répertoire analysé
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        Scan terminé ({analysis.scanDurationMs} ms)
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-950 flex items-baseline gap-2">
                      <span>{analysis.rootName}/</span>
                    </h2>
                  </div>
                </div>

                {/* Métriques globales */}
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Poids total du dossier</span>
                    <span className="text-xl font-bold text-slate-950 font-mono tabular-nums">
                      {formatBytes(analysis.totalSize)}
                    </span>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />

                  <div>
                    <span className="text-xs text-slate-500 block">Sous-dossiers</span>
                    <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                      {analysis.totalDirectories}
                    </span>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />

                  <div>
                    <span className="text-xs text-slate-500 block">Fichiers totaux</span>
                    <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                      {analysis.totalFiles}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setAnalysis(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                      <span>Changer de dossier</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Barre de sélection et calcul du poids des éléments sélectionnés */}
            <SelectionSummaryBar
              metrics={selectionMetrics}
              totalTreeSize={analysis.totalSize}
              onClearSelection={handleDeselectAll}
              onSelectTopLargest={handleSelectTopLargest}
              onSelectByDepth={handleSelectByDepth}
              onInvertSelection={handleInvertSelection}
              onRemoveItem={handleRemoveSelectedItem}
              onOpenExportSelected={handleOpenExportSelected}
            />

            {/* Onglets de navigation entre le tableau arborescent et la répartition visuelle */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab('tree')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'tree'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={activeTab === 'tree'}
                >
                  <ListTree className="w-4 h-4" aria-hidden="true" />
                  <span>Arborescence détaillée</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('distribution')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'distribution'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={activeTab === 'distribution'}
                >
                  <BarChart3 className="w-4 h-4" aria-hidden="true" />
                  <span>Répartition proportionnelle</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenExportGeneral}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Options d&apos;exportation</span>
                </button>
              </div>
            </div>

            {/* Contenu principal de l'onglet actif */}
            {activeTab === 'tree' ? (
              <TreeViewTable
                rootId={analysis.rootId}
                directoriesById={analysis.directoriesById}
                totalTreeSize={analysis.totalSize}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onInspectDirectory={(node) => setInspectedNode(node)}
              />
            ) : rootNode ? (
              <TreemapView
                rootNode={rootNode}
                directoriesById={analysis.directoriesById}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onInspectDirectory={(node) => setInspectedNode(node)}
              />
            ) : null}
          </div>
        )}
      </main>

      {/* Modal d'inspection détaillée d'un répertoire */}
      {inspectedNode && (
        <DirectoryDetailModal
          node={inspectedNode}
          totalTreeSize={analysis ? analysis.totalSize : 0}
          isSelected={selectedIds.has(inspectedNode.id)}
          onToggleSelect={() => handleToggleSelect(inspectedNode.id)}
          onClose={() => setInspectedNode(null)}
          onNavigateToChild={(child) => setInspectedNode(child)}
          directoriesById={analysis ? analysis.directoriesById : {}}
        />
      )}

      {/* Modal d'exportation externe (CSV, JSON, TXT) */}
      {isExportOpen && (
        <ExportModal
          analysis={analysis}
          selectedIds={selectedIds}
          initialScope={exportInitialScope}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {/* Pied de page discret sans moteur halluciné */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} DossierScope · Traitement sécurisé exécuté 100% dans votre navigateur.</p>
          <p className="font-mono tabular-nums">Analyse de sous-répertoires & export de rapports</p>
        </div>
      </footer>
    </div>
  );
}
