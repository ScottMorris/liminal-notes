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

  // Links section
  const linkCommands = commands.filter(cmd => cmd.group === 'Links');
  if (linkCommands.length > 0) {
    sections.push({
      items: linkCommands.map(commandToMenuItem),
    });
  }

  // Format section
  const formatCommands = commands.filter(cmd => cmd.group === 'Format');
  if (formatCommands.length > 0) {
    sections.push({
      items: formatCommands.map(commandToMenuItem),
    });
  }

  // Edit section
  const editCommands = commands.filter(cmd => cmd.group === 'Edit');
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
    disabled: false, // Already filtered by when() condition in getCommands, but could add specific disabled logic if needed
    action: () => {
      // Will be wired up by menu component
    },
  };
}
