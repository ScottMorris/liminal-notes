import { EditorView } from '@codemirror/view';

/**
 * Context passed to commands when they execute or evaluate conditions
 */
export interface EditorContext {
  // Note info
  noteId: string;
  path: string;
  isUnsaved: boolean;

  // Editor state
  editorMode: 'source';  // Later: 'livePreview' | 'reading'

  // Selection info
  selection: {
    text: string;
    from: number;
    to: number;
    empty: boolean;
  };

  // Cursor position
  cursor: number;

  // Document info
  documentLength: number;

  // App-level operations
  operations: {
    // Save note with full app integration
    saveNote: (content: string) => Promise<void>;

    // Update indexes after content change
    updateIndexes: (content: string) => void;

    // Show notification
    notify: (message: string, type: 'success' | 'error') => void;
  };
}

/**
 * Command groups for organisation
 */
export type CommandGroup =
  | 'Format'
  | 'Insert'
  | 'Structure'
  | 'Links'
  | 'Edit'
  | 'File'
  | 'View'
  | 'Navigation'
  | 'Global';

/**
 * Individual command definition
 */
export interface Command {
  // Unique identifier
  id: string;

  // Display name
  label: string;

  // Grouping for menus
  group: CommandGroup;

  // Optional icon identifier
  icon?: string;

  // Optional keyboard shortcut hint
  shortcut?: string;

  // Condition determining if command is available
  when?: (ctx: EditorContext) => boolean;

  // Command execution
  run: (ctx: EditorContext, view: EditorView) => void | Promise<void>;

  // Optional submenu items
  children?: Command[];
}

/**
 * Registry interface
 */
export interface CommandRegistry {
  register(command: Command): void;
  unregister(commandId: string): void;
  getCommand(commandId: string): Command | undefined;
  getAllCommands(): Command[];
  getCommands(context: EditorContext): Command[];
  getCommandsByGroup(group: CommandGroup, context: EditorContext): Command[];
  executeCommand(commandId: string, context: EditorContext, view: EditorView): Promise<void>;
}
