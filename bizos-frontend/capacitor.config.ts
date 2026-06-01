import type { CapacitorConfig } from '@capacitor/cli';

const isProd = process.env.CAP_ENV === 'prod';

const config: CapacitorConfig = {
  appId: 'com.dashandco.bizos',
  appName: 'Dash & Co.',
  webDir: 'out',
  server: isProd
    ? {
        // Live URL — app loads the hosted frontend, no APK rebuild needed for UI changes.
        // Replace with your actual Vercel URL once deployed.
        url: 'https://bizos-frontend.vercel.app',
        androidScheme: 'https',
        cleartext: false,
      }
    : {
        // Local dev — npx cap run android while `npm run dev` is running
        url: 'http://10.0.2.2:3000',   // Android emulator → host machine localhost
        androidScheme: 'http',
        cleartext: true,
      },
};

export default config;
