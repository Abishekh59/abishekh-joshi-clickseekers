import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/themed-text';
import { useAppTheme } from '../../hooks/use-app-theme';

interface AvailabilityManagementProps {
    onBack?: () => void;
}

export default function AvailabilityManagement({ onBack }: AvailabilityManagementProps) {
    const insets = useSafeAreaInsets();
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
        info,
    } = useAppTheme();

    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [blockedDates, setBlockedDates] = useState<Array<{ id: number; date: string; reason: string }>>([
        { id: 1, date: '2026-02-15', reason: 'Personal event' },
        { id: 2, date: '2026-02-20', reason: 'Already booked' }
    ]);

    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [blockReason, setBlockReason] = useState('');
    const [showBlockModal, setShowBlockModal] = useState(false);

    const getDaysInMonth = () => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const isDateBlocked = (day: number) => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return blockedDates.some(blocked => blocked.date === dateStr);
    };

    const isDateSelected = (day: number) => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return selectedDates.includes(dateStr);
    };

    const getBlockedReason = (day: number) => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const blocked = blockedDates.find(b => b.date === dateStr);
        return blocked?.reason || '';
    };

    const handleDateClick = (day: number) => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (multiSelectMode) {
            // Multi-select mode: toggle selection
            if (selectedDates.includes(dateStr)) {
                setSelectedDates(selectedDates.filter(d => d !== dateStr));
            } else {
                setSelectedDates([...selectedDates, dateStr]);
            }
        } else {
            // Single select mode: open modal to add reason
            if (isDateBlocked(day)) {
                setBlockedDates(blockedDates.filter(b => b.date !== dateStr));
            } else {
                setSelectedDates([dateStr]);
                setShowBlockModal(true);
            }
        }
    };

    const startMultiSelect = () => {
        setMultiSelectMode(true);
        setSelectedDates([]);
    };

    const cancelMultiSelect = () => {
        setMultiSelectMode(false);
        setSelectedDates([]);
    };

    const confirmMultiBlock = () => {
        if (selectedDates.length > 0) {
            setShowBlockModal(true);
        }
    };

    const addBlockedDates = () => {
        if (selectedDates.length > 0) {
            const newBlocks = selectedDates.map((date, index) => ({
                id: Math.max(...blockedDates.map(b => b.id), 0) + index + 1,
                date: date,
                reason: blockReason.trim() || 'Unavailable'
            }));
            setBlockedDates([...blockedDates, ...newBlocks]);
            setSelectedDates([]);
            setBlockReason('');
            setMultiSelectMode(false);
            setShowBlockModal(false);
        }
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    return (
        <View style={[styles.container, { backgroundColor: gray100 }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: primary, paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 16 }]}>
                <View style={styles.headerRow}>
                    {onBack && (
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color={white} />
                        </TouchableOpacity>
                    )}
                    <ThemedText type="2xl" weight="bold" style={{ color: white }}>Availability</ThemedText>
                </View>
                <ThemedText type="sm" style={[styles.subtitle, { color: white }]}>
                    Block dates when you're unavailable. You can block single or multiple dates for multi-day events.
                </ThemedText>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.contentSections}>
                    {/* Calendar */}
                    <View style={[styles.sectionCard, { backgroundColor: white }]}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionHeaderLeft}>
                                <Ionicons name="calendar-outline" size={20} color={primary} />
                                <ThemedText type="lg" weight="semibold" style={{ color: gray900 }}>Manage Your Calendar</ThemedText>
                            </View>
                            {!multiSelectMode && (
                                <TouchableOpacity style={[styles.multiSelectBtn, { backgroundColor: warning }]} onPress={startMultiSelect}>
                                    <ThemedText type="sm" weight="semibold" style={{ color: white }}>Select Multiple</ThemedText>
                                </TouchableOpacity>
                            )}
                        </View>

                        {!multiSelectMode && (
                            <View style={[styles.infoBox, { backgroundColor: info + '15', borderColor: info + '40' }]}>
                                <View style={styles.infoTitle}>
                                    <Ionicons name="information-circle-outline" size={16} color={info} />
                                    <ThemedText type="sm" weight="semibold" style={{ color: info }}>Quick Block</ThemedText>
                                </View>
                                <ThemedText type="xs" style={[styles.infoText, { color: info }]}>
                                    Click any date to block/unblock it. For multi-day events, use "Select Multiple" button.
                                </ThemedText>
                            </View>
                        )}

                        {multiSelectMode && (
                            <View style={[styles.multiSelectBanner, { backgroundColor: warning + '20', borderColor: warning }]}>
                                <View style={styles.multiSelectHeader}>
                                    <View style={styles.multiSelectTitleRow}>
                                        <ThemedText type="sm" weight="bold" style={{ color: '#92400e' }}>Multi-Day Selection</ThemedText>
                                        {selectedDates.length > 0 && (
                                            <View style={[styles.multiSelectCount, { backgroundColor: '#92400e' }]}>
                                                <ThemedText type="xs" weight="bold" style={{ color: white }}>{selectedDates.length}</ThemedText>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <ThemedText type="xs" style={[styles.multiSelectText, { color: '#78350f' }]}>
                                    Click on multiple dates to select them for blocking (e.g., 3-day wedding event)
                                </ThemedText>
                                <View style={styles.multiSelectActions}>
                                    <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: white, borderColor: gray200 }]} onPress={cancelMultiSelect}>
                                        <ThemedText type="sm" weight="semibold" style={{ color: gray700 }}>Cancel</ThemedText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.confirmBtn, { backgroundColor: '#92400e', opacity: selectedDates.length === 0 ? 0.5 : 1 }]}
                                        onPress={confirmMultiBlock}
                                        disabled={selectedDates.length === 0}
                                    >
                                        <ThemedText type="sm" weight="bold" style={{ color: white }}>
                                            Block {selectedDates.length} Date{selectedDates.length !== 1 ? 's' : ''}
                                        </ThemedText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View style={styles.calendarControls}>
                            <ThemedText type="lg" weight="semibold" style={{ color: gray900 }}>
                                {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                            </ThemedText>
                            <View style={styles.monthNav}>
                                <TouchableOpacity
                                    style={[styles.monthNavBtn, { borderColor: gray200, backgroundColor: white }]}
                                    onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                                >
                                    <Ionicons name="chevron-back" size={16} color={gray700} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.monthNavBtn, { borderColor: gray200, backgroundColor: white }]}
                                    onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                                >
                                    <Ionicons name="chevron-forward" size={16} color={gray700} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.calendarGrid}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <View key={day} style={styles.calendarDayHeader}>
                                    <ThemedText type="xs" weight="semibold" style={{ color: gray500 }}>{day}</ThemedText>
                                </View>
                            ))}
                            {getDaysInMonth().map((day, index) => {
                                if (day === null) {
                                    return <View key={`empty-${index}`} style={styles.calendarDayEmpty} />;
                                }

                                const year = selectedMonth.getFullYear();
                                const month = selectedMonth.getMonth();
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const currentDate = new Date(year, month, day);
                                const isPast = currentDate < today;
                                const isBlocked = isDateBlocked(day);
                                const isSelected = isDateSelected(day);
                                const isToday = day === today.getDate() &&
                                    month === today.getMonth() &&
                                    year === today.getFullYear();

                                let dayBgColor = gray100;
                                let dayBorderColor = 'transparent';

                                if (multiSelectMode && isSelected) {
                                    dayBgColor = warning + '30';
                                    dayBorderColor = warning;
                                } else if (isBlocked) {
                                    dayBgColor = errorColor + '20';
                                    dayBorderColor = errorColor + '60';
                                } else {
                                    dayBgColor = info + '10';
                                    dayBorderColor = info + '30';
                                }

                                if (isToday) {
                                    dayBorderColor = warning;
                                }

                                return (
                                    <TouchableOpacity
                                        key={day}
                                        style={[
                                            styles.calendarDay,
                                            { backgroundColor: dayBgColor, borderColor: dayBorderColor },
                                            isPast && styles.calendarDayPast
                                        ]}
                                        onPress={() => !isPast && handleDateClick(day)}
                                        disabled={isPast}
                                    >
                                        <ThemedText type="sm" weight={isToday ? 'bold' : 'medium'} style={{ color: isPast ? gray400 : gray900 }}>{day}</ThemedText>
                                        {!isPast && (
                                            <View style={[
                                                styles.dayIndicator,
                                                { backgroundColor: isSelected ? warning : isBlocked ? errorColor : info }
                                            ]} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={[styles.calendarLegend, { borderTopColor: gray200 }]}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: info + '10', borderColor: info + '30' }]} />
                                <ThemedText type="xs" style={{ color: gray600 }}>Available</ThemedText>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: errorColor + '20', borderColor: errorColor + '60' }]} />
                                <ThemedText type="xs" style={{ color: gray600 }}>Blocked</ThemedText>
                            </View>
                            {multiSelectMode && (
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: warning + '30', borderColor: warning }]} />
                                    <ThemedText type="xs" style={{ color: gray600 }}>Selected</ThemedText>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Blocked Dates List */}
                    {blockedDates.length > 0 && (
                        <View style={[styles.sectionCard, { backgroundColor: white }]}>
                            <ThemedText type="lg" weight="semibold" style={[styles.sectionTitle, { color: gray900 }]}>
                                Blocked Dates ({blockedDates.length})
                            </ThemedText>

                            <View style={styles.blockedDatesList}>
                                {blockedDates
                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    .map((blocked) => (
                                        <View key={blocked.id} style={[styles.blockedDateItem, { backgroundColor: errorColor + '10', borderColor: errorColor + '40' }]}>
                                            <View style={styles.blockedDateInfo}>
                                                <ThemedText type="sm" weight="semibold" style={[styles.blockedDateDate, { color: gray900 }]}>
                                                    {new Date(blocked.date).toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </ThemedText>
                                                <ThemedText type="xs" style={[styles.blockedDateReason, { color: gray600 }]}>{blocked.reason}</ThemedText>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.removeDateBtn, { backgroundColor: white, borderColor: errorColor + '40' }]}
                                                onPress={() => setBlockedDates(blockedDates.filter(b => b.id !== blocked.id))}
                                            >
                                                <Ionicons name="close" size={18} color={errorColor} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                            </View>
                        </View>
                    )}

                    {/* Save Button */}
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: success }]}>
                        <Ionicons name="checkmark" size={20} color={white} />
                        <ThemedText type="base" weight="bold" style={{ color: white }}>Save Changes</ThemedText>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Block Dates Modal */}
            <Modal
                visible={showBlockModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowBlockModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowBlockModal(false)}
                    />
                    <View style={[styles.modalContent, { backgroundColor: white }]}>
                        <View style={styles.modalHeader}>
                            <ThemedText type="xl" weight="bold" style={{ color: gray900 }}>
                                {selectedDates.length === 1 ? 'Block Date' : 'Block Multiple Dates'}
                            </ThemedText>
                            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: gray100 }]} onPress={() => setShowBlockModal(false)}>
                                <Ionicons name="close" size={20} color={gray600} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <ThemedText type="sm" weight="medium" style={[styles.inputLabel, { color: gray700 }]}>
                                Selected Dates ({selectedDates.length})
                            </ThemedText>
                            <ScrollView style={[styles.selectedDatesList, { backgroundColor: gray100 }]} horizontal showsHorizontalScrollIndicator={false}>
                                {selectedDates.sort().map((date, idx) => (
                                    <View key={idx} style={[styles.selectedDateChip, { backgroundColor: warning + '30', borderColor: warning }]}>
                                        <ThemedText type="xs" weight="medium" style={{ color: '#92400e' }}>
                                            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </ThemedText>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.inputGroup}>
                            <ThemedText type="sm" weight="medium" style={[styles.inputLabel, { color: gray700 }]}>Reason (Optional)</ThemedText>
                            <TextInput
                                value={blockReason}
                                onChangeText={setBlockReason}
                                placeholder="e.g., Sharma family wedding - 3 days&#10;Events: Mehendi, Wedding, Reception&#10;Location: Kathmandu&#10;Already confirmed"
                                placeholderTextColor={gray400}
                                multiline
                                style={[styles.textInput, { color: gray900, borderColor: gray200, backgroundColor: white }]}
                            />
                            <ThemedText type="xs" style={[styles.helpText, { color: gray500 }]}>
                                Add details about the event so you can track why these dates are blocked
                            </ThemedText>
                        </View>

                        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: errorColor }]} onPress={addBlockedDates}>
                            <Ionicons name="close-circle" size={18} color={white} />
                            <ThemedText type="base" weight="bold" style={{ color: white }}>
                                Block {selectedDates.length} Date{selectedDates.length !== 1 ? 's' : ''}
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitle: {
        lineHeight: 20,
        opacity: 0.9,
    },
    scrollContent: {
        flex: 1,
    },
    contentSections: {
        padding: 16,
        gap: 16,
    },
    sectionCard: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    sectionTitle: {
        marginBottom: 16,
    },
    multiSelectBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    infoBox: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    infoTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    infoText: {
        lineHeight: 18,
    },
    multiSelectBanner: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    multiSelectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    multiSelectTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    multiSelectCount: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    multiSelectText: {
        marginBottom: 12,
    },
    multiSelectActions: {
        flexDirection: 'row',
        gap: 8,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 10,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    calendarControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    monthNav: {
        flexDirection: 'row',
        gap: 8,
    },
    monthNavBtn: {
        width: 36,
        height: 36,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    calendarDayHeader: {
        width: '13.28%',
        alignItems: 'center',
        paddingVertical: 8,
    },
    calendarDay: {
        width: '13.28%',
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calendarDayEmpty: {
        width: '13.28%',
        aspectRatio: 1,
    },
    calendarDayPast: {
        opacity: 0.4,
    },
    dayIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 2,
    },
    calendarLegend: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        flexWrap: 'wrap',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 16,
        height: 16,
        borderRadius: 6,
        borderWidth: 2,
    },
    blockedDatesList: {
        gap: 12,
    },
    blockedDateItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: 12,
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 8,
    },
    blockedDateInfo: {
        flex: 1,
    },
    blockedDateDate: {
        marginBottom: 4,
    },
    blockedDateReason: {
        lineHeight: 18,
    },
    removeDateBtn: {
        padding: 8,
        borderWidth: 1,
        borderRadius: 8,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        marginBottom: 8,
    },
    textInput: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 120,
        textAlignVertical: 'top',
        lineHeight: 20,
    },
    selectedDatesList: {
        maxHeight: 80,
        borderRadius: 8,
        padding: 8,
    },
    selectedDateChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 6,
    },
    helpText: {
        marginTop: 6,
        lineHeight: 16,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
});
