import { createClient } from "@supabase/supabase-js";

// Database A (Master DB - Admin & Seller operations)
const dbAUrl = process.env.NEXT_PUBLIC_SUPABASE_B_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qgiichnytbukisofuqiv.supabase.co";
const dbAKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_B_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_kMnEF2aqyz1z2SOB-sxtCQ_s4J-VisB";

// Database B (Customer DB - Customer storefront & catalog)
const dbBUrl = process.env.NEXT_PUBLIC_SUPABASE_A_URL || "https://bprkenwmheakcqryjupi.supabase.co";
const dbBKey = process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY || "sb_publishable_W3vW-6g_CDVw57zEK-oF5A_Y3RzKCzR";

export const masterDb = createClient(dbAUrl, dbAKey);
export const customerDb = createClient(dbBUrl, dbBKey);

export async function syncProductToCustomerDb(product: any, action: 'upsert' | 'delete' = 'upsert') {
  if (!product || !product.id) return;

  try {
    if (action === 'delete') {
      console.log(`[DualDBSync] Deleting product ID ${product.id} from Customer DB B...`);
      await customerDb.from("products").delete().eq("id", product.id);
      return;
    }

    const syncPayload = {
      id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp || Math.round(product.price * 1.25),
      description: product.description || '',
      image_url: product.image_url || product.images?.[0] || '',
      images: product.images || (product.image_url ? [product.image_url] : []),
      category_id: product.category_id || 1,
      category_name: product.category_name || product.category || 'General',
      category: product.category || product.category_name || 'General',
      brand: product.brand || 'Asali Swad',
      stock: typeof product.stock === 'number' ? product.stock : 100,
      sku: product.sku || '',
      low_stock_limit: product.low_stock_limit || 5,
      is_active: product.is_active !== false,
      is_approved: product.is_approved !== false && product.approval_status !== 'rejected',
      approval_status: product.approval_status || (product.is_approved ? 'approved' : 'pending'),
      updated_at: new Date().toISOString()
    };

    console.log(`[DualDBSync] Syncing Product ID ${product.id} (${product.name}) to Customer DB B...`);
    const { error } = await customerDb.from("products").upsert([syncPayload], { onConflict: "id" });
    if (error) {
      await customerDb.from("products").insert([syncPayload]);
    }
  } catch (err) {
    console.error("[DualDBSync Error] Unexpected error during product synchronization:", err);
  }
}

export async function syncCategoryToCustomerDb(category: any, action: 'upsert' | 'delete' = 'upsert') {
  if (!category || !category.id) return;

  try {
    if (action === 'delete') {
      await customerDb.from("categories").delete().eq("id", category.id);
      return;
    }

    const syncPayload = {
      id: category.id,
      name: category.name,
      main_category: category.main_category || 'Grocery',
      image_url: category.image_url || null,
      icon: category.icon || '📦',
      updated_at: new Date().toISOString()
    };

    const { error } = await customerDb.from("categories").upsert([syncPayload], { onConflict: "id" });
    if (error) {
      await customerDb.from("categories").insert([syncPayload]);
    }
  } catch (err) {
    console.error("[DualDBSync Error] Unexpected error during category synchronization:", err);
  }
}
