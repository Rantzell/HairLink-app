import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import DonationSuccessModal from '../../components/DonationSuccessModal';

interface HairDonationScreenProps {
    onBack: () => void;
    onSuccess?: () => void;
}

export default function HairDonationScreen({ onBack, onSuccess }: HairDonationScreenProps) {
    const [hairLength, setHairLength] = useState<'Short' | 'Long' | null>(null);
    const [hairColor, setHairColor] = useState<'Black' | 'Brown' | 'Light' | null>(null);
    const [chemicallyTreated, setChemicallyTreated] = useState(false);
    const [address, setAddress] = useState('');
    const [reason, setReason] = useState('');
    const [proofImage, setProofImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingLabel, setLoadingLabel] = useState('Submitting...');
    const [showSuccess, setShowSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setProofImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string, path: string) => {
        try {
            const formData = new FormData();
            formData.append('file', {
                uri,
                name: 'donation.jpg',
                type: 'image/jpeg',
            } as any);

            const { data, error } = await supabase.storage
                .from('hair-requests') // Reverting to known bucket from SQL
                .upload(path, formData, {
                    contentType: 'multipart/form-data',
                    upsert: true
                });

            if (error) {
                console.error('Storage upload error:', error);
                return null;
            }
            return data?.path || null;
        } catch (err) {
            console.error('Upload exception:', err);
            return null;
        }
    };

    const handleSubmit = async () => {
        setSubmitError(null);
        if (!hairLength || !hairColor || !address || !reason || !proofImage) {
            setSubmitError('Please fill in all fields and upload a photo.');
            return;
        }

        setLoading(true);
        setLoadingLabel('Verifying authentication...');
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                setSubmitError('You are not logged in. Please go back and log in again.');
                return;
            }

            const timestamp = Date.now();
            setLoadingLabel('Uploading proof of donation...');
            const proofPath = await uploadImage(proofImage, `${user.id}/donation_${timestamp}.jpg`);
            
            if (!proofPath) {
                setSubmitError('Could not upload image. Please try again.');
                return;
            }

            setLoadingLabel('Saving donation record...');
            const { error } = await supabase.from('donations').insert({
                user_id: user.id,
                type: 'hair',
                status: 'pending',
                proof_of_Donation: proofPath,
                hair_length: hairLength,
                hair_color: hairColor,
                chemically_treated: chemicallyTreated,
                address: address,
                reason: reason,
            });

            if (error) {
                setSubmitError(`${error.message} (code: ${error.code})`);
                return;
            }

            // Send notification
            setLoadingLabel('Sending confirmation...');
            try {
                await supabase.from('notifications').insert({
                    user_id: user.id,
                    title: 'Donation Submitted! ❤️',
                    message: 'Your hair donation request has been received. Please wait for our staff to approve and provide further instructions.',
                    type: 'donation'
                });
            } catch (nErr) {
                console.warn('Notification failed:', nErr);
            }

            setShowSuccess(true);
        } catch (err: any) {
            setSubmitError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
            setLoadingLabel('Submitting...');
        }
    };

    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="light" />

            {/* ── Elite Header ──────────────────────────────── */}
            <LinearGradient
                colors={['#FF66B2', '#FF1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerBrand}>Strand Up for Cancer</Text>
                    <Text style={styles.headerTitle}>Hair Donation</Text>
                </View>
                <View style={{ width: ms(44) }} />
            </LinearGradient>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>{loadingLabel}</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ── Section 1: Your Donation Story ────────── */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
                    <Text style={styles.cardTitle}>Donation Story</Text>
                    <Text style={styles.instructions}>Kindly describe the reason for your hair donation. *</Text>
                    <View style={styles.bulletList}>
                        {[
                            'Who are you donating for?',
                            'What inspired your gift?',
                            'A message for the future recipient',
                        ].map((item, i) => (
                            <View key={i} style={styles.bulletItem}>
                                <Ionicons name="heart" size={14} color="#FF66B2" />
                                <Text style={styles.bulletText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                    <TextInput
                        style={styles.storyInput}
                        placeholder="Tell us your story..."
                        placeholderTextColor="#999"
                        multiline
                        value={reason}
                        onChangeText={setReason}
                        textAlignVertical="top"
                    />
                </Animated.View>

                {/* ── Section 2: Hair Information ───────────── */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
                    <Text style={styles.cardTitle}>Hair Specifications</Text>

                    <Text style={styles.fieldLabel}>Hair Length *</Text>
                    <View style={styles.chipRow}>
                        {['Short', 'Long'].map((val: any) => (
                            <TouchableOpacity
                                key={val}
                                style={[styles.chip, hairLength === val && styles.chipActive]}
                                onPress={() => setHairLength(val)}
                            >
                                <Text style={[styles.chipText, hairLength === val && styles.chipTextActive]}>
                                    {val === 'Short' ? 'Short' : 'Long '}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Natural Hair Color *</Text>
                    <View style={styles.chipRow}>
                        {['Black', 'Brown', 'Light'].map((val: any) => (
                            <TouchableOpacity
                                key={val}
                                style={[styles.chip, hairColor === val && styles.chipActive]}
                                onPress={() => setHairColor(val)}
                            >
                                <Text style={[styles.chipText, hairColor === val && styles.chipTextActive]}>{val}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.checkRow}
                        onPress={() => setChemicallyTreated(!chemicallyTreated)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.checkBox, chemicallyTreated && styles.checkBoxActive]}>
                            {chemicallyTreated && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <Text style={styles.checkLabel}>
                            My hair has been chemically treated (colored, permed, etc.)
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Section 3: Proof & Verification ────────── */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
                    <Text style={styles.cardTitle}>Proof of Hair</Text>
                    <Text style={styles.instructions}>Upload a clear picture of the hair. *</Text>
                    <Text style={styles.hint}>Ensure the hair is visible and measured if possible. MAX 10MB.</Text>

                    <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                        {proofImage ? (
                            <Image source={{ uri: proofImage }} style={styles.previewImg} />
                        ) : (
                            <>
                                <Ionicons name="camera-outline" size={32} color="#FF66B2" />
                                <Text style={styles.uploadBtnText}>Add Photo</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Section 4: Shipping Logistics ───────────── */}
                <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
                    <Text style={styles.cardTitle}>Shipping Logistics</Text>
                    <Text style={styles.instructions}>Where will you be sending from? *</Text>
                    <TextInput
                        style={[styles.storyInput, { height: 100 }]}
                        placeholder="Enter your complete shipping address..."
                        placeholderTextColor="#999"
                        multiline
                        value={address}
                        onChangeText={setAddress}
                        textAlignVertical="top"
                    />
                </Animated.View>

                {/* ── Submit Button ───────────────────────────── */}
                <Animated.View entering={FadeInUp.delay(500)} style={styles.submitContainer}>
                    {submitError && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>{submitError}</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={handleSubmit} activeOpacity={0.8} disabled={loading}>
                        <LinearGradient
                            colors={['#FF66B2', '#FF1493']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitBtn}
                        >
                            <Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit Donation'}</Text>
                            {!loading && <Ionicons name="heart" size={20} color="#fff" style={{ marginLeft: 8 }} />}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

            </ScrollView>

            <DonationSuccessModal
                visible={showSuccess}
                type="hair"
                amount={0}
                stars={10}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                    else onBack();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF9FB' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: ms(16),
        paddingVertical: vs(15),
        borderBottomLeftRadius: ms(30),
        borderBottomRightRadius: ms(30),
        shadowColor: '#FF1493',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    },
    backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },
    headerTextContainer: { alignItems: 'center' },
    headerBrand: { fontSize: ms(12), color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 1 },
    headerTitle: { fontSize: ms(22), fontWeight: '900', color: '#fff' },

    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: { color: '#fff', marginTop: vs(15), fontWeight: '800', fontSize: ms(16) },

    scrollContent: { paddingHorizontal: ms(16), paddingBottom: vs(50), paddingTop: vs(10) },

    card: {
        backgroundColor: '#fff',
        borderRadius: ms(24),
        padding: ms(20),
        marginBottom: vs(20),
        shadowColor: '#FF1493',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
        borderWidth: 1, borderColor: 'rgba(255,102,178,0.05)',
    },
    cardTitle: { fontSize: ms(20), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(12) },
    instructions: { fontSize: ms(15), fontWeight: '700', color: '#444', marginBottom: vs(10) },

    bulletList: { marginBottom: vs(15) },
    bulletItem: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(6) },
    bulletText: { fontSize: ms(13), color: '#666', marginLeft: ms(8), fontWeight: '500' },

    storyInput: {
        backgroundColor: '#FFFAFC',
        borderWidth: 1.5,
        borderColor: '#FFD6EF',
        borderRadius: ms(18),
        padding: ms(16),
        height: vs(140),
        fontSize: ms(15),
        color: '#1a1a1a',
        fontWeight: '500',
    },

    fieldLabel: { fontSize: ms(14), fontWeight: '900', color: '#444', marginBottom: vs(12) },
    chipRow: { flexDirection: 'row', gap: ms(10) },
    chip: {
        flex: 1,
        paddingVertical: vs(12),
        alignItems: 'center',
        borderRadius: ms(16),
        borderWidth: 1.5,
        borderColor: '#FFD6EF',
        backgroundColor: '#fff',
    },
    chipActive: { borderColor: '#FF1493', backgroundColor: '#FFF9FB' },
    chipText: { fontSize: ms(14), fontWeight: '700', color: '#666' },
    chipTextActive: { color: '#FF1493' },

    checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: vs(24) },
    checkBox: {
        width: ms(24), height: ms(24), borderRadius: ms(8),
        borderWidth: 2, borderColor: '#FFD6EF',
        alignItems: 'center', justifyContent: 'center',
        marginRight: ms(12),
    },
    checkBoxActive: { backgroundColor: '#FF1493', borderColor: '#FF1493' },
    checkLabel: { flex: 1, fontSize: ms(14), color: '#555', fontWeight: '600', lineHeight: vs(20) },

    hint: { fontSize: ms(12), color: '#888', marginBottom: vs(12), lineHeight: vs(18) },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#FF66B2',
        borderRadius: ms(18),
        paddingVertical: vs(20),
        backgroundColor: 'rgba(255,102,178,0.03)',
        overflow: 'hidden',
    },
    previewImg: { width: '100%', height: vs(200), resizeMode: 'cover' },
    uploadBtnText: { fontSize: ms(15), fontWeight: '900', color: '#FF66B2', marginLeft: ms(8) },

    submitContainer: { marginTop: vs(10) },
    errorBanner: { padding: ms(12), backgroundColor: '#FFF0F0', borderRadius: ms(16), marginBottom: vs(16), borderWidth: 1, borderColor: '#FFD1D1' },
    errorText: { color: '#D32F2F', fontSize: ms(13), fontWeight: '700', textAlign: 'center' },
    submitBtn: {
        height: vs(60),
        borderRadius: ms(30),
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: '#FF1493',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
    },
    submitText: { fontSize: ms(18), fontWeight: '900', color: '#fff' },
});

