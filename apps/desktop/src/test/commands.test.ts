import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandRegistry } from '../commands/CommandRegistry';
import { EditorContext, Command } from '../commands/types';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

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

// Mock Context
const mockContext: EditorContext = {
    noteId: 'test-note',
    path: 'test.md',
    isUnsaved: false,
    editorMode: 'source',
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
        await registry.executeCommand('test.run', mockContext, mockView);
        expect(runFn).toHaveBeenCalledWith(mockContext, mockView);
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
        await registry.executeCommand('test.when', mockContext, mockView);
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

        const available = registry.getCommands(mockContext);
        expect(available).toHaveLength(1);
        expect(available[0].id).toBe('cmd1');
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
        await registry.executeCommand('test.error', mockContext, mockView);
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
});
