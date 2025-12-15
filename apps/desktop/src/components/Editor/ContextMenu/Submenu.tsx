import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MenuItem as MenuItemType } from './types';
import { MenuItem } from './MenuItem';

interface SubmenuProps {
  items: MenuItemType[];
  parentRect: DOMRect;
  onItemClick: (itemId: string) => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function Submenu({
  items,
  parentRect,
  onItemClick,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: SubmenuProps) {
  const submenuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Position submenu relative to parent
  useEffect(() => {
    if (!submenuRef.current) return;

    const menu = submenuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Start position: right of parent, aligned with top
    let x = parentRect.right - 4;
    let y = parentRect.top - 4;

    // Check if submenu would overflow right
    if (x + rect.width > viewport.width) {
      // Flip to left side of parent
      x = parentRect.left - rect.width + 4;
    }

    // Check if submenu would overflow bottom
    if (y + rect.height > viewport.height) {
      // Shift up to fit
      y = Math.max(8, viewport.height - rect.height - 8);
    }

    // Ensure not off top
    y = Math.max(8, y);

    setPosition({ x, y });
  }, [parentRect]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (submenuRef.current && !submenuRef.current.contains(e.target as Node)) {
        // Parent menu handling suffices
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
      ref={submenuRef}
      className="submenu"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      role="menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map(item => (
        <MenuItem
          key={item.id}
          item={item}
          onItemClick={onItemClick}
        />
      ))}
    </div>,
    document.body
  );
}
