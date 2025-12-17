import type { Command, CommandRegistry as ICommandRegistry, CommandContextValue, CommandGroup } from './types';

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
   * Get all registered commands (unfiltered)
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get all commands that are enabled in the current context
   */
  getCommands(context: CommandContextValue): Command[] {
    return Array.from(this.commands.values()).filter(cmd => {
      // STRICT CONTEXT CHECK
      // Prevent running Editor commands in FileTree context and vice-versa.
      // Global commands are generally allowed unless 'when' restricts them.
      // But if cmd.context is specific (e.g. 'Editor'), we MUST ensure context.type matches.

      if (cmd.context !== 'Global') {
          // cmd.context is 'Editor' or 'FileTree'
          // context.type is 'Editor' or 'FileTree'
          if (cmd.context !== context.type) {
              return false;
          }
      }

      if (!cmd.when) return true;
      return cmd.when(context);
    });
  }

  /**
   * Get commands by group, filtered by context
   */
  getCommandsByGroup(group: CommandGroup, context: CommandContextValue): Command[] {
    return this.getCommands(context).filter(cmd => cmd.group === group);
  }

  /**
   * Execute a command by ID
   */
  async executeCommand(
    commandId: string,
    context: CommandContextValue
  ): Promise<void> {
    const command = this.commands.get(commandId);

    if (!command) {
      console.error(`Command ${commandId} not found`);
      return;
    }

    // Check if command is available in this context
    // Same strict check as getCommands
    if (command.context !== 'Global' && command.context !== context.type) {
        console.warn(`Command ${commandId} (context: ${command.context}) not available in current context (${context.type})`);
        return;
    }

    if (command.when && !command.when(context)) {
      console.warn(`Command ${commandId} not available in current context (when condition failed)`);
      return;
    }

    try {
      await command.run(context);
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
      context.operations.notify(`Error executing command: ${command.label}`, 'error');
    }
  }
}

// Singleton instance
export const commandRegistry = new CommandRegistry();
