import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TextInput, Button, Alert, FlatList, TouchableOpacity, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchIncidents();
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchIncidents();
    });
  }, []);

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || email.split('@')[0], role: 'firefighter' }
      }
    });
    if (error) Alert.alert('Sign-up Error', error.message);
    else Alert.alert('Success', 'Account created! You can now log in.');
    setLoading(false);
  };

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Error', error.message);
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const fetchIncidents = async () => {
    const { data } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
    setIncidents(data || []);
  };

  const takeIncident = async (id) => {
    await supabase.from('incidents').update({ status: 'en_route' }).eq('id', id);
    fetchIncidents(); // refresh instantly
  };

  // ================== LOGIN SCREEN ==================
  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>FireGuard LK</Text>
        <TextInput placeholder="Full Name (optional)" value={fullName} onChangeText={setFullName} style={styles.input} />
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <Button title={loading ? "Creating..." : "Create Firefighter Account"} onPress={signUp} disabled={loading} />
        <View style={{ height: 10 }} />
        <Button title={loading ? "Logging in..." : "Login"} onPress={signIn} color="#d32f2f" disabled={loading} />
      </View>
    );
  }

  // ================== FIREFIGHTER DASHBOARD ==================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#111' }}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Welcome, {session.user.email}</Text>
        <Button title="Logout" onPress={signOut} color="red" />
      </View>

      {/* Map */}
      <MapView style={{ flex: 1 }}>
        {incidents.map(inc => (
          <Marker
            key={inc.id}
            coordinate={{ latitude: inc.latitude, longitude: inc.longitude }}
            pinColor={inc.severity === 'critical' ? 'red' : 'orange'}
          />
        ))}
      </MapView>

      {/* Incident List */}
      <View style={{ height: 350, backgroundColor: '#111', padding: 10 }}>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Active Incidents ({incidents.length})
        </Text>
        <FlatList
          data={incidents}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#222', padding: 12, marginVertical: 6, borderRadius: 10 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{item.title}</Text>
              
              {/* Photo */}
              {item.photo_url && (
                <Image source={{ uri: item.photo_url }} style={{ width: '100%', height: 180, borderRadius: 8, marginVertical: 8 }} />
              )}
              
              <Text style={{ color: '#aaa' }}>Severity: {item.severity.toUpperCase()} | Status: {item.status}</Text>
              
              {item.status === 'reported' && (
                <Button title="I'm En Route!" onPress={() => takeIncident(item.id)} color="#d32f2f" />
              )}
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ff4444', textAlign: 'center', marginTop: 60 },
  input: { backgroundColor: 'white', padding: 15, margin: 10, borderRadius: 8 }
});