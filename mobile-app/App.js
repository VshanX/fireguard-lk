import { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Button } from 'react-native';
import { supabase } from './supabaseClient';

export default function App() {
  const [status, setStatus] = useState('Connecting to Supabase...');

  useEffect(() => {
    supabase.from('test') // we’ll create this table in 2 minutes
      .select('*')
      .then(({ data, error }) => {
        if (error) setStatus('Supabase connected!\nError: ' + error.message);
        else setStatus('Supabase connected successfully!\nData: ' + JSON.stringify(data));
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 FireGuard LK</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.footer}>by Vidushan Thiwanka</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ff4444', marginBottom: 20 },
  status: { color: 'white', textAlign: 'center', padding: 20, fontSize: 16 },
  footer: { position: 'absolute', bottom: 50, color: '#888' }
});