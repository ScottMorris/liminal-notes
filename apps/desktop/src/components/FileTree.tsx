import { FileEntry, FileNode } from "../types";
import { useState, useMemo } from "react";

interface FileTreeProps {
  files: FileEntry[];
  onFileSelect: (path: string) => void;
}

export function FileTree({ files, onFileSelect }: FileTreeProps) {
  // Build tree
  const tree = useMemo(() => {
    const root: FileNode[] = [];

    files.forEach(entry => {
      // Normalize path
      const parts = entry.path.split("/");
      let currentLevel = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const isDir = isLast ? entry.is_dir : true;

        let existing = currentLevel.find(node => node.name === part);

        if (!existing) {
          existing = {
            name: part,
            path: entry.path, // Use full relative path for leaf? No, need path for intermediate nodes?
            // Wait, for intermediate nodes, path should be the path up to that point.
            isDir: isDir,
            children: isDir ? [] : undefined,
          };
          // Correct path for intermediate nodes
          if (!isLast) {
             existing.path = parts.slice(0, index + 1).join("/");
          }

          currentLevel.push(existing);
        }

        if (isDir && existing.children) {
          currentLevel = existing.children;
        }
      });
    });

    // Sort: directories first, then files
    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.isDir === b.isDir) {
          return a.name.localeCompare(b.name);
        }
        return a.isDir ? -1 : 1;
      });
      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(root);
    return root;
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="file-tree empty-state-sidebar" style={{ padding: '20px', textAlign: 'center', color: 'var(--ln-muted)', fontStyle: 'italic' }}>
        <p style={{ margin: 0 }}>This vault is empty.</p>
      </div>
    );
  }

  return (
    <div className="file-tree">
      {tree.map(node => (
        <TreeNode key={node.path} node={node} onFileSelect={onFileSelect} />
      ))}
    </div>
  );
}

function TreeNode({ node, onFileSelect }: { node: FileNode, onFileSelect: (path: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDir) {
      setExpanded(!expanded);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <div className="tree-node">
      <div
        className={`node-label ${node.isDir ? "folder" : "file"}`}
        onClick={handleClick}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ marginRight: "5px" }}>{node.isDir ? (expanded ? "📂" : "📁") : "📄"}</span>
        {node.name}
      </div>
      {node.isDir && expanded && node.children && (
        <div className="node-children" style={{ paddingLeft: "20px" }}>
          {node.children.map(child => (
            <TreeNode key={child.path} node={child} onFileSelect={onFileSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
