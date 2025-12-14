import React from 'react';
import type { MenuItem as MenuItemType } from './types';
import { getIconByName } from './iconMapper';

interface MenuItemProps {
  item: MenuItemType;
  onClick: () => void;
}

export function MenuItem({ item, onClick }: MenuItemProps) {
  function handleClick(e: React.MouseEvent) {
    if (item.disabled) return;
    e.preventDefault();
    onClick();
  }

  const iconNode = getIconByName(item.icon);

  return (
    <button
      className={`menu-item ${item.disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      disabled={item.disabled}
      role="menuitem"
    >
      <span className="menu-item-icon">
        {iconNode}
      </span>
      <span className="menu-item-label">{item.label}</span>
      {item.shortcut && (
        <span className="menu-item-shortcut">{item.shortcut}</span>
      )}
      {item.children && (
        <span className="menu-item-chevron">›</span>
      )}
    </button>
  );
}
