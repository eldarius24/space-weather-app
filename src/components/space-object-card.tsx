import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SpaceObject } from '@/generated/prisma';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SpaceObjectCardProps {
  spaceObject: SpaceObject;
}

export function SpaceObjectCard({ spaceObject }: Readonly<SpaceObjectCardProps>) {
  const { name, noradId, objectType, countryCode, launchDate } = spaceObject;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{name}</CardTitle>
        </div>
        <CardDescription>NORAD ID: {noradId}</CardDescription>
      </CardHeader>
      <CardContent>
        <p><strong>Type:</strong> {objectType}</p>
        <p><strong>Pays:</strong> {countryCode}</p>
        {launchDate && (
          <p>
            <strong>Date de lancement:</strong>{' '}
            {format(new Date(launchDate), 'd MMMM yyyy', { locale: fr })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}