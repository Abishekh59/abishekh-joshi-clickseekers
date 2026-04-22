import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

interface BadgeDisplayProps {
    badgeName: string;
    size?: 'small' | 'medium' | 'large';
}

const BADGE_IMAGES: Record<string, any> = {
    'Rookie': require('../assets/images/Badges/Rookie.png'),
    'Rising Star': require('../assets/images/Badges/RisingStar.png'),
    'Pro Shooter': require('../assets/images/Badges/ProShooter.png'),
    'Elite Lens': require('../assets/images/Badges/EliteLens.png'),
    'Golden Lens': require('../assets/images/Badges/GoldenLens.png'),
};

const BADGE_COLORS: Record<string, string> = {
    'Beginner': '#94a3b8',
    'Rookie': '#9ca3af',
    'Rising Star': '#60a5fa',
    'Pro Shooter': '#8b5cf6',
    'Elite Lens': '#f59e0b',
    'Golden Lens': '#eab308',
};

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badgeName, size = 'medium' }) => {
    const color = BADGE_COLORS[badgeName] || '#9ca3af';
    const badgeImage = BADGE_IMAGES[badgeName] || BADGE_IMAGES['Rookie'];

    const imageSize = size === 'small' ? 20 : size === 'large' ? 40 : 30;
    const textType = size === 'small' ? 'xs' : size === 'large' ? 'lg' : 'sm';

    return (
        <View style={[styles.container, { backgroundColor: `${color}15` }]}>
            <Image
                source={badgeImage}
                style={{ width: imageSize, height: imageSize }}
                resizeMode="contain"
            />
            <ThemedText
                type={textType as any}
                weight="bold"
                style={[styles.text, { color }]}
            >
                {badgeName}
            </ThemedText>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    text: {
        // Color set dynamically
    },
});
