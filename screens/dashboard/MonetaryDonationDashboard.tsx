import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Switch,
    Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import DonationSuccessModal from '../../components/DonationSuccessModal';

interface MonetaryDonationDashboardProps {
    onBack: () => void;
    onSuccess?: () => void;
    role?: 'Donor' | 'Recipient';
}

export default function MonetaryDonationDashboard({ onBack, onSuccess, role = 'Donor' }: MonetaryDonationDashboardProps) {
    const isRecipient = role === 'Recipient';
    
    // Theme Colors
    const themeColor = isRecipient ? '#9B59B6' : '#FF1493';
    const themeMedium = isRecipient ? '#8E44AD' : '#FF66B2';
    const themeLight = isRecipient ? '#E8DAEF' : '#FFB3D9';
    const themePale = isRecipient ? '#F5EEF8' : '#FFF0F5';
    const themeBg = isRecipient ? '#F9F4FC' : '#F9F5F7';
    const themeFrame = isRecipient ? '#F5EEF8' : '#F5DEE7';

    const [amount, setAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Bank' | 'InstaPay'>('Bank');
    const [fullName, setFullName] = useState('');
    const [numAmount, setNumAmount] = useState('');
    const [wordsAmount, setWordsAmount] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [proofImage, setProofImage] = useState<string | null>(null);
    const [anonymous, setAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // ── Success Modal State ──────────────────────────────────────
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastAmount, setLastAmount] = useState(0);
    const [earnedStars, setEarnedStars] = useState(0);

    const amounts = [50, 100, 150, 200, 250];

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
                name: 'payment_proof.jpg',
                type: 'image/jpeg',
            } as any);

            const { data, error } = await supabase.storage
                .from('Proof_of_Donation') // Matching the bucket in your screenshot
                .upload(path, formData, {
                    contentType: 'multipart/form-data',
                    upsert: true
                });

            if (error) {
                console.error('Storage upload error:', error);
                if (error.message.includes('row-level security')) {
                    console.error('CRITICAL: Storage RLS Policy is blocking the upload. Please check your Supabase Dashboard policies.');
                }
                return null;
            }
            return data?.path || null;
        } catch (err) {
            console.error('Upload exception:', err);
            return null;
        }
    };

  const handleDonate = async () => {
    setSubmitError(null);
    if (!fullName || !numAmount || !proofImage || !referenceNumber) {
      const msg = 'Please provide your name, amount, reference number, and upload a proof of payment.';
      setSubmitError(msg);
      Alert.alert('Missing Fields', msg);
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setSubmitError('You are not logged in. Please go back and log in again.');
        return;
      }
      
      const timestamp = Date.now();
      const proofPath = await uploadImage(proofImage, `${user.id}/monetary_${timestamp}.jpg`);
      
      if (!proofPath) {
        setSubmitError('Could not upload proof of payment. Please try again.');
        return;
      }

      const { error } = await supabase
        .from('monetary_donations') // Using the table name from your screenshot
        .insert({
          user_id: user.id,
          name: fullName,       // Changed from full_name to name
          amount: parseFloat(numAmount),
          currency: 'PHP',     // Added currency from your screenshot
          payment_method: paymentMethod,
          reference_number: referenceNumber, // Added to fix not-null constraint
          status: 'pending',
          proof_of_donation: proofPath, 
        });

      if (error) {
        setSubmitError(`${error.message} (code: ${error.code})`);
        Alert.alert('Submission Error', error.message);
        return;
      }

      // ── Send Notification ────────────────────────────────
      try {
          await supabase.from('notifications').insert({
              user_id: user.id,
              title: 'Donation Received! 💖',
              message: `Thank you for your donation of ₱${numAmount}. We are reviewing your proof of payment.`,
              type: 'donation'
          });
      } catch (nErr) {
          console.warn('Notification failed:', nErr);
      }

      const donationAmount = parseFloat(numAmount);
      setLastAmount(donationAmount);
      setEarnedStars(Math.floor(donationAmount / 100));
      setShowSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit donation.');
    } finally {
      setLoading(false);
    }
  };


    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { backgroundColor: themeBg, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={ms(26)} color="#1a1a1a" />
                </TouchableOpacity>
                <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
                <View style={styles.spacer} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Title Section */}
                <Text style={styles.pageTitle}>Monetary Donation</Text>
                <Text style={styles.pageSubtitle}>
                    Let's boost your confidence. Request hair to support your journey of comfort and self-expression.
                </Text>

                {/* Guidelines Card */}
                <View style={[styles.guidelinesCard, { borderColor: themeMedium }]}>
                    <View style={styles.guideHeader}>
                        <Ionicons name="information-circle-outline" size={ms(22)} color={themeColor} />
                        <Text style={[styles.guideTitle, { color: themeColor }]}> Donation Guidelines</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.bulletTitle}>• Prepare the following:</Text>
                            <Text style={styles.bulletItem}>   - Proof of transfer</Text>
                            <Text style={styles.bulletItem}>   - Account details</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.bulletTitle}>• Wait for us to message you directly</Text>
                            <View style={{ height: 10 }} />
                            <Text style={styles.bulletTitle}>• Fill up the required form</Text>
                        </View>
                    </View>
                </View>

                {/* Donation Details Main Frame */}
                <View style={[styles.detailsFrame, { borderColor: themeLight }]}>
                    <Text style={styles.sectionTitle}>Donation details</Text>

                    <Text style={styles.inputLabel}>Select an amount</Text>
                    <View style={styles.amountGrid}>
                        {amounts.map((v) => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.amountBtn, { borderColor: themeLight }, amount === v && { backgroundColor: themeMedium, borderColor: themeMedium }]}
                                onPress={() => { setAmount(v); setCustomAmount(''); setNumAmount(v.toString()); }}
                            >
                                <Text style={[styles.amountBtnText, amount === v && styles.amountBtnTextActive]}>₱ {v}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.inputLabel}>Or Enter A Custom Amount</Text>
                    <View style={[styles.inputBox, { borderColor: themeLight }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter custom amount"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            value={customAmount}
                            onChangeText={(t) => { setCustomAmount(t); setAmount(null); setNumAmount(t); }}
                        />
                    </View>

                    {/* Payment Method Toggle */}
                    <View style={styles.toggleRow}>
                        <TouchableOpacity
                            style={[
                                styles.toggleBtn,
                                paymentMethod === 'Bank' && { backgroundColor: themeMedium, borderColor: themeMedium },
                                { borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }
                            ]}
                            onPress={() => setPaymentMethod('Bank')}
                        >
                            <Text style={[styles.toggleBtnText, paymentMethod === 'Bank' && styles.toggleBtnTextActive]}>Bank Transfer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.toggleBtn,
                                paymentMethod === 'InstaPay' && { backgroundColor: themeMedium, borderColor: themeMedium },
                                { borderTopRightRadius: 16, borderBottomRightRadius: 16, borderLeftWidth: 0 }
                            ]}
                            onPress={() => setPaymentMethod('InstaPay')}
                        >
                            <Text style={[styles.toggleBtnText, paymentMethod === 'InstaPay' && styles.toggleBtnTextActive]}>InstaPay</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Billing Info block */}
                    <Text style={styles.sectionTitle}>Billing Information</Text>
                    <View style={[styles.billingBox, { backgroundColor: themeFrame }]}>
                        {paymentMethod === 'Bank' ? (
                            <View style={styles.billingCenter}>
                                <View style={styles.bdoMock}>
                                    <Text style={styles.bdoText}>BDO</Text>
                                </View>
                                <Text style={styles.billingName}>Venus Alinsod</Text>
                                <Text style={styles.billingAccount}>004560025684</Text>
                            </View>
                        ) : (
                            <View style={styles.billingCenter}>
                                <View style={styles.qrMock}>
                                    <Ionicons name="qr-code-outline" size={ms(100)} color="#1a1a1a" />
                                    <Text style={styles.qrLogo}>Insta<Text style={{ color: '#0033a0' }}>Pay</Text></Text>
                                </View>
                                <Text style={styles.billingName}>InstaPay QR</Text>
                                <Text style={styles.billingAccount}>Scan to donate</Text>
                            </View>
                        )}
                    </View>

                    {/* Form */}
                    <Text style={styles.formLabel}>Full Name *</Text>
                    <Text style={styles.subtext}>Full Name must be the same on the ACCOUNT NAME used for donations</Text>
                    <View style={[styles.inputBox, { borderColor: themeLight }]}>
                        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#aaa" value={fullName} onChangeText={setFullName} />
                    </View>

                    <Text style={styles.formLabel}>Amount of Donation (in number) *</Text>
                    <View style={[styles.inputBox, { borderColor: themeLight }]}>
                        <TextInput style={styles.input} placeholder="Ex. 10,000.00" placeholderTextColor="#aaa" keyboardType="numeric" value={numAmount} onChangeText={setNumAmount} />
                    </View>

                    <Text style={styles.formLabel}>Amount of Donation (in words) *</Text>
                    <View style={[styles.inputBox, { borderColor: themeLight }]}>
                        <TextInput style={styles.input} placeholder="Ex. Ten thousand pesos" placeholderTextColor="#aaa" value={wordsAmount} onChangeText={setWordsAmount} />
                    </View>

                    <Text style={styles.formLabel}>Reference Number *</Text>
                    <View style={[styles.inputBox, { borderColor: themeLight }]}>
                        <TextInput style={styles.input} placeholder="Ex. 123456789" placeholderTextColor="#aaa" value={referenceNumber} onChangeText={setReferenceNumber} />
                    </View>

                    <Text style={styles.formLabel}>Proof of Donation *</Text>
                    <Text style={styles.subtext}>Kindly insert the screenshot/photo or any proof of donation</Text>
                    <Text style={[styles.subtext, { marginBottom: 10 }]}>Upload 1 supported file: PDF, document, or image. Max 10 MB</Text>

                    {proofImage ? (
                        <View style={{ marginBottom: 24, alignSelf: 'flex-start' }}>
                            <Image source={{ uri: proofImage }} style={{ width: 100, height: 140, borderRadius: 12, borderWidth: 1.5, borderColor: themeLight }} resizeMode="cover" />
                            <TouchableOpacity
                                style={{ position: 'absolute', top: -10, right: -10, backgroundColor: '#fff', borderRadius: 15, elevation: 4 }}
                                onPress={() => setProofImage(null)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close-circle" size={28} color="#e53e3e" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.7}>
                            <Ionicons name="cloud-upload-outline" size={20} color="#1a1a1a" />
                            <Text style={styles.uploadBtnText}> Add File</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.anonRow}>
                        <Switch
                            trackColor={{ false: '#d1d1d1', true: themeLight }}
                            thumbColor={anonymous ? themeMedium : '#f4f3f4'}
                            onValueChange={setAnonymous}
                            value={anonymous}
                        />
                        <Text style={styles.anonText}>Make this donation anonymous</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.donateSubmitBtn, { backgroundColor: themeMedium, shadowColor: themeColor }, loading && { opacity: 0.7 }]}
                        onPress={handleDonate}
                        disabled={loading}
                    >
                        <Text style={styles.donateSubmitText}>{loading ? 'Submitting...' : 'Donate it'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>

            <DonationSuccessModal
                visible={showSuccess}
                amount={lastAmount}
                stars={earnedStars}
                role={role}
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
    container: { flex: 1 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: ms(16), paddingTop: vs(10), paddingBottom: vs(10),
    },
    backBtn: { width: ms(44), height: ms(44), justifyContent: 'center' },
    logoImage: { width: ms(50), height: ms(50), resizeMode: 'contain', borderRadius: ms(25), marginLeft: ms(-6) },
    spacer: { flex: 1 },

    scrollContent: { paddingHorizontal: ms(16), paddingBottom: vs(40) },

    pageTitle: { fontSize: ms(26), fontWeight: '900', color: '#1a1a1a', textAlign: 'center', marginTop: vs(10) },
    pageSubtitle: { fontSize: ms(14), color: '#333', textAlign: 'center', marginTop: vs(10), marginBottom: vs(20), paddingHorizontal: ms(10), lineHeight: vs(20), fontWeight: '500' },

    guidelinesCard: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderRadius: ms(20), padding: ms(18),
        marginBottom: vs(24),
    },
    guideHeader: { flexDirection: 'row', alignItems: 'center' },
    guideTitle: { fontSize: ms(16), fontWeight: '800' },
    bulletTitle: { fontSize: ms(13), fontWeight: '800', color: '#555', marginTop: vs(6), marginBottom: vs(2) },
    bulletItem: { fontSize: ms(12), color: '#666', marginBottom: vs(2) },

    detailsFrame: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderRadius: ms(30), padding: ms(20),
        marginBottom: vs(20),
    },
    sectionTitle: { fontSize: ms(20), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(16) },

    inputLabel: { fontSize: ms(14), fontWeight: '800', color: '#444', marginBottom: vs(8) },
    amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(10), marginBottom: vs(16) },
    amountBtn: {
        borderWidth: 1.5, borderRadius: ms(12),
        paddingVertical: vs(12), paddingHorizontal: ms(16),
        flexBasis: '47%', alignItems: 'center'
    },
    amountBtnText: { fontSize: ms(18), color: '#888', fontWeight: '800' },
    amountBtnTextActive: { color: '#fff' },

    inputBox: {
        borderWidth: 1.5, borderRadius: ms(12),
        height: vs(52), paddingHorizontal: ms(16), justifyContent: 'center',
        marginBottom: vs(20),
    },
    input: { fontSize: ms(16), color: '#1a1a1a', flex: 1 },

    toggleRow: { flexDirection: 'row', alignSelf: 'flex-end', marginBottom: vs(24), marginTop: vs(10) },
    toggleBtn: {
        borderWidth: 1, borderColor: '#555',
        paddingVertical: vs(10), paddingHorizontal: ms(16),
        minWidth: ms(110), alignItems: 'center'
    },
    toggleBtnText: { fontSize: ms(14), fontWeight: '700', color: '#1a1a1a' },
    toggleBtnTextActive: { color: '#fff' },

    billingBox: {
        borderRadius: ms(20),
        padding: ms(24), paddingVertical: vs(36), marginBottom: vs(24),
        alignItems: 'center', justifyContent: 'center'
    },
    billingCenter: { alignItems: 'center' },
    bdoMock: {
        width: ms(120), height: ms(120), backgroundColor: '#005b9f',
        justifyContent: 'center', alignItems: 'center', marginBottom: vs(16)
    },
    bdoText: { color: '#f7c800', fontSize: ms(40), fontWeight: '900', fontStyle: 'italic' },
    qrMock: {
        width: ms(140), height: ms(140), backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center', marginBottom: vs(16),
        borderWidth: 4, borderColor: '#1a1a1a'
    },
    qrLogo: { position: 'absolute', backgroundColor: '#fff', paddingHorizontal: ms(4), fontSize: ms(14), fontWeight: '900' },
    billingName: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(4) },
    billingAccount: { fontSize: ms(16), fontWeight: '900', color: '#1a1a1a' },

    formLabel: { fontSize: ms(14), fontWeight: '800', color: '#444', marginTop: vs(4), marginBottom: vs(2) },
    subtext: { fontSize: ms(11), color: '#888', marginBottom: vs(8), lineHeight: vs(16) },

    uploadBtn: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        borderWidth: 1.5, borderColor: '#1a1a1a', borderRadius: ms(12),
        paddingVertical: vs(10), paddingHorizontal: ms(16), marginBottom: vs(24)
    },
    uploadBtnText: { fontSize: ms(14), fontWeight: '700', color: '#1a1a1a' },

    anonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(30) },
    anonText: { fontSize: ms(14), fontWeight: '800', color: '#444', marginLeft: ms(10) },

    donateSubmitBtn: {
        borderRadius: ms(24), height: vs(56),
        justifyContent: 'center', alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    },
    donateSubmitText: { color: '#fff', fontSize: ms(20), fontWeight: '900' },
});

