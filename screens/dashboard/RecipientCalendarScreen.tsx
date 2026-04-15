import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  FadeIn, 
  FadeOut, 
  SlideInUp, 
  Layout, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  location: string;
  time: string;
  date: string; // YYYY-MM-DD
  type: 'drive' | 'meeting' | 'other';
  accepted?: boolean;
  status?: string;
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

export default function RecipientCalendarScreen({ onBack }: { onBack?: () => void }) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [showAcceptedModal, setShowAcceptedModal] = useState(false);
  const [showMonthView, setShowMonthView] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // ── Fetch Donations ──────────────────────────
  React.useEffect(() => {
    fetchDonations();
  }, [viewDate]);

  const fetchDonations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch both donations and hair requests simultaneously
      const [donationsResult, requestsResult] = await Promise.all([
        supabase.from('donations').select('*').eq('user_id', session.user.id),
        supabase.from('hair_requests').select('*').eq('user_id', session.user.id)
      ]);

      if (donationsResult.error) throw donationsResult.error;
      if (requestsResult.error) throw requestsResult.error;

      // Map donations to Events
      const mappedDonations: Event[] = (donationsResult.data || []).map((d: any) => ({
        id: d.id,
        title: d.type === 'hair' ? 'Hair Donation' : `Monetary Support (₱${d.amount})`,
        location: d.type === 'hair' ? 'Strand-by-Strand' : 'Financial Aid',
        time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: d.created_at.split('T')[0],
        type: d.type === 'hair' ? 'drive' : 'other', 
        accepted: d.status === 'approved',
        status: d.status
      }));

      // Map hair requests to Events
      const mappedRequests: Event[] = (requestsResult.data || []).map((h: any) => ({
        id: h.id,
        title: 'Hair Request',
        location: 'Medical Review',
        time: new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: h.created_at.split('T')[0],
        type: 'drive',
        accepted: h.status === 'approved',
        status: h.status
      }));

      setEvents([...mappedDonations, ...mappedRequests]);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Dynamic Date Helpers ─────────────────────
  
  const monthName = useMemo(() => {
    return viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [viewDate]);

  const monthDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', full: `pad-${i}`, isPadding: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        const full = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        days.push({ date: i.toString(), full, isPadding: false });
    }
    return days;
  }, [viewDate]);

  const weekDays = useMemo(() => {
    const sel = new Date(selectedDate);
    const startOfWeek = new Date(sel);
    startOfWeek.setDate(sel.getDate() - sel.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        return {
            day: dayNames[i],
            date: d.getDate().toString(),
            full: d.toISOString().split('T')[0]
        };
    });
  }, [selectedDate]);

  const dailyEvents = events.filter((e) => e.date === selectedDate);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const handleAccept = (eventId: string) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, accepted: true } : e));
    setShowAcceptedModal(true);
  };

  const getDayNameLong = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('default', { weekday: 'long' });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* ── Premium Purple Gradient Header ────────────────── */}
      <LinearGradient
        colors={['#8E44AD', '#9B59B6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.purpleHeader, { paddingTop: insets.top }]}
      >
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtnWrapper}>
            <Ionicons name="chevron-back" size={ms(28)} color="#fff" />
          </TouchableOpacity>
            
            <View style={styles.titleNavGroup}>
              <Text style={styles.monthTitle}>{monthName}</Text>
              
              <View style={styles.navArrows}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
                  <Ionicons name="chevron-back-circle-outline" size={ms(26)} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
                  <Ionicons name="chevron-forward-circle-outline" size={ms(26)} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.headerIcons}>
              <ScaleButton style={styles.iconCircle} onPress={() => setShowMonthView(!showMonthView)}>
                <Ionicons 
                  name={showMonthView ? "list-sharp" : "calendar-sharp"} 
                  size={ms(22)} 
                  color={"#9B59B6"} 
                />
              </ScaleButton>
            </View>
          </View>

          <Animated.View layout={Layout.springify()}>
            {showMonthView ? (
              <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.monthGrid}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={i} style={styles.monthDayName}>{d}</Text>
                ))}
                {monthDays.map((m, idx) => (
                  <ScaleButton 
                    key={`${m.full}-${idx}`} 
                    style={[
                        styles.monthDayItem, 
                        selectedDate === m.full && styles.selectedMonthDay,
                        m.isPadding && { opacity: 0 }
                    ]}
                    onPress={() => !m.isPadding && setSelectedDate(m.full)}
                  >
                    <Text style={[styles.monthDayText, selectedDate === m.full && styles.selectedMonthDayText]}>
                      {m.date}
                    </Text>
                    {!m.isPadding && events.some(e => e.date === m.full) && <View style={styles.eventDot} />}
                  </ScaleButton>
                ))}
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.weekRow}>
                {weekDays.map((w) => (
                  <ScaleButton 
                    key={w.full} 
                    style={[styles.dayItem, selectedDate === w.full && styles.selectedDay]}
                    onPress={() => setSelectedDate(w.full)}
                  >
                    <Text style={[styles.dayName, selectedDate === w.full && styles.selectedDayText]}>{w.day}</Text>
                    <Text style={[styles.dayDate, selectedDate === w.full && styles.selectedDayText]}>{w.date}</Text>
                  </ScaleButton>
                ))}
              </Animated.View>
            )}
          </Animated.View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.whiteCard}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{getDayNameLong(selectedDate)} {selectedDate.split('-')[2]}</Text>
            <TouchableOpacity onPress={() => setSelectedDate(today.toISOString().split('T')[0])} style={styles.todayBtn}>
               <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
            <View style={styles.line} />
          </View>

          {dailyEvents.length > 0 ? (
            <FlatList
              data={dailyEvents}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                    <Animated.View entering={FadeInDown.springify()} style={styles.eventItem}>
                      <View style={styles.timeCol}>
                        <Text style={styles.timeText}>{item.time.split(' ')[0]}</Text>
                        <Text style={styles.ampmText}>{item.time.split(' ')[1]}</Text>
                      </View>
                      
                      <LinearGradient
                        colors={['#9B59B6', '#8E44AD']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.eventCard}
                      >
                    <View style={styles.eventIconBg}>
                      {item.title.includes('Hair') ? (
                        <MaterialCommunityIcons name="heart-pulse" size={ms(24)} color="#9B59B6" />
                      ) : (
                        <MaterialCommunityIcons name="cash-multiple" size={ms(24)} color="#9B59B6" />
                      )}
                    </View>
                    <View style={styles.eventDetails}>
                      <Text style={styles.eventTitle}>{item.title}</Text>
                      <Text style={styles.eventLoc}>{item.location}</Text>
                      
                      {item.status && (
                        <View style={[
                          styles.statusBadge, 
                          { backgroundColor: item.status === 'approved' ? '#27AE60' : '#F39C12' }
                        ]}>
                          <Text style={styles.statusBadgeText}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                      </LinearGradient>
                    </Animated.View>
              )}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-blank" size={ms(60)} color="#E8DAEF" />
              <Text style={styles.emptyText}>No requests or aid for this date.</Text>
            </View>
          )}
        </View>
      </View>

      <Modal visible={showAcceptedModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={SlideInUp} style={styles.modalContent}>
            <View style={styles.modalIconBg}>
              <Ionicons name="checkmark-done" size={ms(40)} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Request Updated</Text>
            <Text style={styles.modalDesc}>Your application status has been refreshed.</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowAcceptedModal(false)}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F4FC' },
  purpleHeader: { 
    paddingHorizontal: ms(16), 
    paddingBottom: vs(24),
    borderBottomLeftRadius: ms(30),
    borderBottomRightRadius: ms(30),
    shadowColor: '#9B59B6',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  topRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: vs(10), 
    marginBottom: vs(20),
    width: '100%',
  },
  backBtnWrapper: { 
    width: ms(44), 
    height: ms(44), 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  titleNavGroup: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: ms(4),
  },
  monthTitle: { 
    fontSize: ms(20), 
    fontWeight: '900', 
    color: '#fff', 
    marginRight: ms(10),
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  navArrows: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: ms(20),
    paddingHorizontal: ms(4),
  },
  arrowBtn: { 
    padding: ms(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcons: { 
    width: ms(44), 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconCircle: { 
    width: ms(42), 
    height: ms(42), 
    borderRadius: ms(14), 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  weekRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: ms(4), marginTop: vs(10) },
  dayItem: { alignItems: 'center', paddingVertical: vs(14), borderRadius: ms(24), width: '13%', height: vs(72) },
  selectedDay: { 
    backgroundColor: '#fff', 
    elevation: 8,
    shadowColor: '#9B59B6',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  dayName: { fontSize: ms(13), fontWeight: '800', color: 'rgba(255,255,255,0.8)', marginBottom: vs(6), letterSpacing: 0.5 },
  dayDate: { fontSize: ms(20), fontWeight: '900', color: '#fff' },
  selectedDayText: { color: '#9B59B6' },

  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', paddingHorizontal: 0, marginTop: vs(10) },
  monthDayName: { width: '14.28%', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontWeight: '900', fontSize: ms(13), marginBottom: vs(15), letterSpacing: 1 },
  monthDayItem: { width: '14.28%', height: vs(48), alignItems: 'center', justifyContent: 'center', marginBottom: vs(6), borderRadius: ms(14) },
  selectedMonthDay: { 
    backgroundColor: '#fff', 
    elevation: 8,
    shadowColor: '#9B59B6',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  monthDayText: { color: '#fff', fontWeight: '900', fontSize: ms(16) },
  selectedMonthDayText: { color: '#9B59B6' },
  eventDot: { width: ms(5), height: ms(5), borderRadius: ms(2.5), backgroundColor: '#AF7AC5', position: 'absolute', bottom: vs(6) },

  content: { flex: 1, backgroundColor: '#F9F4FC', marginTop: vs(-25) },
  whiteCard: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderRadius: ms(35), 
    marginHorizontal: ms(16), 
    padding: ms(28), 
    marginTop: vs(10), 
    marginBottom: vs(20), 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 20, 
    elevation: 4,
    shadowOffset: { width: 0, height: 5 },
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(35) },
  dayTitle: { fontSize: ms(26), fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
  line: { flex: 1, height: 1.5, backgroundColor: '#f0f0f0', marginLeft: ms(15) },
  todayBtn: { marginLeft: ms(15), backgroundColor: '#F4ECF7', paddingHorizontal: ms(14), paddingVertical: vs(8), borderRadius: ms(12) },
  todayBtnText: { fontSize: ms(14), fontWeight: '900', color: '#9B59B6', textTransform: 'uppercase', letterSpacing: 0.5 },

  eventItem: { flexDirection: 'row', marginBottom: vs(30) },
  timeCol: { width: ms(70), alignItems: 'flex-start', paddingTop: vs(8) },
  timeText: { fontSize: ms(24), fontWeight: '900', color: '#1a1a1a', letterSpacing: -1 },
  ampmText: { fontSize: ms(12), fontWeight: '800', color: '#bbb', textTransform: 'uppercase', marginTop: vs(-2) },

  eventCard: { 
    flex: 1, 
    borderRadius: ms(26), 
    padding: ms(20), 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: '#9B59B6', 
    shadowOpacity: 0.25, 
    shadowRadius: 12, 
    elevation: 6,
    shadowOffset: { width: 0, height: 6 },
  },
  eventIconBg: { 
    width: ms(54), 
    height: ms(54), 
    borderRadius: ms(18), 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: ms(18),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  eventDetails: { flex: 1 },
  eventTitle: { fontSize: ms(18), fontWeight: '900', color: '#fff', marginBottom: vs(4), letterSpacing: 0.2 },
  eventLoc: { fontSize: ms(13), color: 'rgba(255,255,255,0.9)', marginBottom: vs(14), fontWeight: '700' },
  statusBadge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: ms(14), 
    paddingVertical: vs(6), 
    borderRadius: ms(12), 
    marginTop: vs(10),
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  statusBadgeText: { 
    color: '#fff', 
    fontSize: ms(12), 
    fontWeight: '900', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: vs(60) },
  emptyText: { fontSize: ms(18), color: '#bbb', fontWeight: '800', marginTop: vs(20), textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: ms(35), padding: ms(35), width: '85%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 25, elevation: 20 },
  modalIconBg: { width: ms(90), height: ms(90), borderRadius: ms(45), backgroundColor: '#9B59B6', justifyContent: 'center', alignItems: 'center', marginBottom: vs(25) },
  modalTitle: { fontSize: ms(24), fontWeight: '900', color: '#fff', marginBottom: vs(12), letterSpacing: 0.2 },
  modalDesc: { fontSize: ms(16), color: '#999', textAlign: 'center', marginBottom: vs(35), lineHeight: vs(24), fontWeight: '600' },
  modalBtn: { borderTopWidth: 1, borderTopColor: '#333', width: '100%', paddingTop: vs(25), alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: ms(18), fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
});
