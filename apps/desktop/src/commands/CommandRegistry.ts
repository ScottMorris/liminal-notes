import type { Command, CommandRegistry as ICommandRegistry, EditorContext, CommandGroup } from './types';
import { EditorView } from '@codemirror/view';

export class CommandRegistry implements ICommandRegistry {
  private commands: Map<string, Command> = new Map();

  register(command: Command): void {
    if (this.commands.has(command.id)) {
      console.warn(`Command ${command.id} is already registered`);
      return;
    }
    this.commands.set(command.id, command);
  }

  unregister(commandId: string): void {
    this.commands.delete(commandId);
  }

  getCommand(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Get all commands that are enabled in the current context
   */
  getCommands(context: EditorContext): Command[] {
    return Array.from(this.commands.values()).filter(cmd => {
      if (!cmd.when) return true;
      return cmd.when(context);
    });
  }

  /**
   * Get commands by group, filtered by context
   */
  getCommandsByGroup(group: CommandGroup, context: EditorContext): Command[] {
    return this.getCommands(context).filter(cmd => cmd.group === group);
  }

  /**
   * Execute a command by ID
   */
  async executeCommand(
    commandId: string,
    context: EditorContext,
    view: EditorView
  ): Promise<void> {
    const command = this.commands.get(commandId);

    if (!command) {
      console.error(`Command ${commandId} not found`);
      return;
    }

    // Check if command is available in this context
    if (command.when && !command.when(context)) {
      console.warn(`Command ${commandId} not available in current context`);
      return;
    }

    try {
      await command.run(context, view);
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
      context.operations.notify(`Error executing command: ${command.label}`, 'error');
    }
  }
}

// Singleton instance
export const commandRegistry = new CommandRegistry();
