import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { ThemedText } from "../components/themed-text";
import Ionicons from "react-native-vector-icons/Ionicons";
import Navbar from "../components/navbar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Feature {
    icon: string;
    title: string;
    description: string;
    color: string;
}

const features: Feature[] = [
    {
        icon: "camera-outline",
        title: "Verified Photographers",
        description:
            "All photographers go through KYC verification for your safety and trust.",
        color: "#3b82f6",
    },
    {
        icon: "shield-checkmark-outline",
        title: "Secure Payments",
        description: "Safe and secure payment processing with buyer protection.",
        color: "#10b981",
    },
    {
        icon: "trending-up-outline",
        title: "Quality Rankings",
        description:
            "Transparent ranking system based on performance and client satisfaction.",
        color: "#f59e0b",
    },
    {
        icon: "people-outline",
        title: "Easy Booking",
        description:
            "Simple booking process with real-time chat and calendar management.",
        color: "#8b5cf6",
    },
    {
        icon: "trophy-outline",
        title: "Portfolio Showcase",
        description:
            "Instagram-style portfolios to showcase photographer work beautifully.",
        color: "#ec4899",
    },
    {
        icon: "flash-outline",
        title: "Gamified Experience",
        description: "Earn points, climb rankings, and unlock achievements.",
        color: "#f97316",
    },
];

interface ContactInfo {
    icon: string;
    label: string;
    value: string;
    color: string;
    link?: string;
}

const contactInfo: ContactInfo[] = [
    {
        icon: "mail-outline",
        label: "Email Us",
        value: "clickseekersofficial@gmail.com.com",
        color: "#3b82f6",
        link: "mailto:clickseekersofficial@gmail.com",
    },
    {
        icon: "call-outline",
        label: "Call Us",
        value: "+977 9800000000",
        color: "#10b981",
        link: "tel:+9779800000000",
    },
    {
        icon: "location-outline",
        label: "Visit Us",
        value: "Kathmandu, Nepal",
        color: "#f59e0b",
    },
];


export default function AboutPage() {
    const Text = ThemedText;
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleOpenLink = (url?: string) => {
        if (url) {
            Linking.openURL(url);
        }
    };

    return (
        <View style={styles.wrapper}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <LinearGradient
                    colors={["#1e3a8a", "#3b82f6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.hero, { paddingTop: insets.top + 16 }]}
                >
                    <View style={styles.heroContent}>
                        <Image source={require("../assets/images/logo.png")} style={styles.heroLogo} resizeMode="contain" />
                        <Text style={styles.heroTitle}>ClickSeekers</Text>
                        <Text style={styles.heroSubtitle}>
                            Nepal's Premier Photography Marketplace connecting clients with
                            verified professional photographers
                        </Text>
                    </View>
                </LinearGradient>

                {/* Main Content */}
                <View style={styles.content}>
                    {/* What is ClickSeekers */}
                    <Text style={styles.sectionTitle}>What is ClickSeekers?</Text>
                    <Text style={styles.sectionDescription}>
                        ClickSeekers is a cross-platform mobile marketplace designed
                        specifically for Nepal's photography industry. We bridge the gap
                        between clients seeking professional photographers and talented
                        photographers looking to grow their business.
                    </Text>

                    {/* Stats */}
                    <View style={styles.statsCard}>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>500+</Text>
                                <Text style={styles.statLabel}>PHOTOGRAPHERS</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>2K+</Text>
                                <Text style={styles.statLabel}>BOOKINGS</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>4.8★</Text>
                                <Text style={styles.statLabel}>AVG RATING</Text>
                            </View>
                        </View>
                    </View>

                    {/* Features */}
                    <Text style={styles.sectionTitle}>Why Choose ClickSeekers?</Text>
                    <View style={styles.featuresGrid}>
                        {features.map((feature, index) => (
                            <View key={index} style={styles.featureCard}>
                                <View style={styles.featureHeader}>
                                    <View
                                        style={[
                                            styles.featureIconContainer,
                                            { backgroundColor: feature.color },
                                        ]}
                                    >
                                        <Ionicons name={feature.icon as any} size={24} color="#fff" />
                                    </View>
                                    <Text style={styles.featureTitle}>{feature.title}</Text>
                                </View>
                                <Text style={styles.featureDescription}>
                                    {feature.description}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* CTA Section */}
                    <View style={styles.ctaSection}>
                        <Text style={styles.sectionTitle}>Ready to Get Started?</Text>
                        <Text style={styles.sectionDescription}>
                            Join thousands of satisfied clients and photographers on
                            ClickSeekers today!
                        </Text>
                        <View style={styles.ctaButtons}>
                            <TouchableOpacity
                                style={styles.ctaBtnPrimary}
                                onPress={() => router.push("/role" as any)}
                            >
                                <LinearGradient
                                    colors={["#3b82f6", "#2563eb"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.ctaGradient}
                                >
                                    <Text style={styles.ctaBtnPrimaryText}>Get Started</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Contact Information Section */}
                    <View style={styles.contactSection}>
                        <Text style={styles.sectionTitle}>Get In Touch</Text>
                        <Text style={styles.sectionDescription}>
                            Have questions? We're here to help!
                        </Text>

                        <View style={styles.contactCards}>
                            {contactInfo.map((info, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.contactCard}
                                    onPress={() => handleOpenLink(info.link)}
                                    activeOpacity={info.link ? 0.7 : 1}
                                >
                                    <View
                                        style={[
                                            styles.contactIconContainer,
                                            { backgroundColor: info.color },
                                        ]}
                                    >
                                        <Ionicons name={info.icon as any} size={24} color="#fff" />
                                    </View>
                                    <View style={styles.contactContent}>
                                        <Text style={styles.contactLabel}>{info.label}</Text>
                                        <Text style={styles.contactValue}>{info.value}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>


                    </View>
                </View>

                {/* Bottom spacing for navbar */}
                <View style={{ height: 100 }} />
            </ScrollView>
            <Navbar />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    container: {
        flex: 1,
    },
    hero: {
        paddingTop: 60,
        paddingBottom: 48,
        paddingHorizontal: 24,
        alignItems: "center",
    },
    heroContent: {
        alignItems: "center",
    },
    heroLogo: {
        width: 80,
        height: 80,
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 12,
        lineHeight: 40,
    },
    heroSubtitle: {
        fontSize: 16,
        color: "rgba(255, 255, 255, 0.9)",
        lineHeight: 24,
        textAlign: "center",
        maxWidth: 350,
    },
    content: {
        padding: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 12,
        textAlign: "center",
        lineHeight: 32,
    },
    sectionDescription: {
        fontSize: 15,
        color: "#64748b",
        lineHeight: 24,
        marginBottom: 24,
        textAlign: "center",
    },
    statsCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        marginBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    statsGrid: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
    },
    statValue: {
        fontSize: 28,
        fontWeight: "700",
        color: "#3b82f6",
        marginBottom: 4,
        lineHeight: 38,
    },
    statLabel: {
        fontSize: 11,
        color: "#64748b",
        letterSpacing: 0.5,
    },
    featuresGrid: {
        gap: 16,
        marginBottom: 32,
    },
    featureCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    featureHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    featureIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1e293b",
        flex: 1,
    },
    featureDescription: {
        fontSize: 14,
        color: "#64748b",
        lineHeight: 22,
    },
    ctaSection: {
        marginTop: 16,
        alignItems: "center",
    },
    ctaButtons: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
        width: "100%",
    },
    ctaBtnPrimary: {
        flex: 1,
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#3b82f6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    ctaGradient: {
        paddingVertical: 16,
        alignItems: "center",
    },
    ctaBtnPrimaryText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#fff",
    },
    ctaBtnSecondary: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: "#fff",
        borderWidth: 2,
        borderColor: "#3b82f6",
        alignItems: "center",
    },
    ctaBtnSecondaryText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#3b82f6",
    },
    contactSection: {
        marginTop: 48,
    },
    contactCards: {
        gap: 12,
        marginBottom: 32,
    },
    contactCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    contactIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    contactContent: {
        flex: 1,
    },
    contactLabel: {
        fontSize: 12,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    contactValue: {
        fontSize: 15,
        color: "#1e293b",
        fontWeight: "500",
    },
    socialSection: {
        alignItems: "center",
        marginTop: 16,
    },
    socialTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: 16,
    },
    socialLinks: {
        flexDirection: "row",
        gap: 16,
    },
    socialLink: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
});
