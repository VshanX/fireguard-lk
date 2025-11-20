// public-portal/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eqinaklhvlxqcvwcvhkz.supabase.co'  // ← change
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaW5ha2xodmx4cWN2d2N2aGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTcxNjgsImV4cCI6MjA3OTAzMzE2OH0.00Dabgv8fY_DHHclWnfMaXMAG0dLzn21NxEiE90IIaM'              // ← change

export const supabase = createClient(supabaseUrl, supabaseAnonKey)