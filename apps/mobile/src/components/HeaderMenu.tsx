import React from 'react';
import { IconButton, Menu } from 'react-native-paper';

export interface HeaderMenuAction {
  id: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

// NOTE: We simplified the implementation. It is now a self-contained button + menu.
// The `visible` prop is managed internally.
// We accept `icon` to customize the trigger.

export function HeaderMenu({ actions, icon = "dots-vertical" }: { actions: HeaderMenuAction[], icon?: string }) {
    const [visible, setVisible] = React.useState(false);

    const openMenu = () => setVisible(true);
    const closeMenu = () => setVisible(false);

    return (
        <Menu
            visible={visible}
            onDismiss={closeMenu}
            anchor={
                <IconButton icon={icon} onPress={openMenu} />
            }
        >
            {actions.map((action) => (
                <Menu.Item
                    key={action.id}
                    onPress={() => {
                        closeMenu();
                        // Defer action slightly to allow menu close animation?
                        // Paper usually handles this well, but let's just call it.
                        action.onPress();
                    }}
                    title={action.label}
                    titleStyle={action.destructive ? { color: 'red' } : undefined}
                />
            ))}
        </Menu>
    );
}
