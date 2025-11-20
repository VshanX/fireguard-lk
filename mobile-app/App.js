import { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TextInput, TouchableOpacity, Alert, FlatList, Image, ScrollView, SafeAreaView, StatusBar, ActivityIndicator, Animated, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from './supabaseClient';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#d32f2f',
  secondary: '#1976d2',
  dark: '#0a0e27',
  darker: '#050810',
  text: '#ffffff',
  subtitle: '#b0bec5',
  success: '#4caf50',
  warning: '#ff9800',
  danger: '#f44336',
  border: '#1a237e'
};

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationInterval, setLocationInterval] = useState(null);
  const [activeTab, setActiveTab] = useState('incidents');
  const [locationEnabled, setLocationEnabled] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const cardAnimations = useRef({}).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchIncidents();
        startLocationTracking(session.user.id);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchIncidents();
        startLocationTracking(session.user.id);
      }
    });
  }, []);

  const startLocationTracking = async (userId) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission denied', 'Location access is required');

      setLocationEnabled(true);
      const interval = setInterval(async () => {
        try {
          let location = await Location.getCurrentPositionAsync({});
          await supabase.from('firefighter_locations').upsert({
            user_id: userId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            updated_at: new Date().toISOString()
          });
        } catch (err) {
          console.error('Location update error:', err);
        }
      }, 10000);
      
      setLocationInterval(interval);
    } catch (err) {
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const signUp = async () => {
    if (!email || !password || !fullName) return Alert.alert('All fields required');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Sign up failed', error.message);
    else Alert.alert('Success', 'Check your email to verify');
    setLoading(false);
  };

  const signIn = async () => {
    if (!email || !password) return Alert.alert('Email and password required');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login failed', error.message);
    setLoading(false);
  };

  const signOut = async () => {
    if (locationInterval) clearInterval(locationInterval);
    await supabase.auth.signOut();
    setSession(null);
  };

  const fetchIncidents = async () => {
    const { data } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
    setIncidents(data || []);
  };

  const takeIncident = async (id) => {
    try {
      await supabase.from('incidents').update({ status: 'en_route' }).eq('id', id);
      Alert.alert('Confirmed', 'You are en route to the incident!');
      fetchIncidents();
    } catch (err) {
      Alert.alert('Error', 'Failed to update incident');
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return COLORS.danger;
      case 'high': return COLORS.warning;
      case 'medium': return '#ff9800';
      default: return COLORS.secondary;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'reported': return COLORS.danger;
      case 'en_route': return COLORS.warning;
      case 'arrived': return COLORS.success;
      default: return COLORS.subtitle;
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.darker} />
        <Animated.ScrollView 
          style={[
            styles.authContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
          contentContainerStyle={styles.authContent}
        >
          <View style={styles.logoSection}>
            <Animated.Text style={[styles.fireLogo, { transform: [{ scale: scaleAnim }] }]}>
              🔥
            </Animated.Text>
            <Animated.Text 
              style={[
                styles.appTitle,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              FireGuard LK
            </Animated.Text>
            <Animated.Text 
              style={[
                styles.appSubtitle,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              Emergency Response System
            </Animated.Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              placeholderTextColor={COLORS.subtitle}
              editable={!loading}
            />
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholderTextColor={COLORS.subtitle}
              keyboardType="email-address"
              editable={!loading}
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor={COLORS.subtitle}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={signUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={signIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darker} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🔥 FireGuard</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: locationEnabled ? COLORS.success : COLORS.danger }]} />
            <Text style={styles.statusText}>
              {locationEnabled ? 'Tracking ON' : 'Tracking OFF'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>📍 Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incidents' && styles.activeTab]}
          onPress={() => setActiveTab('incidents')}
        >
          <Text style={[styles.tabText, activeTab === 'incidents' && styles.activeTabText]}>
            🚨 Incidents ({incidents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'map' ? (
        <MapView style={styles.map} initialRegion={{ latitude: 6.9271, longitude: 79.8612, latitudeDelta: 0.5, longitudeDelta: 0.5 }}>
          {incidents.map(inc => (
            <Marker
              key={inc.id}
              coordinate={{ latitude: inc.latitude, longitude: inc.longitude }}
              pinColor={getSeverityColor(inc.severity)}
              title={inc.title}
              description={`${inc.severity.toUpperCase()} - ${inc.status}`}
            />
          ))}
        </MapView>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>✓ No active incidents</Text>
              <Text style={styles.emptySubtext}>Stand by for updates</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            if (!cardAnimations[item.id]) {
              cardAnimations[item.id] = new Animated.Value(0);
            }

            useEffect(() => {
              Animated.timing(cardAnimations[item.id], {
                toValue: 1,
                duration: 400 + index * 50,
                useNativeDriver: true
              }).start();
            }, []);

            return (
              <Animated.View
                style={[
                  styles.incidentCard,
                  {
                    opacity: cardAnimations[item.id],
                    transform: [
                      {
                        translateY: cardAnimations[item.id].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0]
                        })
                      }
                    ]
                  }
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.incidentTitle}>{item.title}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: getSeverityColor(item.severity) }]}>
                        <Text style={styles.badgeText}>{item.severity.toUpperCase()}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {item.photo_url && (
                  <Image
                    source={{ uri: item.photo_url }}
                    style={styles.incidentImage}
                  />
                )}

                <View style={styles.cardInfo}>
                  <Text style={styles.infoLabel}>Description</Text>
                  <Text style={styles.infoValue}>{item.description || 'No description provided'}</Text>

                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
                </View>

                {item.status === 'reported' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => takeIncident(item.id)}
                  >
                    <Text style={styles.actionButtonText}>🚒 I'm En Route!</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'en_route' && (
                  <View style={styles.enRouteStatus}>
                    <ActivityIndicator color={COLORS.warning} />
                    <Text style={styles.enRouteText}>En Route...</Text>
                  </View>
                )}
              </Animated.View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darker,
  },
  authContainer: {
    flex: 1,
    backgroundColor: COLORS.darker,
  },
  authContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  fireLogo: {
    fontSize: 80,
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    textShadowColor: 'rgba(211, 47, 47, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appSubtitle: {
    fontSize: 15,
    color: COLORS.subtitle,
    letterSpacing: 0.5,
  },
  formContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: COLORS.dark,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 4,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
    borderWidth: 0,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: COLORS.dark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    elevation: 2,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.subtitle,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
  },
  logoutText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.dark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.subtitle,
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  map: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  emptySubtext: {
    color: COLORS.subtitle,
    fontSize: 14,
  },
  incidentCard: {
    backgroundColor: COLORS.dark,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  incidentTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    elevation: 2,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  incidentImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.darker,
  },
  cardInfo: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    color: COLORS.subtitle,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  enRouteStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.darker,
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  enRouteText: {
    color: COLORS.warning,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
});

const COLORS = {
  primary: '#d32f2f',
  secondary: '#1976d2',
  dark: '#0a0e27',
  darker: '#050810',
  text: '#ffffff',
  subtitle: '#b0bec5',
  success: '#4caf50',
  warning: '#ff9800',
  danger: '#f44336',
  border: '#1a237e'
};

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationInterval, setLocationInterval] = useState(null);
  const [activeTab, setActiveTab] = useState('incidents');
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchIncidents();
        startLocationTracking(session.user.id);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchIncidents();
        startLocationTracking(session.user.id);
      }
    });
  }, []);

  const startLocationTracking = async (userId) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission denied', 'Location access is required');

      setLocationEnabled(true);
      const interval = setInterval(async () => {
        try {
          let location = await Location.getCurrentPositionAsync({});
          await supabase.from('firefighter_locations').upsert({
            user_id: userId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            updated_at: new Date().toISOString()
          });
        } catch (err) {
          console.error('Location update error:', err);
        }
      }, 10000);
      
      setLocationInterval(interval);
    } catch (err) {
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const signUp = async () => {
    if (!email || !password || !fullName) return Alert.alert('All fields required');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Sign up failed', error.message);
    else Alert.alert('Success', 'Check your email to verify');
    setLoading(false);
  };

  const signIn = async () => {
    if (!email || !password) return Alert.alert('Email and password required');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login failed', error.message);
    setLoading(false);
  };

  const signOut = async () => {
    if (locationInterval) clearInterval(locationInterval);
    await supabase.auth.signOut();
    setSession(null);
  };

  const fetchIncidents = async () => {
    const { data } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
    setIncidents(data || []);
  };

  const takeIncident = async (id) => {
    try {
      await supabase.from('incidents').update({ status: 'en_route' }).eq('id', id);
      Alert.alert('Confirmed', 'You are en route to the incident!');
      fetchIncidents();
    } catch (err) {
      Alert.alert('Error', 'Failed to update incident');
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return COLORS.danger;
      case 'high': return COLORS.warning;
      case 'medium': return '#ff9800';
      default: return COLORS.secondary;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'reported': return COLORS.danger;
      case 'en_route': return COLORS.warning;
      case 'arrived': return COLORS.success;
      default: return COLORS.subtitle;
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.darker} />
        <ScrollView style={styles.authContainer} contentContainerStyle={styles.authContent}>
          <View style={styles.logoSection}>
            <Text style={styles.fireLogo}>🔥</Text>
            <Text style={styles.appTitle}>FireGuard LK</Text>
            <Text style={styles.appSubtitle}>Emergency Response System</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              placeholderTextColor={COLORS.subtitle}
              editable={!loading}
            />
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholderTextColor={COLORS.subtitle}
              keyboardType="email-address"
              editable={!loading}
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor={COLORS.subtitle}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={signUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={signIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darker} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🔥 FireGuard</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: locationEnabled ? COLORS.success : COLORS.danger }]} />
            <Text style={styles.statusText}>
              {locationEnabled ? 'Tracking ON' : 'Tracking OFF'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>📍 Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incidents' && styles.activeTab]}
          onPress={() => setActiveTab('incidents')}
        >
          <Text style={[styles.tabText, activeTab === 'incidents' && styles.activeTabText]}>
            🚨 Incidents ({incidents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'map' ? (
        <MapView style={styles.map} initialRegion={{ latitude: 6.9271, longitude: 79.8612, latitudeDelta: 0.5, longitudeDelta: 0.5 }}>
          {incidents.map(inc => (
            <Marker
              key={inc.id}
              coordinate={{ latitude: inc.latitude, longitude: inc.longitude }}
              pinColor={getSeverityColor(inc.severity)}
              title={inc.title}
              description={`${inc.severity.toUpperCase()} - ${inc.status}`}
            />
          ))}
        </MapView>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>✓ No active incidents</Text>
              <Text style={styles.emptySubtext}>Stand by for updates</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.incidentCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.incidentTitle}>{item.title}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: getSeverityColor(item.severity) }]}>
                      <Text style={styles.badgeText}>{item.severity.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                      <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {item.photo_url && (
                <Image
                  source={{ uri: item.photo_url }}
                  style={styles.incidentImage}
                />
              )}

              <View style={styles.cardInfo}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>{item.description || 'No description provided'}</Text>

                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
              </View>

              {item.status === 'reported' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => takeIncident(item.id)}
                >
                  <Text style={styles.actionButtonText}>🚒 I'm En Route!</Text>
                </TouchableOpacity>
              )}

              {item.status === 'en_route' && (
                <View style={styles.enRouteStatus}>
                  <ActivityIndicator color={COLORS.warning} />
                  <Text style={styles.enRouteText}>En Route...</Text>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darker,
  },
  authContainer: {
    flex: 1,
    backgroundColor: COLORS.darker,
  },
  authContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  fireLogo: {
    fontSize: 60,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 14,
    color: COLORS.subtitle,
  },
  formContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.dark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.subtitle,
  },
  logoutButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.dark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.subtitle,
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.subtitle,
    fontSize: 14,
  },
  incidentCard: {
    backgroundColor: COLORS.dark,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  incidentTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  incidentImage: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.darker,
  },
  cardInfo: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    color: COLORS.subtitle,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  enRouteStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.darker,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  enRouteText: {
    color: COLORS.warning,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});