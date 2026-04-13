import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.planovakidz.app',
  appName: 'Planova Kidz',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
