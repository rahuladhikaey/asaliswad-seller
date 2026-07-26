"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_A_URL ?? "https://bprkenwmheakcqryjupi.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ?? "sb_publishable_W3vW-6g_CDVw57zEK-oF5A_Y3RzKCzR";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
export const supabaseA = supabase;
export const supabaseB = supabase;
export const supabaseStorage = supabase;
