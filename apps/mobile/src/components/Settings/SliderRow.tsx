import React from 'react';
import Slider from '@react-native-community/slider';
import { View, Text, StyleSheet } from 'react-native';
import { SettingsRow } from './SettingsRow';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';

interface SliderRowProps {
  label: string;
  description?: string;
  settingKey: string;
  min: number;
  max: number;
  step?: number;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function SliderRow({ label, description, settingKey, min, max, step = 1 }: SliderRowProps) {
  const { settings, updateSetting } = useSettings();
  const { resolveColor } = useTheme();

  const value = getNestedValue(settings, settingKey);

  const handleValueChange = (val: number) => {
    updateSetting(settingKey, val);
  };

  const accent = resolveColor('--ln-accent');
  const fg = resolveColor('--ln-fg');

  return (
    <SettingsRow
      label={label}
      description={description}
      rightElement={
          <View style={styles.sliderContainer}>
            <Text style={[styles.valueText, { color: fg }]}>{value}</Text>
            <Slider
                style={styles.slider}
                minimumValue={min}
                maximumValue={max}
                step={step}
                value={value}
                onSlidingComplete={handleValueChange}
                minimumTrackTintColor={accent}
                maximumTrackTintColor="#ccc"
                thumbTintColor={accent}
            />
          </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  sliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: 150,
  },
  slider: {
      flex: 1,
      height: 40,
  },
  valueText: {
      width: 30,
      textAlign: 'right',
      marginRight: 8,
      fontSize: 14,
  }
});
