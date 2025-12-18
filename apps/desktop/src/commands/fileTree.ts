import type { Command, FileContext } from './types';
import { commandRegistry } from './CommandRegistry';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import * as opener from '@tauri-apps/plugin-opener';
import { readNote, writeNote, getVaultConfig } from '../ipc';

// Open in new tab
const openInNewTabCommand: Command<FileContext> = {
  id: 'fileTree.openInNewTab',
  label: 'Open in new tab',
  context: 'FileTree',
  group: 'File',
  icon: 'plus-square',
  when: (ctx) => !ctx.isDir,
  run: (ctx) => {
    if (ctx.operations.openTab) {
        ctx.operations.openTab(ctx.path);
    } else {
        console.warn("openInNewTab triggered but openTab operation missing in context");
    }
  },
};

// Duplicate
const duplicateCommand: Command<FileContext> = {
  id: 'fileTree.duplicate',
  label: 'Make a copy',
  context: 'FileTree',
  group: 'File',
  icon: 'duplicate',
  when: (ctx) => !ctx.isDir,
  run: async (ctx) => {
    try {
      const content = await readNote(ctx.path);
      const pathParts = ctx.path.split('/');
      const fileName = pathParts.pop() || '';
      const dirPath = pathParts.join('/');

      const baseName = fileName.replace(/\.md$/, '');
      let counter = 1;
      let newName = `${baseName} ${counter}.md`;
      let newPath = dirPath ? `${dirPath}/${newName}` : newName;

      // Simple collision detection against allFiles set in context
      while (ctx.allFiles.has(newPath)) {
        counter++;
        newName = `${baseName} ${counter}.md`;
        newPath = dirPath ? `${dirPath}/${newName}` : newName;
      }

      await writeNote(newPath, content);
      ctx.operations.notify(`Created ${newName}`, 'success');
      await ctx.operations.refreshFiles();

      // Optionally open the new note? Not requested but nice.
      // if (ctx.operations.openTab) ctx.operations.openTab(newPath);
    } catch (error) {
      console.error('Duplicate failed:', error);
      ctx.operations.notify('Failed to duplicate file', 'error');
    }
  },
};

// Copy Path
const copyPathCommand: Command<FileContext> = {
  id: 'fileTree.copyPath',
  label: 'Copy path',
  context: 'FileTree',
  group: 'File',
  icon: 'copy-clipboard', // We used this icon name in mapper
  run: async (ctx) => {
    // Absolute path? Backend gives us rootPath.
    try {
      const config = await getVaultConfig();
      if (config) {
        // Simple join, might need platform specific separator handling if cross platform is strict,
        // but forward slash is usually fine or we can let backend handle it.
        // For clipboard, OS specific separator is better.
        // Assuming Linux/Mac for now given the environment, but let's try to be generic.
        const sep = config.rootPath.includes('\\') ? '\\' : '/';
        // Normalize ctx.path (which is forward slash from backend usually)
        const relative = ctx.path.replaceAll('/', sep);
        const fullPath = `${config.rootPath}${sep}${relative}`;
        await writeText(fullPath);
        ctx.operations.notify('Path copied to clipboard', 'success');
      } else {
        // Fallback to relative
        await writeText(ctx.path);
        ctx.operations.notify('Relative path copied (Vault config missing)', 'success');
      }
    } catch (e) {
      console.error(e);
      ctx.operations.notify('Failed to copy path', 'error');
    }
  },
};

// Copy Relative Path
const copyRelativePathCommand: Command<FileContext> = {
  id: 'fileTree.copyRelativePath',
  label: 'Copy relative path',
  context: 'FileTree',
  group: 'File',
  icon: 'copy-clipboard',
  run: async (ctx) => {
    await writeText(ctx.path);
    ctx.operations.notify('Relative path copied to clipboard', 'success');
  },
};

// Show in System Explorer
const showInExplorerCommand: Command<FileContext> = {
  id: 'fileTree.showInExplorer',
  label: 'Show in system explorer',
  context: 'FileTree',
  group: 'File',
  icon: 'folder-open',
  run: async (ctx) => {
    try {
      const config = await getVaultConfig();
      if (config) {
        const sep = config.rootPath.includes('\\') ? '\\' : '/';
        const relative = ctx.path.replaceAll('/', sep);
        const fullPath = `${config.rootPath}${sep}${relative}`;

        // If it's a file, we might want to reveal it.
        // tauri-plugin-opener `reveal`? It has `revealItem` in v2?
        // `opener.reveal` doesn't exist in the types usually, it's `revealItem` or just `open` on parent.
        // `revealItem` was added recently. If not available, `open` on parent dir.
        // Let's check imports.

        // Try revealItem if it exists (need to cast or check)
        // @ts-ignore
        if (opener.revealItem) {
           // @ts-ignore
           await opener.revealItem(fullPath);
        } else {
           // Fallback: open parent directory
           const parentDir = fullPath.substring(0, fullPath.lastIndexOf(sep));
           await opener.open(parentDir);
        }
      }
    } catch (e) {
      console.error(e);
      ctx.operations.notify('Failed to open system explorer', 'error');
    }
  },
};

// Open in Default App
const openInDefaultAppCommand: Command<FileContext> = {
  id: 'fileTree.openInDefaultApp',
  label: 'Open in default app',
  context: 'FileTree',
  group: 'File',
  icon: 'external-link',
  run: async (ctx) => {
     try {
      const config = await getVaultConfig();
      if (config) {
        const sep = config.rootPath.includes('\\') ? '\\' : '/';
        const relative = ctx.path.replaceAll('/', sep);
        const fullPath = `${config.rootPath}${sep}${relative}`;
        await opener.open(fullPath);
      }
    } catch (e) {
      console.error(e);
      ctx.operations.notify('Failed to open file', 'error');
    }
  },
};

// Rename
const renameCommand: Command<FileContext> = {
  id: 'fileTree.rename',
  label: 'Rename...',
  context: 'FileTree',
  group: 'File',
  icon: 'pencil',
  run: (ctx) => {
    ctx.operations.startRename(ctx.path);
  },
};

// Delete
const deleteCommand: Command<FileContext> = {
  id: 'fileTree.delete',
  label: 'Delete',
  context: 'FileTree',
  group: 'File',
  icon: 'trash',
  run: async (ctx) => {
    const shouldDelete = window.confirm(`Are you sure you want to delete ${ctx.path}?`);
    if (!shouldDelete) return;
    await ctx.operations.deleteFileAndCleanup(ctx.path);
  },
};


export function registerFileTreeCommands() {
  commandRegistry.register(openInNewTabCommand);
  commandRegistry.register(duplicateCommand);
  commandRegistry.register(copyPathCommand);
  commandRegistry.register(copyRelativePathCommand);
  commandRegistry.register(showInExplorerCommand);
  commandRegistry.register(openInDefaultAppCommand);
  commandRegistry.register(renameCommand);
  commandRegistry.register(deleteCommand);
}
