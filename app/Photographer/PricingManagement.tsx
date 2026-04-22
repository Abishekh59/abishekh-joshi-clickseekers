import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/themed-text';
import { useAppTheme } from '../../hooks/use-app-theme';
import { API_BASE_URL, ApiResponse } from '../../services/api';
import { storage } from '../../utils/storage';

interface Package {
  package_id: number;
  name: string;
  price: number;
  description?: string | null;
  features: string[];
  duration?: string;
}

interface PricingManagementProps {
  onBack?: () => void;
}

export default function PricingManagement({ onBack }: PricingManagementProps) {
  const {
    primary,
    background,
    gray900,
    gray700,
    gray600,
    gray500,
    gray400,
    gray300,
    gray200,
    gray100,
    white,
    success,
    warning,
    error: errorColor,
    info
  } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch packages for the logged-in photographer
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const user = await storage.getUser();
        const token = await storage.getToken();
        if (!user || !user.user_id) {
          Alert.alert('Error', 'User not found. Please login again.');
          setLoading(false);
          return;
        }
        const res: ApiResponse<Package[]> = await fetch(
          `${API_BASE_URL}/packages/photographer/${user.user_id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        ).then(r => r.json());
        if (res.success && Array.isArray(res.data)) {
          setPackages(
            res.data.map(pkg => ({
              ...pkg,
              features:
                typeof pkg.features === 'string'
                  ? (pkg.features as string).split(',').map(f => f.trim())
                  : Array.isArray(pkg.features)
                    ? pkg.features
                    : [],
            }))
          );
        } else {
          setPackages([]);
        }
      } catch (e) {
        setPackages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const [editingPackage, setEditingPackage] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Package | null>(null);
  const [newPackage, setNewPackage] = useState<Package>({
    package_id: Date.now(),
    name: '',
    price: 0,
    duration: '',
    features: ['']
  });
  const [priceInputStr, setPriceInputStr] = useState('');

  const handleAddPackage = async () => {
    if (!newPackage.name || !newPackage.price || !newPackage.duration) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (newPackage.price < 0) {
      Alert.alert('Validation Error', 'Price cannot be negative');
      return;
    }
    try {
      const user = await storage.getUser();
      const token = await storage.getToken();
      const res = await fetch(`${API_BASE_URL}/packages/createPackage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPackage.name,
          description: newPackage.description || '',
          price: newPackage.price,
          features: newPackage.features,
          duration: newPackage.duration || '',
        }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setPackages([...packages, {
          ...result.data,
          features:
            typeof result.data.features === 'string'
              ? (result.data.features as string).split(',').map(f => f.trim())
              : Array.isArray(result.data.features)
                ? result.data.features
                : [],
        }]);
        Alert.alert('Success', 'Package added successfully');
        setShowAddModal(false);
        setPriceInputStr('');
        setNewPackage({
          package_id: Date.now(),
          name: '',
          price: 0,
          duration: '',
          features: ['']
        });
      } else {
        Alert.alert('Error', result.message || 'Failed to add package');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to add package');
    }
  };

  const handleEditPackage = (id: number) => {
    const packageToEdit = packages.find((pkg) => pkg.package_id === id);
    if (packageToEdit) {
      setEditFormData({ ...packageToEdit });
      setPriceInputStr(packageToEdit.price.toString());
      setEditingPackage(id);
    }
  };

  const handleSaveEdit = async () => {
    if (editFormData && editingPackage !== null) {
      if (editFormData.price < 0) {
        Alert.alert('Validation Error', 'Price cannot be negative');
        return;
      }
      try {
        const token = await storage.getToken();
        const res = await fetch(`${API_BASE_URL}/packages/${editingPackage}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editFormData.name,
            description: editFormData.description || '',
            price: editFormData.price,
            features: editFormData.features,
            duration: editFormData.duration || '',
          }),
        });
        const result = await res.json();
        if (result.success && result.data) {
          const updatedPackages = packages.map((pkg) =>
            pkg.package_id === editingPackage ? {
              ...result.data,
              features:
                typeof result.data.features === 'string'
                  ? (result.data.features as string).split(',').map(f => f.trim())
                  : Array.isArray(result.data.features)
                    ? result.data.features
                    : [],
            } : pkg
          );
          setPackages(updatedPackages);
          Alert.alert('Success', 'Package updated successfully');
        } else {
          Alert.alert('Error', result.message || 'Failed to update package');
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to update package');
      }
      setEditingPackage(null);
      setEditFormData(null);
      setPriceInputStr('');
    }
  };

  const handleDeletePackage = async (id: number) => {
    Alert.alert('Delete Package', 'Are you sure you want to delete this package?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const token = await storage.getToken();
            const res = await fetch(`${API_BASE_URL}/packages/${id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });
            const result = await res.json();
            if (result.success) {
              setPackages(packages.filter((pkg) => pkg.package_id !== id));
              Alert.alert('Success', 'Package deleted successfully');
            } else {
              Alert.alert('Error', result.message || 'Failed to delete package');
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to delete package');
          }
        },
        style: 'destructive'
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View style={[styles.header, { borderBottomColor: gray200, backgroundColor: white, paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={{ padding: 8, marginRight: 8 }}>
                <Ionicons name="chevron-back" size={24} color={gray900} />
              </TouchableOpacity>
            )}
            <ThemedText type="xl" weight="bold" style={{ color: gray900 }}>Pricing Packages</ThemedText>
          </View>
          <TouchableOpacity
            testID="add-package-button"
            style={[styles.addButton, { backgroundColor: primary }]}
            onPress={() => {
              setPriceInputStr('');
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={24} color={white} />
          </TouchableOpacity>
        </View>
        <ThemedText type="xs" style={[styles.headerSubtitle, { color: gray500 }]}>Manage your photography packages and pricing</ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.packagesList}>
          {loading ? (
            <ActivityIndicator size="large" color={primary} style={{ marginTop: 40 }} />
          ) : packages.length === 0 ? (
            <ThemedText style={{ textAlign: 'center', color: gray500, marginVertical: 24 }}>No packages found.</ThemedText>
          ) : (
            packages.map((pkg) => (
              <View key={pkg.package_id} style={[styles.packageCard, { backgroundColor: white, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }]}>
                <View style={styles.packageHeader}>
                  <View style={styles.packageTitleSection}>
                    <View style={styles.packageTitleRow}>
                      <ThemedText weight="bold" style={[styles.packageName, { color: gray900 }]}>{pkg.name}</ThemedText>
                    </View>
                    {pkg.duration && <ThemedText type="xs" style={[styles.packageDuration, { color: gray600 }]}>{pkg.duration}</ThemedText>}
                  </View>
                  <View style={styles.packageActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn]}
                      onPress={() => handleEditPackage(pkg.package_id)}
                    >
                      <Ionicons name="pencil" size={18} color={info} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn]}
                      onPress={() => handleDeletePackage(pkg.package_id)}
                    >
                      <Ionicons name="trash" size={18} color={errorColor} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.packagePrice, { borderTopWidth: 1, borderTopColor: gray100, paddingTop: 12, marginTop: 4 }]}>
                  <ThemedText weight="bold" style={[styles.priceValue, { color: primary }]}>NPR {pkg.price.toLocaleString()}</ThemedText>
                </View>

                <View style={styles.featuresList}>
                  {pkg.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={14} color={success} />
                      <ThemedText type="xs" style={[styles.featureText, { color: gray600 }]}>{feature}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={[styles.addPackageBtn, { borderColor: gray300, backgroundColor: gray100 }]}
          onPress={() => {
            setPriceInputStr('');
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add" size={20} color={gray600} />
          <ThemedText weight="bold" style={[styles.addPackageBtnText, { color: gray600 }]}>Add New Package</ThemedText>
        </TouchableOpacity>

        <View style={[styles.tipsCard, { backgroundColor: info + '10', borderColor: info + '30' }]}>
          <ThemedText weight="bold" style={[styles.tipsTitle, { color: info }]}>💡 Pricing Tips</ThemedText>
          <View style={styles.tipsList}>
            <ThemedText type="xs" style={[styles.tipsItem, { color: gray700 }]}>• Research competitor pricing in your area</ThemedText>
            <ThemedText type="xs" style={[styles.tipsItem, { color: gray700 }]}>• Consider your experience level and portfolio quality</ThemedText>
            <ThemedText type="xs" style={[styles.tipsItem, { color: gray700 }]}>• Offer package deals to increase bookings</ThemedText>
            <ThemedText type="xs" style={[styles.tipsItem, { color: gray700 }]}>• Update pricing based on demand and season</ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* Add Package Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: background }]}>
            <ThemedText type="lg" weight="bold" style={[styles.modalTitle, { color: gray900 }]}>Add New Package</ThemedText>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
              <View style={styles.formGroup}>
                <ThemedText type="xs" weight="bold" style={[styles.formLabel, { color: gray700 }]}>Package Name</ThemedText>
                <TextInput
                  testID="package-name-input"
                  style={[styles.formInput, { color: gray900, borderColor: gray200, backgroundColor: gray100 }]}
                  placeholder="e.g., Gold Package"
                  placeholderTextColor={gray400}
                  value={newPackage.name}
                  onChangeText={(text) => setNewPackage({ ...newPackage, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="xs" weight="bold" style={[styles.formLabel, { color: gray700 }]}>Price (NPR)</ThemedText>
                <View style={styles.priceInputWrapper}>
                  <ThemedText weight="bold" style={[styles.pricePrefix, { color: gray500 }]}>NPR</ThemedText>
                  <TextInput
                    testID="package-price-input"
                    style={[styles.formInput, styles.priceInput, { color: gray900, borderColor: gray200, backgroundColor: gray100 }]}
                    placeholder="20000"
                    placeholderTextColor={gray400}
                    value={priceInputStr}
                    onChangeText={(text) => {
                      setPriceInputStr(text);
                      if (text === '' || text === '-') {
                        setNewPackage({ ...newPackage, price: 0 });
                      } else {
                        const val = parseInt(text);
                        if (!isNaN(val)) {
                          setNewPackage({ ...newPackage, price: val });
                        }
                      }
                    }}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="xs" weight="bold" style={[styles.formLabel, { color: gray700 }]}>Duration</ThemedText>
                <TextInput
                  testID="package-duration-input"
                  style={[styles.formInput, { color: gray900, borderColor: gray200, backgroundColor: gray100 }]}
                  placeholder="e.g., 6 hours, Full day"
                  placeholderTextColor={gray400}
                  value={newPackage.duration}
                  onChangeText={(text) => setNewPackage({ ...newPackage, duration: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="xs" weight="bold" style={[styles.formLabel, { color: gray700 }]}>Features (one per line)</ThemedText>
                <TextInput
                  style={[styles.formInput, styles.textareaInput, { color: gray900, borderColor: gray200, backgroundColor: gray100 }]}
                  placeholder={"100 edited photos\nOnline gallery\nBasic editing"}
                  placeholderTextColor={gray400}
                  value={newPackage.features.join('\n')}
                  onChangeText={(text) =>
                    setNewPackage({
                      ...newPackage,
                      features: text.split('\n').filter((f) => f.trim())
                    })
                  }
                  multiline
                  numberOfLines={5}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btnSecondary, { borderColor: gray200 }]} onPress={() => setShowAddModal(false)}>
                <ThemedText weight="bold" style={[styles.btnSecondaryText, { color: gray600 }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                testID="package-submit-button"
                style={[styles.btnPrimary, { backgroundColor: primary }]}
                onPress={handleAddPackage}
              >
                <ThemedText weight="bold" style={[styles.btnPrimaryText, { color: white }]}>Add Package</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Package Modal */}
      <Modal visible={editingPackage !== null} transparent animationType="slide" onRequestClose={() => setEditingPackage(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: background }]}>
            <ThemedText type="lg" weight="bold" style={[styles.modalTitle, { color: gray900 }]}>Edit Package</ThemedText>

            {editFormData && (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
                <View style={styles.formGroup}>
                  <ThemedText type="xs" weight="bold" style={[styles.formLabel, { color: gray700 }]}>Package Name</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: gray900, borderColor: gray200, backgroundColor: gray100 }]}
                    value={editFormData.name}
                    onChangeText={(text) => setEditFormData({ ...editFormData, name: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText type="xs" weight="bold" style={[styles.formLabel, { color: gray700 }]}>Price (NPR)</ThemedText>
                  <View style={styles.priceInputWrapper}>
                    <ThemedText weight="bold" style={[styles.pricePrefix, { color: gray500 }]}>NPR</ThemedText>
                    <TextInput
                      style={[styles.formInput, styles.priceInput, { color: gray900, borderColor: gray200, backgroundColor: gray100 }]}
                      placeholderTextColor={gray400}
                      value={priceInputStr}
                      onChangeText={(text) => {
                        setPriceInputStr(text);
                        if (editFormData) {
                          if (text === '' || text === '-') {
                            setEditFormData({ ...editFormData, price: 0 });
                          } else {
                            const val = parseInt(text);
                            if (!isNaN(val)) {
                              setEditFormData({ ...editFormData, price: val });
                            }
                          }
                        }
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText type="xs" weight="bold" style={[styles.formLabel, { color: gray700 }]}>Duration</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: gray900, borderColor: gray200, backgroundColor: gray100 }]}
                    value={editFormData.duration}
                    onChangeText={(text) => setEditFormData({ ...editFormData, duration: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText type="xs" weight="bold" style={[styles.formLabel, { color: gray700 }]}>Features (one per line)</ThemedText>
                  <TextInput
                    style={[styles.formInput, styles.textareaInput, { color: gray900, borderColor: gray200, backgroundColor: gray100 }]}
                    value={editFormData.features.join('\n')}
                    onChangeText={(text) =>
                      setEditFormData({
                        ...editFormData,
                        features: text.split('\n').filter((f) => f.trim())
                      })
                    }
                    multiline
                    numberOfLines={5}
                  />
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btnSecondary, { borderColor: gray200 }]} onPress={() => setEditingPackage(null)}>
                <ThemedText weight="bold" style={[styles.btnSecondaryText, { color: gray600 }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: primary }]} onPress={handleSaveEdit}>
                <ThemedText weight="bold" style={[styles.btnPrimaryText, { color: white }]}>Save Changes</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 20, borderBottomWidth: 1 },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  content: { flex: 1, padding: 16 },
  packagesList: { gap: 12, marginBottom: 12 },
  packageCard: { borderRadius: 12, padding: 16, position: 'relative' },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  packageTitleSection: { flex: 1 },
  packageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  packageName: { fontSize: 16 },
  packageDuration: { fontSize: 13 },
  packageActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { padding: 6 },
  packagePrice: { marginBottom: 12 },
  priceValue: { fontSize: 24 },
  featuresList: { gap: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13 },
  addPackageBtn: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  addPackageBtnText: { fontSize: 14 },
  formLabel: { fontSize: 13, marginBottom: 6 },
  formGroup: { marginBottom: 16 },
  formInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  priceInputWrapper: { position: 'relative' },
  pricePrefix: { position: 'absolute', left: 12, top: 10, fontSize: 14 },
  priceInput: { paddingLeft: 40 },
  textareaInput: { height: 100, textAlignVertical: 'top' },
  tipsCard: { borderWidth: 1, padding: 16, borderRadius: 12, marginBottom: 32 },
  tipsTitle: { fontSize: 15, marginBottom: 10 },
  tipsList: { gap: 6 },
  tipsItem: { lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 22, marginBottom: 20, textAlign: 'center' },
  modalForm: { marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  btnPrimary: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimaryText: { fontSize: 16 },
  btnSecondary: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  btnSecondaryText: { fontSize: 16 },
  addButton: { padding: 8, borderRadius: 8 }
});
