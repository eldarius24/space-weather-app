export const metadata = {
  title: 'Space Weather App',
  description: 'Application de surveillance de la météo spatiale',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}