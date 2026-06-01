import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAP_ENV === 'dev';

const config: CapacitorConfig = {
  appId: 'com.dashandco.bizos',
  appName: 'Dash & Co.',
  webDir: 'out',
  server: isDev
    ? {
      // Local dev — npx cap run android while `npm run dev` is running
      // Only active when CAP_ENV=dev
      url: 'http://10.0.2.2:3000',   // Android emulator → host machine localhost
      androidScheme: 'http',
      cleartext: true,
    }
    : {
      // Live URL — app loads the hosted frontend, no APK rebuild needed for UI changes.
      url: 'https://bizos-six.vercel.app',
      androidScheme: 'https',
      cleartext: false,
    },
};

export default config;
