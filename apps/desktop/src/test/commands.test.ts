import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommandRegistry } from '../commands/CommandRegistry';
import { EditorContext, Command, FileContext } from '../commands/types';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { commandRegistry } from '../commands/CommandRegistry';
import { registerFileTreeCommands } from '../commands/fileTree';
import { confirm } from '@tauri-apps/plugin-dialog';
const confirmMock = vi.mocked(confirm);

vi.mock('@tauri-apps/plugin-dialog', () => ({
    confirm: vi.fn(),
}));

// Mock EditorView and State
const mockView = {
    state: EditorState.create({ doc: 'test content' }),
    dispatch: vi.fn(),
    focus: vi.fn()
} as unknown as EditorView;

// Mock Operations
const mockOperations = {
    saveNote: vi.fn(),
    updateIndexes: vi.fn(),
    notify: vi.fn()
};

// Mock Editor Context
const mockEditorContext: EditorContext = {
    type: 'Editor',
    noteId: 'test-note',
    path: 'test.md',
    isUnsaved: false,
    editorMode: 'source',
    view: mockView,
    selection: {
        text: '',
        from: 0,
        to: 0,
        empty: true
    },
    cursor: 0,
    documentLength: 12,
    operations: mockOperations
};

// Mock File Context
const mockFileContext: FileContext = {
    type: 'FileTree',
    path: 'test.md',
    isDir: false,
    allFiles: new Set(),
    operations: {
        notify: vi.fn(),
        refreshFiles: vi.fn(),
        startRename: vi.fn(),
        deleteFileAndCleanup: vi.fn(),
        openTab: vi.fn(),
        createNote: vi.fn()
    }
};

describe('CommandRegistry', () => {
    let registry: CommandRegistry;

    beforeEach(() => {
        registry = new CommandRegistry();
        vi.clearAllMocks();
    });

    it('should register and retrieve a command', () => {
        const cmd: Command = {
            id: 'test.cmd',
            label: 'Test Command',
            context: 'Editor',
            group: 'Edit',
            run: vi.fn()
        };

        registry.register(cmd);
        expect(registry.getCommand('test.cmd')).toBe(cmd);
    });

    it('should execute a command', async () => {
        const runFn = vi.fn();
        const cmd: Command = {
            id: 'test.run',
            label: 'Run Test',
            context: 'Editor',
            group: 'Edit',
            run: runFn
        };

        registry.register(cmd);
        await registry.executeCommand('test.run', mockEditorContext);
        expect(runFn).toHaveBeenCalledWith(mockEditorContext);
    });

    it('should not execute command if condition (when) fails', async () => {
        const runFn = vi.fn();
        const cmd: Command = {
            id: 'test.when',
            label: 'When Test',
            context: 'Editor',
            group: 'Edit',
            when: (ctx) => false,
            run: runFn
        };

        registry.register(cmd);
        await registry.executeCommand('test.when', mockEditorContext);
        expect(runFn).not.toHaveBeenCalled();
    });

    it('should filter commands by context', () => {
        const cmd1: Command = {
            id: 'cmd1',
            label: 'Cmd 1',
            context: 'Editor',
            group: 'Edit',
            run: vi.fn()
        };
        const cmd2: Command = {
            id: 'cmd2',
            label: 'Cmd 2',
            context: 'Editor',
            group: 'Edit',
            when: () => false,
            run: vi.fn()
        };

        registry.register(cmd1);
        registry.register(cmd2);

        const available = registry.getCommands(mockEditorContext);
        expect(available).toHaveLength(1);
        expect(available[0].id).toBe('cmd1');
    });

    it('should STRICTLY filter commands by context type', () => {
        const editorCmd: Command = {
            id: 'editor.cmd',
            label: 'Editor Cmd',
            context: 'Editor',
            group: 'Edit',
            run: vi.fn()
        };
        const fileCmd: Command = {
            id: 'file.cmd',
            label: 'File Cmd',
            context: 'FileTree',
            group: 'File',
            run: vi.fn()
        };
        const globalCmd: Command = {
            id: 'global.cmd',
            label: 'Global Cmd',
            context: 'Global',
            group: 'Navigation',
            run: vi.fn()
        };

        registry.register(editorCmd);
        registry.register(fileCmd);
        registry.register(globalCmd);

        // Test Editor Context
        const editorCommands = registry.getCommands(mockEditorContext);
        expect(editorCommands.map(c => c.id)).toContain('editor.cmd');
        expect(editorCommands.map(c => c.id)).toContain('global.cmd');
        expect(editorCommands.map(c => c.id)).not.toContain('file.cmd');

        // Test File Context
        const fileCommands = registry.getCommands(mockFileContext);
        expect(fileCommands.map(c => c.id)).toContain('file.cmd');
        expect(fileCommands.map(c => c.id)).toContain('global.cmd');
        expect(fileCommands.map(c => c.id)).not.toContain('editor.cmd');
    });

    it('should handle execution errors gracefully', async () => {
        const cmd: Command = {
            id: 'test.error',
            label: 'Error Test',
            context: 'Editor',
            group: 'Edit',
            run: () => { throw new Error('Boom'); }
        };

        registry.register(cmd);
        await registry.executeCommand('test.error', mockEditorContext);
        expect(mockOperations.notify).toHaveBeenCalledWith(expect.stringContaining('Error executing command'), 'error');
    });

    it('should register Global commands successfully', () => {
        const cmd: Command = {
            id: 'global.test',
            label: 'Global Test',
            context: 'Global',
            group: 'File',
            shortcut: 'Ctrl+T',
            run: vi.fn()
        };

        registry.register(cmd);
        const retrieved = registry.getCommand('global.test');
        expect(retrieved).toBeDefined();
        expect(retrieved?.context).toBe('Global');
        expect(retrieved?.shortcut).toBe('Ctrl+T');
    });

    describe('fileTree.delete command', () => {
        beforeEach(() => {
            commandRegistry.unregister('fileTree.delete');
            registerFileTreeCommands();
            vi.clearAllMocks();
        });

        afterEach(() => {
            commandRegistry.unregister('fileTree.delete');
        });

        it('should not delete when user cancels', async () => {
            confirmMock.mockResolvedValue(false);
            await commandRegistry.executeCommand('fileTree.delete', mockFileContext);
            expect(confirm).toHaveBeenCalledTimes(1);
            expect(mockFileContext.operations.deleteFileAndCleanup).not.toHaveBeenCalled();
        });

        it('should delete when user confirms', async () => {
            confirmMock.mockResolvedValue(true);
            await commandRegistry.executeCommand('fileTree.delete', mockFileContext);
            expect(confirm).toHaveBeenCalledTimes(1);
            expect(mockFileContext.operations.deleteFileAndCleanup).toHaveBeenCalledWith('test.md');
        });
    });
});
