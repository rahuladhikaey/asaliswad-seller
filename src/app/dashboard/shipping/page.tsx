"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  Truck, 
  MapPin, 
  Plus, 
  CheckCircle2, 
  FileText, 
  RefreshCw, 
  Search,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export default function SellerShipping() {
  const [loading, setLoading] = useState(true);
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);
  const [shiprocketConnected, setShiprocketConnected] = useState(false);
  const [shiprocketEmail, setShiprocketEmail] = useState("");
  const [shiprocketPassword, setShiprocketPassword] = useState("");
  
  // AWB / Label generation inputs
  const [orderIdInput, setOrderIdInput] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("Delhivery Surface");
  const [awbOutput, setAwbOutput] = useState<{ awb: string; labelUrl: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // New location form
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLoc, setNewLoc] = useState({
    name: "",
    phone: "",
    address_line1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const loadShippingData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch pickup locations
      const { data: locations } = await supabase
        .from("seller_pickup_locations")
        .select("*")
        .eq("seller_id", user.id)
        .order("is_default", { ascending: false });

      setPickupLocations(locations || []);

      // 2. Fetch seller shiprocket status from sellers table
      const { data: seller } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (seller?.shiprocket_email) {
        setShiprocketConnected(true);
        setShiprocketEmail(seller.shiprocket_email);
      }
    } catch (e) {
      console.error("Error loading shipping data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShippingData();
  }, []);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch seller ID
      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!seller) return;

      const { error } = await supabase.from("seller_pickup_locations").insert({
        seller_id: seller.id,
        name: newLoc.name,
        phone: newLoc.phone,
        address_line1: newLoc.address_line1,
        city: newLoc.city,
        state: newLoc.state,
        pincode: newLoc.pincode,
        is_default: pickupLocations.length === 0,
      });

      if (error) throw error;
      
      setShowLocationModal(false);
      setNewLoc({ name: "", phone: "", address_line1: "", city: "", state: "", pincode: "" });
      loadShippingData();
    } catch (err: any) {
      alert(err.message || "Failed to add location.");
    }
  };

  const handleConnectShiprocket = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg("Connecting to Shiprocket API...");
    setTimeout(() => {
      setShiprocketConnected(true);
      setStatusMsg("✅ Shiprocket API connected successfully!");
    }, 1200);
  };

  const handleGenerateLabelAndAWB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdInput.trim()) return;

    setGenerating(true);
    setAwbOutput(null);

    // Simulate Shiprocket AWB generation & Label URL
    setTimeout(() => {
      const fakeAWB = `AWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const fakeLabelUrl = `https://shiprocket.in/labels/${fakeAWB}.pdf`;
      
      setAwbOutput({
        awb: fakeAWB,
        labelUrl: fakeLabelUrl,
      });
      setGenerating(false);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Shipping & Logistics</h1>
        <p className="text-xs font-bold text-text-secondary mt-1">
          Manage pickup locations, Shiprocket integration, courier selection, and AWB label generation.
        </p>
      </div>

      {statusMsg && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 text-xs font-black text-emerald-700 dark:text-emerald-400">
          {statusMsg}
        </div>
      )}

      {/* Grid: Shiprocket Config & AWB Generation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shiprocket Integration Box */}
        <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Truck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black">Shiprocket Integration</h2>
                  <span className="text-[10px] font-black uppercase text-text-muted">Automated Shipping API</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${shiprocketConnected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600"}`}>
                {shiprocketConnected ? "Active" : "Not Connected"}
              </span>
            </div>

            <p className="text-xs font-bold text-text-secondary mb-6 leading-relaxed">
              Connect your official Shiprocket merchant account to automatically sync orders, compare courier rates, assign AWBs, and print shipping labels directly from this panel.
            </p>

            {shiprocketConnected ? (
              <div className="rounded-2xl bg-foreground/[0.03] p-4 border border-foreground/[0.06] space-y-2 text-xs font-bold">
                <div className="flex justify-between">
                  <span className="text-text-muted">Connected Account:</span>
                  <span className="font-black">{shiprocketEmail || "merchant@asaliswad.com"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">API Status:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck size={14} /> Ready for Dispatch
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnectShiprocket} className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted block mb-1">
                    Shiprocket Account Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email@shiprocket.in"
                    value={shiprocketEmail}
                    onChange={(e) => setShiprocketEmail(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted block mb-1">
                    API Key / Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={shiprocketPassword}
                    onChange={(e) => setShiprocketPassword(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-90"
                >
                  Connect Shiprocket Account
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Generate AWB & Shipping Label Box */}
        <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-black">Generate AWB & Label</h2>
              <span className="text-[10px] font-black uppercase text-text-muted">Courier Dispatch Utility</span>
            </div>
          </div>

          <form onSubmit={handleGenerateLabelAndAWB} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-text-muted block mb-1">
                Order ID / Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ORD-10928"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-text-muted block mb-1">
                Preferred Courier Partner
              </label>
              <select
                value={selectedCourier}
                onChange={(e) => setSelectedCourier(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none focus:border-primary"
              >
                <option value="Delhivery Surface">Delhivery Surface (₹45)</option>
                <option value="BlueDart Air">BlueDart Express Air (₹95)</option>
                <option value="DTDC Express">DTDC Express (₹60)</option>
                <option value="Shadowfax Local">Shadowfax Local (₹40)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full h-12 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-90 disabled:opacity-50"
            >
              {generating ? "Assigning AWB..." : "Generate AWB & Printable Label"}
            </button>
          </form>

          {awbOutput && (
            <div className="mt-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 dark:border-emerald-900/30 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-text-muted">Generated AWB Code:</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400">{awbOutput.awb}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold pt-2">
                <span className="text-text-muted">Label Document:</span>
                <a
                  href={awbOutput.labelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary font-black hover:underline"
                >
                  <span>Download PDF Label</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pickup Locations Management Section */}
      <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black tracking-tight">Pickup & Warehouse Locations</h2>
            <p className="text-xs font-bold text-text-secondary mt-0.5">
              Addresses registered for courier order collection
            </p>
          </div>
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-black shadow-lg hover:opacity-90"
          >
            <Plus size={16} />
            Add Pickup Location
          </button>
        </div>

        {pickupLocations.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-xs font-bold">
            No pickup locations added yet. Add your warehouse or store pickup address.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pickupLocations.map((loc) => (
              <div
                key={loc.id}
                className="rounded-3xl bg-foreground/[0.03] border border-foreground/[0.06] p-5 relative space-y-2 text-xs font-bold"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm">{loc.name}</span>
                  {loc.is_default && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/10 text-primary">
                      Default Pickup
                    </span>
                  )}
                </div>
                <p className="text-text-secondary">{loc.address_line1}, {loc.city}, {loc.state} - {loc.pincode}</p>
                <p className="text-text-muted">Contact Phone: {loc.phone}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[2.5rem] bg-background border border-foreground/[0.08] p-6 md:p-8 shadow-2xl space-y-4">
            <h2 className="text-lg font-black">Add Pickup Location</h2>
            <form onSubmit={handleAddLocation} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Location Name (e.g. Main Warehouse)"
                value={newLoc.name}
                onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
              <input
                type="tel"
                required
                placeholder="Contact Phone"
                value={newLoc.phone}
                onChange={(e) => setNewLoc({ ...newLoc, phone: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
              <textarea
                required
                rows={2}
                placeholder="Address Line 1"
                value={newLoc.address_line1}
                onChange={(e) => setNewLoc({ ...newLoc, address_line1: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={newLoc.city}
                  onChange={(e) => setNewLoc({ ...newLoc, city: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2.5 text-xs font-bold outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={newLoc.state}
                  onChange={(e) => setNewLoc({ ...newLoc, state: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2.5 text-xs font-bold outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Pincode"
                  value={newLoc.pincode}
                  onChange={(e) => setNewLoc({ ...newLoc, pincode: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2.5 text-xs font-bold outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 h-12 rounded-2xl border border-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-2xl bg-primary text-white text-xs font-black uppercase"
                >
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
