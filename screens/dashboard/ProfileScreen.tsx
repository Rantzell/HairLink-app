import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import Animated, {
    FadeInDown,
    FadeInUp,
    Layout,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    interpolateColor
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface ProfileScreenProps {
    onBack: () => void;
    onLogout: () => void;
    onRoleChange?: (role: 'Donor' | 'Recipient') => void;
}

export default function ProfileScreen({ onBack, onLogout, onRoleChange }: ProfileScreenProps) {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Profile Data
    const [profile, setProfile] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'Donor' | 'Recipient'>('Donor');
    const [points, setPoints] = useState(0);
    const [referralCode, setReferralCode] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [hasRedeemed, setHasRedeemed] = useState(false);

    // Redemption State
    const [otherReferralCode, setOtherReferralCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);

    // Animation values
    const roleToggleValue = useSharedValue(role === 'Donor' ? 0 : 1);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setEmail(user.email || '');

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                setProfile(data);
                setFullName(data.full_name || '');
                setPhone(data.phone || '');
                setRole(data.role || 'Donor');
                setPoints(data.reward_points || 0);
                setReferralCode(data.referral_code || '---');
                setAvatarUrl(data.avatar_url);
                setHasRedeemed(data.has_redeemed_code || false);
                roleToggleValue.value = withSpring(data.role === 'Donor' ? 0 : 1);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemCode = async () => {
        const cleanedCode = otherReferralCode.trim().toUpperCase();
        
        if (!cleanedCode) {
            Alert.alert('Required', 'Please enter a referral code to redeem.');
            return;
        }

        if (cleanedCode === referralCode.toUpperCase()) {
            Alert.alert('Invalid Code', 'You cannot redeem your own referral code. Share it with friends instead! ✨');
            return;
        }

        try {
            setIsRedeeming(true);
            const { data, error } = await supabase.rpc('redeem_referral_code', {
                code_to_redeem: cleanedCode
            });

            if (error) throw error;

            if (data.success) {
                // Optimistic UI Update: Update points immediately for "live" feel
                setPoints(prev => prev + 3);
                setHasRedeemed(true);

                Alert.alert(
                    'Success! 🎉', 
                    "You've earned 3 Welcome Stars! \n\nYour kindness is the first step toward a beautiful journey. Keep shining and making a difference! ✨"
                );
                setOtherReferralCode('');
                fetchProfile(); // Background sync
            } else {
                Alert.alert('Redemption Failed', data.message);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong while redeeming the code.');
        } finally {
            setIsRedeeming(false);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            setUpdating(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Update Auth Metadata & Email
            const authUpdates: any = {
                data: { full_name: fullName, phone: phone, role: role }
            };

            if (email !== user.email) {
                authUpdates.email = email;
            }

            const { error: authError } = await supabase.auth.updateUser(authUpdates);
            if (authError) throw authError;

            // Update Public Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone: phone,
                    role: role,
                    updated_at: new Date(),
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            Alert.alert(
                'Profile Updated',
                email !== user.email
                    ? 'Check your new email for a verification link.'
                    : 'Your changes have been saved.'
            );
            if (onRoleChange) onRoleChange(role);
            setEditMode(false);
        } catch (error: any) {
            Alert.alert('Update Failed', error.message);
        } finally {
            setUpdating(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.3, // Reduced quality for faster upload
            });

            if (!result.canceled) {
                uploadAvatar(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const uploadAvatar = async (uri: string) => {
        try {
            setUpdating(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // ── ROBUST UPLOAD LOGIC ──────────────
            const response = await fetch(uri);
            const blob = await response.blob();

            const fileExt = uri.split('.').pop()?.toLowerCase();
            const mimeType = fileExt === 'jpg' ? 'image/jpeg' : `image/${fileExt}`;
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, blob, {
                    contentType: mimeType,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Update Profile table
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    avatar_url: publicUrl,
                    updated_at: new Date()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            Alert.alert('Success', 'Profile picture updated! ✨');
        } catch (error: any) {
            console.error('Upload error:', error);
            Alert.alert('Upload Error', error.message || 'Failed to sync image to database.');
        } finally {
            setUpdating(false);
        }
    };

    const copyReferral = async () => {
        await Clipboard.setStringAsync(referralCode);
        Alert.alert('Copied', 'Referral code copied to clipboard!');
    };

    const toggleRole = () => {
        const newRole = role === 'Donor' ? 'Recipient' : 'Donor';

        Alert.alert(
            'Switch Role?',
            `Are you sure you want to switch to the ${newRole} dashboard?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Switch Now',
                    onPress: async () => {
                        try {
                            setUpdating(true);
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;

                            // 1. Update DB 
                            const { error } = await supabase
                                .from('profiles')
                                .update({ role: newRole, updated_at: new Date() })
                                .eq('id', user.id);

                            if (error) throw error;

                            // 2. Update Local State
                            setRole(newRole);
                            roleToggleValue.value = withSpring(newRole === 'Donor' ? 0 : 1);

                            // 3. Trigger Global Transition
                            if (onRoleChange) {
                                // Small delay for animation feel
                                setTimeout(() => onRoleChange(newRole), 500);
                            }
                        } catch (err: any) {
                            Alert.alert('Switch Failed', err.message);
                        } finally {
                            setUpdating(false);
                        }
                    }
                }
            ]
        );
    };

    const animatedToggleStyle = useAnimatedStyle(() => {
        return {
            backgroundColor: interpolateColor(
                roleToggleValue.value,
                [0, 1],
                ['#FF1493', '#9B59B6']
            ),
        };
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF1493" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header Hero Section */}
                <LinearGradient
                    colors={role === 'Donor' ? ['#FF1493', '#FF69B4'] : ['#8E44AD', '#9B59B6']}
                    style={[styles.heroHeader, { paddingTop: insets.top }]}
                >
                    <View style={styles.topNav}>
                        <TouchableOpacity onPress={onBack} style={styles.glassButton}>
                            <Ionicons name="chevron-back" size={ms(24)} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Account Settings</Text>
                        <View style={{ width: ms(44) }} />
                    </View>

                    {/* Premium Avatar Section */}
                    <Animated.View entering={FadeInDown.springify()} style={styles.avatarSection}>
                            <View style={styles.avatarWrapper}>
                                <View style={styles.avatarImageContainer}>
                                    <Image
                                        source={avatarUrl ? { uri: avatarUrl } : require('../../assets/logo.png')}
                                        style={styles.avatar}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={styles.premiumCamBtn}
                                    onPress={pickImage}
                                    disabled={updating}
                                    activeOpacity={0.7}
                                >
                                    {updating ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Ionicons name="camera" size={20} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.userName}>{fullName || 'User Name'}</Text>
                            <View style={styles.idChip}>
                                <Text style={styles.idChipText}>#{profile?.id?.slice(0, 4).toUpperCase() || '0000'}</Text>
                            </View>
                        </Animated.View>
                </LinearGradient>

                <View style={styles.bodyContent}>
                    {/* Role Switcher Premium */}
                    <Animated.View entering={FadeInUp.delay(200)} style={styles.roleCard}>
                        <Text style={styles.sectionHeading}>COMMUNITY STATUS</Text>
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                activeOpacity={1}
                                onPress={toggleRole}
                                style={[styles.toggleBase, { backgroundColor: '#f0f0f0' }]}
                            >
                                <Animated.View style={[styles.toggleThumb, animatedToggleStyle, { left: role === 'Donor' ? 4 : '50%' }]}>
                                    <Text style={styles.toggleText}>{role}</Text>
                                </Animated.View>
                                <View style={styles.toggleLabels}>
                                    <Text style={[styles.toggleLabelText, role === 'Donor' && { opacity: 0 }]}>Donor</Text>
                                    <Text style={[styles.toggleLabelText, role === 'Recipient' && { opacity: 0 }]}>Recipient</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Edit Section */}
                    <View style={styles.infoSection}>
                        <View style={styles.sectionRow}>
                            <Text style={styles.sectionHeading}>PERSONAL DETAILS</Text>
                            <TouchableOpacity
                                style={[styles.miniEditBtn, editMode && styles.activeSaveBtn]}
                                onPress={() => editMode ? handleUpdateProfile() : setEditMode(true)}
                                disabled={updating}
                            >
                                <Feather name={editMode ? "check" : "edit-3"} size={ms(14)} color="#fff" />
                                <Text style={styles.miniEditBtnText}>{editMode ? 'Save' : 'Edit'}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.glassCard}>
                            <InfoRow
                                icon="mail"
                                label="Email Address"
                                value={email}
                                isEdit={editMode}
                                onChange={setEmail}
                                keyboardType="email-address"
                            />
                            <View style={styles.divider} />
                            <InfoRow
                                icon="user"
                                label="Full Name"
                                value={fullName}
                                isEdit={editMode}
                                onChange={setFullName}
                            />
                            <View style={styles.divider} />
                            <InfoRow
                                icon="phone"
                                label="Mobile Number"
                                value={phone}
                                isEdit={editMode}
                                onChange={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Rewards Premium View */}
                    <Animated.View entering={FadeInUp.delay(300)} style={styles.premiumCard}>
                        <LinearGradient
                            colors={['#1a1a1a', '#333']}
                            style={styles.cardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.platinumBadge}>
                                    <FontAwesome5 name="medal" size={ms(14)} color="#FFD700" />
                                    <Text style={styles.platinumText}>ELITE MEMBER</Text>
                                </View>
                                <Ionicons name="star" size={ms(24)} color="#FFD700" />
                            </View>

                            <View style={styles.pointsBody}>
                                <Text style={styles.pointsValue}>{points}</Text>
                                <Text style={styles.pointsLabel}>TOTAL REWARD STARS</Text>
                            </View>

                            <View style={styles.cardFooter}>
                                <View>
                                    <Text style={styles.footerLabel}>YOUR UNIQUE CODE</Text>
                                    <Text style={styles.footerValue}>{referralCode}</Text>
                                </View>
                                <TouchableOpacity style={styles.premiumCopyBtn} onPress={copyReferral}>
                                    <Feather name="copy" size={ms(18)} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* Redeem Section - Only show if hasn't redeemed yet */}
                    {!hasRedeemed && role === 'Donor' && (
                        <Animated.View entering={FadeInUp.delay(400)} style={styles.redeemCard}>
                            <View style={styles.redeemHeader}>
                                <View style={styles.redeemIconBg}>
                                    <Ionicons name="gift-outline" size={ms(24)} color="#FF1493" />
                                </View>
                                <View>
                                    <Text style={styles.redeemTitle}>GOT A REFERRAL CODE?</Text>
                                    <Text style={styles.redeemSubtitle}>Claim your 3-star welcome bonus!</Text>
                                </View>
                            </View>

                            <View style={styles.redeemInputRow}>
                                <TextInput
                                    style={styles.redeemInput}
                                    placeholder="Enter Friend's Code"
                                    placeholderTextColor="#999"
                                    value={otherReferralCode}
                                    onChangeText={setOtherReferralCode}
                                    autoCapitalize="characters"
                                    maxLength={6}
                                />
                                <TouchableOpacity
                                    style={[styles.claimBtn, isRedeeming && { opacity: 0.7 }]}
                                    onPress={handleRedeemCode}
                                    disabled={isRedeeming}
                                >
                                    {isRedeeming ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.claimBtnText}>CLAIM</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    {/* Logout Action */}
                    <TouchableOpacity style={styles.premiumLogout} onPress={onLogout}>
                        <Feather name="log-out" size={ms(18)} color="#C0392B" />
                        <Text style={styles.logoutText}>Sign Out Account</Text>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>
        </View>
    );
}

function InfoRow({ icon, label, value, isEdit, onChange, keyboardType }: any) {
    return (
        <View style={styles.rowItem}>
            <View style={styles.iconContainer}>
                <Feather name={icon} size={ms(18)} color="#FF1493" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{label}</Text>
                {isEdit ? (
                    <TextInput
                        style={styles.rowInput}
                        value={value}
                        onChangeText={onChange}
                        placeholder={`Enter ${label}`}
                        keyboardType={keyboardType}
                        autoCapitalize={label === 'Email Address' ? 'none' : 'words'}
                    />
                ) : (
                    <Text style={styles.rowValue}>{value || `Add ${label}`}</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fdfdfd' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flexGrow: 1 },

    // Hero Header
    heroHeader: { paddingBottom: vs(50), borderBottomLeftRadius: ms(45), borderBottomRightRadius: ms(45) },
    topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ms(20), paddingTop: vs(10) },
    glassButton: { width: ms(44), height: ms(44), borderRadius: ms(22), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    headerTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' },

    // Avatar
    avatarSection: { alignItems: 'center', marginTop: vs(25) },
    avatarWrapper: {
        position: 'relative',
    },
    avatarImageContainer: {
        width: ms(140),
        height: ms(140),
        borderRadius: ms(70),
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 5,
        borderColor: '#fff',
    },
    avatar: { width: '100%', height: '100%' },
    premiumCamBtn: {
        position: 'absolute',
        bottom: ms(4),
        right: ms(4),
        backgroundColor: '#1a1a1a',
        width: ms(44),
        height: ms(44),
        borderRadius: ms(22),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        zIndex: 10,
    },
    userName: { fontSize: ms(26), fontWeight: '900', color: '#fff', marginTop: vs(18), letterSpacing: ms(-0.5) },
    idChip: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: ms(16), paddingVertical: vs(6), borderRadius: ms(15), marginTop: vs(10) },
    idChipText: { color: '#fff', fontSize: ms(13), fontWeight: '800', letterSpacing: 1.5 },

    bodyContent: { marginTop: vs(-40), paddingHorizontal: ms(20) },

    // Role Switcher
    roleCard: {
        backgroundColor: '#fff',
        padding: ms(24),
        borderRadius: ms(30),
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        marginBottom: vs(25),
        shadowOffset: { width: 0, height: 4 }
    },
    sectionHeading: { fontSize: ms(12), fontWeight: '900', color: '#ccc', letterSpacing: 2, marginBottom: vs(18), textTransform: 'uppercase' },
    toggleContainer: { height: vs(60) },
    toggleBase: { flex: 1, borderRadius: ms(30), position: 'relative', overflow: 'hidden' },
    toggleThumb: {
        position: 'absolute', top: 5, bottom: 5, width: '48%',
        borderRadius: ms(25), zIndex: 1,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 5
    },
    toggleText: { color: '#fff', fontWeight: '900', fontSize: ms(15), textTransform: 'uppercase' },
    toggleLabels: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: ms(10) },
    toggleLabelText: { color: '#aaa', fontSize: ms(14), fontWeight: '800', textTransform: 'uppercase' },

    // Info Section
    infoSection: { marginBottom: vs(30) },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(18) },
    miniEditBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#bbb', paddingHorizontal: ms(18), paddingVertical: vs(10), borderRadius: ms(15), elevation: 2 },
    activeSaveBtn: { backgroundColor: '#27AE60' },
    miniEditBtnText: { color: '#fff', fontWeight: '900', fontSize: ms(13), marginLeft: ms(8), textTransform: 'uppercase' },

    glassCard: {
        backgroundColor: '#fff',
        borderRadius: ms(30),
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
        shadowOffset: { width: 0, height: 4 }
    },
    rowItem: { flexDirection: 'row', alignItems: 'center', padding: ms(22) },
    iconContainer: {
        width: ms(44),
        height: ms(44),
        borderRadius: ms(14),
        backgroundColor: '#f9f9f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: ms(18),
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    rowLabel: { fontSize: ms(12), fontWeight: '800', color: '#bbb', marginBottom: vs(4), textTransform: 'uppercase', letterSpacing: 0.5 },
    rowValue: { fontSize: ms(14), fontWeight: '900', color: '#1a1a1a' },
    rowInput: { fontSize: ms(16), fontWeight: '900', color: '#FF1493', padding: 0 },
    divider: { height: 1, backgroundColor: '#f5f5f5', marginLeft: ms(80) },

    // Premium Card
    premiumCard: { height: vs(210), borderRadius: ms(35), overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, marginBottom: vs(25), shadowOffset: { width: 0, height: 8 } },
    cardGradient: { flex: 1, padding: ms(30) },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    platinumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: ms(12), paddingVertical: vs(6), borderRadius: ms(12) },
    platinumText: { color: '#FFD700', fontSize: ms(11), fontWeight: '900', marginLeft: ms(8), letterSpacing: 1.5 },
    pointsBody: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    pointsValue: { fontSize: ms(54), fontWeight: '900', color: '#fff', letterSpacing: -1 },
    pointsLabel: { fontSize: ms(13), fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginTop: vs(-5) },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    footerLabel: { fontSize: ms(10), fontWeight: '900', color: 'rgba(255,255,255,0.35)', marginBottom: vs(4), letterSpacing: 1 },
    footerValue: { fontSize: ms(18), fontWeight: '900', color: '#fff', letterSpacing: 2 },
    premiumCopyBtn: { backgroundColor: 'rgba(255,255,255,0.15)', width: ms(44), height: ms(44), borderRadius: ms(14), justifyContent: 'center', alignItems: 'center' },

    // Redeem Card
    redeemCard: {
        backgroundColor: '#fff',
        borderRadius: ms(30),
        padding: ms(24),
        marginBottom: vs(30),
        borderWidth: 2,
        borderColor: '#FFD6EF',
        shadowColor: '#FF1493',
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    redeemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(20) },
    redeemIconBg: { width: ms(48), height: ms(48), borderRadius: ms(16), backgroundColor: '#FFF0F7', justifyContent: 'center', alignItems: 'center', marginRight: ms(15) },
    redeemTitle: { fontSize: ms(14), fontWeight: '900', color: '#1a1a1a', letterSpacing: 0.5 },
    redeemSubtitle: { fontSize: ms(12), fontWeight: '700', color: '#999', marginTop: vs(2) },
    redeemInputRow: { flexDirection: 'row', alignItems: 'center' },
    redeemInput: {
        flex: 1,
        backgroundColor: '#F8F8F8',
        height: vs(54),
        borderRadius: ms(18),
        paddingHorizontal: ms(20),
        fontSize: ms(15),
        fontWeight: '900',
        color: '#FF1493',
        marginRight: ms(12),
        letterSpacing: 2,
    },
    claimBtn: {
        backgroundColor: '#FF1493',
        height: vs(54),
        paddingHorizontal: ms(25),
        borderRadius: ms(18),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF1493',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    claimBtnText: { color: '#fff', fontWeight: '900', fontSize: ms(14), letterSpacing: 1 },

    // Logout
    premiumLogout: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFF5F5', padding: ms(20), borderRadius: ms(24),
        borderWidth: 2, borderColor: '#FEE2E2', marginBottom: vs(20)
    },
    logoutText: { color: '#C0392B', fontWeight: '900', fontSize: ms(16), marginLeft: ms(12), textTransform: 'uppercase', letterSpacing: 1 },
});

