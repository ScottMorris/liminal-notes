import { describe, expect, it, vi } from 'vitest';
import { closeTabsSequential, createTabContextMenuModel } from './TabBar';
import type { OpenTab } from '../../types/tabs';

describe('createTabContextMenuModel', () => {
  const tabs: OpenTab[] = [
    { id: 'a.md', title: 'A', path: 'a.md', mode: 'source', isDirty: false, isLoading: false, isUnsaved: false, isPreview: false, editorState: '' },
    { id: 'b.md', title: 'B', path: 'b.md', mode: 'source', isDirty: false, isLoading: false, isUnsaved: false, isPreview: false, editorState: '' },
    { id: 'c.md', title: 'C', path: 'c.md', mode: 'source', isDirty: false, isLoading: false, isUnsaved: false, isPreview: false, editorState: '' }
  ];

  it('builds expected tab menu entries and action hooks', () => {
    const actions = {
      closeTab: vi.fn(),
      closeTabs: vi.fn(),
      closeOtherTabs: vi.fn(),
      closeTabsToRight: vi.fn(),
      copyPath: vi.fn()
    };

    const model = createTabContextMenuModel('b.md', 'b.md', tabs, actions);
    expect(model.sections).toHaveLength(2);
    const copyItem = model.sections[0]?.items[0];
    const closeItem = model.sections[1]?.items[0];

    if (!copyItem || !closeItem || !('action' in copyItem) || !('action' in closeItem)) {
      throw new Error('Unexpected menu model shape');
    }

    copyItem.action?.();
    closeItem.action?.();

    expect(actions.copyPath).toHaveBeenCalledWith('b.md');
    expect(actions.closeTab).toHaveBeenCalledWith('b.md');
  });

  it('disables close-right when selected tab is the last tab', () => {
    const actions = {
      closeTab: vi.fn(),
      closeTabs: vi.fn(),
      closeOtherTabs: vi.fn(),
      closeTabsToRight: vi.fn(),
      copyPath: vi.fn()
    };

    const model = createTabContextMenuModel('c.md', 'c.md', tabs, actions);
    const closeRight = model.sections[1]?.items[2];
    expect(closeRight && 'disabled' in closeRight ? closeRight.disabled : undefined).toBe(true);
  });
});

describe('closeTabsSequential', () => {
  it('closes tabs in order and stops when a close is cancelled', async () => {
    const calls: string[] = [];
    const onTabClose = vi.fn(async (id: string) => {
      calls.push(id);
      return id !== 'b.md';
    });

    await closeTabsSequential(['a.md', 'b.md', 'c.md'], onTabClose);

    expect(calls).toEqual(['a.md', 'b.md']);
    expect(onTabClose).toHaveBeenCalledTimes(2);
  });
});
