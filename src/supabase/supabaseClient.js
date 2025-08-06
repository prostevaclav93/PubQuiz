import { createClient } from '@supabase/supabase-js';

// Use environment variables in production, fallback to hardcoded values for development
const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || 'https://svhzqxmuhfqzfyumrryw.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aHpxeG11aGZxemZ5dW1ycnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjAwMzUsImV4cCI6MjA2OTQzNjAzNX0.4KX0FwqIjimwY8OAGiS4UJ4JqCbOoDLIyd3E4agKs_U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);