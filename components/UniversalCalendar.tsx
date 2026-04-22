import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useAppTheme } from '../hooks/use-app-theme';
import { ThemedText } from './themed-text';

export type CalendarSelectionMode = 'single' | 'multi' | 'range';

interface UniversalCalendarProps {
    mode: CalendarSelectionMode;
    selectedDates: string[]; // YYYY-MM-DD
    onSelectDates: (dates: string[]) => void;
    blockedDates?: string[]; // YYYY-MM-DD
    bookedDates?: string[]; // YYYY-MM-DD
    minDate?: string;
    maxDate?: string;
    showLegend?: boolean;
    initialDate?: string; // YYYY-MM-DD
    allowSelectingBlockedDates?: boolean;
}

/**
 * A unified calendar component that supports single, multi, and range selection.
 * Used across both client-side booking and photographer-side availability management.
 */
export function UniversalCalendar({
    mode,
    selectedDates,
    onSelectDates,
    blockedDates = [],
    bookedDates = [],
    minDate,
    maxDate,
    showLegend = true,
    initialDate,
    allowSelectingBlockedDates = false,
}: UniversalCalendarProps) {
    const { primary, secondary, gray100, gray200, gray300, gray400, gray500, gray600, gray900, white, error, warning, info } = useAppTheme();

    const [currentMonthView, setCurrentMonthView] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [calendarKey, setCalendarKey] = useState(0); // Forcing re-mount only when picker is used
    const [isPickerVisible, setIsPickerVisible] = useState(false);

    // Temp state for picker to allow multiple selections before applying
    const [tempYear, setTempYear] = useState(new Date(currentMonthView).getFullYear());
    const [tempMonth, setTempMonth] = useState(new Date(currentMonthView).getMonth());

    const yearScrollRef = useRef<ScrollView>(null);
    const monthScrollRef = useRef<ScrollView>(null);

    const ITEM_HEIGHT = 44; // Approx height of each picker item (padding + text)

    const sortedSelected = useMemo(() => [...selectedDates].sort(), [selectedDates]);

    const markedDates = useMemo(() => {
        const marked: Record<string, any> = {};

        // 1. Mark Blocked Dates (Manually by photographer)
        blockedDates.forEach(d => {
            marked[d] = {
                marked: true,
                dotColor: error,
                color: error + '20', // For range mode
                textColor: error,   // For range mode
                customStyles: {
                    container: { backgroundColor: error + '20', borderRadius: 8 },
                    text: { color: error, fontWeight: 'bold' }
                }
            };
        });

        // 2. Mark Booked Dates (Confirmed bookings)
        bookedDates.forEach(d => {
            marked[d] = {
                disabled: true,
                disableTouchEvent: true,
                marked: true,
                dotColor: '#a855f7', // Purple for booked
                color: '#e9d5ff',    // For range mode
                textColor: '#a855f7', // For range mode
                customStyles: {
                    container: { backgroundColor: '#e9d5ff', borderRadius: 8 },
                    text: { color: '#a855f7', fontWeight: 'bold' }
                }
            };
        });

        // 3. Mark Selected Dates based on mode
        if (mode === 'range') {
            if (selectedDates.length > 0) {
                const startStr = sortedSelected[0];
                const endStr = sortedSelected.length === 2 ? sortedSelected[1] : startStr;
                
                const start = new Date(startStr);
                const end = new Date(endStr);
                const current = new Date(start);

                while (current <= end) {
                    const dStr = current.toISOString().split('T')[0];
                    const isEdge = dStr === startStr || dStr === endStr;
                    
                    // Period marking (range mode) uses color/textColor
                    marked[dStr] = {
                        ...marked[dStr],
                        color: isEdge ? primary : primary + '30',
                        textColor: isEdge ? white : primary,
                        startingDay: dStr === startStr,
                        endingDay: dStr === endStr,
                    };
                    current.setDate(current.getDate() + 1);
                }
            }
        } else {
            // Single or Multi mode
            selectedDates.forEach(d => {
                // Custom marking uses customStyles or selectedColor + selectedTextColor
                marked[d] = {
                    ...marked[d],
                    selected: true,
                    selectedColor: primary,
                    selectedTextColor: white,
                    customStyles: {
                        container: {
                            backgroundColor: primary,
                            borderRadius: 8,
                        },
                        text: {
                            color: white,
                        }
                    }
                };
            });
        }

        return marked;
    }, [mode, selectedDates, sortedSelected, blockedDates, bookedDates, primary, white, error]);

    const handleDayPress = (day: any) => {
        const dateStr = day.dateString;

        // 1. Don't allow selecting booked dates (actual bookings are managed elsewhere)
        if (bookedDates.includes(dateStr)) return;

        // 2. Conditionally allow selecting blocked dates (e.g. for photographers to unblock)
        if (!allowSelectingBlockedDates && blockedDates.includes(dateStr)) {
            Alert.alert("Date Unavailable", "The photographer has marked this date as unavailable.");
            return;
        }

        if (mode === 'single') {
            onSelectDates([dateStr]);
        } else if (mode === 'multi') {
            if (selectedDates.includes(dateStr)) {
                onSelectDates(selectedDates.filter(d => d !== dateStr));
            } else {
                onSelectDates([...selectedDates, dateStr]);
            }
        } else if (mode === 'range') {
            if (selectedDates.length === 0 || selectedDates.length === 2) {
                // Start a new range
                onSelectDates([dateStr]);
            } else {
                // Complete the range
                const start = selectedDates[0];
                if (dateStr === start) {
                    onSelectDates([dateStr]); // Toggle back to single if same date
                } else {
                    // Always sort so they're in order
                    const newRange = [start, dateStr].sort();
                    onSelectDates(newRange);
                }
            }
        }
    };

    const openPicker = () => {
        const date = new Date(currentMonthView);
        setTempYear(date.getFullYear());
        setTempMonth(date.getMonth());
        setIsPickerVisible(true);
    };

    const handleApply = () => {
        // Use local date construction to avoid timezone shifts
        const year = tempYear;
        const month = String(tempMonth + 1).padStart(2, '0');
        setCurrentMonthView(`${year}-${month}-01`);
        setCalendarKey(prev => prev + 1); // Force navigation
        setIsPickerVisible(false);
    };

    const currentYearVal = new Date().getFullYear();
    const years = useMemo(() => {
        const range = [];
        for (let y = currentYearVal + 10; y >= 1930; y--) range.push(y);
        return range;
    }, [currentYearVal]);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        if (isPickerVisible) {
            // Give layout a moment to stabilize
            setTimeout(() => {
                const yearIndex = years.indexOf(tempYear);
                if (yearIndex !== -1 && yearScrollRef.current) {
                    yearScrollRef.current.scrollTo({ y: yearIndex * ITEM_HEIGHT - 100, animated: true });
                }
                if (monthScrollRef.current) {
                    monthScrollRef.current.scrollTo({ y: tempMonth * ITEM_HEIGHT - 100, animated: true });
                }
            }, 100);
        }
    }, [isPickerVisible, years, tempYear, tempMonth]);

    const renderYearPicker = () => {

        return (
            <Modal
                visible={isPickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsPickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsPickerVisible(false)}
                >
                    <View style={[styles.pickerCard, { backgroundColor: white }]}>
                        <View style={styles.pickerHeader}>
                            <ThemedText testID="calendar-picker-title" weight="bold" type="lg">Select Year & Month</ThemedText>
                            <TouchableOpacity onPress={() => setIsPickerVisible(false)}>
                                <Ionicons name="close" size={24} color={gray900} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.pickerBody}>
                            <ScrollView 
                                ref={yearScrollRef}
                                testID="year-picker-scroll"
                                style={styles.pickerColumn} 
                                showsVerticalScrollIndicator={false}
                            >
                                {years.map(y => (
                                    <TouchableOpacity
                                        key={y}
                                        testID={"year-item-" + y}
                                        style={[styles.pickerItem, y === tempYear && { backgroundColor: primary + '20' }]}
                                        onPress={() => setTempYear(y)}
                                    >
                                        <ThemedText 
                                            style={{ color: y === tempYear ? primary : gray900 }}
                                            weight={y === tempYear ? "bold" : "normal"}
                                        >
                                            {y}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <ScrollView 
                                ref={monthScrollRef}
                                testID="month-picker-scroll"
                                style={styles.pickerColumn} 
                                showsVerticalScrollIndicator={false}
                            >
                                {months.map((m, idx) => (
                                    <TouchableOpacity
                                        key={m}
                                        testID={"month-item-" + idx}
                                        style={[styles.pickerItem, idx === tempMonth && { backgroundColor: primary + '20' }]}
                                        onPress={() => setTempMonth(idx)}
                                    >
                                        <ThemedText 
                                            style={{ color: idx === tempMonth ? primary : gray900 }}
                                            weight={idx === tempMonth ? "bold" : "normal"}
                                        >
                                            {m}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity 
                            testID="calendar-apply-button"
                            style={[styles.applyBtn, { backgroundColor: primary }]}
                            onPress={handleApply}
                        >
                            <ThemedText weight="bold" style={{ color: white }}>Done</ThemedText>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    return (
        <View style={styles.container}>
            <Calendar
                key={calendarKey}
                markingType={mode === 'range' ? 'period' : 'custom'}
                current={currentMonthView}
                onMonthChange={(month: any) => setCurrentMonthView(month.dateString)}
                minDate={minDate}
                maxDate={maxDate}
                markedDates={markedDates}
                onDayPress={handleDayPress}
                renderHeader={(date: any) => {
                    const month = date.toString('MMMM');
                    const year = date.toString('yyyy');
                    return (
                        <TouchableOpacity 
                            testID="calendar-header-picker"
                            style={styles.headerBtn}
                            onPress={openPicker}
                        >
                            <ThemedText weight="bold" style={{ color: gray900, fontSize: 16 }}>
                                {month} {year}
                            </ThemedText>
                            <Ionicons name="chevron-down" size={16} color={gray600} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    );
                }}
                theme={{
                    backgroundColor: white,
                    calendarBackground: white,
                    textSectionTitleColor: gray500,
                    selectedDayBackgroundColor: primary,
                    selectedDayTextColor: white,
                    todayTextColor: primary,
                    dayTextColor: gray900,
                    textDisabledColor: gray300,
                    dotColor: primary,
                    selectedDotColor: white,
                    arrowColor: primary,
                    disabledArrowColor: gray300,
                    monthTextColor: gray900,
                    indicatorColor: primary,
                    textDayFontWeight: '600',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 12,
                }}
            />

            {showLegend && (
                <View style={[styles.legend, { borderTopColor: gray200 }]}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: white, borderColor: gray300 }]} />
                        <ThemedText type="xs" style={{ color: gray600 }}>Available</ThemedText>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: primary }]} />
                        <ThemedText type="xs" style={{ color: gray600 }}>Selected</ThemedText>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: error + '20', borderColor: error }]} />
                        <ThemedText type="xs" style={{ color: gray600 }}>Blocked (Unavailable)</ThemedText>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#e9d5ff', borderColor: '#a855f7' }]} />
                        <ThemedText type="xs" style={{ color: gray600 }}>Booked (Confirmed)</ThemedText>
                    </View>
                </View>
            )}
            {renderYearPicker()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        borderTopWidth: 1,
        backgroundColor: '#fff',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 4,
        borderWidth: 1,
    },
    headerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerCard: {
        width: '85%',
        maxHeight: '70%',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    pickerBody: {
        flexDirection: 'row',
        height: 300,
    },
    pickerColumn: {
        flex: 1,
    },
    pickerItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginVertical: 2,
    },
    applyBtn: {
        marginTop: 20,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
