import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

interface PointsIndicatorProps {
    points: number;
    currentBadge?: { badge_name: string; points_required: number };
    nextBadge?: { badge_name: string; points_required: number } | null;
    showProgress?: boolean;
}

export const PointsIndicator: React.FC<PointsIndicatorProps> = ({
    points,
    currentBadge,
    nextBadge,
    showProgress = true
}) => {
    const gray900 = useThemeColor({}, 'gray900');
    const gray600 = useThemeColor({}, 'gray600');
    const primary = useThemeColor({}, 'primary');

    const progress = nextBadge
        ? ((points - (currentBadge?.points_required || 0)) /
            (nextBadge.points_required - (currentBadge?.points_required || 0))) * 100
        : 100;

    return (
        <View style={styles.container}>
            <View style={styles.pointsRow}>
                <ThemedText type="2xl" weight="bold" style={{ color: primary }}>
                    {points.toLocaleString()}
                </ThemedText>
                <ThemedText type="sm" weight="medium" style={{ color: gray600 }}>
                    points
                </ThemedText>
            </View>

            {showProgress && nextBadge && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${Math.min(progress, 100)}%`, backgroundColor: primary }
                            ]}
                        />
                    </View>
                    <ThemedText type="xs" style={{ color: gray600 }}>
                        {nextBadge.points_required - points} points to {nextBadge.badge_name}
                    </ThemedText>
                </View>
            )}

            {showProgress && !nextBadge && (
                <ThemedText type="xs" style={{ color: gray600, marginTop: 8 }}>
                    🎉 Maximum rank achieved!
                </ThemedText>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    pointsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    progressContainer: {
        gap: 4,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
});
