import { registerEditingCommands } from './editing';
import { registerLinkCommands } from './links';
import { registerFileCommands } from './file';
import { registerStructureCommands } from './structure';
import { registerGlobalCommands } from './global';

/**
 * Register all built-in commands
 * Call this on app initialisation
 */
export function registerAllCommands() {
  registerGlobalCommands();
  registerEditingCommands();
  registerLinkCommands();
  registerFileCommands();
  registerStructureCommands();
}
