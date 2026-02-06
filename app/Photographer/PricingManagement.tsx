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
  popular?: boolean;
}

interface PricingManagementProps {
  onBack?: () => void;
}

export default function PricingManagement({ onBack }: PricingManagementProps) {
  const {
    primary,
    secondary,
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
          // Parse features string to array if needed, fallback to []
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
        setLoading(false);
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
    features: [''],
    popular: false
  });


  const [hourlyRate, setHourlyRate] = useState('5000');
  const [customNotes, setCustomNotes] = useState('');

  const handleAddPackage = async () => {
    if (!newPackage.name || !newPackage.price || !newPackage.duration) {
      Alert.alert('Error', 'Please fill all fields');
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
          most_popular: newPackage.popular || false,
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
        setNewPackage({
          package_id: Date.now(),
          name: '',
          price: 0,
          duration: '',
          features: [''],
          popular: false
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
      setEditingPackage(id);
    }
  };

  // Ensure only one package can be most popular
  const handleSetMostPopular = (id: number) => {
    setNewPackage((prev) => ({ ...prev, popular: false }));
    setPackages((prev) => prev.map(pkg => ({ ...pkg, popular: pkg.package_id === id })));
    if (editFormData && editingPackage === id) {
      setEditFormData({ ...editFormData, popular: true });
    }
  };

  const handleSaveEdit = async () => {
    if (editFormData && editingPackage !== null) {
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
            most_popular: editFormData.popular || false,
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
            style={[styles.addButton, { backgroundColor: primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color={white} />
          </TouchableOpacity>
        </View>
        <ThemedText type="xs" style={[styles.headerSubtitle, { color: gray500 }]}>Manage your photography packages and pricing</ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Packages List */}
        <View style={styles.packagesList}>
          {loading ? (
            <ActivityIndicator size="large" color={primary} style={{ marginTop: 40 }} />
          ) : packages.length === 0 ? (
            <ThemedText style={{ textAlign: 'center', color: gray500, marginVertical: 24 }}>No packages found.</ThemedText>
          ) : (
            packages.map((pkg) => (
              <View key={pkg.package_id} style={[styles.packageCard, { backgroundColor: background }, pkg.popular && [styles.mostPopularCard, { borderColor: warning }]]}>
                {/* Most Popular Badge */}
                {pkg.popular && (
                  <View style={[styles.mostPopularBadge, { backgroundColor: warning }]}>
                    <Ionicons name="star" size={12} color={white} />
                    <ThemedText weight="bold" style={[styles.mostPopularBadgeText, { color: white }]}>BEST VALUE</ThemedText>
                  </View>
                )}
                <View style={styles.packageHeader}>
                  <View style={styles.packageTitleSection}>
                    <View style={styles.packageTitleRow}>
                      <ThemedText weight="bold" style={[styles.packageName, { color: gray900 }]}>{pkg.name}</ThemedText>
                    </View>
                    {pkg.duration && <ThemedText type="xs" style={[styles.packageDuration, { color: gray600 }]}>{pkg.duration}</ThemedText>}
                  </View>
                  <View style={styles.packageActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: info + '15', borderRadius: 8 }]}
                      onPress={() => handleEditPackage(pkg.package_id)}
                    >
                      <Ionicons name="pencil" size={18} color={info} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: errorColor + '15', borderRadius: 8 }]}
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

        {/* Add Package Button */}
        <TouchableOpacity
          style={[styles.addPackageBtn, { borderColor: gray300, backgroundColor: gray100 }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color={gray600} />
          <ThemedText weight="bold" style={[styles.addPackageBtnText, { color: gray600 }]}>Add New Package</ThemedText>
        </TouchableOpacity>



        {/* Pricing Tips */}
        <View style={[styles.tipsCard, { backgroundColor: info + '10', borderColor: info + '30' }]}>
          <ThemedText weight="bold" style={[styles.tipsTitle, { color: info }]}>💡 Pricing Tips</ThemedText>
          <View style={styles.tipsList}>
            <ThemedText type="xs" style={[styles.tipsItem, { color: gray700 }]}>• Research competitor pricing in your area</ThemedText>
            <ThemedText type="xs" style={[styles.tipsItem, { color: gray700 }]}>• Consider your experience level and portfolio quality</ThemedText>
            <ThemedText type="xs" style={[styles.tipsItem, { color: gray700 }]}>• Offer package deals to increase bookings</ThemedText>
            <ThemedText type="xs" style={[styles.tipsItem, { color: gray700 }]}>• Update pricing based on demand and season</ThemedText>
          </View>
        </View>
      </ScrollView >

      {/* Add Package Modal */}
      < Modal visible={showAddModal} transparent animationType="slide" >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: background }]}>
            <ThemedText type="lg" weight="bold" style={[styles.modalTitle, { color: gray900 }]}>Add New Package</ThemedText>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
              <View style={styles.formGroup}>
                <ThemedText type="xs" weight="bold" style={[styles.formLabel, { color: gray700 }]}>Package Name</ThemedText>
                <TextInput
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
                    style={[styles.formInput, styles.priceInput, { color: gray900, borderColor: gray200, backgroundColor: gray100 }]}
                    placeholder="20000"
                    placeholderTextColor={gray400}
                    value={newPackage.price.toString()}
                    onChangeText={(text) => setNewPackage({ ...newPackage, price: parseInt(text) || 0 })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="xs" weight="bold" style={[styles.formLabel, { color: gray700 }]}>Duration</ThemedText>
                <TextInput
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
                  value={Array.isArray(newPackage.features) ? newPackage.features.join('\n') : (typeof newPackage.features === 'string' ? newPackage.features : '')}
                  onChangeText={(text) =>
                    setNewPackage({
                      ...newPackage,
                      features: text.split(/\r?\n/).filter((f) => f.trim())
                    })
                  }
                  multiline
                  numberOfLines={5}
                />
              </View>

              <View style={[styles.checkboxRow, { backgroundColor: gray100 }]}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    { borderColor: gray300 },
                    newPackage.popular && { backgroundColor: primary, borderColor: primary }
                  ]}
                  onPress={() => {
                    setNewPackage({ ...newPackage, popular: !newPackage.popular });
                    if (!newPackage.popular) {
                      handleSetMostPopular(newPackage.package_id);
                    }
                  }}
                >
                  {newPackage.popular && (
                    <Ionicons name="checkmark" size={14} color={white} />
                  )}
                </TouchableOpacity>
                <ThemedText style={[styles.checkboxLabel, { color: gray700 }]}>Mark as Most Popular Package</ThemedText>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btnSecondary, { borderColor: gray200 }]} onPress={() => setShowAddModal(false)}>
                <ThemedText weight="bold" style={[styles.btnSecondaryText, { color: gray600 }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: primary }]} onPress={handleAddPackage}>
                <ThemedText weight="bold" style={[styles.btnPrimaryText, { color: white }]}>Add Package</ThemedText>
              </TouchableOpacity>
            </View>
          </View >
        </View >
      </Modal >

      {/* Edit Package Modal */}
      < Modal visible={editingPackage !== null
      } transparent animationType="slide" >
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
                      value={editFormData.price.toString()}
                      onChangeText={(text) => setEditFormData({ ...editFormData, price: parseInt(text) || 0 })}
                      keyboardType="number-pad"
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

                <View style={[styles.checkboxRow, { backgroundColor: gray100 }]}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      { borderColor: gray300 },
                      editFormData.popular && { backgroundColor: primary, borderColor: primary }
                    ]}
                    onPress={() => setEditFormData({ ...editFormData, popular: !editFormData.popular })}
                  >
                    {editFormData.popular && (
                      <Ionicons name="checkmark" size={14} color={white} />
                    )}
                  </TouchableOpacity>
                  <ThemedText style={[styles.checkboxLabel, { color: gray700 }]}>Mark as Popular Package</ThemedText>
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
      </Modal >
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  packagesList: {
    gap: 12,
    marginBottom: 12,
  },
  packageCard: {
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  mostPopularCard: {
    borderWidth: 2,
  },
  mostPopularBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mostPopularBadgeText: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageTitleSection: {
    flex: 1,
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  packageName: {
    fontSize: 16,
  },
  popularBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
  },
  packageDuration: {
    fontSize: 13,
  },
  packageActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
  },
  packagePrice: {
    marginBottom: 12,
  },
  priceValue: {
    fontSize: 24,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
  },
  addPackageBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addPackageBtnText: {
    fontSize: 14,
  },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 16,
  },
  hourlyRateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  hourlyInputGroup: {
    flex: 1,
  },
  formLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  formGroup: {
    marginBottom: 16,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  priceInputWrapper: {
    position: 'relative',
  },
  pricePrefix: {
    position: 'absolute',
    left: 12,
    top: 10,
    fontSize: 14,
  },
  priceInput: {
    paddingLeft: 40,
  },
  textareaInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
  },
  checkboxLabel: {
    fontSize: 14,
  },
  updateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  updateBtnText: {
    fontSize: 14,
  },
  saveNotesBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveNotesBtnText: {
    fontSize: 14,
  },
  tipsCard: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 15,
    marginBottom: 10,
  },
  tipsList: {
    gap: 6,
  },
  tipsItem: {
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalForm: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 16,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontSize: 16,
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
  }
});
