import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

// It loads the native module object from the JSI or requires it from the bridge.
const IosBookmarksModule =
  Platform.OS === 'ios' ? requireOptionalNativeModule('IosBookmarksModule') : null;

function assertIosModuleAvailable() {
  if (!IosBookmarksModule) {
    throw new Error('IosBookmarksModule is only available on iOS.');
  }
}

export async function createBookmark(url: string): Promise<string> {
  assertIosModuleAvailable();
  return await IosBookmarksModule.createBookmark(url);
}

export async function resolveBookmark(bookmarkBase64: string): Promise<string> {
  assertIosModuleAvailable();
  return await IosBookmarksModule.resolveBookmark(bookmarkBase64);
}

export async function releaseAccess(url: string): Promise<void> {
  assertIosModuleAvailable();
  return await IosBookmarksModule.releaseAccess(url);
}
