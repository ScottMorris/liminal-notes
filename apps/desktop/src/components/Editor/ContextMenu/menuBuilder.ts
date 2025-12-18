import type { EditorContext, FileContext, CommandRegistry, Command, CommandContextValue } from '../../../commands/types';
import type { MenuModel, MenuItem, MenuSection } from './types';

/**
 * Build context menu model from commands
 */
export function buildContextMenu(
  context: CommandContextValue,
  registry: CommandRegistry
): MenuModel {
  if ('editorMode' in context) {
      return buildEditorContextMenu(context as EditorContext, registry);
  } else {
      return buildFileContextMenu(context as FileContext, registry);
  }
}

function buildEditorContextMenu(context: EditorContext, registry: CommandRegistry): MenuModel {
  // Get all available commands in current context
  const commands = registry.getCommands(context);
  const sections: MenuSection[] = [];

  const parentIds = ['editor.format.group', 'editor.structure.paragraph', 'editor.insert.group'];

  // 1. Links
  const linkCommands = commands.filter(cmd => cmd.group === 'Links');
  if (linkCommands.length > 0) {
    sections.push({ items: linkCommands.map(commandToMenuItem) });
  }

  // 2. Submenus
  const submenuParents = commands.filter(cmd => parentIds.includes(cmd.id));
  const sortOrder = ['editor.format.group', 'editor.structure.paragraph', 'editor.insert.group'];
  submenuParents.sort((a, b) => sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id));

  if (submenuParents.length > 0) {
    sections.push({ items: submenuParents.map(commandToMenuItem) });
  }

  // 3. Edit (Cut/Copy/Paste)
  const childrenIds = new Set<string>();
  submenuParents.forEach(parent => {
    parent.children?.forEach(child => childrenIds.add(child.id));
  });

  const editCommands = commands.filter(cmd =>
    cmd.group === 'Edit' &&
    !parentIds.includes(cmd.id) &&
    !childrenIds.has(cmd.id)
  );

  if (editCommands.length > 0) {
    sections.push({ items: editCommands.map(commandToMenuItem) });
  }

  return { sections };
}

function buildFileContextMenu(context: FileContext, registry: CommandRegistry): MenuModel {
    const commands = registry.getCommands(context);
    const sections: MenuSection[] = [];

    // Order:
    // 1. Open / Navigation (New Tab, Right, Window)
    // 2. File Ops (Duplicate, Move, Bookmark, Merge)
    // 3. Copy (URL, Path)
    // 4. System (Open in default app, Show in explorer)
    // 5. Destructive (Rename, Delete)

    // Group 1: Open/Nav
    // We only have 'Open in new tab' for now.
    // Let's filter by specific IDs or attributes.
    // 'fileTree.openInNewTab'
    const openCommands = commands.filter(c => ['fileTree.openInNewTab'].includes(c.id));
    if (openCommands.length > 0) sections.push({ items: openCommands.map(commandToMenuItem) });

    // Group 2: File Ops
    // 'fileTree.duplicate'
    const opsCommands = commands.filter(c => ['fileTree.duplicate'].includes(c.id));
    if (opsCommands.length > 0) sections.push({ items: opsCommands.map(commandToMenuItem) });

    // Group 3: Copy
    const copyCommands = commands.filter(c => ['fileTree.copyPath', 'fileTree.copyRelativePath'].includes(c.id));
    if (copyCommands.length > 0) sections.push({ items: copyCommands.map(commandToMenuItem) });

    // Group 4: System
    const sysCommands = commands.filter(c => ['fileTree.openInDefaultApp', 'fileTree.showInExplorer'].includes(c.id));
    if (sysCommands.length > 0) sections.push({ items: sysCommands.map(commandToMenuItem) });

    // Group 5: Destructive
    const destCommands = commands.filter(c => ['fileTree.rename', 'fileTree.delete'].includes(c.id));
    if (destCommands.length > 0) sections.push({ items: destCommands.map(commandToMenuItem) });

    return { sections };
}

/**
 * Convert Command to MenuItem
 */
function commandToMenuItem(command: Command): MenuItem {
  return {
    id: command.id,
    label: command.label,
    icon: command.icon,
    shortcut: command.shortcut,
    disabled: false, // Already filtered by when() condition in getCommands
    children: command.children?.map(commandToMenuItem), // Recursively convert children
  };
}
