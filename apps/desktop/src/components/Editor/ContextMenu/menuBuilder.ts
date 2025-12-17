import type { EditorContext, CommandRegistry, Command } from '../../../commands/types';
import type { MenuModel, MenuItem, MenuSection } from './types';

/**
 * Build context menu model from commands
 */
export function buildContextMenu(
  context: EditorContext,
  registry: CommandRegistry
): MenuModel {
  // Get all available commands in current context
  const commands = registry.getCommands(context);

  // Group commands into sections
  const sections: MenuSection[] = [];

  // Helper to check if a command is a submenu parent
  // We identify them by ID or specific property.
  // For this implementation, we will look for specific IDs that we know are parents.
  const parentIds = ['editor.format.group', 'editor.structure.paragraph', 'editor.insert.group'];

  // 1. Links section (Top level)
  const linkCommands = commands.filter(cmd => cmd.group === 'Links');
  if (linkCommands.length > 0) {
    sections.push({
      items: linkCommands.map(commandToMenuItem),
    });
  }

  // 2. Format / Paragraph / Insert (The Submenus)
  // We strictly want ONLY the parent commands here, not the loose children.
  // The children are registered in the registry (for keybindings), but in the menu they appear nested.

  // We can filter by ID since we know them.
  const submenuParents = commands.filter(cmd => parentIds.includes(cmd.id));

  // Sort them: Format, Paragraph, Insert
  const sortOrder = ['editor.format.group', 'editor.structure.paragraph', 'editor.insert.group'];
  submenuParents.sort((a, b) => sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id));

  if (submenuParents.length > 0) {
    sections.push({
      items: submenuParents.map(commandToMenuItem),
    });
  }

  // 3. Edit section (Cut/Copy/Paste - remaining commands)
  // Exclude everything we've already handled (Links, Submenu Parents, and Submenu Children)

  // To identify Submenu Children, we can collect all children IDs from the known parents.
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
    sections.push({
      items: editCommands.map(commandToMenuItem),
    });
  }

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
