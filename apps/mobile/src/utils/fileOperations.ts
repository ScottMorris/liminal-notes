import { MobileSandboxVaultAdapter } from '../adapters/MobileSandboxVaultAdapter';
import { parseWikilinks } from '@liminal-notes/core-shared/indexing/resolution';
import { SearchIndex, LinkIndex } from '@liminal-notes/core-shared/indexing/types';
import { NoteId } from '@liminal-notes/core-shared/types';
import { recentsStorage } from '../storage/recents';
import { WikiLinkMatch } from '@liminal-notes/core-shared/types';
import { FileExistsError, FileNotFoundError } from '../errors';

interface RenameOptions {
  noteId: string;
  newName: string;
  content: string;
  searchIndex: SearchIndex | null;
  linkIndex: LinkIndex | null;
  router: any;
  ignoreNextLoadRef: React.MutableRefObject<boolean>;
}

export async function renameNote({
  noteId,
  newName,
  content,
  searchIndex,
  linkIndex,
  router,
  ignoreNextLoadRef
}: RenameOptions): Promise<void> {
    // Construct new path: dirname(noteId) + newName + .md
    const segments = noteId.split('/');
    const parent = segments.length > 1 ? segments.slice(0, -1).join('/') : '';
    const newPath = parent ? `${parent}/${newName}.md` : `${newName}.md`;

    if (newPath === noteId) return;

    try {
      const adapter = new MobileSandboxVaultAdapter();
      await adapter.init();

      // Check if target exists
      try {
        await adapter.readNote(newPath);
        // If read succeeds, file exists
        throw new FileExistsError(newPath);
      } catch (e: unknown) {
        if (e instanceof FileExistsError) {
             throw e;
        }
        // If it's a FileNotFoundError, that's what we want (target shouldn't exist)
        // If it's another error, rethrow
        if (!(e instanceof FileNotFoundError)) {
             throw e;
        }
      }

      await adapter.rename(noteId, newPath);

      // Update Indexes
      if (searchIndex) {
          await searchIndex.remove(noteId);
          await searchIndex.upsert({
              id: newPath,
              title: newName,
              content: content,
              mtimeMs: Date.now()
          });
      }

      if (linkIndex) {
          await linkIndex.removeSource(noteId);
           const links = parseWikilinks(content).map((match: WikiLinkMatch) => ({
               source: newPath,
               targetRaw: match.targetRaw,
               targetPath: match.targetRaw
           }));
          await linkIndex.upsertLinks(newPath, links);
      }

      // Update Recents
      await recentsStorage.remove(noteId);
      await recentsStorage.add(newPath);

      // Seamless Transition
      ignoreNextLoadRef.current = true;
      router.setParams({ id: encodeURIComponent(newPath) });

    } catch (e: unknown) {
       console.error('Rename failed', e);
       throw e;
    }
}
