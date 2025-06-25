"use client";
import useSWR from 'swr';
import {Spinner} from "@heroui/spinner";
import { SpaceTrackGeneralPerturbation } from '@/generated/prisma';
import { GeneralPertubationCard } from '@/components/general-pertubation-card';
import { getSyncGeneralPerturbationsOrGetFromApi } from '@/data/space-track/synchro';

export default function Home() {
  const { data: spaceObjects, error, isLoading } = useSWR<SpaceTrackGeneralPerturbation[]>(
    'space-objects',
    () => getSyncGeneralPerturbationsOrGetFromApi(false)
  );

  if (isLoading) {
    return (
      <main className="container mx-auto p-4">
        <h1 className="mb-4 text-2xl font-bold">Space Weather Dashboard</h1>
        <Spinner />
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto p-4">
        <h1 className="mb-4 text-2xl font-bold">Space Weather Dashboard</h1>
        <p className="text-red-500">
          Erreur lors de la récupération des données : {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Space Weather Dashboard</h1>
      {spaceObjects?.map((gp: SpaceTrackGeneralPerturbation) => {
        return (
          <GeneralPertubationCard key={gp.NORAD_CAT_ID} spaceObject={gp} />
        );
      })}
    </main>
  );
}
