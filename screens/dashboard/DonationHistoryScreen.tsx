import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

interface DonationRecord {
  id: string;
  type: 'hair' | 'monetary';
  amount: number;
  status: 'approved' | 'pending' | 'rejected';
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

export default function DonationHistoryScreen({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const insets = useSafeAreaInsets();

  const fetchHistory = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Approved' };
      case 'pending': return { bg: '#FFF3E0', text: '#EF6C00', label: 'Pending' };
      case 'rejected': return { bg: '#FFEBEE', text: '#C62828', label: 'Rejected' };
      default: return { bg: '#F5F5F5', text: '#757575', label: status };
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={['#FF66B2', '#FF1493']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={ms(28)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Donation History</Text>
          <View style={{ width: ms(44) }} />
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF66B2" />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#FF1493" style={{ marginTop: vs(50) }} />
        ) : donations.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="heart-multiple-outline" size={ms(80)} color="#FFD6EF" />
            <Text style={styles.emptyTitle}>No Donations Yet</Text>
            <Text style={styles.emptyDesc}>Your kindness will show up here as soon as you make your first donation!</Text>
          </View>
        ) : (
          donations.map((item, idx) => {
            const status = getStatusStyle(item.status);
            return (
              <Animated.View 
                key={item.id} 
                entering={FadeInUp.delay(idx * 100).springify()}
                style={styles.recordCard}
              >
                 <View style={styles.cardMain}>
                   <View style={[styles.iconCircle, { backgroundColor: item.type === 'hair' ? '#FFF0F8' : '#E3F2FD' }]}>
                      {item.type === 'hair' ? (
                        <MaterialCommunityIcons name="content-cut" size={ms(26)} color="#FF1493" />
                      ) : (
                        <FontAwesome5 name="wallet" size={ms(20)} color="#1976D2" />
                      )}
                   </View>
                   
                   <View style={styles.infoCol}>
                      <Text style={styles.cardTitle}>
                        {item.type === 'hair' ? 'Hair Donation' : 'Monetary Support'}
                      </Text>
                      <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                   </View>

                   <View style={styles.rightCol}>
                      {item.type === 'monetary' && (
                        <Text style={styles.amountText}>₱{item.amount}</Text>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                      </View>
                   </View>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F0F5' },
  header: {
    borderBottomLeftRadius: ms(30),
    borderBottomRightRadius: ms(30),
    shadowColor: '#FF1493',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(10),
    paddingVertical: vs(15),
  },
  headerTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff' },
  backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },

  scrollContent: { padding: ms(20), paddingBottom: vs(40) },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: ms(20),
    marginBottom: vs(15),
    padding: ms(16),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: '#FFF0F8',
  },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: ms(52), height: ms(52), borderRadius: ms(18),
    justifyContent: 'center', alignItems: 'center',
    marginRight: ms(15),
  },
  infoCol: { flex: 1 },
  cardTitle: { fontSize: ms(16), fontWeight: '800', color: '#1a1a1a', marginBottom: vs(2) },
  cardDate: { fontSize: ms(12), color: '#999', fontWeight: '600' },
  
  rightCol: { alignItems: 'flex-end' },
  amountText: { fontSize: ms(16), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(6) },
  statusBadge: {
    paddingHorizontal: ms(10),
    paddingVertical: vs(4),
    borderRadius: ms(10),
  },
  statusText: { fontSize: ms(11), fontWeight: '800', textTransform: 'uppercase' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: vs(100) },
  emptyTitle: { fontSize: ms(20), fontWeight: '900', color: '#FF66B2', marginTop: vs(20) },
  emptyDesc: { fontSize: ms(14), color: '#999', textAlign: 'center', paddingHorizontal: ms(40), marginTop: vs(10), lineHeight: vs(20) },
});

