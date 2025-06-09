'use client';

import { useState, useEffect } from 'react';
import { fetchGeneralPerturbations, SpaceTrack_GeneralPertubation } from '@/data/space-track/general-pertubation';

export default function TestSpaceTrackPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<SpaceTrack_GeneralPertubation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchGeneralPerturbations();
        if (result instanceof Error) {
          throw result;
        }
        setData(result);
        console.log('Données orbitales récupérées:', result);
        
      } catch (err) {
        setError('Une erreur est survenue lors du chargement des données');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Space Track API</h1>
      
      {loading && <p>Chargement des données...</p>}
      
      {error && <p className="text-red-500">{error}</p>}
      
      {data && (
        <>
          <p className="mb-2">Nombre d objets orbitaux: {data.length}</p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 border">NORAD ID</th>
                  <th className="px-4 py-2 border">Object Name</th>
                  <th className="px-4 py-2 border">Object Type</th>
                  <th className="px-4 py-2 border">Country</th>
                  <th className="px-4 py-2 border">Launch Date</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-2 border">{item.NORAD_CAT_ID}</td>
                    <td className="px-4 py-2 border">{item.OBJECT_NAME ?? 'N/A'}</td>
                    <td className="px-4 py-2 border">{item.OBJECT_TYPE ?? 'N/A'}</td>
                    <td className="px-4 py-2 border">{item.COUNTRY_CODE ?? 'N/A'}</td>
                    <td className="px-4 py-2 border">
                      {item.LAUNCH_DATE ? new Date(item.LAUNCH_DATE).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
