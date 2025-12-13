import React, { useRef, useEffect } from 'react';
import { Tab } from './Tab';
import { OpenTab } from '../../types/tabs';

interface TabBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onTabSwitch: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onKeepTab: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabSwitch, onTabClose, onKeepTab }: TabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabId && scrollContainerRef.current) {
        // We could implement more robust scrolling logic here
    }
  }, [activeTabId]);

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="tab-bar-container">
        <div
            className="tab-bar"
            ref={scrollContainerRef}
            onWheel={handleWheel}
        >
        {tabs.map((tab) => (
            <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => onTabSwitch(tab.id)}
            onClose={() => onTabClose(tab.id)}
            onDoubleClick={() => onKeepTab(tab.id)}
            />
        ))}
        </div>
    </div>
  );
}
