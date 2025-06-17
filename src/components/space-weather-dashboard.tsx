'use client';

import { useState, useEffect, useTransition } from 'react';
import { SpaceObject, SpaceWeatherEvent } from '@/generated/prisma';
import { WeatherEventCard } from './weather-event-card';
import { SpaceObjectCard } from './space-object-card';
import { EditSpaceObjectForm } from './edit-space-object-form';
import { updateSpaceObject } from '@/app/actions';
import { syncAllDataSources } from '@/services/data-sync.service';

interface SpaceWeatherDashboardProps {
  initialSpaceObjects: SpaceObject[];
  initialEvents: SpaceWeatherEvent[];
}

export function SpaceWeatherDashboard({ initialSpaceObjects, initialEvents }: Readonly<SpaceWeatherDashboardProps>) {
  const [events] = useState<SpaceWeatherEvent[]>(initialEvents);
  const [spaceObjects, setSpaceObjects] = useState<SpaceObject[]>(initialSpaceObjects);
  const [loading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [editingObject, setEditingObject] = useState<SpaceObject | null>(null);
  const [isPending, startTransition] = useTransition();

  // This function can be kept for potential client-side-only event fetching in the future
  // For now, we comment it out to remove the lint warning.
  // const fetchEvents = async () => {
  //   try {
  //     setLoading(true);
  //     const response = await fetch('/api/events');
  //     if (!response.ok) {
  //       throw new Error('Failed to fetch space weather events.');
  //     }
  //     const data: SpaceWeatherEvent[] = await response.json();
  //     setEvents(data);
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'An unknown error occurred.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      
      await syncAllDataSources();

      // Refresh data after a delay
      setTimeout(() => {
        window.location.reload(); // Simplest way to refetch server-side props
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditObject = (spaceObject: SpaceObject) => {
    setEditingObject(spaceObject);
  };

  const handleCloseModal = () => {
    setEditingObject(null);
  };

  const handleSaveObject = async (updatedObject: SpaceObject) => {
    startTransition(async () => {
      try {
        await updateSpaceObject(updatedObject.id, {
          name: updatedObject.name,
          objectType: updatedObject.objectType,
          countryCode: updatedObject.countryCode,
        });
        // The revalidation should happen on the server, updating the list automatically.
        // We can optimistically update the UI here if needed.
        setSpaceObjects((prev) =>
          prev.map((obj) => (obj.id === updatedObject.id ? updatedObject : obj))
        );
        handleCloseModal();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while saving.');
      }
    });
  };

  useEffect(() => {
    // Data is now fetched on the server, so this is not needed for initial load.
    // We might need it for client-side-only updates.
    // fetchEvents();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-slate-100 text-center sm:text-left mb-4 sm:mb-0">
          Tableau de Bord Spatial
        </h1>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSyncing ? 'Synchronisation...' : 'Synchroniser les Données'}
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="text-center text-red-500 py-20">
          <p>Erreur: {error}</p>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center text-slate-400 py-20">
          <p>Aucun événement de météo spatiale à afficher.</p>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <p>Cliquez sur 'Synchroniser les Données' pour commencer.</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-200 mb-4">Événements de Météo Spatiale</h2>
            {events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <WeatherEventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Aucun événement de météo spatiale à afficher.</p>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-slate-200 mb-4">Objets Spatiaux Suivis</h2>
            {spaceObjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spaceObjects.map((obj) => (
                  <SpaceObjectCard key={obj.id} spaceObject={obj} onEdit={handleEditObject} />
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Aucun objet spatial à afficher.</p>
            )}
          </div>
        </>
      )}

      {editingObject && (
        <EditSpaceObjectForm
          isOpen={!!editingObject}
          onClose={handleCloseModal}
          onSave={handleSaveObject}
          spaceObject={editingObject}
        />
      )}

      {(isPending || isSyncing) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}