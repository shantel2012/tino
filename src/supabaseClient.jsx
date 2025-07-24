import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jlzdmtlefuwzzfhkqeqh.supabase.co';
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsemRtdGxlZnV3enpmaGtxZXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NjAxMjgsImV4cCI6MjA2ODEzNjEyOH0.mnYAfg85ZrderkuM1v6wTzYxqvgZUPRI5A3n5mnPl5o";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
