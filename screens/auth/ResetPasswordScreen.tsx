import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { s, vs, ms } from "../../lib/scaling";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import Animated, { FadeInDown, FadeInUp, Layout } from "react-native-reanimated";
import AuthStatusModal from "../../components/AuthStatusModal";

interface ResetPasswordScreenProps {
    onPasswordUpdated: () => void;
}

export default function ResetPasswordScreen({ onPasswordUpdated }: ResetPasswordScreenProps) {
    const insets = useSafeAreaInsets();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [updating, setUpdating] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalError, setModalError] = useState("");

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setErrorMsg("Authentication session missing! Please try the 'Forgot Password' process again.");
            }
        };
        checkSession();
    }, []);

    // Calculate password strength
    const getPasswordStrength = (pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } => {
        if (pw.length === 0) return { level: 0, label: '', color: '#D1D1D1' };
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        if (score <= 1) return { level: 1, label: 'Weak', color: '#e53e3e' };
        if (score <= 2) return { level: 2, label: 'Moderate', color: '#dd6b20' };
        return { level: 3, label: 'Strong', color: '#38a169' };
    };
    const pwStrength = getPasswordStrength(password);

    const handleUpdatePassword = async () => {
        setErrorMsg("");
        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }
        if (pwStrength.level < 2) {
            setErrorMsg("Please choose a stronger password.");
            return;
        }

        setUpdating(true);
        const { error } = await supabase.auth.updateUser({ password });
        setUpdating(false);

        if (error) {
            setModalError(error.message || "Failed to update password.");
            setShowErrorModal(true);
        } else {
            setShowSuccessModal(true);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        onPasswordUpdated();
    };

    return (
        <View style={{ flex: 1, paddingTop: insets.top }}>
            <LinearGradient colors={["#FF1493", "#FF69B4", "#FFF0F5"]} style={styles.root}>
                <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} keyboardShouldPersistTaps="handled">
                    <View style={{ alignItems: "center", paddingHorizontal: ms(24), paddingVertical: vs(40) }}>
                        
                        <Animated.View entering={FadeInDown.duration(800)} style={styles.premiumIconCircle}>
                             <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']} style={styles.gradientCircleInner}>
                                <Ionicons name="key" size={44} color="#fff" />
                            </LinearGradient>
                        </Animated.View>

                        <Animated.Text entering={FadeInUp.delay(200)} style={styles.premiumTitle}>Set New Password</Animated.Text>
                        <Animated.Text entering={FadeInUp.delay(300)} style={styles.premiumSubtitle}>Almost there! Please choose a strong password to secure your account.</Animated.Text>

                        <Animated.View entering={FadeInUp.delay(500)} style={styles.premiumCard}>
                            {/* New Password */}
                            <View style={styles.fieldWrap}>
                                <Text style={styles.cardInfoLabel}>NEW PASSWORD</Text>
                                <View style={[styles.inputBox, {
                                    borderColor: pwStrength.level === 3 ? '#38a169' : pwStrength.level === 2 ? '#dd6b20' : pwStrength.level === 1 ? '#e53e3e' : '#D1D1D1',
                                }]}>
                                    <TextInput 
                                        style={styles.input} 
                                        secureTextEntry 
                                        value={password} 
                                        onChangeText={(t) => { setPassword(t); setErrorMsg(""); }} 
                                        placeholder="Enter new password"
                                        placeholderTextColor="#bbb"
                                    />
                                </View>
                            </View>

                            {/* Password strength bar */}
                            {password.length > 0 && (
                                <View style={{ width: '100%', marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                                        {[1, 2, 3].map((seg) => (
                                            <View key={seg} style={{
                                                flex: 1, height: 5, borderRadius: 4, marginHorizontal: 2,
                                                backgroundColor: pwStrength.level >= seg ? pwStrength.color : '#E2E8F0',
                                            }} />
                                        ))}
                                    </View>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: pwStrength.color, marginLeft: 2 }}>{pwStrength.label}</Text>
                                </View>
                            )}

                            {/* Confirm Password */}
                            <View style={styles.fieldWrap}>
                                <Text style={styles.cardInfoLabel}>CONFIRM PASSWORD</Text>
                                <View style={[styles.inputBox, { borderColor: '#D1D1D1' }]}>
                                    <TextInput 
                                        style={styles.input} 
                                        secureTextEntry 
                                        value={confirmPassword} 
                                        onChangeText={(t) => { setConfirmPassword(t); setErrorMsg(""); }} 
                                        placeholder="Re-enter new password"
                                        placeholderTextColor="#bbb"
                                    />
                                </View>
                            </View>

                            {errorMsg ? <Text style={styles.fieldError}>{errorMsg}</Text> : null}

                            <TouchableOpacity 
                                style={styles.primaryBtn} 
                                onPress={handleUpdatePassword} 
                                disabled={updating}
                            >
                                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </ScrollView>
            </LinearGradient>

            {/* Success Modal */}
            <AuthStatusModal 
                visible={showSuccessModal}
                type="success"
                title="Success!"
                message="Your password has been updated successfully. You can now log in with your new credentials."
                onClose={handleSuccessClose}
            />

            {/* Error Modal */}
            <AuthStatusModal 
                visible={showErrorModal}
                type="error"
                title="Update Failed"
                message={modalError}
                onClose={() => setShowErrorModal(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    
    premiumIconCircle: {
        width: ms(100), height: ms(100), borderRadius: ms(50),
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center", alignItems: "center",
        marginBottom: vs(25),
        borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
    },
    gradientCircleInner: { width: '100%', height: '100%', borderRadius: ms(50), justifyContent: 'center', alignItems: 'center' },
    premiumTitle: { fontSize: ms(32), fontWeight: "900", color: "#fff", textAlign: "center", marginBottom: vs(10) },
    premiumSubtitle: { fontSize: ms(13), color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: vs(20), maxWidth: '90%', marginTop: vs(8) },
    premiumCard: {
        backgroundColor: "#fff",
        borderRadius: ms(35),
        paddingVertical: vs(35),
        paddingHorizontal: ms(25),
        width: "100%",
        marginTop: vs(35),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 15,
        alignItems: "center",
    },
    cardInfoLabel: { fontSize: ms(13), fontWeight: "800", color: "#BBB", marginBottom: vs(15), letterSpacing: 2, width: '100%', textAlign: 'left', marginLeft: ms(2) },

    fieldWrap: { width: '100%', marginBottom: 15 },
    inputBox: { 
        width: '100%', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5,
        height: 52, justifyContent: 'center', paddingHorizontal: 14,
    },
    input: { flex: 1, fontSize: 15, color: '#000' },
    
    fieldError: { color: '#e53e3e', fontSize: 13, fontWeight: '700', marginTop: 4, marginBottom: 12, width: '100%', textAlign: 'center' },

    primaryBtn: { 
        width: '100%', height: 58, borderRadius: 20, backgroundColor: '#FF1493', 
        justifyContent: 'center', alignItems: 'center', marginTop: 12,
        shadowColor: "#FF1493", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8
    },
    primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 17, letterSpacing: 1 },
});
