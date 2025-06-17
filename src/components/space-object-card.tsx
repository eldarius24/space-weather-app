import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SpaceObject } from '@/generated/prisma';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SpaceObjectCardProps {
  spaceObject: SpaceObject;
  onEdit: (spaceObject: SpaceObject) => void;
}

export function SpaceObjectCard({ spaceObject, onEdit }: Readonly<SpaceObjectCardProps>) {
  const { name, noradId, objectType, countryCode, launchDate } = spaceObject;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{name}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => onEdit(spaceObject)}>
            Modifier
          </Button>
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