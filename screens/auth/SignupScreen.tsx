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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import AuthStatusModal from "../../components/AuthStatusModal";
import Animated, { 
    FadeInDown, 
    FadeInUp, 
    FadeInRight, 
    Layout, 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring 
} from "react-native-reanimated";

// Reusable animated button for tactile feedback
const ScaleButton = ({ children, onPress, style }: any) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[animatedStyle, style]}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
                onPressIn={() => (scale.value = withSpring(0.96, { damping: 10, stiffness: 200 }))}
                onPressOut={() => (scale.value = withSpring(1))}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
};

const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];

interface SignupScreenProps {
    onSignupComplete: (role: "Donor" | "Recipient") => void;
    onNeedsVerification: (email: string, role: "Donor" | "Recipient") => void;
    onSwitchToLogin: () => void;
}

export default function SignupScreen({
    onSignupComplete,
    onNeedsVerification,
    onSwitchToLogin,
}: SignupScreenProps) {
    const insets = useSafeAreaInsets();
    // ── Form state ──────────────────────────────────────────────
    const [role, setRole] = useState<"Donor" | "Recipient" | null>(null);
    const [ageText, setAgeText] = useState("18"); // fallback for text input instead of slider
    const [gender, setGender] = useState("Female");
    const [pickingGender, setPickingGender] = useState(false);
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [city, setCity] = useState("");
    const [barangay, setBarangay] = useState("");
    const [address, setAddress] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // ── View mode ────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<"form" | "otp">("form");

    // ── Email validation ─────────────────────────────────────────
    const [emailTouched, setEmailTouched] = useState(false);
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const emailError = emailTouched && !isEmailValid;

    // ── Password strength ────────────────────────────────────────
    const getPasswordStrength = (pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } => {
        if (pw.length === 0) return { level: 0, label: '', color: '#D1D1D1' };
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        if (score <= 1) return { level: 1, label: 'Weak', color: '#e53e3e' };
        if (score <= 2) return { level: 2, label: 'Fair', color: '#dd6b20' };
        return { level: 3, label: 'Strong', color: '#38a169' };
    };
    const pwStrength = getPasswordStrength(password);

    // ── OTP bottom-sheet state ───────────────────────────────────
    const [otp, setOtp] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');

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

    const handleVerifyOtp = async () => {
        if (otpLoading || otp.length !== 6) return;
        setOtpLoading(true);
        setOtpError('');
        const { error } = await supabase.auth.verifyOtp({
            email: pendingEmail,
            token: otp,
            type: 'signup',
        });
        setOtpLoading(false);
        if (error) {
            setOtpError(error.message);
            setOtp('');
        }
        // ✅ On success: App.tsx onAuthStateChange fires → routes dashboard
    };

    const handleResendOtp = async () => {
        setOtp('');
        setOtpError('');
        const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
        if (error) setOtpError(error.message);
    };

    // ── Sign Up submit ───────────────────────────────────────────
    const handleSignUp = async () => {
        setEmailTouched(true);
        if (!name.trim() || !password.trim() || !city.trim() || !barangay.trim() || !address.trim() || !phone.trim() || !email.trim()) {
            showError("Missing Info", "Please fill in all fields completely.");
            return;
        }
        if (!isEmailValid) { showError("Invalid Email", "Please enter a valid email address."); return; }
        if (pwStrength.level < 2) { showError("Weak Password", "Add uppercase letters, numbers or symbols."); return; }
        if (phone.length < 8 || phone.length > 11) { showError("Invalid Phone", "Phone number must be 8 to 11 digits."); return; }
        if (!role) { showError("Selection Required", "Please select a role (Donor or Recipient)."); return; }
        
        const numericAge = parseInt(ageText) || 18;

        setSubmitting(true);
        const { data: signUpData, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name.trim() || 'New Member',
                    role: role || 'Donor',
                    phone: phone,
                    city: city,
                    barangay: barangay,
                    address: address,
                    age: numericAge,
                    gender: gender
                },
            },
        });
        setSubmitting(false);

        if (error) { 
            // Silently ignore rate limits during development if they specifically asked to remove the popup
            if (!error.message.includes("rate limit")) {
                showError("Signup Failed", error.message); 
                return;
            }
            console.warn("Email Rate Limit Suppressed:", error.message);
        }

        if (signUpData?.user && !signUpData.session) {
            // Email confirmation required -> delegate to App.tsx / VerificationScreen
            onNeedsVerification(email, role || 'Donor');
        } else if (signUpData?.user && signUpData.session) {
            // Already logged in (Auto-confirm) - App.tsx handles navigation via session
        } else {
            // Possible already registered but unconfirmed? 
            // In development, sometimes this happens. Let's try to verify anyway.
            onNeedsVerification(email, role || 'Donor');
        }
        // If auto-confirmed (email confirm disabled), App.tsx listener handles routing
    };

    const [currentStep, setCurrentStep] = useState<1 | 2>(1);

    const handleNext = () => {
        if (currentStep === 1) {
            if (!name || !email || !password || !role) {
                showError("Incomplete", "Please complete all fields in this step.");
                return;
            }
            if (pwStrength.level < 2) {
                showError("Weak Password", "Password is too weak. Try adding numbers or symbols.");
                return;
            }
            setCurrentStep(2);
        }
    };

    // ── GENDER PICKER VIEW ──
    if (pickingGender) {
        return (
            <LinearGradient colors={['#FFF4F8', '#FFE6F0']} style={styles.root}>
                <View style={styles.innerContainer}>
                    <Text style={[styles.title, { marginBottom: 24 }]}>Select Gender</Text>
                    {GENDERS.map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={styles.genderItem}
                            onPress={() => { setGender(item); setPickingGender(false); }}
                        >
                            <Text style={styles.genderItemText}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => setPickingGender(false)} style={{ marginTop: 24, padding: 12 }}>
                        <Text style={{ color: '#888', fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }


    // ── Main form ──
    return (
        <LinearGradient colors={['#FFF4F8', '#FFEBEB']} style={styles.root}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + vs(20) }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                    <Text style={styles.title}>Welcome!</Text>
                    <Text style={styles.subtitle}>Step {currentStep} of 2</Text>
                </View>

                {currentStep === 1 ? (
                    <Animated.View layout={Layout.springify()} entering={FadeInRight.delay(200)}>
                        <View style={styles.glassCard}>
                            <Text style={styles.sectionLabel}>ACCOUNT INFO</Text>

                            {/* Full Name */}
                            <View style={styles.fieldWrap}>
                                <View style={styles.inputBox}>
                                    <Ionicons name="person-outline" size={20} color="#FF1493" style={{ marginRight: 10 }} />
                                    <TextInput 
                                        style={styles.input} 
                                        value={name} 
                                        onChangeText={setName} 
                                        autoCapitalize="words" 
                                        placeholder="Full Name"
                                    />
                                </View>
                            </View>

                            {/* Email */}
                            <View style={[styles.fieldWrap, { marginTop: 16 }]}>
                                <View style={[styles.inputBox, {
                                    borderColor: emailError ? '#e53e3e' : emailTouched && isEmailValid ? '#38a169' : '#FFD6EF',
                                }]}>
                                    <Ionicons name="mail-outline" size={20} color="#FF1493" style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={(t) => { setEmail(t); setEmailTouched(true); }}
                                        onBlur={() => setEmailTouched(true)}
                                        autoCapitalize="none"
                                        placeholder="Email Address"
                                    />
                                </View>
                                {emailError && <Text style={styles.errorText}>Enter a valid email</Text>}
                            </View>

                            {/* Password */}
                            <View style={[styles.fieldWrap, { marginTop: 16 }]}>
                                <View style={[styles.inputBox, {
                                    borderColor: pwStrength.level === 3 ? '#38a169' : pwStrength.level === 2 ? '#dd6b20' : pwStrength.level === 1 ? '#e53e3e' : '#FFD6EF',
                                }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#FF1493" style={{ marginRight: 10 }} />
                                    <TextInput 
                                        style={styles.input} 
                                        secureTextEntry 
                                        value={password} 
                                        onChangeText={setPassword} 
                                        placeholder="Password"
                                    />
                                </View>
                                {/* Strength Bar */}
                                {password.length > 0 && (
                                    <View style={{ marginTop: 8 }}>
                                        <View style={{ flexDirection: 'row', gap: 4 }}>
                                            {[1, 2, 3].map((seg) => (
                                                <View key={seg} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: pwStrength.level >= seg ? pwStrength.color : '#EEE' }} />
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>I WANT TO BE A...</Text>
                            <View style={styles.roleGrid}>
                                {(["Donor", "Recipient"] as const).map((r) => (
                                    <TouchableOpacity 
                                        key={r} 
                                        style={[styles.roleCard, role === r && styles.roleCardActive]} 
                                        onPress={() => setRole(r)}
                                        activeOpacity={0.9}
                                    >
                                        <View style={[styles.roleIconBg, role === r && styles.roleIconBgActive]}>
                                            <MaterialCommunityIcons 
                                                name={r === 'Donor' ? 'heart-plus' : 'account-heart'} 
                                                size={32} 
                                                color={role === r ? '#fff' : '#FF66B2'} 
                                            />
                                        </View>
                                        <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <ScaleButton style={[styles.signUpBtn, { marginTop: 32 }]} onPress={handleNext}>
                                <Text style={styles.signUpBtnText}>Continue</Text>
                            </ScaleButton>
                        </View>
                    </Animated.View>
                ) : (
                    <Animated.View layout={Layout.springify()} entering={FadeInRight.delay(200)}>
                        <View style={styles.glassCard}>
                            <Text style={styles.sectionLabel}>CONTACT & LOCATION</Text>

                            {/* Phone */}
                            <View style={styles.fieldWrap}>
                                <View style={styles.inputBox}>
                                    <Ionicons name="call-outline" size={20} color="#FF1493" style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="phone-pad"
                                        value={phone}
                                        onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
                                        maxLength={11}
                                        placeholder="Phone Number"
                                    />
                                </View>
                            </View>

                            {/* Exact Address */}
                            <View style={[styles.fieldWrap, { marginTop: 16 }]}>
                                <View style={styles.inputBox}>
                                    <Ionicons name="map-outline" size={20} color="#FF1493" style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={styles.input}
                                        value={address}
                                        onChangeText={setAddress}
                                        placeholder="Address (House No., Street)"
                                    />
                                </View>
                            </View>

                            {/* City & Barangay */}
                            <View style={[styles.row, { marginTop: 16, gap: 12 }]}>
                                <View style={[styles.inputBox, { flex: 1 }]}>
                                    <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" />
                                </View>
                                <View style={[styles.inputBox, { flex: 1 }]}>
                                    <TextInput style={styles.input} value={barangay} onChangeText={setBarangay} placeholder="Barangay" />
                                </View>
                            </View>

                            <View style={[styles.row, { marginTop: 16, gap: 12 }]}>
                                <View style={[styles.inputBox, { flex: 1 }]}>
                                    <TextInput 
                                        style={styles.input} 
                                        value={ageText} 
                                        onChangeText={setAgeText}
                                        keyboardType="number-pad" 
                                        placeholder="Age"
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.inputBox, { flex: 1.5, justifyContent: 'space-between' }]}
                                    onPress={() => setPickingGender(true)}
                                >
                                    <Text style={{ color: gender ? '#000' : '#888', fontSize: 15 }}>{gender || 'Gender'}</Text>
                                    <Ionicons name="chevron-down" size={16} color="#FF1493" />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
                                <ScaleButton 
                                    style={[styles.signUpBtn, { flex: 1, backgroundColor: '#EEE' }]} 
                                    onPress={() => setCurrentStep(1)}
                                >
                                    <Text style={[styles.signUpBtnText, { color: '#888' }]}>Back</Text>
                                </ScaleButton>
                                <ScaleButton 
                                    style={[styles.signUpBtn, { flex: 2 }]} 
                                    onPress={handleSignUp}
                                >
                                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.signUpBtnText}>Complete Sign Up</Text>}
                                </ScaleButton>
                            </View>
                        </View>
                    </Animated.View>
                )}

                    <TouchableOpacity onPress={onSwitchToLogin} activeOpacity={0.8} style={styles.switchLink}>
                        <Text style={styles.switchLinkText}>Already have an account? <Text style={{ color: '#FF1493' }}>Log In</Text></Text>
                    </TouchableOpacity>
                </ScrollView>

                <AuthStatusModal
                    visible={statusVisible}
                    type={statusType}
                    title={statusTitle}
                    message={statusMessage}
                    onClose={() => setStatusVisible(false)}
                />
            </LinearGradient>
        );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scrollContent: { 
        flexGrow: 1, 
        paddingHorizontal: ms(24), 
        paddingBottom: vs(48) 
    },
    innerContainer: { flex: 1, paddingHorizontal: ms(24), justifyContent: 'center' },

    // Header
    header: { alignItems: 'center', marginBottom: 32 },
    logo: { width: 80, height: 80, marginBottom: 12 },
    title: { fontSize: 32, fontWeight: '900', color: '#1a1a1a', textAlign: 'center', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: '#FF1493', fontWeight: '800', textAlign: 'center', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

    // Premium Card
    glassCard: { 
        backgroundColor: '#fff', 
        borderRadius: 30, 
        padding: 24, 
        shadowColor: '#FF66B2', 
        shadowOffset: { width: 0, height: 10 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 20, 
        elevation: 5,
        borderWidth: 1,
        borderColor: '#FFF0F5'
    },
    sectionLabel: { fontSize: 11, fontWeight: '900', color: '#999', letterSpacing: 1.5, marginBottom: 16 },

    // Form fields
    fieldWrap: { position: 'relative' },
    inputBox: { 
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5, 
        borderColor: '#FFD6EF', 
        borderRadius: 15, 
        height: 56, 
        paddingHorizontal: 16, 
        backgroundColor: '#FFF9FB' 
    },
    input: { color: '#000', fontSize: 15, height: 56, flex: 1, fontWeight: '600' },
    errorText: { color: '#e53e3e', fontSize: 11, fontWeight: '700', marginTop: 4, marginLeft: 4 },

    // Role Selection
    roleGrid: { flexDirection: 'row', gap: 16 },
    roleCard: { 
        flex: 1, 
        backgroundColor: '#FFF9FB', 
        borderRadius: 20, 
        paddingVertical: 20, 
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFD6EF'
    },
    roleCardActive: { 
        backgroundColor: '#fff', 
        borderColor: '#FF1493',
        shadowColor: '#FF1493',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3
    },
    roleIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    roleIconBgActive: { backgroundColor: '#FF1493' },
    roleText: { fontSize: 14, fontWeight: '800', color: '#999' },
    roleTextActive: { color: '#1a1a1a' },

    // Layout
    row: { flexDirection: 'row', alignItems: 'center' },

    // Sign Up button
    signUpBtn: { backgroundColor: '#FF1493', height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    signUpBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
    switchLink: { alignSelf: 'center', marginTop: 24, padding: 8 },
    switchLinkText: { color: '#888', fontWeight: '700', fontSize: 14 },

    // OTP
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },

    // Gender picker items
    genderItem: { padding: 16, width: '100%', borderBottomWidth: 1, borderBottomColor: '#FFD6EF', alignItems: 'center' },
    genderItemText: { color: '#000', fontSize: 18, fontWeight: '700' },
});

