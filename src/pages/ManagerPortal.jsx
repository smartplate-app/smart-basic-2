import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Loader, AlertCircle, ShoppingCart, PackageCheck, Warehouse,
  BarChart2, Users, Package, TrendingDown, BarChart3, Menu, X,
  Plus, Search, Eye, ChevronDown, ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OrderForm from "../components/orders/OrderForm";
import ReceiveSupplyForm from "../components/orders/ReceiveSupplyForm";
import WorkerInventoryCount from "../components/worker/WorkerInventoryCount";

const PAGES = [
  { key: "orders", label: "הזמנות", icon: ShoppingCart },
  { key: "receipts", label: "קבלות אספקה", icon: PackageCheck },
  { key: "counts", label: "ספירות מלאי", icon: BarChart3 },
  { key: "suppliers", label: "ספקים", icon: Users },
  { key: "items", label: "פריטים", icon: Package },
  { key: "waste", label: "זריקות", icon: TrendingDown },
];

function OrdersList({ orders }) {
  const [search, setSearch] = useState("");
  const filtered = orders.filter(o =>
    (o.supplier_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.order_number || "").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div dir="rtl">
      <div className="relative mb-4">
        <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש הזמנה..." className="pr-9 text-right" />
      </div>
      {filtered.length === 0 && <p className="text-center text-gray-400 py-8">אין הזמנות</p>}
      <div className="space-y-3">
        {filtered.map(order => (
          <div key={order.id} className="bg-white rounded-xl border px-4 py-3 flex justify-between items-center">
            <div className="text-right">
              <div className="font-semibold text-gray-800">{order.supplier_name}</div>
              <div className="text-xs text-gray-400">{order.order_number || "טיוטה"} · {order.created_date?.split("T")[0]}</div>
            </div>
            <div className="text-left">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.status === "sent" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {order.status === "sent" ? "נשלחה" : "טיוטה"}
              </span>
              <div className="text-sm font-bold text-gray-700 mt-1">₪{(order.total_cost || 0).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuppliersList({ suppliers }) {
  return (
    <div dir="rtl">
      {suppliers.length === 0 && <p className="text-center text-gray-400 py-8">אין ספקים</p>}
      <div className="space-y-2">
        {suppliers.map(s => (
          <div key={s.id} className="bg-white rounded-xl border px-4 py-3 flex justify-between items-center">
            <div className="text-right">
              <div className="font-semibold text-gray-800">{s.name}</div>
              <div className="text-xs text-gray-400">{s.contact_person} {s.phone && `· ${s.phone}`}</div>
            </div>
            <div className="text-xs text-gray-400">{s.email}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemsList({ items }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter(i =>
    (i.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (i.supplier_name || "").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div dir="rtl">
      <div className="relative mb-4">
        <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש פריט..." className="pr-9 text-right" />
      </div>
      {filtered.length === 0 && <p className="text-center text-gray-400 py-8">אין פריטים</p>}
      <div className="space-y-2">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl border px-4 py-3 flex justify-between items-center">
            <div className="text-right">
              <div className="font-semibold text-gray-800">{item.name}</div>
              <div className="text-xs text-gray-400">{item.supplier_name} · {item.unit}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-700">₪{(item.price_after_discount || 0).toLocaleString()}</div>
              {item.discount > 0 && <div className="text-xs text-green-600">הנחה {item.discount}%</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReceiptsList({ receipts }) {
  const [search, setSearch] = useState("");
  const filtered = (receipts || []).filter(r =>
    (r.supplier_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.invoice_number || "").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div dir="rtl">
      <div className="relative mb-4">
        <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש קבלה..." className="pr-9 text-right" />
      </div>
      {filtered.length === 0 && <p className="text-center text-gray-400 py-8">אין קבלות</p>}
      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.id} className="bg-white rounded-xl border px-4 py-3 flex justify-between items-center">
            <div className="text-right">
              <div className="font-semibold text-gray-800">{r.supplier_name}</div>
              <div className="text-xs text-gray-400">חשבונית {r.invoice_number || "-"} · {r.received_date}</div>
            </div>
            <div className="text-sm font-bold text-gray-700">₪{(r.invoice_total || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountsList({ counts }) {
  return (
    <div dir="rtl">
      {(counts || []).length === 0 && <p className="text-center text-gray-400 py-8">אין ספירות</p>}
      <div className="space-y-3">
        {(counts || []).map(c => (
          <div key={c.id} className="bg-white rounded-xl border px-4 py-3 flex justify-between items-center">
            <div className="text-right">
              <div className="font-semibold text-gray-800">{c.name || c.warehouse_name}</div>
              <div className="text-xs text-gray-400">{c.count_date} · {c.count_type}</div>
            </div>
            <div className="text-sm font-bold text-gray-700">₪{(c.total_inventory_value || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ManagerPortal() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ownerEmail, setOwnerEmail] = useState(null);
  const [businessName, setBusinessName] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [activePage, setActivePage] = useState("orders");
  const [subView, setSubView] = useState("list"); // 'list' | 'create'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [counts, setCounts] = useState([]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ownerParam = urlParams.get("owner");
    if (!ownerParam) { setError("קישור לא תקין"); setLoading(false); return; }
    setOwnerId(ownerParam);
    try {
      const n = sessionStorage.getItem("wp_business_name");
      const e = sessionStorage.getItem("wp_owner_email");
      if (n) setBusinessName(n);
      if (e) setOwnerEmail(e);
    } catch {}
    loadAll(ownerParam);
  }, []);

  const loadAll = async (id) => {
    try {
      setLoading(true);
      const [portalRes, receiptsRes, countsRes] = await Promise.all([
        base44.functions.invoke("workerPortalData", { ownerId: id, action: "load" }),
        base44.functions.invoke("workerPortalData", { ownerId: id, action: "loadReceipts" }),
        base44.functions.invoke("workerPortalData", { ownerId: id, action: "loadCounts" }),
      ]);
      const d = portalRes.data;
      setSuppliers(d.suppliers || []);
      setOrders(d.orders || []);
      setItems(d.items || []);
      if (d.ownerEmail) setOwnerEmail(d.ownerEmail);
      if (d.businessName) setBusinessName(d.businessName);
      setReceipts(receiptsRes.data?.receipts || []);
      setCounts(countsRes.data?.counts || []);
    } catch (e) {
      setError("שגיאה בטעינה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = async (orderData) => {
    await base44.functions.invoke("workerPortalData", { ownerId, action: "createOrder", ...orderData });
    alert("ההזמנה נשמרה!");
    setSubView("list");
    loadAll(ownerId);
  };

  const handleReceiptSubmit = async (receiptData) => {
    await base44.functions.invoke("workerPortalData", { ownerId, action: "createReceipt", ...receiptData });
    alert("הקבלה נשמרה!");
    setSubView("list");
    loadAll(ownerId);
  };

  const handleCountSubmit = async (countData) => {
    const res = await base44.functions.invoke("workerPortalData", { ownerId, action: "createCount", ...countData });
    if (res.data?.error) throw new Error(res.data.error);
    loadAll(ownerId);
  };

  const navigate = (page) => { setActivePage(page); setSubView("list"); setSidebarOpen(false); };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" alt="Smart Plate" className="h-14 object-contain mb-2" />
        <span className="text-base font-bold text-black mb-4">SMART PLATE BASIC</span>
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle className="text-red-600 flex gap-2"><AlertCircle className="w-5 h-5" />שגיאה</CardTitle></CardHeader>
          <CardContent><p>{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    if (activePage === "orders") {
      if (subView === "create") return (
        <OrderForm order={null} suppliers={suppliers} onSubmit={handleOrderSubmit} onCancel={() => setSubView("list")} />
      );
      return <OrdersList orders={orders} />;
    }
    if (activePage === "receipts") {
      if (subView === "create") return (
        <ReceiveSupplyForm order={null} receipt={null} suppliers={suppliers} onSubmit={handleReceiptSubmit} onCancel={() => setSubView("list")} />
      );
      return <ReceiptsList receipts={receipts} />;
    }
    if (activePage === "counts") {
      if (subView === "create") return (
        <WorkerInventoryCount items={items} ownerId={ownerId} onBack={() => setSubView("list")} onSubmit={handleCountSubmit} />
      );
      return <CountsList counts={counts} />;
    }
    if (activePage === "suppliers") return <SuppliersList suppliers={suppliers} />;
    if (activePage === "items") return <ItemsList items={items} />;
    if (activePage === "waste") return <div className="text-center text-gray-400 py-16">זריקות - בקרוב</div>;
    return null;
  };

  const canCreate = ["orders", "receipts", "counts"].includes(activePage);
  const createLabel = activePage === "orders" ? "הזמנה חדשה" : activePage === "receipts" ? "קבלה חדשה" : "ספירה חדשה";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-blue-800 md:hidden">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg"
            alt="Smart Plate" className="h-8 object-contain" />
          <div>
            <div className="font-bold text-sm leading-tight">פורטל מנהלים 🗂️</div>
            {businessName && <div className="text-blue-200 text-xs">{businessName}</div>}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`bg-white border-l border-gray-200 w-52 flex-shrink-0 flex flex-col py-4
          ${sidebarOpen ? "fixed right-0 top-14 bottom-0 z-30 shadow-xl" : "hidden"} md:relative md:flex md:top-0`}>
          <nav className="flex-1 px-3 space-y-1">
            {PAGES.map(p => (
              <button key={p.key} onClick={() => navigate(p.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition
                  ${activePage === p.key ? "bg-blue-900 text-white font-bold" : "text-gray-700 hover:bg-gray-100"}`}>
                <p.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{p.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            {subView === "list" && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {PAGES.find(p => p.key === activePage)?.label}
                </h2>
                {canCreate && (
                  <Button onClick={() => setSubView("create")} className="bg-blue-700 hover:bg-blue-800 text-white">
                    <Plus className="w-4 h-4 ml-1" /> {createLabel}
                  </Button>
                )}
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}