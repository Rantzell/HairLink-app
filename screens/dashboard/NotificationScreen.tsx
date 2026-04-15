import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, Layout, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// Reusable animated button for consistency
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

export default function NotificationScreen({ onBack, role = 'Donor' }: { onBack?: () => void, role?: 'Donor' | 'Recipient' }) {
  const isRecipient = role === 'Recipient';
  const themeColor = isRecipient ? '#9B59B6' : '#FF1493';
  const themeMedium = isRecipient ? '#8E44AD' : '#FF66B2';
  const themeLight = isRecipient ? '#E8DAEF' : '#FFB3D9';
  const themeBg = isRecipient ? '#F9F4FC' : '#F8F0F5';
  const themePale = isRecipient ? '#FFF0F8' : '#FFF0F5'; // Small adjustment for consistency
  const [activeTab, setActiveTab] = useState<'All' | 'Unread'>('All');
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  React.useEffect(() => {
    const init = async () => {
      await fetchNotifications();
      await markAllAsRead(); // Auto-mark all as read when screen opens
    };
    init();
  }, []);
  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };


  const filteredNotifications = notifications.filter((n) => {
    const matchesTab = activeTab === 'All' || !n.is_read;
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                          n.message.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getDateGroup = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const groupedNotifications = filteredNotifications.reduce((acc: any, n) => {
    const group = getDateGroup(n.created_at);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  const renderIcon = (type: string) => {
    switch (type) {
      case 'wig':
        return <MaterialCommunityIcons name="ribbon" size={28} color={themeMedium} />;
      case 'donation':
        return <MaterialCommunityIcons name="heart-pulse" size={28} color={themeMedium} />;
      case 'announcement':
        return <Ionicons name="notifications" size={28} color={themeMedium} />;
      default:
        return <Ionicons name="mail" size={28} color={themeMedium} />;
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: themeBg }]}>
      <StatusBar style="light" />
      
      {/* ── Premium Gradient Header ────────────────── */}
      <LinearGradient
        colors={isRecipient ? [themeColor, themeMedium] : ['#FF66B2', '#FF1493']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { shadowColor: isRecipient ? themeMedium : '#FF1493', paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={ms(28)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: ms(44) }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Search Bar ──────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.searchContainer}>
          <View style={[styles.searchBar, { borderColor: themeLight }]}>
            <Ionicons name="search-outline" size={20} color={themeMedium} />
            <TextInput
              placeholder="Search notifications..."
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
        </Animated.View>

        {/* ── Filters ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.tabsRow}>
          <View style={styles.tabsGroup}>
            {['All', 'Unread'].map((tab: any) => {
              const count = notifications.filter(n => tab === 'All' ? true : !n.is_read).length;
              return (
                <TouchableOpacity 
                  key={tab}
                  style={[styles.tab, activeTab === tab && [styles.activeTab, { borderColor: themeMedium }]]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && { color: themeColor }]}>{tab}</Text>
                  <View style={[styles.badge, activeTab === tab && { backgroundColor: themeMedium }]}>
                    <Text style={[styles.badgeText, activeTab === tab && styles.activeBadgeText]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={[styles.markAllText, { color: themeColor }]}>Mark all as read</Text>
          </TouchableOpacity>
        </Animated.View>

        {loading && !refreshing && (
          <View style={{ marginTop: 100 }}>
            <ActivityIndicator size="large" color={themeColor} />
          </View>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={80} color={themeLight} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyDesc}>
              {search ? "No results found for your search." : "You're all caught up! Check back later for updates."}
            </Text>
          </View>
        )}

        {/* ── Notification Groups ────────────────────── */}
        {Object.keys(groupedNotifications).map((group, gIdx) => (
          <Animated.View key={group} entering={FadeIn.delay(300 + gIdx * 100)}>
            <Text style={styles.dateHeader}>{group}</Text>
            {groupedNotifications[group].map((n: NotificationItem) => (
              <ScaleButton 
                key={n.id} 
                style={[styles.notificationCard, { borderColor: isRecipient ? '#E8DAEF' : '#FFF0F8' }]}
                onPress={() => markAsRead(n.id)}
              >
                <View style={styles.cardInner}>
                  <View style={styles.iconCircle}>
                    {renderIcon(n.type)}
                  </View>
                  <View style={styles.notifContent}>
                    <View style={styles.notifHeader}>
                      <Text style={styles.notifTitle}>{n.title}</Text>
                      {!n.is_read && <View style={[styles.unreadDot, { backgroundColor: themeMedium }]} />}
                    </View>
                    <Text style={styles.notifDesc} numberOfLines={2}>
                      {n.message}
                    </Text>
                    <Text style={styles.notifTime}>{getRelativeTime(n.created_at)}</Text>
                  </View>
                </View>
              </ScaleButton>
            ))}
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomLeftRadius: ms(30),
    borderBottomRightRadius: ms(30),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(10),
    paddingVertical: vs(15),
  },
  headerTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingBottom: vs(40) },
  searchContainer: { paddingHorizontal: ms(20), paddingTop: vs(24), marginBottom: vs(20) },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: ms(20),
    borderWidth: 1.5,
    paddingHorizontal: ms(16),
    paddingVertical: vs(12),
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: ms(10), fontSize: ms(16), fontWeight: '600', color: '#333' },

  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(20),
    marginBottom: vs(10),
  },
  tabsGroup: { flexDirection: 'row' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,102,178,0.1)',
    paddingHorizontal: ms(14),
    paddingVertical: vs(8),
    borderRadius: ms(15),
    marginRight: ms(10),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontSize: ms(14), fontWeight: '700', color: '#666', marginRight: ms(6) },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: ms(10),
    paddingHorizontal: ms(6),
    paddingVertical: vs(2),
    minWidth: ms(20),
    alignItems: 'center',
  },
  badgeText: { fontSize: ms(11), fontWeight: '800', color: '#888' },
  activeBadgeText: { color: '#fff' },
  markAllText: { fontSize: ms(13), fontWeight: '700' },

  dateHeader: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a', marginHorizontal: ms(24), marginTop: vs(24), marginBottom: vs(12) },
  notificationCard: {
    backgroundColor: '#fff',
    marginHorizontal: ms(16),
    marginBottom: vs(12),
    borderRadius: ms(22),
    shadowColor: '#FF66B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    borderWidth: 1,
    height: vs(100), // Explicit height for ScaleButton logic
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: ms(12), flex: 1 },
  iconCircle: {
    width: ms(60), height: ms(60), borderRadius: ms(30),
    backgroundColor: '#FFF0F8',
    justifyContent: 'center', alignItems: 'center',
    marginRight: ms(14),
  },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: vs(2) },
  notifTitle: { fontSize: ms(16), fontWeight: '800', color: '#1a1a1a' },
  unreadDot: { width: ms(8), height: ms(8), borderRadius: ms(4), backgroundColor: '#FF66B2' },
  notifDesc: { fontSize: ms(14), color: '#666', lineHeight: vs(18), fontWeight: '500' },
  notifTime: { fontSize: ms(11), color: '#999', marginTop: vs(4), fontWeight: '700' },
  
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: vs(80), paddingHorizontal: ms(40) },
  emptyTitle: { fontSize: ms(20), fontWeight: '900', color: '#1a1a1a', marginTop: vs(20) },
  emptyDesc: { fontSize: ms(14), color: '#999', textAlign: 'center', marginTop: vs(10), lineHeight: vs(20), fontWeight: '600' },
});


