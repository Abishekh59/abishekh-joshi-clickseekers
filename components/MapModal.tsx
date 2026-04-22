import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  SafeAreaView
} from 'react-native';
import { ThemedText } from './themed-text';
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/use-app-theme';

interface MapModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (address: string, coordinates: { lat: number; lng: number }) => void;
  initialLocation?: string;
}

const DEFAULT_REGION: Region = {
  latitude: 27.7172,
  longitude: 85.3240,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function MapModal({ visible, onClose, onSelectLocation, initialLocation }: MapModalProps) {
  const { primary, background, gray900, gray700, gray600, gray500, gray400, gray100 } = useAppTheme();
  const Text = ThemedText;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<any>(null);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);

  useEffect(() => {
    if (searchQuery.length > 2) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        fetchRecommendations();
      }, 500);
    } else {
      setRecommendations([]);
      setShowRecommendations(false);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=np&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        const mappedData = data.map((item: any) => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon)
        }));
        setRecommendations(mappedData);
        setShowRecommendations(mappedData.length > 0);
      }
    } catch (error) {
      console.error('Recommendations error:', error);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const address = data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
      
      setSelectedLocation({
        address,
        lat,
        lng
      });
    } catch (err) {
      console.error('Reverse geocode error:', err);
      setSelectedLocation({
        address: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
        lat,
        lng
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    reverseGeocode(latitude, longitude);
  };

  const handleSelectRecommendation = (item: any) => {
    const lat = item.lat;
    const lng = item.lon;
    const address = item.display_name;

    const newRegion = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };

    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1000);
    setSelectedLocation({ address, lat, lng });
    setSearchQuery(item.display_name);
    setShowRecommendations(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setShowRecommendations(false);

    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=np`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const address = result.display_name;

        const newRegion = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };

        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        setSelectedLocation({ address, lat, lng });
      } else {
        Alert.alert('Not Found', 'Location not found. Please try a different search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search location.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelectLocation(selectedLocation.address, {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng
      });
      onClose();
    } else {
      Alert.alert('Selection Required', 'Please select a location on the map first.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.container, { backgroundColor: background }]}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={[styles.header, { borderBottomColor: gray100 }]}>
              <Text style={[styles.headerTitle, { color: gray900 }]}>Select Location</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={gray900} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
              <View style={[styles.searchContainer, { backgroundColor: background }]}>
                <View style={[styles.searchInputWrapper, { backgroundColor: gray100 }]}>
                  <Ionicons name="search" size={20} color={gray400} style={styles.searchIcon} />
                  <TextInput
                    style={[styles.searchInput, { color: gray900 }]}
                    placeholder="Search location..."
                    placeholderTextColor={gray400}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                  />
                </View>
                <TouchableOpacity onPress={handleSearch} style={[styles.searchButton, { backgroundColor: primary }]}>
                  <Text style={styles.searchButtonText}>Search</Text>
                </TouchableOpacity>
              </View>

              {showRecommendations && (
                <View style={[styles.recommendationsList, { backgroundColor: background, borderColor: gray100 }]}>
                  {recommendations.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.recommendationItem, { borderBottomColor: gray100 }]}
                      onPress={() => handleSelectRecommendation(item)}
                    >
                      <Ionicons name="location-outline" size={18} color={gray600} style={{ marginRight: 10 }} />
                      <Text style={[styles.recommendationText, { color: gray700 }]} numberOfLines={1}>
                        {item.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.mapWrapper}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={DEFAULT_REGION}
                onPress={handleMapPress}
                provider={PROVIDER_DEFAULT}
              >
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.lat,
                      longitude: selectedLocation.lng,
                    }}
                    title="Selected Location"
                    description={selectedLocation.address}
                  />
                )}
              </MapView>
              {loading && (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" color={primary} />
                </View>
              )}
            </View>

            <View style={[styles.footer, { backgroundColor: background, borderTopColor: gray100 }]}>
              <View style={[styles.selectedAddressContainer, { backgroundColor: primary + '10' }]}>
                <Ionicons name="location" size={20} color={primary} />
                <Text style={[styles.addressText, { color: gray900 }]} numberOfLines={2}>
                  {selectedLocation?.address || 'Tap on map to select location'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.confirmButton, 
                  { backgroundColor: primary },
                  !selectedLocation && { backgroundColor: gray400 }
                ]}
                onPress={handleConfirm}
                disabled={!selectedLocation}
              >
                <Text style={styles.confirmButtonText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 5,
  },
  searchWrapper: {
    zIndex: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  searchButton: {
    borderRadius: 12,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  recommendationsList: {
    position: 'absolute',
    top: 75,
    left: 15,
    right: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  map: {
    flex: 1,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  selectedAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 12,
    borderRadius: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  confirmButton: {
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

