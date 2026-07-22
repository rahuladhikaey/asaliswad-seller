"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qgiichnytbukisofuqiv.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_kMnEF2aqyz1z2SOB-sxtCQ_s4J-VisB";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
export const supabaseStorage = supabase;
