import type { MenuModel } from './ContextMenu/types';

export function createPreviewContextMenuModel(
  hasSelection: boolean,
  actions: {
    copyText: () => void;
    copyHtml: () => void;
  }
): MenuModel {
  return {
    sections: [
      {
        items: [
          {
            id: 'preview.copyText',
            label: 'Copy',
            icon: 'copy',
            disabled: !hasSelection,
            action: actions.copyText
          },
          {
            id: 'preview.copyHtml',
            label: 'Copy as HTML',
            icon: 'code',
            disabled: !hasSelection,
            action: actions.copyHtml
          }
        ]
      }
    ]
  };
}
