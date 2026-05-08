import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://oaiffuvwxdukjfaudcpe.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9haWZmdXZ3eGR1a2pmYXVkY3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTgwMTMsImV4cCI6MjA5MzgzNDAxM30.nJXAo46aRRdvCzy4cujb-m9nOptv2Y5PhqxgRjlsas8";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);