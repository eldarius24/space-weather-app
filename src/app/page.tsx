import { fetchGeneralPerturbations } from '@/data/space-track/general-pertubation';
import { SpaceObjectCard } from '@/components/space-object-card';
import { SpaceObject, SpaceTrackGeneralPerturbation } from '@/generated/prisma';

export default async function Home() {
  
  const getSpaceObjects = await fetchGeneralPerturbations();

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
        const spaceObject: SpaceObject = {
          id: (gp.NORAD_CAT_ID ?? 0).toString(),
          noradId: gp.NORAD_CAT_ID ?? 0,
          name: gp.OBJECT_NAME ?? 'Unknown',
          objectType: gp.OBJECT_TYPE ?? 'Unknown',
          countryCode: gp.COUNTRY_CODE ?? 'N/A',
          launchDate: gp.LAUNCH_DATE ? new Date(gp.LAUNCH_DATE) : null,
          epoch: gp.EPOCH ? new Date(gp.EPOCH) : null,
          meanMotion: parseFloat((gp.MEAN_MOTION ?? 0).toString()),
          eccentricity: parseFloat((gp.ECCENTRICITY ?? 0).toString()),
          inclination: parseFloat((gp.INCLINATION ?? 0).toString()),
          raOfAscNode: parseFloat((gp.RA_OF_ASC_NODE ?? 0).toString()),
          argOfPericenter: parseFloat((gp.ARG_OF_PERICENTER ?? 0).toString()),
          meanAnomaly: parseFloat((gp.MEAN_ANOMALY ?? 0).toString()),
          period: parseFloat((gp.PERIOD ?? 0).toString()),
          apoapsis: parseFloat((gp.APOAPSIS ?? 0).toString()),
          periapsis: parseFloat((gp.PERIAPSIS ?? 0).toString()),
          lastUpdated: new Date(),
          rawData: JSON.parse(JSON.stringify(gp)),
          createdAt: new Date(),
        };
        return <SpaceObjectCard key={spaceObject.noradId} spaceObject={spaceObject} />;
      })}
    </main>
  );
}
