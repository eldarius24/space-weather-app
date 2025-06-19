import { SpaceTrackGeneralPerturbation } from '@/generated/prisma';
import { GeneralPertubationCard } from '@/components/general-pertubation-card';
import { getSyncGeneralPerturbationsOrGetFromApi } from '@/data/space-track/synchro';

export default async function Home() {
  
  const getSpaceObjects = await getSyncGeneralPerturbationsOrGetFromApi();

  if (getSpaceObjects instanceof Error) {
    return (
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Space Weather Dashboard</h1>
        <p className="text-red-500">Erreur lors de la récupération des données : {getSpaceObjects.message}</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Space Weather Dashboard</h1>
      {getSpaceObjects.map((gp: SpaceTrackGeneralPerturbation) => {
        return <GeneralPertubationCard key={gp.NORAD_CAT_ID} spaceObject={gp} />;
      })}
    </main>
  );
}
