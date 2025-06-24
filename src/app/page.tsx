'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Space Weather Dashboard</h1>
      <Button
        className="btn btn-primary"
        onClick={() => router.push('/objets-spatiaux')}
      >
        Objet Spatial
      </Button>
    </main>
  );
}
