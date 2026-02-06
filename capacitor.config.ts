import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tracker.traderecords',
  appName: '交易记录',
  webDir: 'public',
  bundledWebRuntime: false,
  server: {
    // 使用本地开发服务器
    url: 'http://localhost:5000',
    cleartext: true,
    androidScheme: 'http',
  },
  android: {
    buildOptions: {
      signingType: 'apksigner',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'DARK',
    },
  },
};

export default config;
