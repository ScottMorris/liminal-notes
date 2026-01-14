import { requireNativeModule } from 'expo-modules-core';

// It loads the native module object from the JSI or requires it from the bridge.
const IosBookmarksModule = requireNativeModule('IosBookmarksModule');

export async function createBookmark(url: string): Promise<string> {
  return await IosBookmarksModule.createBookmark(url);
}

export async function resolveBookmark(bookmarkBase64: string): Promise<string> {
  return await IosBookmarksModule.resolveBookmark(bookmarkBase64);
}

export async function releaseAccess(url: string): Promise<void> {
    return await IosBookmarksModule.releaseAccess(url);
}
