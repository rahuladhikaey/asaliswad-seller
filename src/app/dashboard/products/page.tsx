"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Product, Category } from "@shared/types";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Eye, 
  X,
  Upload,
  ShoppingBag,
  AlertTriangle
} from "lucide-react";

export default function SellerProducts() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [isSettingsComplete, setIsSettingsComplete] = useState<boolean>(false);
  const [settingsCompletionPct, setSettingsCompletionPct] = useState<number>(0);
  const [fssaiStatus, setFssaiStatus] = useState<string>("Not Submitted");
  const [accountStatus, setAccountStatus] = useState<string>("Active");

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    price: "",
    mrp: "",
    description: "",
    category_id: "",
    image_url: "",
    brand: "asaliswad",
    stock: "0",
    low_stock_limit: "5",
    sku: "",
    offersText: "",
    specificationsText: "",
    packagesText: "",
  });

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string>("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (uploadedImages.length + files.length > 2) {
      setImageError("❌ You can upload a maximum of 2 images.");
      return;
    }

    for (const file of files) {
      if (file.size > 100 * 1024) {
        setImageError(`❌ File "${file.name}" is ${(file.size / 1024).toFixed(1)} KB. Maximum allowed size is 100 KB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64Str = event.target.result as string;
          setUploadedImages((prev) => {
            const nextImages = [...prev, base64Str].slice(0, 2);
            setForm((f) => ({ ...f, image_url: nextImages[0] || "" }));
            return nextImages;
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    const updated = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(updated);
    setForm((f) => ({ ...f, image_url: updated[0] || "" }));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch seller settings status
      const { data: seller } = await supabase
        .from("sellers")
        .select("settings_completion_pct, fssai_status, account_status, status")
        .eq("user_id", user.id)
        .maybeSingle();

      const pct = seller?.settings_completion_pct || 0;
      const fStatus = seller?.fssai_status || "Not Submitted";
      const accStatus = seller?.account_status || seller?.status || "Active";
      const isSuspended = accStatus.toLowerCase() === "suspended";
      const isComplete = pct === 100 && fStatus === "Verified" && !isSuspended;

      setSettingsCompletionPct(pct);
      setFssaiStatus(fStatus);
      setAccountStatus(accStatus);
      setIsSettingsComplete(isComplete);

      // Fetch products for this seller
      const { data: productsData } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch categories for dropdown without restrictive filters + fallback list
      let finalCategories: any[] = [];
      try {
        const { data: categoriesData } = await supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true });

        if (categoriesData && categoriesData.length > 0) {
          finalCategories = categoriesData;
        }
      } catch (err) {
        console.warn("Seller categories fetch notice:", err);
      }

      if (finalCategories.length === 0) {
        finalCategories = [
          { id: 1, name: "Spices & Masala", main_category: "Grocery" },
          { id: 2, name: "Handmade Bori", main_category: "Snacks" },
          { id: 3, name: "Pulses & Dals", main_category: "Grocery" },
          { id: 4, name: "Pure Oils & Ghee", main_category: "Oils & Ghee" },
          { id: 5, name: "Rice & Grains", main_category: "Grocery" },
          { id: 6, name: "Pickles & Chutney", main_category: "Snacks" },
          { id: 7, name: "Fresh Breads & Buns", main_category: "Bakery" },
          { id: 8, name: "Cakes & Pastries", main_category: "Bakery" },
          { id: 9, name: "Namkeen & Chips", main_category: "Snacks" },
          { id: 10, name: "Organic Specials", main_category: "Organic Specials" }
        ];
      }

      setProducts(productsData || []);
      setCategories(finalCategories);
    } catch (e) {
      console.error("Error loading products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('products-seller-changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sellers', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new) {
              const fStatus = payload.new.fssai_status || "Not Submitted";
              const pct = payload.new.settings_completion_pct || 0;
              const accStatus = payload.new.account_status || payload.new.status || "Active";
              const isSuspended = accStatus.toLowerCase() === "suspended";
              setFssaiStatus(fStatus);
              setSettingsCompletionPct(pct);
              setAccountStatus(accStatus);
              setIsSettingsComplete(pct === 100 && fStatus === 'Verified' && !isSuspended);
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  const openAddModal = () => {
    if (accountStatus.toLowerCase() === "suspended") {
      alert("🚫 Your seller account is suspended by Admin. You cannot add or publish new products.");
      return;
    }
    if (!isSettingsComplete) {
      alert("Please complete your Merchant Settings before adding products.");
      return;
    }
    setEditingProduct(null);
    setUploadedImages([]);
    setImageError("");
    setForm({
      name: "",
      price: "",
      mrp: "",
      description: "",
      category_id: categories[0]?.id.toString() || "",
      image_url: "",
      brand: "asaliswad",
      stock: "0",
      low_stock_limit: "5",
      sku: "",
      offersText: "",
      specificationsText: "",
      packagesText: "",
    });
    setStatusMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    if (accountStatus.toLowerCase() === "suspended") {
      alert("🚫 Your seller account is suspended by Admin. Product modification is disabled.");
      return;
    }
    setEditingProduct(product);
    setUploadedImages(product.image_url ? [product.image_url] : []);
    setImageError("");
    
    // Format text areas
    const offersText = (product.offers || []).join("\n");
    
    const specsArray: string[] = [];
    if (product.specifications) {
      Object.entries(product.specifications).forEach(([k, v]) => {
        specsArray.push(`${k}: ${v}`);
      });
    }
    const specificationsText = specsArray.join("\n");

    const pkgsArray: string[] = [];
    if (product.packages) {
      product.packages.forEach(pkg => {
        pkgsArray.push(`${pkg.name}:${pkg.price}:${pkg.mrp || pkg.price}:${pkg.isBestSeller || false}`);
      });
    }
    const packagesText = pkgsArray.join("\n");

    setForm({
      name: product.name || "",
      price: (product.price || 0).toString(),
      mrp: (product.mrp || "").toString(),
      description: product.description || "",
      category_id: (product.category_id || "").toString(),
      image_url: product.image_url || "",
      brand: product.brand || "asaliswad",
      stock: (product.stock || 0).toString(),
      low_stock_limit: (product.low_stock_limit || 5).toString(),
      sku: product.sku || "",
      offersText,
      specificationsText,
      packagesText,
    });
    setStatusMessage("");
    setIsModalOpen(true);
  };

  const handleDelete = async (productId: number) => {
    if (accountStatus.toLowerCase() === "suspended") {
      alert("🚫 Account Suspended: Deleting products is disabled.");
      return;
    }
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      
      setProducts(products.filter(p => p.id !== productId));
      alert("Product deleted successfully.");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to delete product.");
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (accountStatus.toLowerCase() === "suspended") {
      setStatusMessage("❌ Account Suspended: Product creation and updates are disabled.");
      alert("🚫 Your account is suspended by Admin. You cannot save products.");
      return;
    }
    setStatusMessage("Saving product...");

    const price = Number(form.price);
    const mrp = form.mrp ? Number(form.mrp) : null;
    const stock = Number(form.stock);
    const low_stock_limit = Number(form.low_stock_limit);

    if (!form.name.trim() || isNaN(price) || price <= 0) {
      setStatusMessage("❌ Please enter a valid name and price.");
      return;
    }

    // Parse offers
    const offers = form.offersText
      ? form.offersText.split("\n").map(o => o.trim()).filter(Boolean)
      : [];

    // Parse specifications (Key: Value)
    const specifications: Record<string, string> = {};
    if (form.specificationsText) {
      form.specificationsText.split("\n").forEach(line => {
        const [k, ...v] = line.split(":");
        if (k && v.length > 0) {
          specifications[k.trim()] = v.join(":").trim();
        }
      });
    }

    // Parse packages (Name:Price:MRP:isBestSeller)
    const packages = form.packagesText
      ? form.packagesText.split("\n").map((line, index) => {
          const parts = line.split(":");
          if (parts.length >= 1 && parts[0].trim() !== "") {
            return {
              id: `pkg-${Date.now()}-${index}`,
              name: parts[0].trim(),
              price: parts[1] ? Number(parts[1].trim()) : price,
              mrp: parts[2] ? Number(parts[2].trim()) : (mrp || price),
              isBestSeller: parts[3] ? parts[3].trim().toLowerCase() === "true" : false
            };
          }
          return null;
        }).filter(Boolean)
      : [];

    const slug = form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    const isValidUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const rawCatId = String(form.category_id || "");
    const selectedCat = categories.find(c => String(c.id) === rawCatId);
    const categoryId = selectedCat 
      ? selectedCat.id 
      : (isValidUuid(rawCatId) ? rawCatId : (!isNaN(Number(rawCatId)) ? Number(rawCatId) : null));
    const categoryName = selectedCat?.name || "General";
    const mainCategoryName = (selectedCat as any)?.main_category || (selectedCat as any)?.description || "Grocery";

    const payload: any = {
      name: form.name.trim(),
      slug,
      price,
      mrp,
      description: form.description.trim(),
      category_id: categoryId,
      category_name: categoryName,
      category: mainCategoryName,
      image_url: form.image_url.trim() || "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=300",
      images: uploadedImages.length > 0 ? uploadedImages : [form.image_url.trim() || "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=300"],
      brand: form.brand.trim() || "asaliswad",
      stock,
      low_stock_limit,
      sku: form.sku.trim() || null,
      offers,
      specifications,
      packages,
      status: stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
      is_active: true,
      is_approved: true,
      approval_status: "approved",
      seller_id: userId
    };

    try {
      let savedProduct: any = null;
      if (editingProduct) {
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id)
          .select();

        if (error) throw error;
        savedProduct = data?.[0] || { id: editingProduct.id, ...payload };
        setStatusMessage("✅ Product updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert([payload])
          .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
          savedProduct = data[0];
        } else {
          // Fallback query to retrieve auto-generated ID for newly inserted product
          const { data: fetched } = await supabase
            .from("products")
            .select("*")
            .eq("slug", slug)
            .eq("seller_id", userId)
            .order("created_at", { ascending: false })
            .limit(1);
          
          savedProduct = fetched?.[0] || { ...payload };
        }
        setStatusMessage("✅ Product added successfully!");
      }

      setTimeout(() => {
        setIsModalOpen(false);
        loadData();
      }, 1000);

    } catch (e: any) {
      console.error(e);
      setStatusMessage(`❌ Error: ${e.message || "Failed to save product."}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Products</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">Manage spices, grocery packages, and pricing.</p>
        </div>
        <button
          onClick={openAddModal}
          disabled={!isSettingsComplete || accountStatus.toLowerCase() === "suspended"}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {accountStatus.toLowerCase() === "suspended" && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-3">
          <AlertTriangle size={20} className="shrink-0 text-rose-600 dark:text-rose-400" />
          <div>
            <strong>🚫 Account Fully Suspended:</strong> Your seller account has been suspended by SuperAdmin. Adding new products, editing catalog listings, and deleting items are completely disabled.
          </div>
        </div>
      )}

      {!isSettingsComplete && accountStatus.toLowerCase() !== "suspended" && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-xs font-semibold text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <strong>🔒 Product Management Locked:</strong> Please complete your Merchant Settings before adding products.
            <span className="block text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              Settings Completion: {settingsCompletionPct}% | FSSAI License Status: {fssaiStatus}
            </span>
          </div>
          <a
            href="/dashboard/settings"
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors text-center"
          >
            Complete Settings
          </a>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          <span className="ml-3 text-sm font-bold text-text-muted">Loading products...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-foreground/[0.08] p-12 text-center text-text-muted">
          <ShoppingBag size={48} className="mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-black text-foreground">No Products Listed</h3>
          <p className="text-xs font-bold mt-1 max-w-sm mx-auto">Get started by creating your first product listing for the Asali Swad storefront.</p>
          <button 
            onClick={openAddModal}
            className="mt-6 rounded-2xl border border-primary/20 px-5 py-3 text-xs font-black text-primary hover:bg-primary/5 transition-all"
          >
            Add First Product
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-foreground/[0.06] bg-foreground/[0.01] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-foreground/[0.03] border-b border-foreground/[0.06] font-black">
                <tr>
                  <th className="px-6 py-4">Product Info</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-foreground/[0.01] transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="h-12 w-12 rounded-xl object-cover border border-foreground/[0.08]"
                        />
                        <div>
                          <p className="font-black text-foreground text-sm">{product.name}</p>
                          <p className="text-[10px] font-bold text-text-muted mt-0.5">SKU: {product.sku || "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-secondary">
                      {(product as any).categories?.name || "General"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-foreground">₹{product.price}</div>
                      {product.mrp && product.mrp > product.price && (
                        <div className="text-[11px] font-bold text-text-muted line-through">₹{product.mrp}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          (product.stock ?? 0) === 0
                            ? "bg-rose-500" 
                            : (product.stock ?? 0) <= (product.low_stock_limit ?? 5)
                            ? "bg-amber-500" 
                            : "bg-emerald-500"
                        }`} />
                        <span className="font-bold text-text-secondary">
                          {product.stock ?? 0} in stock
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="rounded-xl border border-foreground/[0.08] p-2 text-text-secondary hover:bg-foreground/[0.04] hover:text-text-primary transition-all"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="rounded-xl border border-rose-500/10 p-2 text-rose-500 hover:bg-rose-500/5 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 flex flex-col text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{editingProduct ? "Edit Product" : "Add New Product"}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6 flex-1">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="e.g. Handmade Bori (Special)"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">Price (₹) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={form.price}
                        onChange={e => setForm({...form, price: e.target.value})}
                        placeholder="199"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">MRP (₹) [Optional]</label>
                      <input
                        type="number"
                        min="1"
                        value={form.mrp}
                        onChange={e => setForm({...form, mrp: e.target.value})}
                        placeholder="249"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5 flex items-center justify-between">
                      <span>Category & Subcategory *</span>
                      {form.category_id && (() => {
                        const selected = categories.find(c => String(c.id) === String(form.category_id));
                        return selected ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            🏷️ {(selected as any)?.main_category || (selected as any)?.description || "Grocery"} &gt; {selected.name}
                          </span>
                        ) : null;
                      })()}
                    </label>
                    <select
                      required
                      value={form.category_id}
                      onChange={e => setForm({...form, category_id: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer"
                    >
                      <option value="">Select Category & Subcategory</option>
                      {Array.from(new Set(categories.map((c: any) => c.main_category || c.description || "Grocery"))).map((mainCat) => {
                        const subCats = categories.filter((c: any) => (c.main_category || c.description || "Grocery") === mainCat);
                        return (
                          <optgroup key={mainCat} label={`📦 ${mainCat}`}>
                            {subCats.map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5 flex items-center justify-between">
                      <span>Product Images (Max 2 Images, ≤ 100 KB each)</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">({uploadedImages.length}/2 Uploaded)</span>
                    </label>

                    {/* Image Thumbnail Previews */}
                    {uploadedImages.length > 0 && (
                      <div className="flex items-center gap-3 mb-2.5">
                        {uploadedImages.map((imgSrc, idx) => (
                          <div key={idx} className="relative h-20 w-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group shadow-sm bg-slate-100 dark:bg-slate-800">
                            <img src={imgSrc} alt={`Uploaded ${idx + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shadow hover:scale-110 transition-transform"
                            >
                              ✕
                            </button>
                            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-black">
                              Img {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Drag & Drop File Upload Zone */}
                    {uploadedImages.length < 2 && (
                      <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-600 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/50">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Upload size={22} className="text-emerald-600 dark:text-emerald-400 mb-1" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Upload Image File (Max 2 images, ≤ 100 KB)
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            PNG, JPG, WEBP formats supported
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error Alert */}
                    {imageError && (
                      <p className="text-xs font-bold text-rose-500 mt-1.5 animate-pulse">
                        {imageError}
                      </p>
                    )}

                    {/* URL Input Fallback */}
                    <div className="mt-2.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Or paste image URL:</label>
                      <input
                        type="text"
                        value={form.image_url}
                        onChange={e => {
                          setForm({...form, image_url: e.target.value});
                          if (e.target.value && !uploadedImages.includes(e.target.value)) {
                            setUploadedImages([e.target.value, ...uploadedImages].slice(0, 2));
                          }
                        }}
                        placeholder="Paste image URL here..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 grid-cols-3">
                    <div className="col-span-2">
                      <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">SKU</label>
                      <input
                        type="text"
                        value={form.sku}
                        onChange={e => setForm({...form, sku: e.target.value})}
                        placeholder="AS-BORI-001"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">Brand</label>
                      <input
                        type="text"
                        value={form.brand}
                        onChange={e => setForm({...form, brand: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">Description *</label>
                    <textarea
                      required
                      rows={3}
                      value={form.description}
                      onChange={e => setForm({...form, description: e.target.value})}
                      placeholder="Detailed description of the product and its quality..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">Stock Quantity *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={form.stock}
                        onChange={e => setForm({...form, stock: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">Low Stock Limit *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={form.low_stock_limit}
                        onChange={e => setForm({...form, low_stock_limit: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">Offers (One per line)</label>
                    <textarea
                      rows={2}
                      value={form.offersText}
                      onChange={e => setForm({...form, offersText: e.target.value})}
                      placeholder="Buy 2 Get 1 Free&#10;Flat 10% Off"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">Packages (Format: Name:Price:MRP:isBestSeller) [One per line]</label>
                    <textarea
                      rows={2}
                      value={form.packagesText}
                      onChange={e => setForm({...form, packagesText: e.target.value})}
                      placeholder="250g:120:150:false&#10;500g:220:280:true"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">Specifications (Format: Key:Value) [One per line]</label>
                <textarea
                  rows={2}
                  value={form.specificationsText}
                  onChange={e => setForm({...form, specificationsText: e.target.value})}
                  placeholder="Ingredients: Premium lentils, organic spices&#10;Shelf Life: 6 Months"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
                />
              </div>

              {statusMessage && (
                <div className={`p-4 rounded-xl text-xs font-black ${
                  statusMessage.startsWith("❌") 
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400" 
                    : statusMessage.startsWith("✅")
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }`}>
                  {statusMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-3 text-sm font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 text-white px-6 py-3 text-sm font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  {editingProduct ? "Update Product" : "Publish Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
