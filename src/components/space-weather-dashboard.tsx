'use client';

import { useState, useEffect } from 'react';
import { SpaceWeatherEvent } from '@/generated/prisma';
import { WeatherEventCard } from './weather-event-card';

export function SpaceWeatherDashboard() {
  const [events, setEvents] = useState<SpaceWeatherEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch space weather events.');
      }
      const data: SpaceWeatherEvent[] = await response.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      const response = await fetch('/api/sync', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to start data synchronization.');
      }
      // Attendre un peu pour que la synchronisation se fasse en arrière-plan, puis rafraîchir
      setTimeout(() => {
        fetchEvents();
      }, 3000); // 3 secondes de délai
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-slate-100 text-center sm:text-left mb-4 sm:mb-0">
          Tableau de Bord de Météo Spatiale
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

      {!loading && !error && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <WeatherEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}