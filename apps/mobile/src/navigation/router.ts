import { router } from 'expo-router';

/**
 * Navigates to a note by its ID.
 * @param id The unique identifier of the note.
 */
export function openNote(id: string) {
  router.push({
    pathname: '/vault/note/[id]',
    params: { id },
  });
}

/**
 * Navigates to a path in the vault.
 * Currently, this routes to the explorer with the path as a parameter.
 * Future implementation may map paths directly to note IDs.
 * @param path The relative path within the vault.
 */
export function openPath(path: string) {
  // Current implementation: route to explorer
  router.push({
    pathname: '/vault/explorer',
    params: { path },
  });
}
