import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://svhzqxmuhfqzfyumrryw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aHpxeG11aGZxemZ5dW1ycnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjAwMzUsImV4cCI6MjA2OTQzNjAzNX0.4KX0FwqIjimwY8OAGiS4UJ4JqCbOoDLIyd3E4agKs_U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);