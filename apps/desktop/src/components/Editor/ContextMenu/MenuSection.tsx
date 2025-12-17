import React from 'react';
import type { MenuSection as MenuSectionType } from './types';
import { MenuItem } from './MenuItem';

interface MenuSectionProps {
  section: MenuSectionType;
  onItemClick: (itemId: string, action?: () => void) => void;
}

export function MenuSection({ section, onItemClick }: MenuSectionProps) {
  return (
    <div className="menu-section">
      {section.title && (
        <div className="menu-section-title">{section.title}</div>
      )}
      {section.items.map((item, idx) => {
        if ('type' in item && item.type === 'separator') {
          return <div key={idx} className="menu-separator" />;
        }

        return (
          <MenuItem
            // @ts-ignore
            key={item.id}
            // @ts-ignore
            item={item}
            onItemClick={onItemClick}
          />
        );
      })}
    </div>
  );
}
