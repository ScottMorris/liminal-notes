import { MobileSandboxVaultAdapter } from '../adapters/MobileSandboxVaultAdapter';
import { parseWikilinks } from '@liminal-notes/core-shared/indexing/resolution';
import { SearchIndex, LinkIndex } from '@liminal-notes/core-shared/indexing/types';
import { NoteId } from '@liminal-notes/core-shared/types';
import { recentsStorage } from '../storage/recents';
import { pinnedStorage } from '../storage/pinned';
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

interface RenameFolderOptions {
    oldPath: string;
    newName: string;
    searchIndex: SearchIndex | null;
    linkIndex: LinkIndex | null;
    router: any;
}

export async function renameFolder({
    oldPath,
    newName,
    searchIndex,
    linkIndex,
    router
}: RenameFolderOptions): Promise<void> {
    // Parent path
    const segments = oldPath.split('/');
    const parent = segments.length > 1 ? segments.slice(0, -1).join('/') : '';
    const newPath = parent ? `${parent}/${newName}` : newName;

    if (newPath === oldPath) return;

    try {
        const adapter = new MobileSandboxVaultAdapter();
        await adapter.init();

        // Check if target exists
        // Adapter.stat throws if not found
        try {
            await adapter.stat(newPath);
            throw new FileExistsError(newPath);
        } catch (e: unknown) {
            if (e instanceof FileExistsError) throw e;
            // Expect item not found
        }

        // Rename on disk
        await adapter.rename(oldPath, newPath);

        // Update Indexes & Storage (Bulk update for prefixes)
        // We need to find all items that started with oldPath/
        // Since we don't have a direct "listByPrefix" in adapter efficiently without scan,
        // and we just moved the folder, we can rely on storage/index scans or just cleanup known paths.

        // Strategy:
        // 1. Recents & Pinned: Get all, filter by prefix, update.
        // 2. Search & Link Index: We can't easily know EXACTLY what files were there without a pre-scan.
        //    But since we moved them, the old IDs are gone.
        //    We should ideally remove the old IDs from the index.
        //    To do that, we need to know what they were.
        //    Since we didn't scan before move (for performance), we might leave ghosts?
        //    Actually, standard practice is to scan, but for now let's try to just update Recents/Pinned
        //    and let Index heal lazily or via background scan.
        //    Wait, if we leave ghosts in Search Index, user clicks result -> file not found.
        //    So we SHOULD remove them.

        // Let's do a 'best effort' cleanup using the Index itself if possible, or just accept lazy healing.
        // For a robust implementation, we'll scan the NEW folder to find what the NEW files are,
        // and infer the OLD files from that to remove them.

        const newFiles = await adapter.listFiles(); // This scans everything... might be slow.
        // Optimisation: We only care about files starting with newPath/
        const movedFiles = newFiles.filter(f => f.id.startsWith(newPath + '/'));

        for (const file of movedFiles) {
            const relativeSuffix = file.id.substring(newPath.length);
            const oldId = oldPath + relativeSuffix;

            if (searchIndex) await searchIndex.remove(oldId);
            if (linkIndex) await linkIndex.removeSource(oldId);

            // Recents & Pinned
            // We can explicitly update them here if we iterate, or do a bulk pass.
            // Let's do explicit update here for safety.
            await recentsStorage.remove(oldId);
            await recentsStorage.add(file.id);
            await pinnedStorage.update(oldId, file.id);
        }

        // Also update the folder itself if it was pinned
        await pinnedStorage.update(oldPath, newPath);

        // Update Router
        router.setParams({ folder: encodeURIComponent(newPath) });

    } catch (e: unknown) {
        console.error('Folder rename failed', e);
        throw e;
    }
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

      // Update Pinned Items
      await pinnedStorage.update(noteId, newPath);

      // Seamless Transition
      ignoreNextLoadRef.current = true;
      router.setParams({ id: encodeURIComponent(newPath) });

    } catch (e: unknown) {
       console.error('Rename failed', e);
       throw e;
    }
}
