/**
 * Composant de sélection et chargement de répertoire
 * Gère window.showDirectoryPicker, input webkitdirectory et le glisser-déposer
 */

import React, { useRef, useState } from 'react';
import { FolderUp, Sparkles, FolderArchive, Loader2, AlertCircle } from 'lucide-react';
import { scanDirectoryHandle, scanFileList, generateDemoProject } from '../utils/fileScanner';
import { AnalysisResult } from '../types/analyzer';

interface DirectoryPickerProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
  compact?: boolean;
}

export const DirectoryPicker: React.FC<DirectoryPickerProps> = ({
  onAnalysisComplete,
  isScanning,
  setIsScanning,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedFilesCount, setScannedFilesCount] = useState<number>(0);

  // Méthode 1: File System Access API (showDirectoryPicker)
  const handleNativePicker = async () => {
    setErrorMessage(null);
    setScannedFilesCount(0);

    // Vérifier si showDirectoryPicker est supporté
    if ('showDirectoryPicker' in window) {
      try {
        setIsScanning(true);
        // @ts-expect-error - showDirectoryPicker est standard dans les navigateurs Chromium
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        const result = await scanDirectoryHandle(dirHandle, (count) => {
          setScannedFilesCount(count);
        });
        onAnalysisComplete(result);
      } catch (err: unknown) {
        const error = err as Error;
        // Si l'utilisateur a simplement annulé la sélection
        if (error.name === 'AbortError') {
          setIsScanning(false);
          return;
        }
        console.warn('Erreur showDirectoryPicker, bascule vers input fallback :', err);
        // En cas d'erreur de permission (iframe sandboxed), ouvrir le sélecteur input fallback
        if (fileInputRef.current) {
          fileInputRef.current.click();
        } else {
          setErrorMessage("Impossible d'accéder au dossier avec l'API native. Veuillez utiliser le sélecteur standard.");
        }
      } finally {
        setIsScanning(false);
      }
    } else {
      // Navigateur ne supportant pas showDirectoryPicker (Firefox, Safari)
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // Méthode 2: Input HTML standard avec webkitdirectory
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsScanning(true);
      const result = scanFileList(files);
      onAnalysisComplete(result);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Erreur lors de l'analyse des fichiers.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Méthode 3: Glisser-déposer de dossier
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    setErrorMessage(null);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        try {
          setIsScanning(true);
          const result = scanFileList(files);
          onAnalysisComplete(result);
        } catch (err: unknown) {
          const error = err as Error;
          setErrorMessage(error.message || "Erreur lors de l'analyse.");
        } finally {
          setIsScanning(false);
        }
      }
      return;
    }

    // Récupération récursive via DataTransferItem webkitGetAsEntry
    try {
      setIsScanning(true);
      const filesCollected: Array<{ name: string; relativePath: string; size: number; lastModified?: number }> = [];

      async function readEntry(entry: any, path: string): Promise<void> {
        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            entry.file((file: File) => {
              filesCollected.push({
                name: file.name,
                relativePath: `${path}/${file.name}`,
                size: file.size,
                lastModified: file.lastModified,
              });
              resolve();
            }, () => resolve());
          });
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          const readAllEntries = async (): Promise<any[]> => {
            const batch: any[] = await new Promise((resolve) => {
              dirReader.readEntries((entries: any[]) => resolve(entries), () => resolve([]));
            });
            if (batch.length > 0) {
              const nextBatch = await readAllEntries();
              return [...batch, ...nextBatch];
            }
            return batch;
          };

          const entries = await readAllEntries();
          for (const child of entries) {
            await readEntry(child, `${path}/${entry.name}`);
          }
        }
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          if (entry) {
            await readEntry(entry, '');
          }
        }
      }

      if (filesCollected.length > 0) {
        // Nettoyer les chemins
        const cleaned = filesCollected.map((f) => ({
          ...f,
          relativePath: f.relativePath.replace(/^\/+/, ''),
        }));
        const { buildAnalysisFromFiles } = await import('../utils/fileScanner');
        const result = buildAnalysisFromFiles(cleaned);
        onAnalysisComplete(result);
      } else {
        setErrorMessage('Aucun fichier lisible détecté dans les éléments déposés.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Impossible de lire les éléments déposés.');
    } finally {
      setIsScanning(false);
    }
  };

  // Chargement du projet d'exemple
  const handleLoadDemo = () => {
    setErrorMessage(null);
    setIsScanning(true);
    setTimeout(() => {
      try {
        const demo = generateDemoProject();
        onAnalysisComplete(demo);
      } catch (err: unknown) {
        const error = err as Error;
        setErrorMessage(error.message || "Erreur lors du chargement de l'exemple.");
      } finally {
        setIsScanning(false);
      }
    }, 150);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          // @ts-expect-error webkitdirectory est standardisé dans les navigateurs
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleInputChange}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={handleNativePicker}
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isScanning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <FolderUp className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>Choisir un dossier</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Input de secours masqué */}
      <input
        ref={fileInputRef}
        type="file"
        // @ts-expect-error webkitdirectory est standardisé dans les navigateurs
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleInputChange}
        aria-hidden="true"
      />

      {/* Zone de dépôt interactive */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-50/60'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            {isScanning ? (
              <Loader2 className="w-7 h-7 animate-spin" aria-hidden="true" />
            ) : (
              <FolderUp className="w-7 h-7" aria-hidden="true" />
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Sélectionnez un répertoire à analyser
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Déposez un dossier ici ou cliquez pour explorer son arborescence complète, calculer le poids de chaque sous-répertoire et exporter les données.
          </p>

          {/* Boutons d'action principaux */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleNativePicker}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors shadow-xs"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>
                    Analyse en cours
                    {scannedFilesCount > 0 ? ` (${scannedFilesCount} fichiers)` : '...'}
                  </span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4" aria-hidden="true" />
                  <span>Parcourir mon ordinateur</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-slate-500 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span>Tester avec un exemple</span>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span>Traitement 100% local</span>
            <span aria-hidden="true">·</span>
            <span>Aucune donnée n'est transmise sur un serveur</span>
          </div>
        </div>
      </div>

      {/* Message d'erreur éventuel */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold">Une erreur est survenue</p>
            <p className="mt-0.5 text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};
