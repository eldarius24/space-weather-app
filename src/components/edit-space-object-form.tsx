'use client';

import { useState, useEffect } from 'react';
import { SpaceObject } from '@/generated/prisma';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface EditSpaceObjectFormProps {
  spaceObject: SpaceObject | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedObject: SpaceObject) => void;
}

export function EditSpaceObjectForm({
  spaceObject,
  isOpen,
  onClose,
  onSave,
}: Readonly<EditSpaceObjectFormProps>) {
  const [formData, setFormData] = useState<Partial<SpaceObject>>({});

  useEffect(() => {
    if (spaceObject) {
      setFormData(spaceObject);
    }
  }, [spaceObject]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as SpaceObject);
  };

  if (!spaceObject) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;objet: {spaceObject.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                name="name"
                value={formData.name ?? ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="objectType">Type d&apos;objet</Label>
              <Input
                id="objectType"
                name="objectType"
                value={formData.objectType ?? ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="countryCode">Code Pays</Label>
              <Input
                id="countryCode"
                name="countryCode"
                value={formData.countryCode ?? ''}
                onChange={handleChange}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}