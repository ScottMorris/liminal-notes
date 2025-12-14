import { registerEditingCommands } from './editing';
import { registerLinkCommands } from './links';
import { registerFileCommands } from './file';

/**
 * Register all built-in commands
 * Call this on app initialisation
 */
export function registerAllCommands() {
  registerEditingCommands();
  registerLinkCommands();
  registerFileCommands();
}
