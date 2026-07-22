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
  ShoppingBag
} from "lucide-react";

export default function SellerProducts() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userId, setUserId] = useState<string>("");

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

      // Fetch products for this seller
      const { data: productsData } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch active categories for dropdown
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      setProducts(productsData || []);
      setCategories(categoriesData || []);
    } catch (e) {
      console.error("Error loading products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
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

    const payload = {
      name: form.name.trim(),
      slug,
      price,
      mrp,
      description: form.description.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      image_url: form.image_url.trim() || "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=300", // fallback spicy image
      brand: form.brand.trim(),
      stock,
      low_stock_limit,
      sku: form.sku.trim() || null,
      offers,
      specifications,
      packages,
      status: stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
      seller_id: userId
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);

        if (error) throw error;
        setStatusMessage("✅ Product updated successfully!");
      } else {
        const { error } = await supabase
          .from("products")
          .insert([payload]);

        if (error) throw error;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">My Products</h1>
          <p className="text-sm font-bold text-text-secondary mt-1">Manage spices, grocery packages, and pricing.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-primary/20 hover:opacity-90 transition-all duration-300"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] bg-background border border-foreground/[0.08] shadow-2xl p-6 md:p-8 flex flex-col">
            <div className="flex items-center justify-between border-b border-foreground/[0.06] pb-4 mb-6">
              <h3 className="text-xl font-black">{editingProduct ? "Edit Product" : "Add New Product"}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-foreground/[0.08] p-2 text-text-muted hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6 flex-1">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="e.g. Handmade Bori (Special)"
                      className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">Price (₹) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={form.price}
                        onChange={e => setForm({...form, price: e.target.value})}
                        placeholder="199"
                        className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">MRP (₹) [Optional]</label>
                      <input
                        type="number"
                        min="1"
                        value={form.mrp}
                        onChange={e => setForm({...form, mrp: e.target.value})}
                        placeholder="249"
                        className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">Category *</label>
                    <select
                      value={form.category_id}
                      onChange={e => setForm({...form, category_id: e.target.value})}
                      className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-text-secondary block mb-1.5 flex items-center justify-between">
                      <span>Product Images (Max 2 Images, ≤ 100 KB each)</span>
                      <span className="text-[10px] text-primary font-bold">({uploadedImages.length}/2 Uploaded)</span>
                    </label>

                    {/* Image Thumbnail Previews */}
                    {uploadedImages.length > 0 && (
                      <div className="flex items-center gap-3 mb-2.5">
                        {uploadedImages.map((imgSrc, idx) => (
                          <div key={idx} className="relative h-20 w-20 rounded-2xl overflow-hidden border border-foreground/15 group shadow-sm bg-foreground/[0.02]">
                            <img src={imgSrc} alt={`Uploaded ${idx + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black shadow hover:scale-110 transition-transform"
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
                      <div className="relative border-2 border-dashed border-foreground/20 hover:border-primary rounded-2xl p-4 text-center cursor-pointer transition-colors bg-foreground/[0.01]">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Upload size={22} className="text-primary mb-1" />
                          <span className="text-xs font-bold text-foreground">
                            Upload Image File (Max 2 images, ≤ 100 KB)
                          </span>
                          <span className="text-[10px] font-semibold text-text-muted">
                            PNG, JPG, WEBP formats supported
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error Alert */}
                    {imageError && (
                      <p className="text-xs font-bold text-red-500 mt-1.5 animate-pulse">
                        {imageError}
                      </p>
                    )}

                    {/* URL Input Fallback */}
                    <div className="mt-2.5">
                      <label className="text-[10px] font-bold text-text-muted block mb-1">Or paste image URL:</label>
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
                        className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-2.5 text-xs font-bold outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 grid-cols-3">
                    <div className="col-span-2">
                      <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">SKU</label>
                      <input
                        type="text"
                        value={form.sku}
                        onChange={e => setForm({...form, sku: e.target.value})}
                        placeholder="AS-BORI-001"
                        className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">Brand</label>
                      <input
                        type="text"
                        value={form.brand}
                        onChange={e => setForm({...form, brand: e.target.value})}
                        className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">Description *</label>
                    <textarea
                      required
                      rows={3}
                      value={form.description}
                      onChange={e => setForm({...form, description: e.target.value})}
                      placeholder="Detailed description of the product and its quality..."
                      className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-sm font-bold outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">Stock Quantity *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={form.stock}
                        onChange={e => setForm({...form, stock: e.target.value})}
                        className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">Low Stock Limit *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={form.low_stock_limit}
                        onChange={e => setForm({...form, low_stock_limit: e.target.value})}
                        className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">Offers (One per line)</label>
                    <textarea
                      rows={2}
                      value={form.offersText}
                      onChange={e => setForm({...form, offersText: e.target.value})}
                      placeholder="Buy 2 Get 1 Free&#10;Flat 10% Off"
                      className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-xs font-bold outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">Packages (Format: Name:Price:MRP:isBestSeller) [One per line]</label>
                    <textarea
                      rows={2}
                      value={form.packagesText}
                      onChange={e => setForm({...form, packagesText: e.target.value})}
                      placeholder="250g:120:150:false&#10;500g:220:280:true"
                      className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-xs font-bold outline-none focus:border-primary resize-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-text-secondary block mb-1.5">Specifications (Format: Key:Value) [One per line]</label>
                <textarea
                  rows={2}
                  value={form.specificationsText}
                  onChange={e => setForm({...form, specificationsText: e.target.value})}
                  placeholder="Ingredients: Premium lentils, organic spices&#10;Shelf Life: 6 Months"
                  className="w-full rounded-2xl border border-foreground/[0.1] bg-foreground/[0.01] px-4 py-3 text-xs font-bold outline-none focus:border-primary resize-none"
                />
              </div>

              {statusMessage && (
                <div className={`p-4 rounded-2xl text-xs font-black ${
                  statusMessage.startsWith("❌") 
                    ? "bg-rose-500/10 text-rose-700" 
                    : statusMessage.startsWith("✅")
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-primary/10 text-primary"
                }`}>
                  {statusMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-4 border-t border-foreground/[0.06] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-foreground/[0.08] px-5 py-3 text-sm font-black text-text-secondary hover:bg-foreground/[0.02]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 hover:opacity-90"
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
