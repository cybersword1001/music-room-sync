
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vslotvtpzjihvqvnueyl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzbG90dnRwemppaHZxdm51ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NjYyNzUsImV4cCI6MjA2MjA0MjI3NX0.D1CVBSbw1qNlRKhBZXGe3CnkN-iGHLwW8vO9TpO1yIQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  email: string;
  username?: string;
};

export type Room = {
  id: string;
  room_name: string;
  created_by: string;
  created_at: string;
  room_code: string;
};

export type Song = {
  id: string;
  room_id: string;
  title: string;
  url: string;
  added_by: string;
  votes: number;
  is_playing: boolean;
  added_at: string;
  thumbnail: string;
  artist?: string;
  duration?: string;
};

export type Vote = {
  id: string;
  song_id: string;
  user_id: string;
};
