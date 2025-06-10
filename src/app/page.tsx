'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  SpaceTrack_GeneralPertubation,
} from '@/data/space-track/general-pertubation';
import { getSpaceTrackData } from '@/data/space-track/sync-service';

export default function OrbitalObjectsDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<SpaceTrack_GeneralPertubation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Extraire loadData en dehors du useEffect pour pouvoir l'utiliser ailleurs
  const loadData = async () => {
    try {
      setLoading(true);
      // Utiliser getSpaceTrackData qui implémente la mise en cache
      const result = await getSpaceTrackData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (item) =>
        item.OBJECT_NAME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.NORAD_CAT_ID?.toString().includes(searchTerm),
    );
  }, [data, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getObjectTypeClass = (type: string | null | undefined): string => {
    if (!type) return 'badge-default';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('payload')) return 'badge-success';
    if (lowerType.includes('debris')) return 'badge-destructive';
    if (lowerType.includes('rocket')) return 'badge-warning';
    return 'badge-default';
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-100">
            Suivi des Objets Orbitaux
          </h1>
          <p className="text-slate-400 mt-2">
            Données en temps réel fournies par Space-Track.org
          </p>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Filtres et Recherche</h2>
            <input
              type="text"
              placeholder="Rechercher par nom ou ID NORAD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-4 p-2 rounded-lg bg-slate-800 border border-slate-700 w-full"
            />
          </div>
          <div className="card-content">
            {loading && <p>Chargement des données...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedData.map((item) => (
                    <div key={item.NORAD_CAT_ID} className="card">
                      <div className="card-header">
                        <div className="flex justify-between items-start">
                          <h3 className="card-title text-base">
                            {item.OBJECT_NAME || 'N/A'}
                          </h3>
                          <span className={`badge ${getObjectTypeClass(item.OBJECT_TYPE)}`}>
                            {item.OBJECT_TYPE || 'INCONNU'}
                          </span>
                        </div>
                        <p className="card-description">
                          ID NORAD: {item.NORAD_CAT_ID}
                        </p>
                      </div>
                      <div className="card-content text-xs text-slate-400">
                        <p>Pays: {item.COUNTRY_CODE}</p>
                        <p>
                          Date de lancement:{' '}
                          {item.LAUNCH_DATE
                            ? new Date(item.LAUNCH_DATE).toLocaleDateString()
                            : 'N/A'}
                        </p>
                        <p>Période: {item.PERIOD} min</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex justify-center items-center space-x-4">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <span>
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <button
        className="floating-action-btn"
        aria-label="Ajouter"
        onClick={() => loadData()}
      >
        ↻
      </button>
    </main>
  );
}
