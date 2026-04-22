import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteMap } from '../../components/RouteMap';
import { ThemedText } from '../../components/themed-text';
import { useAppTheme } from '../../hooks/use-app-theme';

export default function NavigationMap() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address } = useLocalSearchParams<{ address: string }>();
  const { primary, background, gray900, white } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Native-style Navigation Header */}
      <View style={[
        styles.header, 
        { 
          paddingTop: insets.top + 5,
          backgroundColor: primary 
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <ThemedText type="lg" weight="bold" style={{ color: 'white' }}>
            Navigation
          </ThemedText>
          <ThemedText type="xs" style={{ color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>
            {address}
          </ThemedText>
        </View>
      </View>

      <View style={styles.mapContainer}>
        {address ? (
          <RouteMap 
            address={address} 
            fullScreen={true} 
            onExit={() => router.back()}
          />
        ) : (
          <View style={styles.errorContainer}>
            <ThemedText>No address provided for navigation.</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  mapContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  }
});
