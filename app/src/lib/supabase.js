import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: false
    }
}) : null;

export const requireSupabase = () => {
    if (!supabase) {
        throw new Error('가족 공유를 사용하려면 Supabase URL과 anon key를 먼저 설정해야 합니다.');
    }
    return supabase;
};
