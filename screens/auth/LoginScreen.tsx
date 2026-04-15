import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    ScrollView,
    Image,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import Animated, { FadeInDown, FadeInUp, Layout } from "react-native-reanimated";
import AuthStatusModal from "../../components/AuthStatusModal";

interface LoginScreenProps {
    onLogin: (role: "Donor" | "Recipient") => void;
    onSwitchToSignup: () => void;
    onForgotPassword?: () => void;
    onPasswordRecovery?: () => void;
}

export default function LoginScreen({
    onLogin,
    onSwitchToSignup,
    onForgotPassword,
    onPasswordRecovery,
}: LoginScreenProps) {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [loggingIn, setLoggingIn] = useState(false);

    // Forgot password simple state (no sub-modals for stability)
    const [viewMode, setViewMode] = useState<"login" | "forgot_email" | "forgot_otp">("login");
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotOtp, setForgotOtp] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState("");
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const otpInputRef = React.useRef<TextInput>(null);

    // ── Status Modal State ──────────────────────────────────────
    const [statusVisible, setStatusVisible] = useState(false);
    const [statusType, setStatusType] = useState<'error' | 'success'>('error');
    const [statusTitle, setStatusTitle] = useState("");
    const [statusMessage, setStatusMessage] = useState("");

    const showError = (title: string, message: string) => {
        setStatusTitle(title);
        setStatusMessage(message);
        setStatusType('error');
        setStatusVisible(true);
    };

    const showSuccess = (title: string, message: string) => {
        setStatusTitle(title);
        setStatusMessage(message);
        setStatusType('success');
        setStatusVisible(true);
    };

    // ── Login ────────────────────────────────────────────────────
    const handleLogin = async () => {
        let valid = true;
        if (!email.trim()) { setEmailError("Required"); valid = false; } else setEmailError("");
        if (!password.trim()) { setPasswordError("Required"); valid = false; } else setPasswordError("");
        if (!valid) return;

        setLoggingIn(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoggingIn(false);
        if (error) {
            showError("Login Failed", error.message);
        }
    };

    // ── Forgot password flow ─────────────────────────────────────
    const handleSendResetCode = async () => {
        if (!forgotEmail.trim()) { setForgotError("Please enter your email."); return; }
        setForgotLoading(true);
        setForgotError("");
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);
        setForgotLoading(false);
        if (error) { 
            // Silently ignore rate limits durante development if they specifically asked to remove the popup 
            if (!error.message.includes("rate limit")) {
                showError("Reset Failed", error.message);
                return;
            }
            console.warn("Email Rate Limit Suppressed:", error.message);
        }
        showSuccess("Email Sent", "Check your inbox for the 8-digit verification code.");
        setViewMode("forgot_otp");
    };

    const handleVerifyResetCode = async () => {
        if (forgotOtp.length !== 6) { setForgotError("Please enter the complete 6-digit code."); return; }
        setForgotLoading(true);
        setForgotError("");
        
        const { error } = await supabase.auth.verifyOtp({ email: forgotEmail, token: forgotOtp, type: "recovery" });
        setForgotLoading(false);
        if (error) { setForgotError(error.message); return; }

        // Success! Now let App.tsx know we are ready to reset.
        if (onPasswordRecovery) onPasswordRecovery();
    };

    // ── Render Forgot Email View ────────────────────────────────
    if (viewMode === "forgot_email") {
        return (
            <LinearGradient colors={["#FF1493", "#FF69B4", "#FFF0F5"]} style={styles.root}>
                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + vs(20) }]} bounces={false} keyboardShouldPersistTaps="handled">
                    <View style={{ alignItems: "center", paddingHorizontal: ms(24), paddingVertical: vs(40) }}>
                        <Animated.View entering={FadeInDown.duration(800)} style={styles.premiumIconCircle}>
                             <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']} style={styles.gradientCircleInner}>
                                <Ionicons name="lock-closed" size={44} color="#fff" />
                            </LinearGradient>
                        </Animated.View>

                        <Animated.Text entering={FadeInUp.delay(200)} style={styles.premiumTitle}>Forgot Password?</Animated.Text>
                        <Animated.Text entering={FadeInUp.delay(300)} style={styles.premiumSubtitle}>
                            Enter your email address and we'll send a 6-digit code to reset your password.
                        </Animated.Text>

                        <Animated.View entering={FadeInUp.delay(500)} style={styles.premiumCard}>
                            <Text style={styles.cardInfoLabel}>EMAIL ADDRESS</Text>
                            <View style={[styles.inputRow, { marginTop: 8, marginBottom: 12 }]}>
                                <Ionicons name="mail-outline" size={20} color="#D1D1D1" />
                                <TextInput
                                    style={styles.inputText}
                                    value={forgotEmail}
                                    onChangeText={(t) => { setForgotEmail(t); setForgotError(""); }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholder="Your email address"
                                    placeholderTextColor="#bbb"
                                />
                            </View>

                            {forgotError ? <Text style={styles.fieldError}>{forgotError}</Text> : null}

                            <TouchableOpacity 
                                style={styles.primaryBtn} 
                                onPress={handleSendResetCode} 
                                disabled={forgotLoading}
                            >
                                {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send reset code</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setViewMode("login")} style={styles.cancelLink}>
                                <Text style={styles.cancelLinkText}>Back to Login</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </ScrollView>
            </LinearGradient>
        );
    }

    // ── Render Forgot OTP View ────────────────────────────────
    if (viewMode === "forgot_otp") {
        return (
            <LinearGradient colors={["#FF1493", "#FF69B4", "#FFF0F5"]} style={styles.root}>
                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + vs(20) }]} bounces={false} keyboardShouldPersistTaps="handled">
                    <View style={{ alignItems: "center", paddingHorizontal: ms(24), paddingVertical: vs(40) }}>
                        <Animated.View entering={FadeInDown.duration(800)} style={styles.premiumIconCircle}>
                            <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']} style={styles.gradientCircleInner}>
                                <Ionicons name="mail-open" size={44} color="#fff" />
                            </LinearGradient>
                        </Animated.View>

                        <Animated.Text entering={FadeInUp.delay(200)} style={styles.premiumTitle}>Verify Code</Animated.Text>
                        <Animated.Text entering={FadeInUp.delay(300)} style={styles.premiumSubtitle}>
                            We've sent a 6-digit code to <Text style={{fontWeight: '900', color: '#fff'}}>{forgotEmail}</Text>
                        </Animated.Text>

                        <Animated.View 
                            layout={Layout.springify()}
                            entering={FadeInUp.delay(500)} 
                            style={styles.premiumCard}
                        >
                            <Text style={styles.cardInfoLabel}>ENTER 6-DIGIT CODE</Text>

                            <TouchableOpacity
                                activeOpacity={1}
                                onPress={() => otpInputRef.current?.focus()}
                                style={styles.otpBoxesRow}
                            >
                                {Array.from({ length: 6 }).map((_, i) => {
                                    const isActive = forgotOtp.length === i;
                                    const isFilled = forgotOtp.length > i;
                                    return (
                                        <View key={i} style={[
                                            styles.otpBox,
                                            isActive && styles.otpBoxActive,
                                            isFilled && styles.otpBoxFilled
                                        ]}>
                                            {isFilled ? (
                                                <Text style={styles.otpBoxText}>{forgotOtp[i]}</Text>
                                            ) : isActive ? (
                                                <View style={styles.otpCursor} />
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </TouchableOpacity>

                            <TextInput
                                ref={otpInputRef}
                                value={forgotOtp}
                                onChangeText={(text) => {
                                    setForgotError("");
                                    setForgotOtp(text.replace(/[^0-9]/g, "").slice(0, 6));
                                }}
                                keyboardType="number-pad"
                                maxLength={6}
                                style={styles.hiddenInput}
                                autoFocus
                            />

                            {forgotError ? <Text style={[styles.fieldError, { textAlign: 'center', width: '100%', marginTop: 10 }]}>{forgotError}</Text> : <View style={{ height: 20 }} />}

                            <TouchableOpacity 
                                style={[styles.primaryBtn, { marginTop: 15, opacity: forgotOtp.length < 6 ? 0.7 : 1 }]} 
                                onPress={handleVerifyResetCode} 
                                disabled={forgotLoading || forgotOtp.length < 6}
                            >
                                {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify and continue</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => { setViewMode("forgot_email"); setForgotOtp(""); }} style={styles.cancelLink}>
                                <Text style={styles.cancelLinkText}>Change email address</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </ScrollView>
            </LinearGradient>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={[styles.mainBox, { paddingTop: vs(20) }]}>
                    {/* Logo */}
                    <View style={styles.logoWrap}>
                        <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
                    </View>

                    <Text style={styles.title}>Welcome!</Text>
                    <Text style={styles.subtitle}>join us by signing up and let's get started!</Text>

                    {/* Email */}
                    <Text style={styles.fieldLabel}>Email</Text>
                    <View style={[styles.inputRow, { borderColor: emailError ? '#e53e3e' : '#FF66CC', marginBottom: emailError ? 4 : 16 }]}>
                        <Ionicons name="mail-outline" size={20} color="#D1D1D1" />
                        <TextInput
                            style={styles.inputText}
                            value={email}
                            onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(""); }}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholderTextColor="#bbb"
                        />
                    </View>
                    {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

                    {/* Password */}
                    <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Password</Text>
                    <View style={[styles.inputRow, { borderColor: passwordError ? '#e53e3e' : '#FF66CC', marginBottom: passwordError ? 4 : 0 }]}>
                        <Ionicons name="lock-closed-outline" size={20} color="#D1D1D1" />
                        <TextInput
                            style={styles.inputText}
                            value={password}
                            onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(""); }}
                            secureTextEntry={!showPassword}
                            placeholderTextColor="#bbb"
                            onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7} style={{ padding: 4 }}>
                            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#D1D1D1" />
                        </TouchableOpacity>
                    </View>
                    {passwordError?.trim() ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

                    {/* Forgot password */}
                    <TouchableOpacity onPress={() => setViewMode("forgot_email")} activeOpacity={0.8} style={styles.forgotBtn}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <View style={{ height: 48 }} />

                    {/* Login Button */}
                    <TouchableOpacity activeOpacity={0.9} onPress={handleLogin} disabled={loggingIn} style={styles.primaryBtn}>
                        {loggingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Login</Text>}
                    </TouchableOpacity>

                    {/* Switch to Sign Up */}
                    <TouchableOpacity onPress={onSwitchToSignup} activeOpacity={0.8} style={styles.signupLink}>
                        <Text style={styles.signupLinkText}>
                            Don't have an account? <Text style={styles.signupLinkBold}>Sign up</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <AuthStatusModal
                visible={statusVisible}
                type={statusType}
                title={statusTitle}
                message={statusMessage}
                onClose={() => setStatusVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFF4F8' },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    mainBox: { paddingHorizontal: ms(32), paddingVertical: vs(40), alignItems: 'center', width: '100%' },
    innerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ms(32) },

    // Logo
    logoWrap: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    logo: { width: '100%', height: '100%' },

    // Typography
    title: { fontSize: 32, fontWeight: '800', color: '#FF1493', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' },
    subtitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 32, textAlign: 'center' },

    // Forms
    fieldLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 6, marginLeft: 2, alignSelf: 'flex-start', width: '100%' },
    inputRow: {
        width: '100%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5,
        height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    },
    inputText: { flex: 1, marginLeft: 10, fontSize: 15, color: '#000', height: 48 },
    fieldError: { color: '#e53e3e', fontSize: 12, fontWeight: '700', marginLeft: 4, marginBottom: 8, alignSelf: 'flex-start' },

    // Buttons
    primaryBtn: { 
        width: '100%', height: 54, borderRadius: 27, backgroundColor: '#FF66B2', 
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

    cancelBtn: { padding: 12 },
    cancelBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },

    forgotBtn: { alignSelf: 'flex-end', marginTop: 12, paddingVertical: 4 },
    forgotText: { fontSize: 13, fontWeight: '700', color: '#FF1493' },

    signupLink: { alignSelf: 'center', marginTop: 16, padding: 8 },
    signupLinkText: { fontSize: 14, fontWeight: '500', color: '#555' },
    signupLinkBold: { fontWeight: '800', color: '#FF1493' },

    // Premium UI Additions
    premiumIconCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center", alignItems: "center",
        marginBottom: 25,
        borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
    },
    gradientCircleInner: { width: '100%', height: '100%', borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
    premiumTitle: { fontSize: 32, fontWeight: "900", color: "#fff", textAlign: "center", marginBottom: 10 },
    premiumSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 20, maxWidth: '90%', marginTop: 8 },
    premiumCard: {
        backgroundColor: "#fff",
        borderRadius: 35,
        paddingVertical: 35,
        paddingHorizontal: 25,
        width: "100%",
        marginTop: 35,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 15,
        alignItems: "center",
    },
    cardInfoLabel: { fontSize: 13, fontWeight: "800", color: "#BBB", marginBottom: 15, letterSpacing: 2 },
    cancelLink: { marginTop: 20, padding: 8 },
    cancelLinkText: { color: "#999", fontSize: 14, fontWeight: "700", textDecorationLine: 'underline' },

    // OTP Boxes
    otpBoxesRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    otpBox: {
        width: 36, height: 48,
        borderRadius: 12,
        marginHorizontal: 3,
        backgroundColor: "#F8F9FA",
        borderWidth: 1.5,
        borderColor: "#E9ECEF",
        justifyContent: "center", alignItems: "center",
    },
    otpBoxActive: { borderColor: "#FF1493", borderWidth: 2.5 },
    otpBoxFilled: { backgroundColor: "#FFF0F5", borderColor: "#FF69B4" },
    otpBoxText: { fontSize: 20, fontWeight: "900", color: "#333" },
    otpCursor: { width: 2, height: 18, backgroundColor: "#FF1493" },
    hiddenInput: { position: "absolute", opacity: 0, height: 0, width: 0 },
});
