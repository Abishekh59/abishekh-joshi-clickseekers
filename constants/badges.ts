export const BADGE_IMAGES: Record<string, any> = {
    Rookie: require('../assets/images/Badges/Rookie.png'),
    'Rising Star': require('../assets/images/Badges/RisingStar.png'),
    'Pro Shooter': require('../assets/images/Badges/ProShooter.png'),
    'Elite Lens': require('../assets/images/Badges/EliteLens.png'),
    'Golden Lens': require('../assets/images/Badges/GoldenLens.png'),
};

export const BADGE_TIERS = [
    { level: 1, name: 'Beginner', points: 0, commission: 10, label: 'Level 1: Beginner', desc: 'Start your journey' },
    { level: 2, name: 'Rookie', points: 300, commission: 9, label: 'Level 2: Rookie', desc: '300 points required' },
    { level: 3, name: 'Rising Star', points: 800, commission: 8, label: 'Level 3: RisingStar', desc: '800 points required' },
    { level: 4, name: 'Pro Shooter', points: 1500, commission: 7, label: 'Level 4: ProShooter', desc: '1500 points required' },
    { level: 5, name: 'Elite Lens', points: 3000, commission: 6, label: 'Level 5: EliteLens', desc: '3000 points required' },
    { level: 6, name: 'Golden Lens', points: 6000, commission: 5, label: 'Level 6: GoldenLens', desc: '6000+ points required' },
];

export function getBadgeForPoints(points: number) {
    let current = BADGE_TIERS[0];
    for (const tier of BADGE_TIERS) {
        if (points >= tier.points) current = tier;
        else break;
    }
    return current;
}
