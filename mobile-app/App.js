import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TextInput, Button, Alert, FlatList, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
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
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission denied');

    // Update location every 10 seconds
    setInterval(async () => {
      let location = await Location.getCurrentPositionAsync({});
      await supabase.from('firefighter_locations').upsert({
        user_id: userId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    }, 10000);
  };

  const signUp = async () => { /* same as before */ };
  const signIn = async () => { /* same as before */ };
  const signOut = async () => { await supabase.auth.signOut(); setSession(null); };

  const fetchIncidents = async () => {
    const { data } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
    setIncidents(data || []);
  };

  const takeIncident = async (id) => {
    await supabase.from('incidents').update({ status: 'en_route' }).eq('id', id);
  };

  if (!session) {
    // LOGIN SCREEN (same as before)
    return (
      <View style={styles.container}>
        <Text style={styles.title}>FireGuard LK</Text>
        <TextInput placeholder="Full Name" value={fullName} onChangeText={setFullName} style={styles.input} />
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <Button title="Create Account" onPress={signUp} />
        <Button title="Login" onPress={signIn} color="#d32f2f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ padding: 15, backgroundColor: '#111', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Live Location ON</Text>
        <Button title="Logout" onPress={signOut} color="red" />
      </View>

      <MapView style={{ flex: 1 }}>
        {incidents.map(inc => (
          <Marker key={inc.id} coordinate={{ latitude: inc.latitude, longitude: inc.longitude }} pinColor="red" />
        ))}
      </MapView>

      <View style={{ height: 350, backgroundColor: '#111' }}>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', padding: 10 }}>Active Incidents</Text>
        <FlatList
          data={incidents}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#222', padding: 12, margin: 8, borderRadius: 10 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{item.title}</Text>
              {item.photo_url && <Image source={{ uri: item.photo_url }} style={{ width: '100%', height: 180, borderRadius: 8, marginVertical: 8 }} />}
              <Text style={{ color: '#aaa' }}>Status: {item.status}</Text>
              {item.status === 'reported' && <Button title="I'm En Route!" onPress={() => takeIncident(item.id)} color="#d32f2f" />}
            </View>
          )}
          keyExtractor={item => item.id}
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