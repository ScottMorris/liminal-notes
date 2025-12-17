import { EditorView } from '@codemirror/view';

/**
 * Command context (scope)
 */
export type CommandContext = 'Global' | 'Editor' | 'FileTree';

/**
 * Base operations available in most contexts
 */
export interface BaseOperations {
  notify: (message: string, type: 'success' | 'error') => void;
}

/**
 * Context passed to commands when they execute or evaluate conditions
 */
export interface EditorContext {
  type: 'Editor';
  // Note info
  noteId: string;
  path: string;
  isUnsaved: boolean;

  // Editor state
  editorMode: 'source';  // Later: 'livePreview' | 'reading'

  // Editor instance (moved from run argument to context)
  view: EditorView;

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
  operations: BaseOperations & {
    // Save note with full app integration
    saveNote: (content: string) => Promise<void>;

    // Update indexes after content change
    updateIndexes: (content: string) => void;
  };
}

/**
 * Context for file tree operations
 */
export interface FileContext {
  type: 'FileTree';
  path: string;
  isDir: boolean;
  // List of all file paths in vault (useful for uniqueness checks)
  allFiles: Set<string>;

  // Operations specific to file tree
  operations: BaseOperations & {
    startRename: (path: string) => void;
    delete: (path: string) => void;
    openTab: (path: string) => void;
    createNote: (name: string) => void;
  };
}

/**
 * Union type for all contexts
 */
export type CommandContextValue = EditorContext | FileContext;

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
  | 'Navigation';

/**
 * Individual command definition
 */
export interface Command<C = any> {
  // Unique identifier
  id: string;

  // Display name
  label: string;

  // Context where command is active
  context: CommandContext;

  // Grouping for menus
  group: CommandGroup;

  // Optional icon identifier
  icon?: string;

  // Optional keyboard shortcut hint
  shortcut?: string;

  // Condition determining if command is available
  when?: (ctx: C) => boolean;

  // Command execution
  run: (ctx: C) => void | Promise<void>;

  // Optional submenu items
  children?: Command<C>[];
}

/**
 * Registry interface
 */
export interface CommandRegistry {
  register(command: Command): void;
  unregister(commandId: string): void;
  getCommand(commandId: string): Command | undefined;
  getAllCommands(): Command[];
  getCommands(context: CommandContextValue): Command[];
  getCommandsByGroup(group: CommandGroup, context: CommandContextValue): Command[];
  executeCommand(commandId: string, context: CommandContextValue): Promise<void>;
}
