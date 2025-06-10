This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Mise en place

Pour mettre en place le projet, vous devez d'abord cloner le dépôt et installer les dépendances. Voici les étapes à suivre :

1. **Cloner le dépôt** :

   ```bash
   git clone https://github.com/eldarius24/space-weather-app.git

   ```

2. **Accéder au répertoire du projet** :
   ```bash
   cd space-weather-app
   ```
3. **Installer les dépendances** :
   ```bash
   npm install
   ```

### Installer Redis (memoire cache)

- sur windows

```bash
choco install redis-64
```

- sur MAC

```bash
brew install redis
brew services start redis
```

- sur linux

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```
