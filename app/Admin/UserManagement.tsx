import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function UserManagement({ onBack }: { onBack?: () => void }) {
    const [activeTab, setActiveTab] = useState<'all' | 'clients' | 'photographers' | 'kyc'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const gray900 = useThemeColor({}, 'gray900');
    const gray700 = useThemeColor({}, 'gray700');
    const gray600 = useThemeColor({}, 'gray600');
    const gray500 = useThemeColor({}, 'gray500');
    const gray400 = useThemeColor({}, 'gray400');
    const primary = useThemeColor({}, 'primary');
    const background = useThemeColor({}, 'background');
    const errorColor = useThemeColor({}, 'error');
    const successColor = useThemeColor({}, 'success');
    const warningColor = useThemeColor({}, 'warning');
    const infoColor = useThemeColor({}, 'info');

    const users = [
        { id: 1, name: 'Rajesh Sharma', email: 'rajesh@email.com', type: 'photographer', status: 'active', kyc: 'approved', joinedDate: '2024-01-15', bookings: 156 },
        { id: 2, name: 'Sita Thapa', email: 'sita@email.com', type: 'client', status: 'active', kyc: 'verified', joinedDate: '2024-02-20', bookings: 5 },
        { id: 3, name: 'Maya Gurung', email: 'maya@email.com', type: 'photographer', status: 'active', kyc: 'pending', joinedDate: '2024-12-01', bookings: 0 },
        { id: 4, name: 'Ram Tamang', email: 'ram@email.com', type: 'client', status: 'suspended', kyc: 'verified', joinedDate: '2024-03-10', bookings: 2 }
    ];

    const pendingKYC = [
        { id: 1, name: 'Maya Gurung', type: 'photographer', submittedDate: '2024-12-15', documents: ['Citizenship', 'Selfie'] },
        { id: 2, name: 'Bikash Rai', type: 'photographer', submittedDate: '2024-12-14', documents: ['Passport', 'Selfie'] }
    ];

    const filteredUsers = users.filter(user => {
        if (activeTab === 'clients' && user.type !== 'client') return false;
        if (activeTab === 'photographers' && user.type !== 'photographer') return false;
        if (searchQuery && !user.name.toLowerCase().includes(searchQuery.toLowerCase()) && !user.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const handleApproveKYC = (id: number) => {
        Alert.alert('KYC Approved', `KYC approved for user ${id}`);
    };

    const handleRejectKYC = (id: number) => {
        Alert.alert('Reject KYC', 'Are you sure you want to reject this KYC?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reject', style: 'destructive', onPress: () => Alert.alert('KYC Rejected', `KYC rejected for user ${id}`) }
        ]);
    };

    const handleSuspendUser = (id: number) => {
        Alert.alert('Suspend User', 'Are you sure you want to suspend this user?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Suspend', style: 'destructive', onPress: () => Alert.alert('User Suspended', `User ${id} suspended`) }
        ]);
    };

    return (
        <View style={[styles.container, { backgroundColor: '#f9fafb' }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: background }]}>
                <ThemedText type="xl" weight="extrabold" style={{ color: gray900, marginBottom: 12 }}>User Management</ThemedText>
                {/* Search */}
                <View style={[styles.searchContainer, { backgroundColor: '#f3f4f6' }]}>
                    <Ionicons name="search-outline" size={20} color={gray500} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: gray900 }]}
                        placeholder="Search users..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={gray400}
                    />
                </View>
                {/* Tabs */}
                <View style={styles.tabsRow}>
                    <TabButton label="All" active={activeTab === 'all'} onPress={() => setActiveTab('all')} color={primary} />
                    <TabButton label="Clients" active={activeTab === 'clients'} onPress={() => setActiveTab('clients')} color={primary} />
                    <TabButton label="Photographers" active={activeTab === 'photographers'} onPress={() => setActiveTab('photographers')} color={primary} />
                    <TabButton label={`KYC${pendingKYC.length > 0 ? ` (${pendingKYC.length})` : ''}`} active={activeTab === 'kyc'} onPress={() => setActiveTab('kyc')} color="#ea580c" />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* KYC Pending Tab */}
                {activeTab === 'kyc' && (
                    <View style={{ gap: 16 }}>
                        {pendingKYC.map((user) => (
                            <View key={user.id} style={[styles.card, { backgroundColor: background }]}>
                                <View style={styles.cardRow}>
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200' }}
                                        style={styles.avatar}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <ThemedText type="sm" weight="extrabold" style={{ color: gray900 }}>{user.name}</ThemedText>
                                        <ThemedText type="xs" weight="bold" style={{ color: gray500, textTransform: 'capitalize' }}>{user.type}</ThemedText>
                                        <ThemedText type="xs" weight="bold" style={{ color: gray400, marginTop: 2 }}>Submitted: {new Date(user.submittedDate).toLocaleDateString()}</ThemedText>
                                    </View>
                                </View>
                                <ThemedText type="xs" weight="extrabold" style={{ color: gray700, marginBottom: 8, marginTop: 8 }}>Documents submitted:</ThemedText>
                                <View style={styles.docsRow}>
                                    {user.documents.map((doc, idx) => (
                                        <View key={idx} style={[styles.docBadge, { backgroundColor: '#dbeafe' }]}>
                                            <ThemedText type="xs" weight="extrabold" style={{ color: infoColor }}>{doc}</ThemedText>
                                        </View>
                                    ))}
                                </View>
                                <View style={styles.actionRow}>
                                    <ActionButton label="View" icon="eye-outline" color={gray700} background="#e5e7eb" onPress={() => { }} />
                                    <ActionButton label="Reject" icon="close-circle-outline" color={errorColor} background="#fee2e2" onPress={() => handleRejectKYC(user.id)} />
                                    <ActionButton label="Approve" icon="checkmark-circle-outline" color="#fff" background={successColor} onPress={() => handleApproveKYC(user.id)} />
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Users List */}
                {activeTab !== 'kyc' && (
                    <View style={{ gap: 12 }}>
                        {filteredUsers.map((user) => (
                            <View key={user.id} style={[styles.card, { backgroundColor: background }]}>
                                <View style={styles.cardRow}>
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200' }}
                                        style={styles.avatar}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <ThemedText type="sm" weight="extrabold" style={{ color: gray900 }}>{user.name}</ThemedText>
                                        <ThemedText type="xs" weight="bold" style={{ color: gray500 }}>{user.email}</ThemedText>
                                        <View style={styles.badgeRow}>
                                            <View style={[styles.statusBadge, { backgroundColor: user.status === 'active' ? '#bbf7d0' : '#fee2e2' }]}>
                                                <ThemedText type="xs" weight="extrabold" style={{ color: user.status === 'active' ? successColor : errorColor }}>{user.status}</ThemedText>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: (user.kyc === 'approved' || user.kyc === 'verified') ? '#dbeafe' : '#fef9c3' }]}>
                                                <ThemedText type="xs" weight="extrabold" style={{ color: (user.kyc === 'approved' || user.kyc === 'verified') ? infoColor : warningColor }}>{user.kyc}</ThemedText>
                                            </View>
                                        </View>
                                        <View style={styles.userMetaRow}>
                                            <ThemedText type="xs" weight="bold" style={{ color: gray400 }}>{user.type.toUpperCase()} • {user.bookings} BOOKINGS</ThemedText>
                                        </View>
                                        <View style={styles.actionRow}>
                                            <ActionButton label="Details" icon="person-outline" color={gray700} background="#e5e7eb" onPress={() => { }} />
                                            {user.status === 'active' ? (
                                                <ActionButton label="Suspend" icon="person-remove-outline" color={errorColor} background="#fee2e2" onPress={() => handleSuspendUser(user.id)} />
                                            ) : (
                                                <ActionButton label="Activate" icon="person-add-outline" color={successColor} background="#bbf7d0" onPress={() => { }} />
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function TabButton({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color: string }) {
    const gray700 = useThemeColor({}, 'gray700');
    return (
        <TouchableOpacity onPress={onPress} style={[styles.tabButton, active ? { backgroundColor: color } : { backgroundColor: '#f3f4f6' }]}>
            <ThemedText type="xs" weight="extrabold" style={{ color: active ? '#fff' : gray700 }}>{label}</ThemedText>
        </TouchableOpacity>
    );
}

function ActionButton({ label, icon, color, background, borderColor, onPress }: { label: string; icon: string; color: string; background?: string; borderColor?: string; onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} style={[styles.actionButton, background && { backgroundColor: background }, borderColor && { borderColor, borderWidth: 1 }]}>
            <Ionicons name={icon as any} size={14} color={color} style={{ marginRight: 4 }} />
            <ThemedText type="xs" weight="extrabold" style={{ color }}>{label}</ThemedText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginBottom: 12, paddingHorizontal: 12, height: 40 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 13, fontWeight: '600' },
    tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    tabButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    content: { paddingHorizontal: 24, paddingVertical: 16 },
    card: { borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, marginBottom: 12 },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
    avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#e5e7eb' },
    docsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    docBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, marginBottom: 6 },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    userMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
});