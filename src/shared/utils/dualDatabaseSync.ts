import { supabaseA } from "./supabaseClient";

export const masterDb = supabaseA;
export const customerDb = supabaseA;

export async function syncProductToCustomerDb(product: any, action: 'upsert' | 'delete' = 'upsert') {
  // Single Database Architecture: All operations write directly to single database (bprkenwmheakcqryjupi.supabase.co).
  return;
}

export async function syncCategoryToCustomerDb(category: any, action: 'upsert' | 'delete' = 'upsert') {
  // Single Database Architecture: All operations write directly to single database (bprkenwmheakcqryjupi.supabase.co).
  return;
}
