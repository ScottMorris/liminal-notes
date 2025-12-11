import { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { readNote } from '../commands';
import { FileEntry, Wikilink, LinkIndex, NotePath } from '../types';

interface LinkIndexContextProps {
  linkIndex: LinkIndex;
  rebuildIndex: (files: FileEntry[]) => Promise<void>;
  updateNote: (path: NotePath, content: string) => void;
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

export const LinkIndexProvider = ({ children }: { children: ReactNode }) => {
  const [linkIndex, setLinkIndex] = useState<LinkIndex>({ outbound: new Map(), backlinks: new Map() });
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);
  const knownPathsRef = useRef<Set<string>>(new Set());

  const resolveTarget = (targetRaw: string, paths: Set<string>): NotePath | undefined => {
    // 1. If path separators, treat as relative path
    if (targetRaw.includes('/') || targetRaw.includes('\\')) {
      // Normalize slashes? Assuming unix style from backend or handling both.
      // But let's check exact match first.
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

  const rebuildIndex = async (files: FileEntry[]) => {
    setIsLoadingIndex(true);
    const mdFiles = files.filter(f => !f.is_dir && f.path.endsWith('.md'));
    const paths = new Set(mdFiles.map(f => f.path));
    knownPathsRef.current = paths;

    const newOutbound = new Map<NotePath, Wikilink[]>();
    const newBacklinks = new Map<NotePath, NotePath[]>();

    for (const file of mdFiles) {
      try {
        const content = await readNote(file.path);
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
  };

  const updateNote = (path: NotePath, content: string) => {
    const paths = knownPathsRef.current;

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
  };

  return (
    <LinkIndexContext.Provider value={{
      linkIndex,
      rebuildIndex,
      updateNote,
      resolvePath: (t) => resolveTarget(t, knownPathsRef.current),
      isLoadingIndex
    }}>
      {children}
    </LinkIndexContext.Provider>
  );
};
