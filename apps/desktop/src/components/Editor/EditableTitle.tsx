import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ContextMenu } from './ContextMenu/ContextMenu';
import { MenuModel, MenuPosition } from './ContextMenu/types';
import { sanitizeFilename } from '../../utils/sanitizeFilename';
import './EditableTitle.css';

interface EditableTitleProps {
  initialTitle: string;
  parentPath: string;
  onRename: (newName: string) => Promise<void>;
  checkExists: (filename: string) => boolean;
  disabled?: boolean;
}

export function EditableTitle({
  initialTitle,
  parentPath,
  onRename,
  checkExists,
  disabled
}: EditableTitleProps) {
  const [value, setValue] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<{ type: 'invalid' | 'collision', message: string } | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialTitle);
  }, [initialTitle]);

  const validate = (name: string): typeof error => {
    if (!name || !name.trim()) return { type: 'invalid', message: 'Name cannot be empty' };
    const invalidCharsRegex = /[<>:"/\\|?*]/;
    const match = name.match(invalidCharsRegex);
    if (match) {
        return {
            type: 'invalid',
            message: `File name cannot contain any of these characters: < > : " / \\ | ? *`
        };
    }
    if (name !== initialTitle && checkExists(name)) {
        return {
            type: 'collision',
            message: "There's already a file with the same name"
        };
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setValue(newVal);
    setError(validate(newVal));
  };

  const commit = async () => {
    const trimmed = value.trim();
    if (trimmed === initialTitle) {
        setValue(initialTitle);
        setError(null);
        return;
    }
    const validationError = validate(trimmed);
    if (validationError) {
        setValue(initialTitle);
        setError(null);
        return;
    }
    try {
        await onRename(trimmed);
    } catch (e) {
        console.error("Rename failed", e);
        setValue(initialTitle);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    commit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        inputRef.current?.blur();
    } else if (e.key === 'Escape') {
        setValue(initialTitle);
        setError(null);
        inputRef.current?.blur();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    setMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMenuAction = async (itemId: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    switch (itemId) {
        case 'cut':
            input.focus();
            if (navigator.clipboard) {
                const selection = value.substring(input.selectionStart || 0, input.selectionEnd || 0);
                await navigator.clipboard.writeText(selection);
                const newValue = value.slice(0, input.selectionStart || 0) + value.slice(input.selectionEnd || 0);
                setValue(newValue);
                setError(validate(newValue));
            }
            break;
        case 'copy':
            input.focus();
            const selection = value.substring(input.selectionStart || 0, input.selectionEnd || 0);
            if (selection) await navigator.clipboard.writeText(selection);
            break;
        case 'paste':
        case 'paste-text':
            input.focus();
            try {
                const text = await navigator.clipboard.readText();
                const sanitized = text.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
                const start = input.selectionStart || 0;
                const end = input.selectionEnd || 0;
                const newValue = value.slice(0, start) + sanitized + value.slice(end);
                setValue(newValue);
                setError(validate(newValue));
                setTimeout(() => {
                    input.selectionStart = input.selectionEnd = start + sanitized.length;
                }, 0);
            } catch (err) {
                console.error('Failed to paste', err);
            }
            break;
    }
  };

  const contextMenuModel: MenuModel = {
    sections: [
        {
            items: [
                { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X' },
                { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C' },
                { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
                { id: 'paste-text', label: 'Paste as plain text', shortcut: 'Ctrl+Shift+V' },
            ]
        }
    ]
  };

  return (
    <div className="editable-title-container">
      <input
        ref={inputRef}
        type="text"
        className="editable-title-input"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        onFocus={() => setIsEditing(true)}
        disabled={disabled}
        title={error ? error.message : "Click to rename"}
        spellCheck={false}
      />
      {error && isEditing && (
        <div className="editable-title-error-banner">
            {error.message}
        </div>
      )}
      {menuPosition && (
        <ContextMenu
            model={contextMenuModel}
            position={menuPosition}
            onClose={() => setMenuPosition(null)}
            onItemClick={handleMenuAction}
        />
      )}
    </div>
  );
}
