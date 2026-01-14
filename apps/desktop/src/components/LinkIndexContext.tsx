import { createContext, useContext, useState, useRef, ReactNode, useCallback } from 'react';
import { desktopVault } from '../adapters/DesktopVaultAdapter';
import { FileEntry, Wikilink, LinkIndex, NotePath } from '../types';

interface LinkIndexContextProps {
  linkIndex: LinkIndex;
  rebuildIndex: (files: FileEntry[]) => Promise<void>;
  updateNote: (path: NotePath, content: string) => void;
  removeFile: (path: string) => void;
  updateFile: (path: string) => Promise<void>;
  resolvePath: (targetRaw: string) => NotePath | undefined;
  isLoadingIndex: boolean;
}

const LinkIndexContext = createContext<LinkIndexContextProps | undefined>(undefined);

export const useLinkIndex = () => {
  const context = useContext(LinkIndexContext);
  if (!context) {
    throw new Error('useLinkIndex must be used within a LinkIndexProvider');
  }
  return context;
};

// Helper functions moved outside to ensure stability
const resolveTarget = (targetRaw: string, paths: Set<string>): NotePath | undefined => {
  // 1. If path separators, treat as relative path
  if (targetRaw.includes('/') || targetRaw.includes('\\')) {
    let candidate = targetRaw;
    if (!candidate.endsWith('.md')) {
      candidate += '.md';
    }
    if (paths.has(candidate)) {
      return candidate;
    }
    return undefined;
  }

  // 2. Basename matching
  const candidateName = targetRaw.endsWith('.md') ? targetRaw : `${targetRaw}.md`;

  // Check exact match first (if file is in root)
  if (paths.has(candidateName)) {
    return candidateName;
  }

  // Search for any file ending with /candidateName
  // Sort paths to be deterministic
  const sortedPaths = Array.from(paths).sort();
  for (const path of sortedPaths) {
    if (path.endsWith(`/${candidateName}`)) {
      return path;
    }
  }

  return undefined;
};

const parseLinks = (source: NotePath, content: string): Wikilink[] => {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: Wikilink[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push({
      source,
      targetRaw: match[1],
      targetPath: undefined // To be resolved
    });
  }
  return links;
};

export const LinkIndexProvider = ({ children }: { children: ReactNode }) => {
  const [linkIndex, setLinkIndex] = useState<LinkIndex>({ outbound: new Map(), backlinks: new Map() });
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);
  const knownPathsRef = useRef<Set<string>>(new Set());

  const rebuildIndex = useCallback(async (files: FileEntry[]) => {
    setIsLoadingIndex(true);
    const mdFiles = files.filter(f => !f.is_dir && f.path.endsWith('.md'));
    const paths = new Set(mdFiles.map(f => f.path));
    knownPathsRef.current = paths;

    const newOutbound = new Map<NotePath, Wikilink[]>();
    const newBacklinks = new Map<NotePath, NotePath[]>();

    for (const file of mdFiles) {
      try {
        const { content } = await desktopVault.readNote(file.path);
        const links = parseLinks(file.path, content);

        links.forEach(link => {
          link.targetPath = resolveTarget(link.targetRaw, paths);
        });

        newOutbound.set(file.path, links);

        links.forEach(link => {
          if (link.targetPath) {
            const existing = newBacklinks.get(link.targetPath) || [];
            if (!existing.includes(file.path)) {
              existing.push(file.path);
            }
            newBacklinks.set(link.targetPath, existing);
          }
        });
      } catch (err) {
        console.error(`Failed to index ${file.path}:`, err);
      }
    }

    setLinkIndex({ outbound: newOutbound, backlinks: newBacklinks });
    setIsLoadingIndex(false);
  }, []);

  const updateNote = useCallback((path: NotePath, content: string) => {
    const paths = knownPathsRef.current;
    if (!paths.has(path)) {
      paths.add(path);
    }

    // Parse new links
    const newLinks = parseLinks(path, content);
    newLinks.forEach(link => {
      link.targetPath = resolveTarget(link.targetRaw, paths);
    });

    setLinkIndex(prev => {
      const nextOutbound = new Map(prev.outbound);
      const nextBacklinks = new Map(prev.backlinks);

      // Remove old backlinks from this source
      const oldLinks = nextOutbound.get(path) || [];
      oldLinks.forEach(link => {
        if (link.targetPath) {
          const backlinkList = nextBacklinks.get(link.targetPath) || [];
          const filtered = backlinkList.filter(p => p !== path);
          if (filtered.length > 0) {
            nextBacklinks.set(link.targetPath, filtered);
          } else {
            nextBacklinks.delete(link.targetPath);
          }
        }
      });

      // Update outbound
      nextOutbound.set(path, newLinks);

      // Add new backlinks
      newLinks.forEach(link => {
        if (link.targetPath) {
          const backlinkList = nextBacklinks.get(link.targetPath) || [];
          if (!backlinkList.includes(path)) {
            backlinkList.push(path);
          }
          nextBacklinks.set(link.targetPath, backlinkList);
        }
      });

      return { outbound: nextOutbound, backlinks: nextBacklinks };
    });
  }, []);

  const removeFile = useCallback((path: string) => {
    knownPathsRef.current.delete(path);
    setLinkIndex(prev => {
      const nextOutbound = new Map(prev.outbound);
      const nextBacklinks = new Map(prev.backlinks);

      // Remove outbound links from this file
      const oldLinks = nextOutbound.get(path) || [];
      oldLinks.forEach(link => {
         if (link.targetPath) {
             const backlinkList = nextBacklinks.get(link.targetPath) || [];
             const filtered = backlinkList.filter(p => p !== path);
             if (filtered.length > 0) {
                 nextBacklinks.set(link.targetPath, filtered);
             } else {
                 nextBacklinks.delete(link.targetPath);
             }
         }
      });
      nextOutbound.delete(path);

      // Remove backlinks pointing TO this file?
      // For now, we keep them but they might point to a ghost.
      // Ideally we re-resolve all backlinks that might have depended on this file.
      // But that's expensive. Let's just remove the file from indices.
      nextBacklinks.delete(path);

      return { outbound: nextOutbound, backlinks: nextBacklinks };
    });
  }, []);

  const updateFile = useCallback(async (path: string) => {
    try {
        if (!path.endsWith('.md')) return;
        const { content } = await desktopVault.readNote(path);
        updateNote(path, content);
    } catch (err) {
        console.warn(`[LinkIndex] Failed to update file ${path}:`, err);
    }
  }, [updateNote]);

  const resolvePath = useCallback((targetRaw: string) => {
    return resolveTarget(targetRaw, knownPathsRef.current);
  }, []);

  return (
    <LinkIndexContext.Provider value={{
      linkIndex,
      rebuildIndex,
      updateNote,
      removeFile,
      updateFile,
      resolvePath,
      isLoadingIndex
    }}>
      {children}
    </LinkIndexContext.Provider>
  );
};
