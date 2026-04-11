import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartplanner.kids',
  appName: 'Smart Planner For Kids',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
