import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  Linking
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { useAppTheme } from '../hooks/use-app-theme';

interface RouteMapProps {
  address: string;
  onLocationFound?: (coords: { latitude: number; longitude: number }) => void;
  fullScreen?: boolean;
  onExit?: () => void;
}

export const RouteMap: React.FC<RouteMapProps> = ({ address, onLocationFound, fullScreen, onExit }) => {
  const { primary, background, gray900, gray700, gray600, gray100 } = useAppTheme();
  
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject['coords'] | null>(null);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  
  // Navigation State
  const [navigationSteps, setNavigationSteps] = useState<any[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState(0);
  const [totalDistanceRemaining, setTotalDistanceRemaining] = useState(0);
  const [totalDurationRemaining, setTotalDurationRemaining] = useState(0);
  
  const [isNavigating, setIsNavigating] = useState(false);
  const [watcher, setWatcher] = useState<Location.LocationSubscription | null>(null);
  
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    initMap();
    return () => {
      // Cleanup watcher on unmount
      if (watcher) {
        watcher.remove();
      }
    };
  }, [address]);

  const initMap = async () => {
    try {
      setLoading(true);
      
      // 1. Geocode destination address FIRST so we can show the map even without GPS
      const destinationCoords = await geocodeAddress(address);
      if (destinationCoords) {
        setDestination(destinationCoords);
        onLocationFound?.(destinationCoords);
      }

      // 2. Get user location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Just stop here but don't hide the map - the destination is already set
        setLoading(false);
        return;
      }

      // 3. Get current location for initial view
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);

      // 4. Fetch route from OSRM if we have both points
      if (destinationCoords) {
        await fetchRoute(location.coords, destinationCoords);
      }

    } catch (error) {
      console.error('Error initializing map:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Automatically fit both points when they become available
    if (userLocation && destination && !isNavigating && mapRef.current) {
      const zoomToPoints = () => {
        mapRef.current?.fitToCoordinates(
          [
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude: destination.latitude, longitude: destination.longitude }
          ],
          {
            edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
            animated: true,
          }
        );
      };

      // Small delay to ensure MapView is ready
      const timer = setTimeout(zoomToPoints, 1000);
      return () => clearTimeout(timer);
    }
  }, [userLocation, destination, isNavigating]);

  const geocodeAddress = async (addr: string) => {
    const tryGeocode = async (query: string) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          { headers: { 'User-Agent': 'ClickSeekers/1.0' } }
        );
        const data = await response.json();
        if (data && data.length > 0) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon)
          };
        }
        return null;
      } catch (error) {
        return null;
      }
    };

    // 1. Try full address first
    let result = await tryGeocode(addr);
    if (result) return result;

    // 2. Try cleaning up common separators (; and ,)
    const cleaned = addr.replace(/[;]/g, ',');
    result = await tryGeocode(cleaned);
    if (result) return result;

    // 3. Try street/city only (take the first 2-3 parts)
    const parts = addr.split(/[;,]/);
    if (parts.length > 2) {
      const simplified = parts.slice(0, 3).join(', ');
      result = await tryGeocode(simplified);
      if (result) return result;
    }

    // 4. Try city only (usually the last 2-3 parts before the country/zip)
    if (parts.length > 1) {
      const cityOnly = parts.slice(-3).join(', ');
      result = await tryGeocode(cityOnly);
    }
    
    return result;
  };

  const fetchRoute = async (start: any, end: any) => {
    try {
      // OSRM format: lon,lat;lon,lat - Using steps=true for turn-by-turn
      const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson&steps=true`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((coord: any) => ({
          latitude: coord[1],
          longitude: coord[0]
        }));
        setRouteCoordinates(coords);
        
        // Save steps for navigation
        const steps = route.legs[0].steps;
        setNavigationSteps(steps);
        setCurrentStepIndex(0);
        setTotalDistanceRemaining(route.distance);
        setTotalDurationRemaining(route.duration);
      } else {
        // Fallback: If OSRM can't find a driving route (e.g. over oceans), 
        // draw a straight line between points
        setRouteCoordinates([
          { latitude: start.latitude, longitude: start.longitude },
          { latitude: end.latitude, longitude: end.longitude }
        ]);
        setNavigationSteps([]);
      }
    } catch (error) {
      console.error('Routing error:', error);
      // Fallback: straight line
      setRouteCoordinates([
        { latitude: start.latitude, longitude: start.longitude },
        { latitude: end.latitude, longitude: end.longitude }
      ]);
      setNavigationSteps([]);
    }
  };

  // Haversine formula for distance calculation in meters
  const calculateDistance = (p1: any, p2: any) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = p1.latitude * Math.PI/180;
    const phi2 = p2.latitude * Math.PI/180;
    const dPhi = (p2.latitude - p1.latitude) * Math.PI/180;
    const dLambda = (p2.longitude - p1.longitude) * Math.PI/180;

    const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLambda/2) * Math.sin(dLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const getManeuverIcon = (step: any) => {
    if (!step) return "navigate";
    const { type, modifier } = step.maneuver;
    
    if (type === 'arrive') return "flag";
    if (type === 'depart') return "navigate";
    
    switch (modifier) {
      case 'right':
      case 'slight right':
      case 'sharp right':
        return "arrow-redo-outline";
      case 'left':
      case 'slight left':
      case 'sharp left':
        return "arrow-undo-outline";
      case 'uturn':
        return "refresh-outline";
      case 'straight':
        return "arrow-up-outline";
      default:
        return "navigate-outline";
    }
  };

  const getManeuverInstruction = (step: any) => {
    if (!step) return "";
    const { type, modifier } = step.maneuver;
    const name = step.name ? ` onto ${step.name}` : "";
    
    if (type === 'arrive') return "You have arrived at your destination";
    if (type === 'depart') return "Head out to start your trip";
    
    let action = "Continue";
    switch (modifier) {
      case 'right': action = "Turn right"; break;
      case 'slight right': action = "Slight right"; break;
      case 'sharp right': action = "Sharp right"; break;
      case 'left': action = "Turn left"; break;
      case 'slight left': action = "Slight left"; break;
      case 'sharp left': action = "Sharp left"; break;
      case 'uturn': action = "Make a U-turn"; break;
      case 'straight': action = "Continue straight"; break;
    }
    
    return `${action}${name}`;
  };

  const startInAppNavigation = async () => {
    try {
      // 1. Re-check permissions just in case
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const res = await Location.requestForegroundPermissionsAsync();
        status = res.status;
      }

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'You need to grant location permission to use in-app navigation.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
        return;
      }

      setIsNavigating(true);
      
      // Fetch initial route when starting navigation
      const location = await Location.getCurrentPositionAsync({});
      if (destination) {
        await fetchRoute(location.coords, destination);
      }

      // Start watching position
      const newWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          const userCoords = location.coords;
          setUserLocation(userCoords);
          
          // Navigation logic
          if (navigationSteps.length > currentStepIndex) {
            const nextStep = navigationSteps[currentStepIndex + 1] || navigationSteps[currentStepIndex];
            const nextStepLoc = {
              latitude: nextStep.maneuver.location[1],
              longitude: nextStep.maneuver.location[0]
            };
            
            const dist = calculateDistance(userCoords, nextStepLoc);
            setDistanceToNextStep(dist);
            
            // If close to next maneuver (< 20m), advance step
            if (dist < 20 && currentStepIndex < navigationSteps.length - 1) {
              setCurrentStepIndex(prev => prev + 1);
            }
          }

          // Animate camera to follow user with true navigation feel
          if (mapRef.current) {
            mapRef.current.animateCamera({
              center: {
                latitude: userCoords.latitude,
                longitude: userCoords.longitude,
              },
              pitch: 60, // Deep tilt like Google Maps
              heading: userCoords.heading ?? 0,
              altitude: 500, // Lower altitude for detail
              zoom: 19, // High zoom
            }, { duration: 1000 });
          }
        }
      );
      
      setWatcher(newWatcher);
    } catch (error: any) {
      console.error('Error starting navigation:', error);
      Alert.alert('Navigation Error', error.message || 'Could not start navigation.');
      setIsNavigating(false);
    }
  };

  const stopInAppNavigation = () => {
    if (watcher) {
      watcher.remove();
      setWatcher(null);
    }
    setIsNavigating(false);
    
    // If on a separate page, we might want to exit the page
    if (fullScreen && onExit) {
      onExit();
      return;
    }
    
    // Zoom back out to show full route
    if (userLocation && destination) {
      mapRef.current?.fitToCoordinates([userLocation, destination], {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  if (loading) {
    return (
      <View style={[fullScreen ? { flex: 1 } : styles.loadingContainer, { backgroundColor: gray100 }]}>
        <ActivityIndicator size="small" color={primary} />
        <ThemedText style={{ marginTop: 10, color: gray600 }}>Calculating route...</ThemedText>
      </View>
    );
  }

  return (
    <View style={fullScreen ? { flex: 1, backgroundColor: background } : styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: destination?.latitude || 27.7172,
          longitude: destination?.longitude || 85.3240,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onLayout={() => {
          if (userLocation && destination && !isNavigating) {
            mapRef.current?.fitToCoordinates([userLocation, destination], {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            });
          }
        }}
        provider={PROVIDER_DEFAULT}
        showsUserLocation={true}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
      >
        {destination && (
          <Marker
            coordinate={destination}
            title="Event Location"
            description={address}
            pinColor="#ef4444"
          />
        )}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={5}
            strokeColor={primary}
            lineJoin="round"
          />
        )}
      </MapView>

      {/* Navigation Overlay - Top Card */}
      {isNavigating && navigationSteps.length > 0 && (
        <View style={styles.instructionCard}>
          <View style={styles.maneuverIconContainer}>
            <Ionicons 
              name={getManeuverIcon(navigationSteps[currentStepIndex]) as any} 
              size={32} 
              color="white" 
            />
          </View>
          <View style={styles.instructionTextContainer}>
            <ThemedText weight="bold" style={styles.distanceText}>
              {distanceToNextStep > 1000 
                ? `${(distanceToNextStep / 1000).toFixed(1)} km` 
                : `${Math.round(distanceToNextStep)} m`}
            </ThemedText>
            <ThemedText style={styles.instructionText}>
              {getManeuverInstruction(navigationSteps[currentStepIndex])}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Navigation Stats - Bottom Bar */}
      {isNavigating && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <ThemedText weight="bold" style={styles.statValue}>
              {Math.ceil(totalDurationRemaining / 60)} min
            </ThemedText>
            <ThemedText style={styles.statLabel}>Arrival</ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <ThemedText weight="bold" style={styles.statValue}>
              {(totalDistanceRemaining / 1000).toFixed(1)} km
            </ThemedText>
            <ThemedText style={styles.statLabel}>Distance</ThemedText>
          </View>
          <TouchableOpacity 
            style={styles.exitButton}
            onPress={stopInAppNavigation}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {!isNavigating && (
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: primary }]}
          onPress={startInAppNavigation}
        >
          <Ionicons name="navigate" size={18} color="white" />
          <ThemedText style={styles.navButtonText} weight="bold">Start Navigation</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 10,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    height: 300,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  navButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    gap: 8,
  },
  navButtonText: {
    color: 'white',
    fontSize: 14,
  },
  userDotContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  instructionCard: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 12,
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  maneuverIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  instructionTextContainer: {
    flex: 1,
  },
  distanceText: {
    color: '#3b82f6',
    fontSize: 18,
    marginBottom: 2,
  },
  instructionText: {
    color: 'white',
    fontSize: 15,
  },
  statsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  }
});
