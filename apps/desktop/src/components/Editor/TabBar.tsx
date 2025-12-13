import React, { useRef, useEffect, useState } from 'react';
import { Tab } from './Tab';
import { OpenTab } from '../../types/tabs';
import { ChevronDownIcon } from '../Icons';
import { useTabs } from '../../contexts/TabsContext';

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

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabId && scrollContainerRef.current) {
        // Implement scrolling later if needed
    }
  }, [activeTabId]);

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // DnD Handlers
  const handleDragStart = (e: React.DragEvent, tabId: string) => {
      setDraggedTabId(tabId);
      e.dataTransfer.effectAllowed = 'move';
      // Dim the element being dragged for visual feedback
      (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = '';
      setDraggedTabId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, targetTabId: string) => {
      e.preventDefault();
      if (!draggedTabId || draggedTabId === targetTabId) return;

      const fromIndex = tabs.findIndex(t => t.id === draggedTabId);
      const toIndex = tabs.findIndex(t => t.id === targetTabId);

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          reorderTabs(fromIndex, toIndex);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDraggedTabId(null);
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
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, tab.id)}
                onDrop={handleDrop}
                className="draggable-tab-wrapper"
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
