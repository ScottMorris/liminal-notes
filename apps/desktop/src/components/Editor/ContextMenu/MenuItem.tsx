import React, { useState, useRef, useEffect } from 'react';
import type { MenuItem as MenuItemType } from './types';
import { Submenu } from './Submenu';
import { getIconByName } from './iconMapper';

interface MenuItemProps {
  item: MenuItemType;
  onClick: () => void;
}

export function MenuItem({ item, onClick }: MenuItemProps) {
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [submenuTimer, setSubmenuTimer] = useState<number | null>(null);
  const itemRef = useRef<HTMLButtonElement>(null);

  const hasSubmenu = item.children && item.children.length > 0;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (submenuTimer) clearTimeout(submenuTimer);
    };
  }, [submenuTimer]);

  function handleClick(e: React.MouseEvent) {
    if (item.disabled) return;
    e.preventDefault();
    e.stopPropagation();

    if (hasSubmenu) {
        setShowSubmenu(true);
        return;
    }

    onClick();
  }

  function handleMouseEnter() {
    if (!hasSubmenu) return;

    if (submenuTimer !== null) {
      clearTimeout(submenuTimer);
      setSubmenuTimer(null);
    }

    const timer = window.setTimeout(() => {
      setShowSubmenu(true);
    }, 250);

    setSubmenuTimer(timer);
  }

  function handleMouseLeave() {
    if (!hasSubmenu) return;

    if (submenuTimer !== null) {
      clearTimeout(submenuTimer);
      setSubmenuTimer(null);
    }

    const timer = window.setTimeout(() => {
      setShowSubmenu(false);
    }, 300);

    setSubmenuTimer(timer);
  }

  const handleSubmenuEnter = () => {
    // We are inside the submenu, cancel any close timer from leaving the parent item
    if (submenuTimer) clearTimeout(submenuTimer);
    setSubmenuTimer(null);
    setShowSubmenu(true);
  };

  const handleSubmenuLeave = () => {
    // Leaving the submenu, start close timer
    // (If they move back to parent item, parent's enter will cancel this)
    const timer = window.setTimeout(() => {
      setShowSubmenu(false);
    }, 300);
    setSubmenuTimer(timer);
  };

  const iconNode = getIconByName(item.icon);

  return (
    <>
      <button
        ref={itemRef}
        className={`menu-item ${item.disabled ? 'disabled' : ''} ${hasSubmenu ? 'has-submenu' : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={item.disabled}
        role="menuitem"
        aria-haspopup={hasSubmenu}
        aria-expanded={hasSubmenu ? showSubmenu : undefined}
      >
        <span className="menu-item-icon">
          {iconNode}
        </span>
        <span className="menu-item-label">{item.label}</span>
        {item.shortcut && (
          <span className="menu-item-shortcut">{item.shortcut}</span>
        )}
        {hasSubmenu && (
          <span className="menu-item-chevron">›</span>
        )}
      </button>

      {hasSubmenu && showSubmenu && itemRef.current && (
        <Submenu
          items={item.children!}
          parentRect={itemRef.current.getBoundingClientRect()}
          onItemClick={onClick}
          onClose={() => setShowSubmenu(false)}
          onMouseEnter={handleSubmenuEnter}
          onMouseLeave={handleSubmenuLeave}
        />
      )}
    </>
  );
}
