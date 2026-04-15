import React, { useState, useEffect, useCallback, useRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Layout,
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

import MonetaryDonationDashboard from './MonetaryDonationDashboard';
import HairDonationScreen from './HairDonationScreen';
import DonorCalendarScreen from './DonorCalendarScreen';
import NotificationScreen from './NotificationScreen';
import DonationHistoryScreen from './DonationHistoryScreen';
import ProfileScreen from './ProfileScreen';

interface DonorDashboardProps {
  onLogout?: () => void;
  onRoleChange?: (role: 'Donor' | 'Recipient') => void;
  userName?: string;
}

// Reusable animated button for premium feedback
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
        style={styles.scaleButtonInner}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function DonorDashboard({ onLogout, onRoleChange, userName = "Donor" }: DonorDashboardProps) {
  const [showMonetary, setShowMonetary] = useState(false);
  const [showHairDonation, setShowHairDonation] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [starPoints, setStarPoints] = useState(0);
  const [referralCode, setReferralCode] = useState('---');
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsViewedRef = useRef(false); // Track if user has seen notifications

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 14, mins: 30, secs: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 };
        if (prev.mins > 0) return { ...prev, mins: prev.mins - 1, secs: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, mins: 59, secs: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, mins: 59, secs: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchPoints = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch Approved Donations for Points
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('type, amount')
        .eq('user_id', session.user.id)
        .eq('status', 'approved');

      if (donationsError) throw donationsError;

      let total = 0;
      donations.forEach((d) => {
        if (d.type === 'hair') {
          total += 10;
        } else if (d.type === 'monetary') {
          total += Math.floor(d.amount / 100);
        }
      });
      setStarPoints(total);

      // 2. Fetch Referral Code from Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.log('Error fetching referral code:', profileError);
      } else if (profile) {
        setReferralCode(profile.referral_code || '---');
      }
    } catch (err) {
      console.log('Error fetching user data:', err);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    } catch (err) {
      console.log('Error fetching unread count:', err);
    }
  }, []);

  useEffect(() => {
    fetchPoints();
    fetchUnreadCount();
  }, [fetchPoints, fetchUnreadCount]);

  useEffect(() => {
    // Only re-fetch unread count when returning from other screens, not notifications
    if (!showMonetary && !showHairDonation && !showCalendar && !showNotifications && !showHistory && !showProfile) {
      fetchPoints();
      if (!notificationsViewedRef.current) {
        fetchUnreadCount();
      }
    }
  }, [showMonetary, showHairDonation, showCalendar, showNotifications, showHistory, showProfile, fetchPoints, fetchUnreadCount]);

  const navPlaceholder = (screen: string) =>
    Alert.alert('Coming Soon', `${screen} is coming soon!`);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(referralCode);
    Alert.alert('Copied', `Referral code "${referralCode}" copied to clipboard!`);
  };

  const handleOpenURL = (url: string) => {
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Cannot open link'));
  };

  if (showMonetary) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <MonetaryDonationDashboard
          onBack={() => setShowMonetary(false)}
          onSuccess={() => {
            setShowMonetary(false);
            setShowNotifications(true);
          }}
        />
      </Animated.View>
    );
  }

  if (showHairDonation) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <HairDonationScreen
          onBack={() => setShowHairDonation(false)}
          onSuccess={() => {
            setShowHairDonation(false);
            setShowNotifications(true);
          }}
        />
      </Animated.View>
    );
  }

  if (showCalendar) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <DonorCalendarScreen onBack={() => setShowCalendar(false)} />
      </Animated.View>
    );
  }

  if (showNotifications) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <NotificationScreen onBack={() => setShowNotifications(false)} role="Donor" />
      </Animated.View>
    );
  }

  if (showHistory) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <DonationHistoryScreen onBack={() => setShowHistory(false)} />
      </Animated.View>
    );
  }

  if (showProfile) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <ProfileScreen
          onBack={() => setShowProfile(false)}
          onLogout={onLogout!}
          onRoleChange={onRoleChange}
        />
      </Animated.View>
    );
  }

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      {/* ── Header ─────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(400)}>
        <LinearGradient
          colors={['rgba(255, 102, 204, 0.88)', 'rgba(255, 153, 221, 0.88)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerGreeting}>Welcome back 👋</Text>
            <Text style={styles.headerRole} numberOfLines={1}>{userName}</Text>
          </View>
          <ScaleButton onPress={() => setShowProfile(true)} style={styles.logoutBtn}>
            <Ionicons name="person-circle-outline" size={30} color="#fff" />
          </ScaleButton>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────── */}
        <Animated.View entering={FadeInDown.springify().delay(100)}>
          <LinearGradient
            colors={['#FFF0F8', '#FFD6EF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroTitle}>STRAND UP{'\n'}FOR CANCER</Text>
            <Text style={styles.heroSubtitle}>Hope begins, one strand at a time</Text>
            <ScaleButton
              style={styles.heroCTA}
              onPress={() => setShowMonetary(true)}
            >
              <Text style={styles.heroCTAText}>Donate Now →</Text>
            </ScaleButton>
          </LinearGradient>
        </Animated.View>

        {/* ── Star Points Card ──────────────────────── */}
        <Animated.View entering={FadeInRight.springify().delay(200)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="star" size={20} color="#FF1493" />
            <Text style={styles.cardTitle}>  Star Points</Text>
            <TouchableOpacity onPress={() => setShowHistory(true)}>
              <View style={styles.historyBtnSmall}>
                <MaterialCommunityIcons name="history" size={16} color="#FF1493" />
                <Text style={styles.historyBtnTextSmall}>View History</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.pointsBadge}>{starPoints} ⭐</Text>
          </View>

          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min((starPoints / 100) * 100, 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{starPoints} / 100 pts — Free wig at 100!</Text>

          <View style={styles.starsRow}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Text key={i} style={styles.star}>⭐</Text>
            ))}
          </View>
        </Animated.View>

        {/* ── Referral ──────────────────────────────── */}
        <Animated.View entering={FadeInRight.springify().delay(300)} style={styles.referralRow}>
          <Text style={styles.referralLabel}>Referral Code:</Text>
          <ScaleButton
            style={styles.referralBox}
            onPress={copyToClipboard}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, paddingRight: 16 }}>
              <Text style={styles.referralCode}>{referralCode}</Text>
              <Ionicons name="copy-outline" size={18} color="#FF1493" />
            </View>
          </ScaleButton>
        </Animated.View>

        {/* ── How It Works ──────────────────────────── */}
        <Animated.View entering={FadeInDown.springify().delay(400)} style={styles.card}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.sectionSubtitle}>
            Give the gift of confidence — donate hair or support financially.
          </Text>

          <View style={styles.actionsRow}>
            <View style={styles.actionBox}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="cut-outline" size={28} color="#FF1493" />
              </View>
              <Text style={styles.actionTitle}>Donate Hair</Text>
              <Text style={styles.actionDesc}>
                Give your hair to someone in need.
              </Text>
              <ScaleButton
                style={styles.actionBtn}
                onPress={() => setShowHairDonation(true)}
              >
                <Text style={styles.actionBtnText}>Donate</Text>
              </ScaleButton>
            </View>

            <View style={styles.actionBox}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="cash-outline" size={28} color="#FF1493" />
              </View>
              <Text style={styles.actionTitle}>Monetary</Text>
              <Text style={styles.actionDesc}>
                Support our mission and earn points.
              </Text>
              <ScaleButton
                style={styles.actionBtn}
                onPress={() => setShowMonetary(true)}
              >
                <Text style={styles.actionBtnText}>Give</Text>
              </ScaleButton>
            </View>
          </View>
        </Animated.View>

        {/* ── Banner ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.springify().delay(500)} style={styles.bannerWrapper}>
          <Image
            source={require('../../assets/group.jpg')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* ── About Us ───────────────────────────────── */}
        <Animated.View entering={FadeInUp.springify().delay(600)} style={styles.aboutUsContainer}>
          <View style={styles.aboutUsHeader}>
            <Text style={styles.aboutUsTitle}>About Us</Text>
            <MaterialCommunityIcons
              name="ribbon"
              size={32}
              color="#FF66B2"
              style={styles.ribbonIcon}
            />
          </View>
          <Text style={styles.aboutUsText}>
            Strand Up for Cancer (SUFC) is a youth-led initiative of the Manila Downtown YMCA Youth Club dedicated to supporting patients who experience long-term hair loss caused by illness and medical treatment. Through hair donations, we craft wigs that restore not only appearance but also a sense of dignity, comfort, and renewed self-confidence. Each strand given is more than just hair—it’s a gift of hope and strength.
          </Text>
        </Animated.View>

        {/* ── Our Partners ───────────────────────────── */}
        <Animated.View entering={FadeInRight.springify().delay(700)} style={styles.partnersSection}>
          <Text style={styles.sectionTitle}>Our Partners</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.partnersContent}
            contentContainerStyle={styles.partnersScrollContent}
          >
            {[
              { id: 1, name: 'YMCA Youth Club', img: require('../../assets/ymca.jpg'), url: 'https://web.facebook.com/ManilaDowntownYMCAYouthClub' },
              { id: 2, name: 'Richard D. Manila', img: require('../../assets/RDM.png'), url: 'https://web.facebook.com/Richarddmanilawigmaker' },
              { id: 3, name: 'PGH Hospital', img: require('../../assets/pgh_logo.png'), url: 'https://pgh.gov.ph/' }
            ].map((p, idx) => (
              <ScaleButton
                key={p.id}
                style={styles.partnerCard}
                onPress={() => handleOpenURL(p.url)}
              >
                <View style={styles.partnerLogoPlaceholder}>
                  <Image source={p.img} style={styles.partnerImg} />
                </View>
                <Text style={styles.partnerName}>{p.name}</Text>
              </ScaleButton>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Upcoming Events ────────────────────────── */}
        <Animated.View entering={FadeInUp.springify().delay(800)} style={styles.eventsSection}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowCalendar(true)}>
            <LinearGradient
              colors={['#FF66B2', '#FF1493']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.eventCard}
            >
              <View style={styles.eventHeader}>
                <Text style={styles.eventLabel}>UPCOMING EVENT</Text>
                <Ionicons name="calendar" size={20} color="#fff" />
              </View>
              <Text style={styles.eventTitle}>Annual Grand Hair Drive</Text>
              <Text style={styles.eventSubtitle}>Manila Downtown YMCA Auditorium</Text>

              <View style={styles.countdownRow}>
                {['DAYS', 'HOURS', 'MINS', 'SECS'].map((unit, idx) => {
                  const val = unit === 'DAYS' ? timeLeft.days :
                    unit === 'HOURS' ? timeLeft.hours :
                      unit === 'MINS' ? timeLeft.mins : timeLeft.secs;
                  return (
                    <React.Fragment key={unit}>
                      <View style={styles.countdownBlock}>
                        <Text style={styles.countdownNum}>{val}</Text>
                        <Text style={styles.countdownLabel}>{unit}</Text>
                      </View>
                      {idx < 3 && <Text style={styles.countdownDivider}>:</Text>}
                    </React.Fragment>
                  )
                })}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* ── Bottom Nav ────────────────────────────── */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + ms(8), height: vs(78) + insets.bottom }]}>
        <ScaleButton style={styles.navItem} onPress={() => { }}>
          <Feather name="home" size={ms(26)} color="#e91e63" />
          <Text style={[styles.navLabel, { color: '#e91e63' }]}>Home</Text>
        </ScaleButton>

        <ScaleButton style={styles.navItem} onPress={() => setShowCalendar(true)}>
          <Ionicons name="calendar-outline" size={ms(26)} color="#888" />
          <Text style={styles.navLabel}>Schedule</Text>
        </ScaleButton>

        <ScaleButton style={[styles.arButton, { width: ms(64), height: ms(64), borderRadius: ms(32) }]} onPress={() => navPlaceholder('AR Try-On')}>
          <MaterialCommunityIcons name="augmented-reality" size={ms(30)} color="#fff" />
        </ScaleButton>

        <ScaleButton style={styles.navItem} onPress={() => {
          setShowNotifications(true);
          setUnreadCount(0); // Clear badge immediately
          notificationsViewedRef.current = true; // Prevent re-fetch after returning
        }}>
          <View style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={ms(26)} color="#888" />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -ms(6),
                right: -ms(8),
                backgroundColor: '#FF1493',
                borderRadius: ms(10),
                minWidth: ms(18),
                height: ms(18),
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: ms(4),
                borderWidth: ms(2),
                borderColor: '#fff',
              }}>
                <Text style={{ color: '#fff', fontSize: ms(10), fontWeight: '900' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.navLabel}>Alerts</Text>
        </ScaleButton>

        <ScaleButton style={styles.navItem} onPress={() => setShowProfile(true)}>
          <Ionicons name="person-outline" size={ms(26)} color={showProfile ? '#e91e63' : '#888'} />
          <Text style={[styles.navLabel, showProfile && { color: '#e91e63' }]}>Profile</Text>
        </ScaleButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F0F5' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    paddingVertical: vs(14),
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomLeftRadius: ms(24),
    borderBottomRightRadius: ms(24),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: vs(8),
  },
  logoImage: { width: ms(44), height: ms(44), resizeMode: 'contain', borderRadius: ms(22), backgroundColor: '#fff' },
  headerGreeting: { fontSize: ms(12), color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  headerRole: { fontSize: ms(17), color: '#fff', fontWeight: '900' },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: ms(20), padding: ms(6),
    width: ms(40), height: ms(40),
    alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { paddingBottom: vs(110) },

  heroCard: {
    margin: ms(14),
    borderRadius: ms(22),
    padding: ms(22),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTitle: {
    fontSize: ms(26),
    fontWeight: '900',
    color: '#1a1a1a',
    lineHeight: vs(32),
    marginBottom: vs(6),
  },
  heroSubtitle: { fontSize: ms(13), color: '#FF1493', fontWeight: '700', marginBottom: vs(18) },
  heroCTA: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF66B2',
    paddingHorizontal: ms(22),
    paddingVertical: vs(10),
    borderRadius: ms(22),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  heroCTAText: { color: '#fff', fontWeight: '800', fontSize: ms(14) },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: ms(14),
    marginBottom: vs(14),
    borderRadius: ms(20),
    padding: ms(18),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(14), justifyContent: 'space-between' },
  cardTitle: { fontSize: ms(16), fontWeight: '800', color: '#1a1a1a', flex: 1 },
  historyBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F8',
    paddingHorizontal: ms(8),
    paddingVertical: vs(4),
    borderRadius: ms(8),
    marginRight: ms(10),
  },
  historyBtnTextSmall: {
    fontSize: ms(11),
    fontWeight: '800',
    color: '#FF1493',
    marginLeft: ms(4),
  },
  pointsBadge: {
    fontSize: ms(14), fontWeight: '800', color: '#FF1493',
    backgroundColor: '#FFF0F8', paddingHorizontal: ms(10),
    paddingVertical: vs(4), borderRadius: ms(12),
  },

  progressBg: { backgroundColor: '#F0F0F0', height: vs(8), borderRadius: ms(8), marginBottom: vs(6) },
  progressFill: { backgroundColor: '#FF66CC', height: vs(8), borderRadius: ms(8) },
  progressLabel: { fontSize: ms(11), color: '#999', fontWeight: '600', marginBottom: vs(12) },

  starsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  star: { fontSize: ms(16) },

  referralRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: ms(14), marginBottom: vs(14),
  },
  referralLabel: { fontSize: ms(15), fontWeight: '700', color: '#333', marginRight: ms(10) },
  referralBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#FF66CC', borderRadius: ms(14),
    paddingHorizontal: ms(16), paddingVertical: vs(12), backgroundColor: '#fff',
  },
  referralCode: { fontSize: ms(16), fontWeight: '800', color: '#FF1493', letterSpacing: ms(2) },

  sectionTitle: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a', textAlign: 'center', marginBottom: vs(4) },
  sectionSubtitle: { fontSize: ms(12), color: '#888', textAlign: 'center', marginBottom: vs(18), lineHeight: vs(18) },

  actionsRow: { flexDirection: 'row' },
  actionBox: {
    flex: 1,
    borderWidth: 1.5, borderColor: '#FFD6EF',
    borderRadius: ms(18),
    padding: ms(14), alignItems: 'center',
    marginHorizontal: ms(4),
    backgroundColor: '#FFFAFC',
  },
  actionIconCircle: {
    width: ms(54), height: ms(54), borderRadius: ms(27),
    backgroundColor: '#FFF0F8',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: vs(10),
  },
  actionTitle: { fontSize: ms(15), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(6), textAlign: 'center' },
  actionDesc: { fontSize: ms(11), color: '#888', textAlign: 'center', lineHeight: vs(16), marginBottom: vs(14), flex: 1 },
  actionBtn: {
    backgroundColor: '#FF66B2', borderRadius: ms(16),
    paddingHorizontal: ms(20), paddingVertical: vs(8),
    alignSelf: 'stretch', alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: ms(13) },

  bannerWrapper: {
    marginHorizontal: ms(14), marginBottom: vs(24),
    borderRadius: ms(18), overflow: 'hidden',
    backgroundColor: '#FFF0F8',
    elevation: 3,
  },
  bannerImage: { width: '100%', height: vs(250) },

  aboutUsContainer: {
    paddingHorizontal: ms(20),
    marginBottom: vs(30),
    alignItems: 'center',
  },
  aboutUsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(12),
  },
  aboutUsTitle: {
    fontSize: ms(26),
    fontWeight: '900',
    color: '#1a1a1a',
    marginRight: ms(8),
  },
  ribbonIcon: {
    transform: [{ rotate: '15deg' }],
  },
  aboutUsText: {
    fontSize: ms(14),
    color: '#333',
    textAlign: 'center',
    lineHeight: vs(22),
    fontWeight: '500',
  },

  partnersSection: {
    marginBottom: vs(30),
  },
  partnersContent: {
    marginTop: vs(14),
  },
  partnersScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: ms(14),
  },
  partnerCard: {
    backgroundColor: '#fff',
    borderRadius: ms(16),
    padding: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(12),
    width: ms(120),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFF0F8',
  },
  partnerLogoPlaceholder: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    backgroundColor: '#FFF0F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(10),
    alignSelf: 'center',
    overflow: 'hidden',
  },
  partnerImg: {
    width: '70%',
    height: '70%',
    resizeMode: 'contain',
  },
  partnerName: {
    fontSize: ms(11),
    fontWeight: '700',
    color: '#666',
    textAlign: 'center',
  },

  eventsSection: {
    marginHorizontal: ms(14),
    marginBottom: vs(30),
  },
  eventCard: {
    borderRadius: ms(22),
    padding: ms(20),
    shadowColor: '#FF1493',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  eventLabel: {
    fontSize: ms(11),
    fontWeight: '900',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
  },
  eventTitle: {
    fontSize: ms(22),
    fontWeight: '900',
    color: '#fff',
    marginBottom: vs(4),
  },
  eventSubtitle: {
    fontSize: ms(12),
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: vs(20),
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: ms(16),
    paddingVertical: vs(12),
  },
  countdownBlock: {
    alignItems: 'center',
    width: ms(60),
  },
  countdownNum: {
    fontSize: ms(22),
    fontWeight: '900',
    color: '#fff',
  },
  countdownLabel: {
    fontSize: ms(9),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    marginTop: vs(2),
  },
  countdownDivider: {
    fontSize: ms(22),
    color: '#fff',
    fontWeight: '900',
    marginHorizontal: ms(4),
    marginTop: vs(-10),
  },

  scaleButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    borderTopWidth: 1.5, borderTopColor: '#FFD6EF',
    shadowColor: '#FF66B2',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ms(64),
  },
  navLabel: { fontSize: ms(10), color: '#888', fontWeight: '700', marginTop: vs(4) },
  arButton: {
    backgroundColor: '#FF66B2',
    alignItems: 'center', justifyContent: 'center',
    marginTop: vs(-34),
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
});