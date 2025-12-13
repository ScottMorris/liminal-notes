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
      // Set drag image if desired, otherwise uses default ghost
  };

  const handleDragOver = (e: React.DragEvent, targetTabId: string) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
      e.preventDefault();
      if (!draggedTabId || draggedTabId === targetTabId) return;

      const fromIndex = tabs.findIndex(t => t.id === draggedTabId);
      const toIndex = tabs.findIndex(t => t.id === targetTabId);

      if (fromIndex !== -1 && toIndex !== -1) {
          reorderTabs(fromIndex, toIndex);
      }
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
                onDragOver={(e) => handleDragOver(e, tab.id)}
                onDrop={(e) => handleDrop(e, tab.id)}
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
