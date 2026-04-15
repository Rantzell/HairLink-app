import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import Animated, { FadeInDown, FadeInUp, Layout } from "react-native-reanimated";
import AuthStatusModal from "../../components/AuthStatusModal";

interface VerificationScreenProps {
    email: string;
    onVerified: () => void;      // called after successful OTP — App.tsx takes over
    onGoBack: () => void;        // go back to signup
}

export default function VerificationScreen({
    email,
    onVerified,
    onGoBack,
}: VerificationScreenProps) {
    const insets = useSafeAreaInsets();
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const otpInputRef = useRef<TextInput>(null);

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

    useEffect(() => {
        let interval: any;
        if (timer > 0 && !canResend) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [timer, canResend]);

    const handleVerify = async () => {
        if (otp.length !== 6) {
            setError("Please enter all 6 digits.");
            return;
        }
        setError("");
        setLoading(true);
        const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: "signup",
        });
        setLoading(false);
        if (verifyError) {
            showError("Verification Failed", verifyError.message);
        } else {
            onVerified();
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        
        setOtp("");
        setError("");
        setLoading(true);
        const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
        });
        setLoading(false);
        
        if (resendError) {
            showError("Resend Failed", resendError.message);
        } else {
            setTimer(60);
            setCanResend(false);
            showSuccess("Code Resent", "A new 6-digit code has been sent via Resend SMTP! ✨");
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <LinearGradient
                colors={["#FF1493", "#FF69B4", "#FFF0F5"]}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={{ alignItems: "center", paddingHorizontal: ms(24), paddingVertical: vs(20), paddingTop: insets.top + vs(20) }}>

                        {/* Premium Header Icon */}
                        <Animated.View entering={FadeInDown.duration(800)} style={styles.premiumIconCircle}>
                             <LinearGradient
                                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                                style={{ width: '100%', height: '100%', borderRadius: 50, justifyContent: 'center', alignItems: 'center' }}
                            >
                                <Ionicons name="mail-open" size={44} color="#fff" />
                            </LinearGradient>
                        </Animated.View>

                        <Animated.Text entering={FadeInUp.delay(200)} style={{ fontSize: 32, fontWeight: "900", color: "#fff", textAlign: "center", marginBottom: 10 }}>
                            Verify Account
                        </Animated.Text>
                        <Animated.Text entering={FadeInUp.delay(300)} style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 20, maxWidth: '90%', marginTop: 8 }}>
                            Can't find the email? Check your <Text style={{ fontWeight: '900', color: '#fff' }}>Spam</Text> or <Text style={{ fontWeight: '900', color: '#fff' }}>Junk</Text> folder. It might be hiding there!
                        </Animated.Text>

                        {/* Enhanced OTP Card */}
                        <Animated.View 
                            layout={Layout.springify()}
                            entering={FadeInUp.delay(500)} 
                            style={{
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
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: "800", color: "#BBB", marginBottom: 25, letterSpacing: 2 }}>
                                ENTER 6-DIGIT CODE
                            </Text>

                            {/* OTP Boxes Rendering */}
                            <TouchableOpacity
                                activeOpacity={1}
                                onPress={() => otpInputRef.current?.focus()}
                                style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
                            >
                                {Array.from({ length: 6 }).map((_, i) => {
                                    const isActive = otp.length === i;
                                    const isFilled = otp.length > i;
                                    return (
                                        <View key={i} style={{
                                            width: 42, height: 55,
                                            borderRadius: 14,
                                            marginHorizontal: 4,
                                            backgroundColor: isFilled ? "#FFF0F5" : "#F8F9FA",
                                            borderWidth: isActive ? 2.5 : 1.5,
                                            borderColor: isActive ? "#FF1493" : isFilled ? "#FF69B4" : "#E9ECEF",
                                            justifyContent: "center", alignItems: "center",
                                        }}>
                                            {isFilled ? (
                                                <Text style={{ fontSize: 24, fontWeight: "900", color: "#333" }}>{otp[i]}</Text>
                                            ) : isActive ? (
                                                <View style={{ width: 2, height: 22, backgroundColor: "#FF1493" }} />
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </TouchableOpacity>

                            <TextInput
                                ref={otpInputRef}
                                value={otp}
                                onChangeText={(text) => {
                                    setError("");
                                    setOtp(text.replace(/[^0-9]/g, "").slice(0, 6));
                                }}
                                keyboardType="number-pad"
                                maxLength={6}
                                style={{ position: "absolute", opacity: 0, height: 0, width: 0 }}
                                autoFocus
                            />

                            {error ? (
                                <Animated.View entering={FadeInDown} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                                    <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                                    <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "700" }}>{error}</Text>
                                </Animated.View>
                            ) : <View style={{ height: 20 }} />}

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleVerify}
                                disabled={loading || otp.length < 6}
                                style={{
                                    width: "100%", height: 58, borderRadius: 20,
                                    backgroundColor: otp.length < 6 ? "#FFD6EF" : "#FF1493",
                                    justifyContent: "center", alignItems: "center",
                                    marginTop: 15,
                                    shadowColor: "#FF1493",
                                    shadowOffset: { width: 0, height: 10 },
                                    shadowOpacity: otp.length < 6 ? 0 : 0.3,
                                    shadowRadius: 15,
                                    elevation: otp.length < 6 ? 0 : 8,
                                }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17, letterSpacing: 1 }}>
                                        VERIFY NOW
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* Resend Logic with Timer */}
                            <View style={{ marginTop: 25, alignItems: "center" }}>
                                {canResend ? (
                                    <TouchableOpacity onPress={handleResend} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Feather name="refresh-cw" size={14} color="#FF1493" style={{ marginRight: 6 }} />
                                        <Text style={{ color: "#FF1493", fontWeight: "800", fontSize: 14 }}>Resend New Code</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={{ color: "#BBB", fontSize: 14, fontWeight: '600' }}>
                                        Resend code in <Text style={{ color: '#FF1493', fontWeight: '800' }}>{timer}s</Text>
                                    </Text>
                                )}
                            </View>
                        </Animated.View>

                        {/* Elegant Back Navigation */}
                        <TouchableOpacity
                            onPress={onGoBack}
                            style={{ marginTop: 30, padding: 10 }}
                            activeOpacity={0.7}
                        >
                            <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "800", fontSize: 14, textDecorationLine: 'underline' }}>
                                Use a different email address
                            </Text>
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </LinearGradient>

            <AuthStatusModal
                visible={statusVisible}
                type={statusType}
                title={statusTitle}
                message={statusMessage}
                onClose={() => setStatusVisible(false)}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    premiumIconCircle: {
        width: ms(100), height: ms(100), borderRadius: ms(50),
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center", alignItems: "center",
        marginBottom: vs(25),
        borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
    },
});
