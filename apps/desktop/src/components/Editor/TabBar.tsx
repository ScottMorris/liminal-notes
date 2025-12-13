import React, { useRef, useEffect } from 'react';
import { Tab } from './Tab';
import { OpenTab } from '../../types/tabs';

interface TabBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onTabSwitch: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabSwitch, onTabClose }: TabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabId && scrollContainerRef.current) {
        // Simple logic: if active tab exists, ensure it's visible.
        // A full implementation would find the specific DOM element, but for now
        // we trust the user to scroll or implement a more complex `scrollIntoView` later.
        // Given we don't have refs to individual tabs easily without forwardRef, we skip auto-scroll for this MVP step
        // unless we want to querySelector by ID or similar.
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
            />
        ))}
        </div>
    </div>
  );
}
