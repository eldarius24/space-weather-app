import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EventType, Severity, SpaceWeatherEvent } from '@/generated/prisma';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WeatherEventCardProps {
  event: SpaceWeatherEvent;
}

const severityMap: Record<Severity, { label: string; variant: 'default' | 'warning' | 'destructive' }> = {
  LOW: { label: 'Faible', variant: 'default' },
  MEDIUM: { label: 'Modérée', variant: 'warning' },
  HIGH: { label: 'Élevée', variant: 'destructive' },
  CRITICAL: { label: 'Critique', variant: 'destructive' },
};

const eventTypeMap: Record<EventType, string> = {
  SOLAR_FLARE: 'Éruption Solaire',
  GEOMAGNETIC_STORM: 'Orage Géomagnétique',
  SOLAR_WIND: 'Vent Solaire',
  COSMIC_RAY: 'Rayon Cosmique',
  RADIO_BLACKOUT: 'Évanouissement Radio',
  SOLAR_ENERGETIC_PARTICLE: 'Particule Énergétique Solaire',
};

export function WeatherEventCard({ event }: WeatherEventCardProps) {
  const { eventType, severity, description, startTime, source } = event;
  const severityInfo = severityMap[severity];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{eventTypeMap[eventType]}</CardTitle>
          <Badge variant={severityInfo.variant}>{severityInfo.label}</Badge>
        </div>
        <CardDescription>
          {format(new Date(startTime), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4">{description}</p>
        <p className="text-xs text-slate-500">Source: {source}</p>
      </CardContent>
    </Card>
  );
}