import type { Command, FileContext } from './types';
import { commandRegistry } from './CommandRegistry';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import { desktopVault } from '../adapters/DesktopVaultAdapter';
import { confirm } from '@tauri-apps/plugin-dialog';
import { desktopVaultConfig } from '../adapters/DesktopVaultConfigAdapter';

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
      const { content } = await desktopVault.readNote(ctx.path);
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

      await desktopVault.writeNote(newPath, content);
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
      const fullPath = await desktopVaultConfig.resolveAbsolutePath(ctx.path);
      if (!fullPath) {
        await writeText(ctx.path);
        ctx.operations.notify('Relative path copied (Vault config missing)', 'success');
        return;
      }

      await writeText(fullPath);
      ctx.operations.notify('Path copied to clipboard', 'success');
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
      const fullPath = await desktopVaultConfig.resolveAbsolutePath(ctx.path);
      if (!fullPath) {
        return;
      }

      try {
         await revealItemInDir(fullPath);
      } catch {
         const parentDir = fullPath.substring(0, Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\')));
         await openPath(parentDir);
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
      const fullPath = await desktopVaultConfig.resolveAbsolutePath(ctx.path);
      if (!fullPath) {
        return;
      }
      await openPath(fullPath);
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
    const shouldDelete = await confirm(`Are you sure you want to delete ${ctx.path}?`, { title: 'Delete file' });
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
