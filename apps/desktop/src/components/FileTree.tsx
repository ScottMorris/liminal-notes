import { FileEntry, FileNode } from "../types";
import { useState, useMemo, useEffect, useRef } from "react";
import { ContextMenu } from "./Editor/ContextMenu/ContextMenu";
import { buildContextMenu } from "./Editor/ContextMenu/menuBuilder";
import { commandRegistry } from "../commands/CommandRegistry";
import type { MenuModel, MenuPosition } from "./Editor/ContextMenu/types";
import type { FileContext } from "../commands/types";
import { useTabs } from "../contexts/TabsContext";
import { FolderIcon, FolderOpenIcon, DocumentTextIcon, PhotoIcon, CodeBracketIcon } from "./Icons";

interface FileTreeProps {
  files: FileEntry[];
  onFileSelect: (path: string, isDoubleClick: boolean) => void;
  editingPath?: string | null;
  isCreating?: boolean;
  onRename?: (oldPath: string, newName: string) => void;
  onCreate?: (name: string) => void;
  onStartCreate?: () => void;
  onCancel?: () => void;
  onDelete?: (path: string) => void;
  onStartRename?: (path: string) => void;
  onRefresh?: () => Promise<void>;
}

interface DisplayNode extends FileNode {
  isTemp?: boolean;
}

export function FileTree({
  files,
  onFileSelect,
  editingPath,
  isCreating,
  onRename,
  onCreate,
  onStartCreate,
  onCancel,
  onDelete,
  onStartRename,
  onRefresh
}: FileTreeProps) {
  const { openTab } = useTabs();
  const [selectedNode, setSelectedNode] = useState<DisplayNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    model: MenuModel;
    position: MenuPosition;
    context: FileContext;
  } | null>(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleMenuItemClick = async (id: string, action?: () => void) => {
    try {
      if (action) {
        action();
        return;
      }

      if (!contextMenu) return;

      await commandRegistry.executeCommand(id, contextMenu.context);
    } catch (err) {
      console.error('Failed to run context menu action', err);
    }
  };

  const tree = useMemo(() => {
    const root: DisplayNode[] = [];

    files.forEach(entry => {
      const parts = entry.path.split("/");
      let currentLevel = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const isDir = isLast ? entry.is_dir : true;

        let existing = currentLevel.find(node => node.name === part);

        if (!existing) {
          existing = {
            name: part,
            path: entry.path,
            isDir: isDir,
            children: isDir ? [] : undefined,
          };
          if (!isLast) {
             existing.path = parts.slice(0, index + 1).join("/");
          }

          currentLevel.push(existing);
        }

        if (isDir && existing.children) {
          currentLevel = existing.children as DisplayNode[];
        }
      });
    });

    const sortNodes = (nodes: DisplayNode[]) => {
      nodes.sort((a, b) => {
        if (a.isDir === b.isDir) {
          return a.name.localeCompare(b.name);
        }
        return a.isDir ? -1 : 1;
      });
      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children as DisplayNode[]);
        }
      });
    };

    sortNodes(root);

    if (isCreating) {
      root.unshift({
        name: "",
        path: "___creating___",
        isDir: false,
        isTemp: true
      });
    }

    return root;
  }, [files, isCreating]);

  const buildContext = (node: DisplayNode): FileContext => ({
    type: 'FileTree',
    path: node.path,
    isDir: node.isDir,
    allFiles: new Set(files.map(f => f.path)),
    operations: {
      notify: (msg, type) => {
        console.log(`[${type}] ${msg}`);
      },
      refreshFiles: async () => {
        if (onRefresh) await onRefresh();
      },
      startRename: (path) => {
        if (onStartRename) onStartRename(path);
      },
      deleteFileAndCleanup: async (path) => {
        if (onDelete) await onDelete(path);
      },
      createNote: (name) => {},
      openTab: (path) => {
        const name = path.split('/').pop() || 'Untitled';
        openTab({
          id: path,
          title: name.replace(/\.md$/, ''),
          path: path,
          isDirty: false,
          isPreview: false,
        mode: 'source',
        isLoading: false,
        isUnsaved: false,
        editorState: '',
        });
      }
    }
  });

  const handleNodeContextMenu = (e: React.MouseEvent, node: DisplayNode) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNode(node);

    const context = buildContext(node);

    const model = buildContextMenu(context, commandRegistry);
    if (model.sections.length > 0) {
      setContextMenu({
        model,
        position: { x: e.clientX, y: e.clientY },
        context
      });
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && selectedNode) {
      e.preventDefault();
      const context = buildContext(selectedNode);
      await commandRegistry.executeCommand('fileTree.delete', context);
    }
  };

  if (files.length === 0 && !isCreating) {
    return (
      <div className="file-tree empty-state-sidebar" style={{ padding: '20px', textAlign: 'center', color: 'var(--ln-muted)' }}>
        <p style={{ margin: "0 0 15px 0", fontStyle: 'italic' }}>This vault is empty.</p>
        {onStartCreate && (
           <button
             onClick={onStartCreate}
             style={{
               background: 'var(--ln-bg)',
               border: '1px solid var(--ln-border)',
               color: 'var(--ln-fg)',
               padding: '5px 10px',
               borderRadius: '4px',
               cursor: 'pointer'
             }}
           >
             Create Note
           </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className="file-tree"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {tree.map(node => (
          <TreeNode
            key={node.path}
            node={node}
            onFileSelect={onFileSelect}
            editingPath={editingPath}
            onRename={onRename}
            onCreate={onCreate}
            onCancel={onCancel}
            onContextMenu={handleNodeContextMenu}
            onSelect={setSelectedNode}
          />
        ))}
      </div>
      {contextMenu && (
        <ContextMenu
          model={contextMenu.model}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onItemClick={handleMenuItemClick}
        />
      )}
    </>
  );
}

interface TreeNodeProps {
  node: DisplayNode;
  onFileSelect: (path: string, isDoubleClick: boolean) => void;
  editingPath?: string | null;
  onRename?: (oldPath: string, newName: string) => void;
  onCreate?: (name: string) => void;
  onCancel?: () => void;
  onContextMenu: (e: React.MouseEvent, node: DisplayNode) => void;
  onSelect: (node: DisplayNode) => void;
}

function getExtension(filename: string): string {
    // Handle hidden files with no extension (e.g. .gitignore)
    if (filename.startsWith('.') && filename.indexOf('.', 1) === -1) {
        return '';
    }

    const parts = filename.split('.');
    if (parts.length > 1) {
        return parts.pop() || '';
    }
    return '';
}

function stripExtension(filename: string): string {
    // Handle hidden files with no extension (e.g. .gitignore)
    if (filename.startsWith('.') && filename.indexOf('.', 1) === -1) {
        return filename;
    }

    const parts = filename.split('.');
    if (parts.length > 1) {
        parts.pop();
        return parts.join('.');
    }
    return filename;
}

function TreeNode({ node, onFileSelect, editingPath, onRename, onCreate, onCancel, onContextMenu, onSelect }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const isEditing = editingPath === node.path;
  const isTemp = node.isTemp;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
    if (node.isDir) {
      setExpanded(!expanded);
    } else {
      onFileSelect(node.path, e.detail === 2);
    }
  };

  const extension = getExtension(node.name).toLowerCase();
  const isMd = extension === 'md' || extension === 'markdown' || extension === 'txt';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(extension);
  const isCode = ['js', 'ts', 'tsx', 'jsx', 'json', 'css', 'html', 'py', 'rs', 'go', 'java', 'c', 'cpp'].includes(extension);

  let IconComponent = DocumentTextIcon;
  if (node.isDir) {
    IconComponent = expanded ? FolderOpenIcon : FolderIcon;
  } else if (isImage) {
    IconComponent = PhotoIcon;
  } else if (isCode) {
    IconComponent = CodeBracketIcon;
  }

  if (isEditing || isTemp) {
      return (
          <div className="tree-node">
              <NodeInput
                initialValue={isEditing ? stripExtension(node.name) : ""}
                isDir={node.isDir}
                originalExtension={isEditing ? getExtension(node.name) : undefined}
                onSubmit={(val) => {
                    if (isTemp && onCreate) onCreate(val);
                    else if (isEditing && onRename) {
                        const originalExt = getExtension(node.name);
                        const newName = originalExt ? `${val}.${originalExt}` : val;
                        onRename(node.path, newName);
                    }
                }}
                onCancel={() => onCancel && onCancel()}
              />
          </div>
      );
  }

  return (
    <div className="tree-node">
      <div
        className={`node-label ${node.isDir ? "folder" : "file"}`}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
        style={{ cursor: "pointer", userSelect: "none", display: 'flex', alignItems: 'center' }}
      >
        <span style={{ marginRight: "6px", display: 'flex', color: 'var(--ln-muted)' }}>
          <IconComponent size={16} />
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stripExtension(node.name)}
        </span>
        {!node.isDir && !isMd && extension && (
            <span style={{
                fontSize: '0.7em',
                color: 'var(--ln-muted)',
                marginLeft: '8px',
                border: '1px solid var(--ln-border)',
                borderRadius: '3px',
                padding: '0 3px',
                opacity: 0.7
            }}>
                {extension.toUpperCase()}
            </span>
        )}
      </div>
      {node.isDir && expanded && node.children && (
        <div className="node-children" style={{ paddingLeft: "20px" }}>
          {node.children.map(child => (
            <TreeNode
                key={child.path}
                node={child as DisplayNode}
                onFileSelect={onFileSelect}
                editingPath={editingPath}
                onRename={onRename}
                onCreate={onCreate}
                onCancel={onCancel}
                onContextMenu={onContextMenu}
                onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NodeInput({ initialValue, isDir, originalExtension, onSubmit, onCancel }: { initialValue: string, isDir: boolean, originalExtension?: string, onSubmit: (val: string) => void, onCancel: () => void }) {
    const [val, setVal] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
            if (val.trim()) onSubmit(val.trim());
            else onCancel();
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
        }
    };

    let IconComponent = isDir ? FolderIcon : DocumentTextIcon;

    return (
        <div className="node-label" onClick={(e) => e.stopPropagation()} style={{ cursor: 'default', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: "6px", display: 'flex', color: 'var(--ln-muted)' }}>
                <IconComponent size={16} />
            </span>
            <input
                ref={inputRef}
                type="text"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={(e) => {
                    e.stopPropagation();
                    setTimeout(() => onCancel(), 100);
                }}
                style={{
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    border: '1px solid var(--ln-accent)',
                    outline: 'none',
                    padding: '2px 4px',
                    borderRadius: '2px',
                    width: '100%',
                    background: 'var(--ln-bg)',
                    color: 'var(--ln-fg)'
                }}
            />
        </div>
    );
}
