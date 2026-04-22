import React, { useRef, useState, useEffect } from 'react';
import {
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface WheelPickerProps {
  items: string[];
  initialItem?: string;
  onItemChange: (item: string) => void;
  height?: number;
  itemHeight?: number;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  initialItem,
  onItemChange,
  height = 150,
  itemHeight = 40,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Add padding items to top and bottom to center the middle item
  const paddingCount = Math.floor(height / itemHeight / 2);
  const paddedItems = [
    ...Array(paddingCount).fill(''),
    ...items,
    ...Array(paddingCount).fill(''),
  ];

  useEffect(() => {
    if (initialItem) {
      const index = items.indexOf(initialItem);
      if (index !== -1) {
        setSelectedIndex(index);
        // Small delay to ensure list is rendered
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: index * itemHeight,
            animated: false,
          });
        }, 100);
      }
    }
  }, [initialItem, items, itemHeight]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    
    if (index !== selectedIndex) {
      setSelectedIndex(index);
      onItemChange(items[index]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => {
    const isPadding = index < paddingCount || index >= items.length + paddingCount;
    const actualIndex = index - paddingCount;
    const isSelected = actualIndex === selectedIndex;

    if (isPadding) {
      return <View style={{ height: itemHeight }} />;
    }

    return (
      <View style={[styles.item, { height: itemHeight }]}>
        <Text
          style={[
            styles.itemText,
            isSelected ? styles.itemTextSelected : styles.itemTextUnselected,
          ]}
        >
          {item}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Selection Highlight */}
      <View
        style={[
          styles.selectionIndicator,
          {
            height: itemHeight,
            top: (height - itemHeight) / 2,
          },
        ]}
      />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{ paddingVertical: 0 }}
        scrollEventThrottle={16}
      >
        {paddedItems.map((item, index) => (
          <View key={index}>
            {renderItem({ item, index })}
          </View>
        ))}
      </ScrollView>

      {/* Fading Overlays */}
      <LinearGradient
        colors={['rgba(240, 249, 255, 1)', 'rgba(240, 249, 255, 0.4)']}
        style={[styles.overlay, styles.overlayTop, { height: (height - itemHeight) / 2 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(240, 249, 255, 0.4)', 'rgba(240, 249, 255, 1)']}
        style={[styles.overlay, styles.overlayBottom, { height: (height - itemHeight) / 2 }]}
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#f0f9ff',
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemTextSelected: {
    color: '#1e40af',
    fontSize: 17,
    fontWeight: '700',
  },
  itemTextUnselected: {
    color: '#94a3b8',
    fontSize: 14,
  },
  selectionIndicator: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  overlayTop: {
    top: 0,
  },
  overlayBottom: {
    bottom: 0,
  },
});
