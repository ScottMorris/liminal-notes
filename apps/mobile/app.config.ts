import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const buildProfile = process.env.EAS_BUILD_PROFILE;
  const isDevBuild = buildProfile === 'development';

  const androidPackage = isDevBuild
    ? 'com.encodedream.liminalnotesmobile.dev'
    : 'com.encodedream.liminalnotesmobile';

  const iosBundleIdentifier = isDevBuild
    ? 'com.encodedream.liminalnotesmobile.dev'
    : 'com.encodedream.liminalnotesmobile';

  return {
    ...config,
    name: isDevBuild ? 'Liminal Notes Dev' : 'Liminal Notes',
    slug: 'liminal-notes-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'liminal',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: iosBundleIdentifier,
      associatedDomains: config.ios?.associatedDomains
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: androidPackage
    },
    web: {
      ...config.web,
      favicon: './assets/favicon.png'
    },
    plugins: [
      ...(config.plugins || []),
      'expo-sqlite',
      'expo-dev-client'
    ],
    extra: {
      ...config.extra,
      eas: {
        projectId: '476d1fb2-4753-4b58-9c19-3d0d92899e61'
      }
    },
    owner: 'encodedream'
  };
};
