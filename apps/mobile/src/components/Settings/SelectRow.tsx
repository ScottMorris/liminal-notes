import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsRow } from './SettingsRow';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { SettingOption } from '../../screens/Settings/schema';

interface SelectRowProps {
  label: string;
  description?: string;
  settingKey: string;
  options: SettingOption[];
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function SelectRow({ label, description, settingKey, options }: SelectRowProps) {
  const { settings, updateSetting } = useSettings();
  const { resolveColor } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const value = getNestedValue(settings, settingKey);
  const selectedOption = options.find(o => o.value === value) || options[0];

  const handleSelect = (newValue: string) => {
    updateSetting(settingKey, newValue);
    setModalVisible(false);
  };

  const bg = resolveColor('--ln-bg');
  const fg = resolveColor('--ln-fg');
  const border = resolveColor('--ln-border');

  return (
    <>
      <SettingsRow
        label={label}
        description={description}
        onPress={() => setModalVisible(true)}
        rightElement={
          <Text style={{ color: resolveColor('--ln-accent'), fontSize: 16 }}>
            {selectedOption?.label || String(value)}
          </Text>
        }
      />

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: bg }]}>
                <View style={[styles.header, { borderBottomColor: border }]}>
                    <Text style={[styles.headerTitle, { color: fg }]}>{label}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Text style={[styles.closeText, { color: resolveColor('--ln-accent') }]}>Done</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView>
                    {options.map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[styles.option, { borderBottomColor: border }]}
                            onPress={() => handleSelect(opt.value)}
                        >
                            <Text style={[
                                styles.optionText,
                                { color: fg },
                                opt.value === value && { color: resolveColor('--ln-accent'), fontWeight: 'bold' }
                            ]}>
                                {opt.label}
                            </Text>
                            {opt.value === value && (
                                <Text style={{ color: resolveColor('--ln-accent') }}>✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    height: '50%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: '600',
  },
  closeText: {
      fontSize: 16,
      fontWeight: '600',
  },
  option: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
      fontSize: 16,
  }
});
