import React, { useRef, useEffect, useState } from 'react';
import { Tab } from './Tab';
import { OpenTab } from '../../types/tabs';
import { ChevronDownIcon } from '../Icons';
import { useTabs } from '../../contexts/TabsContext';

// Preload a tiny transparent image for optional drag ghost suppression
const dragGhostImg = new Image();
let dragGhostReady = false;
dragGhostImg.onload = () => { dragGhostReady = true; };
dragGhostImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

interface TabBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onTabSwitch: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onKeepTab: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabSwitch, onTabClose, onKeepTab }: TabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const { reorderTabs } = useTabs();
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [hoverTabId, setHoverTabId] = useState<string | null>(null);
  const reorderFrame = useRef<number | null>(null);
  const pendingTargetId = useRef<string | null>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabId && scrollContainerRef.current) {
        // Implement scrolling later if needed
    }
  }, [activeTabId]);

  if (tabs.length === 0) {
      return null;
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // DnD Handlers
  const handleDragStart = (e: React.DragEvent, tabId: string) => {
      setDraggedTabId(tabId);
      // Keep drag setup minimal to avoid WebView crashes; rely on default ghost if setDragImage is unsupported.
      const dataTransfer = e.dataTransfer;
      if (dataTransfer) {
          try {
              dataTransfer.effectAllowed = 'move';
              dataTransfer.setData('text/plain', tabId);
              // Suppress giant default ghost when the preloaded image is ready
              if (dragGhostReady) {
                  dataTransfer.setDragImage(dragGhostImg, 0, 0);
              }
          } catch (err) {
              console.warn('Tab drag start failed to configure dataTransfer', err);
          }
      }
      (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = '';
      setDraggedTabId(null);
      setHoverTabId(null);
      pendingTargetId.current = null;
      if (reorderFrame.current !== null) {
          cancelAnimationFrame(reorderFrame.current);
          reorderFrame.current = null;
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      if (e.dataTransfer) {
          try {
              e.dataTransfer.dropEffect = 'move';
          } catch (err) {
              console.warn('Tab drag over failed to set dropEffect', err);
          }
      }

      const target = (e.currentTarget as HTMLElement).dataset.tabId;
      if (!target) return;

      if (pendingTargetId.current === target) return;
      pendingTargetId.current = target;
      setHoverTabId(target);

      if (reorderFrame.current === null) {
          reorderFrame.current = requestAnimationFrame(() => {
              reorderFrame.current = null;

              if (!draggedTabId || !pendingTargetId.current || draggedTabId === pendingTargetId.current) {
                  return;
              }

              const fromIndex = tabs.findIndex(t => t.id === draggedTabId);
              const toIndex = tabs.findIndex(t => t.id === pendingTargetId.current);

              if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
                  reorderTabs(fromIndex, toIndex);
              }
          });
      }
  };

  const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDragLeave = () => {
      setHoverTabId(null);
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
      e.preventDefault();
      pendingTargetId.current = null;
      if (reorderFrame.current !== null) {
          cancelAnimationFrame(reorderFrame.current);
          reorderFrame.current = null;
      }
      if (!draggedTabId || draggedTabId === targetTabId) {
          setDraggedTabId(null);
          setHoverTabId(null);
          return;
      }

      const fromIndex = tabs.findIndex(t => t.id === draggedTabId);
      const toIndex = tabs.findIndex(t => t.id === targetTabId);

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          reorderTabs(fromIndex, toIndex);
      }
      setDraggedTabId(null);
      setHoverTabId(null);
  };

  return (
    <div className="tab-bar-container">
        <div
            className="tab-bar"
            ref={scrollContainerRef}
            onWheel={handleWheel}
        >
        {tabs.map((tab) => (
            <div
                key={tab.id}
                draggable
                data-tab-id={tab.id}
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, tab.id)}
                className={`draggable-tab-wrapper ${hoverTabId === tab.id ? 'drag-over' : ''}`}
            >
                <Tab
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    onSelect={() => onTabSwitch(tab.id)}
                    onClose={(e) => {
                        e.stopPropagation(); // Stop propagation to wrapper if any
                        onTabClose(tab.id);
                    }}
                    onDoubleClick={() => onKeepTab(tab.id)}
                />
            </div>
        ))}
        </div>

        <div className="tab-overflow-menu">
            <button
                className={`overflow-btn ${isOverflowOpen ? 'active' : ''}`}
                onClick={() => setIsOverflowOpen(!isOverflowOpen)}
                title="Show all tabs"
            >
                <ChevronDownIcon size={16} />
            </button>

            {isOverflowOpen && (
                <>
                    <div className="overflow-overlay" onClick={() => setIsOverflowOpen(false)} />
                    <div className="overflow-list">
                        {tabs.map(tab => (
                            <div
                                key={tab.id}
                                className={`overflow-item ${tab.id === activeTabId ? 'active' : ''}`}
                                onClick={() => {
                                    onTabSwitch(tab.id);
                                    setIsOverflowOpen(false);
                                }}
                            >
                                <span className="overflow-title" style={tab.isPreview ? { fontStyle: 'italic' } : {}}>
                                    {tab.title}
                                </span>
                                {tab.isDirty && <span className="overflow-dirty">●</span>}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    </div>
  );
}
