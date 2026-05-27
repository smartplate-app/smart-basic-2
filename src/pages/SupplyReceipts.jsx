import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, PackageCheck, AlertTriangle, Trash2, List, LayoutGrid, FileText, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import MonthlyInvoiceReport from "../components/receipts/MonthlyInvoiceReport";
import { useLanguage } from "../components/LanguageProvider";
import NetworkErrorHandler from "../components/NetworkErrorHandler";
import { getCache, setCache, isStale } from "../components/utils/cache";

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
  const [supplierFilterOpen, setSupplierFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("none");
  const [invoiceNumberFilter, setInvoiceNumberFilter] = useState("");
  const [refundReceivedOnly, setRefundReceivedOnly] = useState(false);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSupplierFilter("all");
    setSortBy("none");
    setInvoiceNumberFilter("");
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setRefundReceivedOnly(false);
    setReviewedOnly(false);
  };
  const [reviewedOnly, setReviewedOnly] = useState(false);
  const [datePreset, setDatePreset] = useState("all"); // all | week | month | year | custom
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const { t, language } = useLanguage();
  const isRTL = language?.startsWith('he') || language?.startsWith('ar');
  const tt = (key, he, en) => {
    const s = t(key);
    return (!s || s === key) ? (language?.startsWith('he') ? he : (en || key)) : s;
  };
  const [activeTab, setActiveTab] = useState('pending_orders');
  const [viewMode, setViewMode] = useState('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const startYRef = useRef(0);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [storeOwnerEmailState, setStoreOwnerEmailState] = useState(null);

  // Hydrate from cache for instant UI
  useEffect(() => {
    const c = getCache('receipts_v1');
    if (c?.data) {
      setReceipts(c.data.receipts || []);
      setOrders(c.data.orders || []);
      setSuppliers(c.data.suppliers || []);
      setLoading(false);
    }
  }, []);

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
      let receiptsData = [];
      let ordersData = [];
      let mergedSuppliers = [];
      
      const currentUserReq = await base44.auth.me();
      const isAdminControlling = userEmail !== currentUserReq.email;
      if (isAdminControlling) {
         try {
             const targetEmail = storeOwnerEmail || userEmail;
             const { data } = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: targetEmail });
             if (data?.success) {
                 receiptsData = data.data.receipts || [];
                 ordersData = data.data.orders || [];
                 mergedSuppliers = data.data.suppliers || [];
                 if (storeOwnerEmail) {
                    const { data: workerData } = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: userEmail });
                    if (workerData?.success) {
                       receiptsData = [...receiptsData, ...(workerData.data.receipts || [])];
                       ordersData = [...ordersData, ...(workerData.data.orders || [])];
                       mergedSuppliers = [...mergedSuppliers, ...(workerData.data.suppliers || [])];
                    }
                 }
             }
         } catch(e) {
             console.error("Admin data fetch error:", e);
         }
      } else {
          const [resReceipts, resOrders, ...supplierLists] = await Promise.all([
            base44.entities.SupplyReceipt.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, "-received_date"),
            base44.entities.Order.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, "-created_date"),
            ...supplierFetches
          ]);
          receiptsData = resReceipts;
          ordersData = resOrders;
          mergedSuppliers = supplierLists.flat().filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
      }
      
      setReceipts(receiptsData);
      setOrders(ordersData);
      setSuppliers(mergedSuppliers);
      setCache('receipts_v1', { receipts: receiptsData, orders: ordersData, suppliers: mergedSuppliers });
      
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
          let workingEmail = currentUser.acting_as_store_email || currentUser.acting_as_user_email || currentUser.email;
          
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
          
          const c = getCache('receipts_v1');
          const stale = isStale(c, 180000);
          if (stale) {
            await loadData(workingEmail, storeOwnerEmail);
          }
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
      
      // Also close the form if this receipt was being edited
      if (editingReceipt && editingReceipt.id === receipt.id) {
        setShowForm(false);
        setEditingReceipt(null);
      }
      
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
    // Exclude resolved receipts (unless looking at specific refund/review status)
    if (statusFilter === 'all' || statusFilter === 'invoices' || statusFilter === 'delivery_notes') {
        const isResolved = receipt.reviewed || receipt.refund_received || receipt.linked_receipt_id;
        if (isResolved) return false;
    }

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
        let fD = dateFrom ? new Date(dateFrom) : null;
        let tD = dateTo ? new Date(dateTo) : null;
        if (fD && tD && fD > tD) {
          const tmp = fD;
          fD = tD;
          tD = tmp;
        }
        if (fD) {
          fD.setHours(0,0,0,0);
          if (recDate < fD) matchesDate = false;
        }
        if (matchesDate && tD) {
          tD.setHours(23,59,59,999);
          if (recDate > tD) matchesDate = false;
        }
      } else {
        matchesDate = false;
      }
    }

    if (matchesSearch && matchesStatus && matchesSupplier && matchesDate) {
      if (statusFilter === 'refund_invoice' && refundReceivedOnly && !receipt.refund_received) return false;
      if (statusFilter === 'needs_review' && reviewedOnly && !receipt.reviewed) return false;
      if (invoiceNumberFilter && !receipt.invoice_number?.toLowerCase().includes(invoiceNumberFilter.toLowerCase())) return false;
      return true;
    }
    return false;
  });

  const sortedReceipts = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    let sortedList = [...filteredReceipts];

    if (sortBy === 'supplier_asc') {
      sortedList.sort((a,b) => (a.supplier_name || '').localeCompare(b.supplier_name || ''));
    } else if (sortBy === 'supplier_desc') {
      sortedList.sort((a,b) => (b.supplier_name || '').localeCompare(a.supplier_name || ''));
    } else if (sortBy === 'amount_asc') {
      sortedList.sort((a,b) => (parseFloat(a.invoice_total||0) - parseFloat(b.invoice_total||0)));
    } else if (sortBy === 'amount_desc') {
      sortedList.sort((a,b) => (parseFloat(b.invoice_total||0) - parseFloat(a.invoice_total||0)));
    } else if (sortBy === 'date_asc') {
      sortedList.sort((a,b) => new Date(a.received_date) - new Date(b.received_date));
    } else if (sortBy === 'date_desc') {
      sortedList.sort((a,b) => new Date(b.received_date) - new Date(a.received_date));
    } else if (sortBy === 'invoice_date_asc') {
      sortedList.sort((a,b) => new Date(a.invoice_date || 0) - new Date(b.invoice_date || 0));
    } else if (sortBy === 'invoice_date_desc') {
      sortedList.sort((a,b) => new Date(b.invoice_date || 0) - new Date(a.invoice_date || 0));
    } else {
        // Default sort: new to old
        sortedList.sort((a,b) => new Date(b.received_date) - new Date(a.received_date));
    }

    // Give priority to today's receipts
    sortedList.sort((a,b) => {
        const isTodayA = a.received_date === todayStr;
        const isTodayB = b.received_date === todayStr;
        
        if (isTodayA && !isTodayB) return -1;
        if (!isTodayA && isTodayB) return 1;
        return 0; // maintain previous sort order if both are today or both are not
    });

    return sortedList;
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
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f8f9fa] p-4 md:p-8"
      onTouchStart={(e) => { if (window.scrollY <= 0) { startYRef.current = e.touches[0].clientY; setPullDist(0); } }}
      onTouchMove={(e) => { if (window.scrollY <= 0 && startYRef.current) { const d = e.touches[0].clientY - startYRef.current; setPullDist(d > 0 ? Math.min(d, 120) : 0); } }}
      onTouchEnd={async () => { if (pullDist > 70 && !refreshing) { setRefreshing(true); const u = user || await base44.auth.me(); await loadData(u.email, storeOwnerEmailState); setTimeout(()=>{ setRefreshing(false); setPullDist(0); }, 300); } else { setPullDist(0); } startYRef.current = 0; }}
    >
      <div className="w-full">
        {/* Native-style Pull to Refresh Indicator */}
        <div 
          className="md:hidden fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-transform" 
          style={{ transform: `translateY(${refreshing ? 60 : pullDist - 40}px)`, opacity: pullDist > 10 || refreshing ? 1 : 0 }}
        >
          <div className="bg-white rounded-full shadow-lg h-10 w-10 flex items-center justify-center border border-gray-100">
            <Loader className={`w-5 h-5 text-green-600 ${refreshing ? 'animate-spin' : ''}`} style={{ transform: !refreshing ? `rotate(${pullDist * 2}deg)` : 'none' }} />
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="w-full md:w-auto">
            <h1 className="text-4xl font-extrabold text-[#1a1f36] tracking-tight">{t('receipts_title')}</h1>
            <p className="text-gray-500 mt-2 text-lg">{t('receipts_greeting', { name: user?.full_name || '' })}</p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            {/* Kept viewMode='list' as default, removed the toggle buttons from UI to match the clean aesthetic */}

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
              className="bg-[#d4a373] hover:bg-[#b88c60] text-white h-12 px-6 rounded-2xl shadow-sm text-base font-bold transition-all hover:scale-105"
            >
              <PackageCheck className="w-5 h-5 rtl:ml-2 rtl:mr-0 ltr:mr-2" />
              {tt('supply_without_order','קבלה ללא הזמנה','Supply without order')}
            </Button>

          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-2 bg-white/50 border border-gray-200 rounded-2xl p-1 shadow-sm h-auto inline-flex flex-wrap gap-1">
            <TabsTrigger value="pending_orders">{language === 'he' ? 'הזמנות לקליטה' : 'Pending Orders'}</TabsTrigger>
            <TabsTrigger value="receipts">{tt('receipts_tab','היסטוריית קבלות','Receipts History')}</TabsTrigger>
            <TabsTrigger value="monthly_report">{tt('monthly_summary','סיכום חודשי','Monthly Summary')}</TabsTrigger>
          </TabsList>

          <TabsContent value="pending_orders" className="mt-8">
            <AnimatePresence>
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
            </AnimatePresence>
            {!showForm && (
              <div className="space-y-6 pb-24">
                {['today', 'future', 'past'].map(section => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const sectionOrders = orders.filter(o => o.status === 'sent').filter(o => {
                    const dateStr = o.delivery_date ? new Date(o.delivery_date).toISOString().split('T')[0] : '';
                    if (section === 'today') return dateStr === todayStr;
                    if (section === 'future') return dateStr > todayStr;
                    if (section === 'past') return dateStr && dateStr < todayStr;
                    return false;
                  }).sort((a,b) => new Date(b.delivery_date || 0) - new Date(a.delivery_date || 0));

                  if (sectionOrders.length === 0) return null;

                  const sectionTitle = section === 'today' ? (language === 'he' ? 'להיום' : 'Today') :
                                       section === 'future' ? (language === 'he' ? 'עתידיות' : 'Future') :
                                       (language === 'he' ? 'לא נקלטו בעבר' : 'Past due');

                  return (
                    <div key={section}>
                      <h3 className="text-lg font-bold text-gray-800 mb-3">{sectionTitle} ({sectionOrders.length})</h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {sectionOrders.map(order => (
                          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-gray-900">{order.supplier_name}</div>
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">{order.order_number}</span>
                            </div>
                            <div className="text-sm text-gray-600 mb-4">{new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</div>
                            <Button
                              onClick={() => { setSelectedOrder(order); setShowForm(true); }}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                              <PackageCheck className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                              {tt('receive_scan', 'קלוט סחורה', 'Receive/Scan')}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {orders.filter(o => o.status === 'sent').length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {language === 'he' ? 'אין הזמנות פתוחות לקליטה.' : 'No open orders to receive.'}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="receipts" className="mt-8">
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

              {/* Receive from Sent Order Form - moved to pending_orders tab */}

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
             {tt('filters','מסננים ומיון','Filters & Sort')}
           </Button>
         </div>

         <div className="flex flex-col gap-3 mb-4 relative">
            <div className={`absolute top-0 w-12 h-full bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10 md:hidden ${isRTL ? 'left-[-16px]' : 'right-[-16px]'}`}></div>
            <div className={`absolute top-0 w-12 h-full bg-gradient-to-r from-gray-50 to-transparent pointer-events-none z-10 md:hidden ${isRTL ? 'right-[-16px]' : 'left-[-16px]'}`}></div>
            <div 
              className="flex flex-nowrap overflow-x-auto pb-1 gap-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x" 
              style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
              ref={(el) => {
                if (el && !el.dataset.scrolled) {
                  el.dataset.scrolled = 'true';
                  setTimeout(() => {
                    const direction = (language === 'he' || language === 'ar') ? -50 : 50;
                    el.scrollBy({ left: direction, behavior: 'smooth' });
                    setTimeout(() => el.scrollBy({ left: -direction, behavior: 'smooth' }), 300);
                  }, 600);
                }
              }}
            >
              {[
                { id: 'all', label: tt('all','הכל','All') },
                { id: 'invoices', label: language === 'he' ? 'חשבוניות' : 'Invoices' },
                { id: 'delivery_notes', label: language === 'he' ? 'תעודות משלוח' : 'Delivery Notes' },
                { id: 'refund_invoice', label: language === 'he' ? 'זיכויים' : 'Refunds' },
                { id: 'awaiting_credit', label: language === 'he' ? 'ממתין לזיכוי' : 'Awaiting Credit' }
              ].map(status => (
                <button
                  key={status.id}
                  onClick={() => setStatusFilter(status.id)}
                  className={`flex-shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    statusFilter === status.id 
                      ? 'bg-green-600 text-white border-green-600 shadow-sm' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex flex-col gap-3 mb-8">
              <div className="flex flex-wrap items-center gap-3">
                {(searchTerm || statusFilter !== 'all' || supplierFilter !== 'all' || sortBy !== 'none' || invoiceNumberFilter || datePreset !== 'all') && (
                  <Button variant="ghost" onClick={clearFilters} className="text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 h-10 rounded-xl transition-colors">
                    {tt('clear_filters','נקה מסננים','Clear')}
                  </Button>
                )}
                
                <div className="flex items-center bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto p-1 max-w-full">
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
                      } else if (v === 'last_year') {
                        const s = new Date(now.getFullYear() - 1, 0, 1);
                        const e = new Date(now.getFullYear() - 1, 11, 31);
                        setDateFrom(s.toISOString().slice(0,10));
                        setDateTo(e.toISOString().slice(0,10));
                      } else if (v === 'all') {
                        setDateFrom("");
                        setDateTo("");
                      } else if (v === 'custom') {
                        // Keep current dateFrom and dateTo
                      }
                    }}
                  >
                    <SelectTrigger className={`h-10 border-transparent shadow-none w-auto min-w-[120px] transition-colors rounded-xl ${datePreset !== 'custom' ? 'bg-white font-bold shadow-sm text-gray-900' : 'bg-transparent text-gray-600 font-medium hover:bg-gray-50'}`}>
                      <SelectValue placeholder={tt('timeframe','תאריכים','Dates')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border-gray-100">
                      <SelectItem value="all" className="rounded-lg">{tt('all_time','כל הזמן','All time')}</SelectItem>
                      <SelectItem value="week" className="rounded-lg">{tt('current_week','השבוע','This week')}</SelectItem>
                      <SelectItem value="month" className="rounded-lg">{tt('current_month','החודש','This month')}</SelectItem>
                      <SelectItem value="year" className="rounded-lg">{tt('current_year','מתחילת השנה','Year to date')}</SelectItem>
                      <SelectItem value="last_year" className="rounded-lg">{tt('last_year','שנה שעברה','Last year')}</SelectItem>
                      <SelectItem value="custom" className="rounded-lg">{tt('custom_range','טווח תאריכים מותאם...','Custom range')}</SelectItem>
                    </SelectContent>
                  </Select>

                  {datePreset === 'custom' && (
                    <div className="flex items-center gap-1.5 px-2 ml-1 border-l border-gray-200 rtl:border-l-0 rtl:border-r rtl:mr-1 animate-in fade-in zoom-in duration-200 flex-shrink-0">
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-10 w-[135px] px-2 text-sm bg-white border-gray-200 shadow-sm rounded-xl flex-shrink-0"
                      />
                      <span className="text-gray-400">-</span>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-10 w-[135px] px-2 text-sm bg-white border-gray-200 shadow-sm rounded-xl flex-shrink-0"
                      />
                    </div>
                  )}
                </div>
                
                <Popover open={supplierFilterOpen} onOpenChange={setSupplierFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={supplierFilterOpen}
                      className="h-12 w-auto min-w-[140px] rounded-2xl bg-white border-gray-200 text-gray-700 shadow-sm font-medium hover:bg-gray-50 transition-colors justify-between"
                    >
                      {supplierFilter === "all" 
                        ? tt('all_suppliers','כל הספקים','All suppliers')
                        : supplierFilter}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 rtl:mr-2 rtl:ml-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={tt('search_supplier','חפש ספק...','Search supplier...')} />
                      <CommandList>
                        <CommandEmpty>{tt('no_suppliers_found','לא נמצאו ספקים','No suppliers found')}</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setSupplierFilter("all");
                              setSupplierFilterOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 ${
                                supplierFilter === "all" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {tt('all_suppliers','כל הספקים','All suppliers')}
                          </CommandItem>
                          {Array.from(new Set(suppliers.map(s => s.name).filter(Boolean)))
                            .sort((a,b) => a.localeCompare(b))
                            .map(name => (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={() => {
                                  setSupplierFilter(name);
                                  setSupplierFilterOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 ${
                                    supplierFilter === name ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Removed Select dropdown for sorting as per user request - clicking on table headers handles this now */}
                <div className="relative ml-auto rtl:ml-0 rtl:mr-auto min-w-[240px]">
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 rtl:right-auto rtl:left-4" />
                  <Input
                    placeholder={tt('search_receipts','חיפוש קבלות (לפי ספק או מס׳ קבלה)','Search receipts')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-11 rtl:pr-4 rtl:pl-11 h-12 text-base rounded-2xl bg-white border-gray-200 shadow-sm focus-visible:ring-gray-300"
                  />
                </div>
              </div>

              {/* Extra filters for refunds/review */}
              {(statusFilter === 'refund_invoice') && (
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  {statusFilter === 'refund_invoice' && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" className="rounded accent-green-600 w-4 h-4" checked={refundReceivedOnly} onChange={(e) => setRefundReceivedOnly(e.target.checked)} />
                      <span>{tt('credit_received','הצג רק זיכויים שהתקבלו','Show only received credits')}</span>
                    </label>
                  )}
                </div>
              )}
            </div>
            </div>

            {/* Mobile Filters Drawer */}
            <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>{tt('filters','מסננים ומיון','Filters & Sort')}</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-4 pb-8 max-h-[80vh] overflow-y-auto">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder={tt('search_receipts','חיפוש קבלות (לפי ספק או מס׳ קבלה)','Search receipts')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-12 pr-10 rounded-xl bg-gray-50/50 border-gray-200 focus-visible:bg-white transition-colors"
                    />
                  </div>
                  
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-gray-200">
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

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-gray-200">
                      <SelectValue placeholder={tt('receipt_status','סוג מסמך / התראות','Document type / Alerts')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tt('all','הכל','All')}</SelectItem>
                      <SelectItem value="invoices">{language === 'he' ? 'חשבוניות מס' : 'Tax invoices'}</SelectItem>
                      <SelectItem value="delivery_notes">{language === 'he' ? 'תעודות משלוח' : 'Delivery notes'}</SelectItem>
                      <SelectItem value="refund_invoice">{language === 'he' ? 'חשבונית זיכוי' : 'Refund invoice'}</SelectItem>
                      <SelectItem value="awaiting_credit">{language === 'he' ? 'ממתין לזיכוי' : 'Awaiting credit'}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-gray-200">
                      <SelectValue placeholder={tt('sort','מיון לפי','Sort')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tt('no_sort','ללא מיון','No sort')}</SelectItem>
                      <SelectItem value="date_desc">{tt('date_new_old','תאריך קבלה: חדש ← ישן','Received: New-Old')}</SelectItem>
                      <SelectItem value="date_asc">{tt('date_old_new','תאריך קבלה: ישן ← חדש','Received: Old-New')}</SelectItem>
                      <SelectItem value="invoice_date_desc">{tt('invoice_date_new_old','תאריך חשבונית: חדש ← ישן','Invoice Date: New-Old')}</SelectItem>
                      <SelectItem value="invoice_date_asc">{tt('invoice_date_old_new','תאריך חשבונית: ישן ← חדש','Invoice Date: Old-New')}</SelectItem>
                      <SelectItem value="amount_asc">{tt('amount_low_to_high','סכום: נמוך ← גבוה','Amount: Low to High')}</SelectItem>
                      <SelectItem value="amount_desc">{tt('amount_high_to_low','סכום: גבוה ← נמוך','Amount: High to Low')}</SelectItem>
                      <SelectItem value="supplier_asc">{tt('supplier_az','ספק: א ← ת','Supplier: A-Z')}</SelectItem>
                      <SelectItem value="supplier_desc">{tt('supplier_za','ספק: ת ← א','Supplier: Z-A')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="space-y-2">
                    <Select
                      value={datePreset}
                      onValueChange={(v) => {
                        setDatePreset(v);
                        const now = new Date();
                        if (v === 'week') {
                          const s = new Date(now);
                          const dow = s.getDay();
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
                        } else if (v === 'last_year') {
                          const s = new Date(now.getFullYear() - 1, 0, 1);
                          const e = new Date(now.getFullYear() - 1, 11, 31);
                          setDateFrom(s.toISOString().slice(0,10));
                          setDateTo(e.toISOString().slice(0,10));
                        } else if (v === 'all') {
                          setDateFrom("");
                          setDateTo("");
                        }
                      }}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-gray-200">
                        <SelectValue placeholder={tt('timeframe','תאריכים','Dates')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tt('all_time','כל הזמן','All time')}</SelectItem>
                        <SelectItem value="week">{tt('current_week','השבוע','This week')}</SelectItem>
                        <SelectItem value="month">{tt('current_month','החודש','This month')}</SelectItem>
                        <SelectItem value="year">{tt('current_year','מתחילת השנה','Year to date')}</SelectItem>
                        <SelectItem value="last_year">{tt('last_year','שנה שעברה','Last year')}</SelectItem>
                        <SelectItem value="custom">{tt('custom_range','טווח מותאם אישית...','Custom range')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {datePreset === 'custom' && (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200 pt-2">
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="h-12 rounded-xl flex-1 bg-gray-50/50 border-gray-200"
                        />
                        <span className="text-gray-400">-</span>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="h-12 rounded-xl flex-1 bg-gray-50/50 border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Extra filters for refunds/review */}
                  {(statusFilter === 'refund_invoice') && (
                    <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
                      {statusFilter === 'refund_invoice' && (
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                          <input type="checkbox" className="rounded accent-green-600 w-5 h-5" checked={refundReceivedOnly} onChange={(e) => setRefundReceivedOnly(e.target.checked)} />
                          <span>{tt('credit_received','הצג רק זיכויים שהתקבלו','Show only received credits')}</span>
                        </label>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 mt-4 w-full">
                    <Button onClick={() => setFiltersOpen(false)} className="flex-1 h-12 text-base font-bold bg-green-600 hover:bg-green-700 rounded-xl">{tt('apply','החל מסננים','Apply')}</Button>
                    <Button onClick={() => { clearFilters(); setFiltersOpen(false); }} variant="outline" className="flex-1 h-12 text-base font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl">{tt('clear','נקה מסננים','Clear')}</Button>
                  </div>
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
               sortBy={sortBy}
               onSortChange={setSortBy}
               invoiceNumberFilter={invoiceNumberFilter}
               onInvoiceNumberFilterChange={setInvoiceNumberFilter}
               statusFilter={statusFilter}
               onStatusFilterChange={setStatusFilter}
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