"use client";

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(OBJECT_NAME || "");

  const handleTitleClick = () => {
    setIsEditing(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleSave = () => {
    // Utiliser uniquement l'état local pour la modification du titre
    // sans essayer de persister les changements dans la base de données
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTitle(OBJECT_NAME || "");
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet objet spatial ?')) {
      const card = document.getElementById(`card-${NORAD_CAT_ID}`);
      if (card) {
        card.style.display = 'none';
      }
    }
  };

  return (
    <Card className="mb-4" id={`card-${NORAD_CAT_ID}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex-1 mr-2">
              <Input
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                className="text-black bg-white"
              />
            </div>
          ) : (
            <CardTitle onClick={handleTitleClick} className="cursor-pointer hover:text-blue-500">
              {title}
            </CardTitle>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="ml-2"
          >
            Supprimer
          </Button>
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
