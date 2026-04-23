import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, PackageCheck, AlertTriangle, Trash2, List, LayoutGrid, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import MonthlyInvoiceReport from "../components/receipts/MonthlyInvoiceReport";
import { useLanguage } from "../components/LanguageProvider";
import NetworkErrorHandler from "../components/NetworkErrorHandler";

import ReceiveSupplyForm from "../components/orders/ReceiveSupplyForm";
import ReceiptCard from "../components/receipts/ReceiptCard";
import ReceiptList from "../components/receipts/ReceiptList";

export default function SupplyReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  // 'showForm' will now control the manual receipt creation/editing form
  const [showForm, setShowForm] = useState(false);
  // 'showReceiveForm' is a new state to control the order selection list when receiving
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [showNoOrderForm, setShowNoOrderForm] = useState(false); // NEW STATE
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [sortBy, setSortBy] = useState("none");
  const [refundReceivedOnly, setRefundReceivedOnly] = useState(false);
  const [reviewedOnly, setReviewedOnly] = useState(false);
  const [datePreset, setDatePreset] = useState("all"); // all | week | month | year | custom
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const { t, language } = useLanguage();
  const tt = (key, he, en) => {
    const s = t(key);
    return (!s || s === key) ? (language === 'he' ? he : (en || key)) : s;
  };
  const [activeTab, setActiveTab] = useState('receipts');
  const [viewMode, setViewMode] = useState('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const startYRef = useRef(0);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [storeOwnerEmailState, setStoreOwnerEmailState] = useState(null);

  const loadData = async (userEmail, storeOwnerEmail = null, retryCount = 0) => {
    try {
      setLoading(true);
      setNetworkError(false);

      // Artificial delay for demonstration/testing, remove in production if not needed
      await new Promise(resolve => setTimeout(resolve, 100));

      // If store user, load suppliers from owner + head store; receipts/orders from working email
      const suppliersEmails = new Set([userEmail]);
      if (storeOwnerEmail) suppliersEmails.add(storeOwnerEmail);
      try {
        const ownerStores = storeOwnerEmail ? await base44.entities.ChainStore.filter({ user_email: storeOwnerEmail }) : [];
        const effChainId = ownerStores?.[0]?.chain_id || null;
        if (effChainId) {
          const chainRec = await base44.entities.Chain.filter({ id: effChainId });
          let headEmail = chainRec?.[0]?.head_store_user_email || null;
          if (!headEmail) {
            const storesInChain = await base44.entities.ChainStore.filter({ chain_id: effChainId });
            const headStore = storesInChain?.find(s => s.is_head_store);
            headEmail = headStore?.user_email || null;
          }
          if (headEmail) suppliersEmails.add(headEmail);
        }
      } catch {}

      const supplierFetches = [];
      Array.from(suppliersEmails).forEach(e => {
        supplierFetches.push(base44.entities.Supplier.filter({ created_by: e }, "-created_date"));
        supplierFetches.push(base44.entities.Supplier.filter({ store_owner_email: e }, "-created_date"));
      });
      const [receiptsData, ordersData, ...supplierLists] = await Promise.all([
        base44.entities.SupplyReceipt.filter({ created_by: userEmail }, "-received_date"),
        base44.entities.Order.filter({ created_by: userEmail }, "-created_date"),
        ...supplierFetches
      ]);
      const mergedSuppliers = supplierLists.flat().filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
      setReceipts(receiptsData);
      setOrders(ordersData);
      setSuppliers(mergedSuppliers);
      
      console.log(`[SupplyReceipts] Loaded ${mergedSuppliers.length} suppliers from ${Array.from(suppliersEmails).join(', ')}`);
    } catch (error) {
      console.error("Error loading data:", error);

      if ((error.message === 'Network Error' || error.code === 'ERR_NETWORK') && retryCount < 3) {
        console.log(`Retrying data load... attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return loadData(userEmail, storeOwnerEmail, retryCount + 1);
      }

      setNetworkError(true);
      setReceipts([]);
      setOrders([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const checkAuthAndLoadData = async (retryCount = 0) => {
      try {
        if (isMounted) {
          setAuthLoading(true);
          setNetworkError(false);
        }

        // Artificial delay for demonstration/testing, remove in production if not needed
        await new Promise(resolve => setTimeout(resolve, 100));

        const currentUser = await base44.auth.me();

        if (isMounted) {
          setUser(currentUser);
          // Determine the working email based on user type
          let workingEmail = currentUser.acting_as_store_email || currentUser.email;
          
          // Check if user is a store user (worker/manager)
          let storeOwnerEmail = currentUser.store_user_owner_email;
          if (!storeOwnerEmail) {
            try {
              const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: currentUser.email });
              if (Array.isArray(storeUserRecords) && storeUserRecords.length > 0) {
                const activeRec = storeUserRecords.find(r => r.is_active !== false) || storeUserRecords[0];
                storeOwnerEmail = activeRec?.owner_email || null;
              }
            } catch (e) {
              console.log("Could not fetch store user records");
            }
          }
          
          // Pass store owner email separately so we can load suppliers from owner
          setStoreOwnerEmailState(storeOwnerEmail || null);
          await loadData(workingEmail, storeOwnerEmail);
        }
      } catch (error) {
        console.error("Authentication failed:", error);

        if ((error.message === 'Network Error' || error.code === 'ERR_NETWORK') && retryCount < 3) {
          console.log(`Retrying auth... attempt ${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
          if (isMounted) {
            return checkAuthAndLoadData(retryCount + 1);
          }
        }

        if (isMounted) {
          setNetworkError(true);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    checkAuthAndLoadData();

    // Cleanup function to set isMounted to false when the component unmounts
    return () => {
      isMounted = false;
    };
  }, []);

  const handleReceiptSubmit = async (receiptData) => {
    try {
      const cleanData = {
        ...receiptData,
        order_id: receiptData.order_id || null,
        order_number: receiptData.order_number || `INV-${Date.now()}`,
        supplier_name: receiptData.supplier_name || "Unknown",
        received_date: receiptData.received_date || new Date().toISOString().split('T')[0],
        verified_items: receiptData.verified_items || [],
        receipt_images: receiptData.receipt_images || [],
        invoice_total: parseFloat(receiptData.invoice_total),
        calculated_total: parseFloat(receiptData.calculated_total) || 0,
        status: receiptData.status || "pending",
        is_refund: !!receiptData.is_refund,
        needs_review: !!receiptData.needs_review,
        review_note: receiptData.review_note || "",
        refund_received: !!receiptData.refund_received,
        reviewed: !!receiptData.reviewed,
        linked_receipt_id: receiptData.linked_receipt_id || "",
        document_type: receiptData.document_type || "invoice",
        linked_order_ids: receiptData.linked_order_ids || [],
        summarized_delivery_note_ids: Array.isArray(receiptData.summarized_delivery_note_ids) ? receiptData.summarized_delivery_note_ids : []
      };

      if (editingReceipt) {
        await base44.entities.SupplyReceipt.update(editingReceipt.id, cleanData);
      } else {
        await base44.entities.SupplyReceipt.create(cleanData);
        // Close linked open orders as delivered
        const linkedOrderIds = [cleanData.order_id, ...(cleanData.linked_order_ids || [])].filter(Boolean);
        if (linkedOrderIds.length > 0) {
          await Promise.all(linkedOrderIds.map(orderId =>
            base44.entities.Order.update(orderId, { status: 'delivered' }).catch(() => {})
          ));
        }
      }

      // Reset all form-related states
      setShowForm(false); // Closes manual/editing form
      setShowReceiveForm(false); // Closes order selection list
      setShowNoOrderForm(false); // Closes no-order form
      setSelectedOrder(null);
      setEditingReceipt(null);
      alert(t('receipt_saved_successfully'));
      await loadData(user.email);
    } catch (error) {
      console.error("Full error saving receipt:", error);
      const errorMsg = error?.response?.data?.message || error?.message || error.toString();
      alert(`${t('error_saving')}: ${errorMsg}`);
      throw error;
    }
  };

  const handleEditReceipt = (receipt) => {
    setEditingReceipt(receipt);
    setShowForm(true); // Editing always opens the manual form, now controlled by 'showForm'
    setShowReceiveForm(false); // Ensure order selection is closed
    setShowNoOrderForm(false); // Ensure no-order form is closed
    setSelectedOrder(null); // Clear any pre-selected order
  };

  const handleDeleteReceipt = async (receipt) => {
    try {
      const details = `${receipt.supplier_name || ''} • ${receipt.invoice_number || '-'} • ${receipt.received_date || ''}`;
      const ok = window.confirm((t('confirm_delete_receipt') || 'Delete this receipt?') + '\n' + details);
      if (!ok) return;
      await base44.entities.SupplyReceipt.delete(receipt.id);
      setReceipts(prev => prev.filter(r => r.id !== receipt.id));
      alert(t('deleted_successfully') || 'Deleted successfully');
    } catch (e) {
      alert((t('delete_failed') || 'Delete failed') + ': ' + (e?.message || e));
    }
  };

  const handleQuickUpdate = async (id, patch) => {
    try {
      await base44.entities.SupplyReceipt.update(id, patch);
      setReceipts(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    } catch (e) { alert((t('error_saving') || 'Error saving') + ': ' + (e?.message || e)); }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = (() => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'refund_invoice') return !!receipt.is_refund;
      if (statusFilter === 'awaiting_credit') return !!receipt.awaiting_credit;
      if (statusFilter === 'needs_review') return !!receipt.needs_review;
      if (statusFilter === 'invoices') return receipt.document_type === 'invoice' || receipt.document_type === 'summary_invoice';
      if (statusFilter === 'delivery_notes') return receipt.document_type === 'delivery_note';
      return true;
    })();
    const matchesSupplier = supplierFilter === "all" || receipt.supplier_name === supplierFilter;

    // Date range filter (inclusive)
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const recDate = new Date(receipt.received_date);
      if (!isNaN(recDate)) {
        if (dateFrom) {
          const fromD = new Date(dateFrom);
          fromD.setHours(0,0,0,0);
          if (recDate < fromD) matchesDate = false;
        }
        if (matchesDate && dateTo) {
          const toD = new Date(dateTo);
          toD.setHours(23,59,59,999);
          if (recDate > toD) matchesDate = false;
        }
      }
    }

    if (matchesSearch && matchesStatus && matchesSupplier && matchesDate) {
    if (statusFilter === 'refund_invoice' && refundReceivedOnly && !receipt.refund_received) return false;
    if (statusFilter === 'needs_review' && reviewedOnly && !receipt.reviewed) return false;
    return true;
    }
    return false;
  });

  const sortedReceipts = React.useMemo(() => {
    if (sortBy === 'supplier_asc') {
      return [...filteredReceipts].sort((a,b) => (a.supplier_name || '').localeCompare(b.supplier_name || ''));
    }
    if (sortBy === 'supplier_desc') {
      return [...filteredReceipts].sort((a,b) => (b.supplier_name || '').localeCompare(a.supplier_name || ''));
    }
    if (sortBy === 'amount_asc') {
      return [...filteredReceipts].sort((a,b) => (parseFloat(a.invoice_total||0) - parseFloat(b.invoice_total||0)));
    }
    if (sortBy === 'amount_desc') {
      return [...filteredReceipts].sort((a,b) => (parseFloat(b.invoice_total||0) - parseFloat(a.invoice_total||0)));
    }
    return filteredReceipts;
  }, [filteredReceipts, sortBy]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <img
            src="https://smartplate.org/logo.png"
            alt="Smart Plate"
            className="h-20 object-contain animate-pulse"
          />
          <Loader className="w-12 h-12 animate-spin text-gray-600" />
          <p className="text-lg text-gray-700">{tt('loading','טוען...','Loading')}</p>
        </div>
      </div>
    );
  }

  if (networkError) {
    return <NetworkErrorHandler onRetry={() => window.location.reload()} />;
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-4 md:p-8"
      onTouchStart={(e) => { if (window.scrollY <= 0) { startYRef.current = e.touches[0].clientY; setPullDist(0); } }}
      onTouchMove={(e) => { if (window.scrollY <= 0 && startYRef.current) { const d = e.touches[0].clientY - startYRef.current; setPullDist(d > 0 ? Math.min(d, 120) : 0); } }}
      onTouchEnd={async () => { if (pullDist > 70 && !refreshing) { setRefreshing(true); const u = user || await base44.auth.me(); await loadData(u.email, storeOwnerEmailState); setTimeout(()=>{ setRefreshing(false); setPullDist(0); }, 300); } else { setPullDist(0); } startYRef.current = 0; }}
    >
      <div className="w-full">
        {/* Pull to Refresh Indicator (mobile) */}
        <div className="md:hidden flex items-center justify-center text-xs text-gray-500 h-8 transition-transform" style={{ transform: `translateY(${pullDist}px)` }}>
          {refreshing ? (<><Loader className="w-3 h-3 mr-1 animate-spin" /> {t('refreshing') || 'Refreshing...'}</>) : (pullDist > 0 ? (t('pull_to_refresh') || 'Pull to refresh') : null)}
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('receipts_title')}</h1>
            <p className="text-gray-600 mt-2">{t('receipts_greeting', { name: user?.full_name || '' })}</p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex bg-white rounded-lg shadow-sm border">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-100'}
                title={tt('list','רשימה','List')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-100'}
                title={tt('grid','כרטיסים','Grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>

           <Button
             variant="outline"
             onClick={async () => {
               const list = (sortedReceipts || []).filter(r => r.is_refund || r.needs_review);
               if (!list.length) { alert(t('no_refund_review_found') || 'No refund/review invoices in current view.'); return; }
               const header = ['supplier','invoice_number','received_date','amount','flags','review_note'];
               const esc = (s) => String(s ?? '').replace(/\"/g, '\\"');
               const rows = list.map(r => {
                 const flags = [r.is_refund ? 'refund' : null, r.needs_review ? 'review' : null].filter(Boolean).join('|');
                 return [r.supplier_name || '', r.invoice_number || '', r.received_date || '', (r.invoice_total ?? 0), flags, r.review_note || ''];
               });
               const title = `Refund_Review_${new Date().toISOString().slice(0,10)}`;
               const { data } = await base44.functions.invoke('createRefundReviewSheet', { header, rows, title });
               if (data?.url) {
                 window.open(data.url, '_blank');
               } else {
                 alert((t('export_failed') || 'Export failed') + (data?.error ? `: ${data.error}` : ''));
               }
             }}
             className="flex items-center gap-2"
           >
             <FileText className="w-5 h-5 ml-2" />
             {tt('refund_review_report','דוח זיכויים/בדיקה','Refund/Review report')}
           </Button>
            <Button
              onClick={() => {
                setShowNoOrderForm(true); // Open the no-order receipt creation form
                setShowForm(false); // Close the manual receipt form if open
                setShowReceiveForm(false); // Close the order selection flow if open
                setEditingReceipt(null); // Clear editing state
                setSelectedOrder(null); // Clear any selected order
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <PackageCheck className="w-5 h-5 ml-2" />
              {tt('supply_without_order','קבלה ללא הזמנה','Supply without order')}
            </Button>

          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="receipts">{tt('receipts_tab','קבלות','Receipts')}</TabsTrigger>
            <TabsTrigger value="monthly_report">{tt('monthly_report','דוח חודשי','Monthly Report')}</TabsTrigger>
          </TabsList>

          <TabsContent value="receipts">
            <AnimatePresence>
              {/* Editing Form */}
              {showForm && editingReceipt && (
                <ReceiveSupplyForm
                  order={null}
                  receipt={editingReceipt}
                  suppliers={suppliers}
                  noOrderMode={true}
                  user={user}
                  onSubmit={handleReceiptSubmit}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingReceipt(null);
                  }}
                  onDelete={handleDeleteReceipt}
                />
              )}

              {/* Receive from Sent Order Form */}
               {showForm && selectedOrder && !editingReceipt && (
                 <ReceiveSupplyForm
                   order={selectedOrder}
                   receipt={null}
                   suppliers={suppliers}
                   noOrderMode={false}
                   user={user}
                   onSubmit={handleReceiptSubmit}
                   onCancel={() => { setShowForm(false); setSelectedOrder(null); }}
                 />
               )}

               {/* Supply Without Order Form */}
               {showNoOrderForm && (
                <ReceiveSupplyForm
                  order={null}
                  receipt={null}
                  suppliers={suppliers}
                  noOrderMode={true}
                  user={user}
                  onSubmit={handleReceiptSubmit}
                  onCancel={() => {
                    setShowNoOrderForm(false);
                  }}
                />
              )}
            </AnimatePresence>



            {/* Mobile Filters Drawer trigger */}
         <div className="md:hidden mb-4">
           <Button variant="outline" onClick={() => setFiltersOpen(true)} className="w-full">
             {tt('filters','מסננים','Filters')}
           </Button>
         </div>

         <div className="hidden md:flex flex-wrap items-center gap-1 mb-4">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                                 <Input
                  placeholder={tt('search_receipts','חיפוש בקבלות','Search receipts')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pr-7 rounded-md text-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                               <SelectTrigger className="h-8 rounded-md px-2 text-xs border-gray-200 shadow-none bg-white">
                  <SelectValue placeholder={tt('receipt_status','סטטוס קבלה','Receipt status')} />
                </SelectTrigger>
                <SelectContent>
                 <SelectItem value="all">{tt('all_statuses','כל הסטטוסים','All statuses')}</SelectItem>
                 <SelectItem value="invoices">{language === 'he' ? 'חשבוניות מס' : 'Tax invoices'}</SelectItem>
                 <SelectItem value="delivery_notes">{language === 'he' ? 'תעודות משלוח' : 'Delivery notes'}</SelectItem>
                 <SelectItem value="refund_invoice">{language === 'he' ? 'חשבונית זיכוי' : 'Refund invoice'}</SelectItem>
                 <SelectItem value="awaiting_credit">{language === 'he' ? 'ממתין לזיכוי' : 'Awaiting credit'}</SelectItem>
                 <SelectItem value="needs_review">{language === 'he' ? 'לבדיקה נוספת' : 'Needs review'}</SelectItem>
                </SelectContent>
              </Select>

              {/* Extra filters for refunds/review */}
              {statusFilter === 'refund_invoice' && (
                <label className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-gray-200 bg-white">
                  <input type="checkbox" checked={refundReceivedOnly} onChange={(e) => setRefundReceivedOnly(e.target.checked)} />
                  <span>{tt('credit_received','התקבל זיכוי','Credit received')}</span>
                </label>
              )}
              {statusFilter === 'needs_review' && (
                <label className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-gray-200 bg-white">
                  <input type="checkbox" checked={reviewedOnly} onChange={(e) => setReviewedOnly(e.target.checked)} />
                  <span>{tt('reviewed','נסקר','Reviewed')}</span>
                </label>
              )}

              {/* Supplier filter */}
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                               <SelectTrigger className="h-8 rounded-md px-2 text-xs border-gray-200 shadow-none bg-white">
                  <SelectValue placeholder={tt('supplier','ספק','Supplier')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tt('all_suppliers','כל הספקים','All suppliers')}</SelectItem>
                  {Array.from(new Set(suppliers.map(s => s.name).filter(Boolean)))
                    .sort((a,b) => a.localeCompare(b))
                    .map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Sort by amount */}
              <Select value={sortBy} onValueChange={setSortBy}>
                               <SelectTrigger className="h-8 rounded-md px-2 text-xs border-gray-200 shadow-none bg-white">
                  <SelectValue placeholder={tt('sort','מיון','Sort')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tt('no_sort','ללא מיון','No sort')}</SelectItem>
                  <SelectItem value="amount_asc">{tt('amount_low_to_high','סכום: נמוך → גבוה','Amount: Low → High')}</SelectItem>
                  <SelectItem value="amount_desc">{tt('amount_high_to_low','סכום: גבוה → נמוך','Amount: High → Low')}</SelectItem>
                  <SelectItem value="supplier_asc">{tt('supplier_az','ספק א→ת','Supplier A–Z')}</SelectItem>
                  <SelectItem value="supplier_desc">{tt('supplier_za','ספק ת→א','Supplier Z–A')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Timeframe preset */}
              <Select
                               value={datePreset}
                               onValueChange={(v) => {
                  setDatePreset(v);
                  const now = new Date();
                  if (v === 'week') {
                    const s = new Date(now);
                    const dow = s.getDay(); // 0=Sunday
                    s.setDate(s.getDate() - dow);
                    s.setHours(0,0,0,0);
                    const e = new Date(s);
                    e.setDate(s.getDate() + 6);
                    e.setHours(23,59,59,999);
                    setDateFrom(s.toISOString().slice(0,10));
                    setDateTo(e.toISOString().slice(0,10));
                  } else if (v === 'month') {
                    const s = new Date(now.getFullYear(), now.getMonth(), 1);
                    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setDateFrom(s.toISOString().slice(0,10));
                    setDateTo(e.toISOString().slice(0,10));
                  } else if (v === 'year') {
                    const s = new Date(now.getFullYear(), 0, 1);
                    const e = new Date(now.getFullYear(), 11, 31);
                    setDateFrom(s.toISOString().slice(0,10));
                    setDateTo(e.toISOString().slice(0,10));
                  } else if (v === 'all') {
                    setDateFrom("");
                    setDateTo("");
                  }
                }}
              >
                <SelectTrigger className="h-8 rounded-md px-2 text-xs border-gray-200 shadow-none bg-white">
                  <SelectValue placeholder={tt('timeframe','טווח זמן','Timeframe')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tt('all_time','כל הזמן','All time')}</SelectItem>
                  <SelectItem value="week">{tt('current_week','שבוע נוכחי','Current week')}</SelectItem>
                  <SelectItem value="month">{tt('current_month','חודש נוכחי','Current month')}</SelectItem>
                  <SelectItem value="year">{tt('current_year','שנה נוכחית','Current year')}</SelectItem>
                  <SelectItem value="custom">{tt('custom_range','טווח מותאם','Custom range')}</SelectItem>
                </SelectContent>
              </Select>

              {/* From / To dates */}
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                placeholder={tt('from_date','מתאריך','From date')}
                className="h-9 rounded-full px-3 text-sm"
                disabled={datePreset !== 'custom' && datePreset !== 'week' && datePreset !== 'month' && datePreset !== 'year' && datePreset !== 'all' && false}
              />
              <span className="text-[11px] text-gray-500">{tt('between_dates','בין תאריכים','Between dates')}</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setDatePreset('custom'); }}
                placeholder={tt('to_date','עד תאריך','To date')}
                className="h-9 rounded-full px-3 text-sm"
                disabled={datePreset !== 'custom' && datePreset !== 'week' && datePreset !== 'month' && datePreset !== 'year' && datePreset !== 'all' && false}
              />
            </div>

            {/* Mobile Filters Drawer */}
            <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>{tt('filters','מסננים','Filters')}</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                                          <Input
                      placeholder={tt('search_receipts','חיפוש בקבלות','Search receipts')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 pr-7 rounded-md text-xs"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={tt('receipt_status','סטטוס קבלה','Receipt status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tt('all_statuses','כל הסטטוסים','All statuses')}</SelectItem>
                      <SelectItem value="invoices">{language === 'he' ? 'חשבוניות מס' : 'Tax invoices'}</SelectItem>
                      <SelectItem value="delivery_notes">{language === 'he' ? 'תעודות משלוח' : 'Delivery notes'}</SelectItem>
                      <SelectItem value="refund_invoice">{language === 'he' ? 'חשבונית זיכוי' : 'Refund invoice'}</SelectItem>
                      <SelectItem value="awaiting_credit">{language === 'he' ? 'ממתין לזיכוי' : 'Awaiting credit'}</SelectItem>
                      <SelectItem value="needs_review">{language === 'he' ? 'לבדיקה נוספת' : 'Needs review'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setFiltersOpen(false)} className="w-full">{tt('apply','החל','Apply')}</Button>
                </div>
              </DrawerContent>
            </Drawer>

            {viewMode === 'list' ? (
              <ReceiptList
               receipts={sortedReceipts}
               onEdit={handleEditReceipt}
               onDelete={handleDeleteReceipt}
               onQuickUpdate={handleQuickUpdate}
               loading={loading}
               />
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <AnimatePresence>
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                        <div className="h-6 bg-gray-200 rounded mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </div>
                    ))
                  ) : (
                    sortedReceipts.map((receipt) => (
                      <ReceiptCard
                        key={receipt.id}
                        receipt={receipt}
                        onEdit={handleEditReceipt}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            )}

            {!loading && sortedReceipts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">{tt('no_receipts_to_display','אין קבלות להצגה','No receipts to display')}</div>
                <div className="text-gray-500">{tt('start_by_creating_receipt','התחל ביצירת קבלה','Start by creating a receipt')}</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="monthly_report">
            <MonthlyInvoiceReport receipts={receipts} suppliers={suppliers} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}