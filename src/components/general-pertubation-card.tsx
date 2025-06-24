import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SpaceTrackGeneralPerturbation } from '@/generated/prisma';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GeneralPertubationCardProps {
  spaceObject: SpaceTrackGeneralPerturbation;
}

export function GeneralPertubationCard({
  spaceObject,
}: Readonly<GeneralPertubationCardProps>) {
  const { OBJECT_NAME, NORAD_CAT_ID, OBJECT_TYPE, COUNTRY_CODE, EPOCH } =
    spaceObject;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{OBJECT_NAME}</CardTitle>
        </div>
        <CardDescription>NORAD ID: {NORAD_CAT_ID}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          <strong>Type:</strong> {OBJECT_TYPE}
        </p>
        <p>
          <strong>Pays:</strong> {COUNTRY_CODE}
        </p>
        {EPOCH && (
          <div className="absolute bottom-2 right-2">
            <span className="text-muted-foreground/60 font-mono text-xs">
              {format(new Date(EPOCH), 'dd/MM/yy HH:mm', { locale: fr })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
