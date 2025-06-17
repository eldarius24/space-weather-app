'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { SpaceObject } from '@/generated/prisma';

export async function getSpaceObjects() {
  try {
    const spaceObjects = await prisma.spaceObject.findMany({
      orderBy: {
        launchDate: 'desc',
      },
    });
    return spaceObjects;
  } catch (error) {
    console.error('Failed to fetch space objects:', error);
    return [];
  }
}

export async function updateSpaceObject(
  id: string,
  data: Partial<Omit<SpaceObject, 'id' | 'noradId' | 'rawData' | 'createdAt' | 'lastUpdated'>>
) {
  try {
    const updatedSpaceObject = await prisma.spaceObject.update({
      where: { id },
      data: {
        ...data,
        lastUpdated: new Date(),
      },
    });
    revalidatePath('/'); // Revalide la page d'accueil pour afficher les nouvelles données
    return updatedSpaceObject;
  } catch (error) {
    console.error(`Failed to update space object with id ${id}:`, error);
    throw new Error('Failed to update space object');
  }
}