import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, RefreshCw, Edit, AlertCircle, Trash2, Mail, MessageCircle, Share, Copy, FileCode, MoreHorizontal, PackageCheck, Send, CalendarIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { useLanguage } from "../components/LanguageProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import html2canvas from 'html2canvas';

import OrderForm from "../components/orders/OrderForm";
import ReceiveSupplyForm from "../components/orders/ReceiveSupplyForm";
import OrderPreviewModal from "../components/orders/OrderPreviewModal";
import NetworkErrorHandler from "../components/NetworkErrorHandler";
import { offlineQueue } from "../components/offline/offlineQueue";
import { notifyOS } from "../components/notifications/notify";
import { getCache, setCache, isStale } from "../components/utils/cache";
import { toast } from "sonner";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("history");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [sortBy, setSortBy] = useState("none");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const { t, language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const safeT = (key, he, en) => {
    const v = t(key);
    if (language === 'he' && (v === key || !v)) return he;
    return (v === key || !v) ? (en ?? key) : v;
  };
  const unitLabel = (u) => {
    if (!u) return '';
    if (language !== 'he') return u;
    const map = { unit: 'יחידות', liter: 'ליטר', kg: 'ק״ג', case: 'ארגזים', gram: 'גרם', ml: 'מ״ל' };
    return map[u] || u;
  };


  const [isViewer, setIsViewer] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const startYRef = useRef(0);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [showNoOrderReceiveForm, setShowNoOrderReceiveForm] = useState(false);
  const [receiveOrder, setReceiveOrder] = useState(null);
  // Send options chooser
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [sendOptionOrder, setSendOptionOrder] = useState(null);


  // Hydrate from cache for instant UI, then optionally revalidate
  useEffect(() => {
    const c = getCache('orders_v1');
    if (c?.data) {
      setOrders(c.data.orders || []);
      setSuppliers(c.data.suppliers || []);
      setLoading(false);
    }
  }, []);

  // No pre-generated file anymore

  const loadData = async (currentUser, retryAttempt = 0, background = false) => {
    try {
      if (!background) setLoading(true);
      setError(null);

      console.log(`[Orders] Loading data (attempt ${retryAttempt + 1})...`);

      // Check network connectivity
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network.');
      }

      // Exponential backoff for retries
      if (retryAttempt > 0) {
        const delay = Math.min(3000 * Math.pow(1.5, retryAttempt - 1), 15000);
        console.log(`[Orders] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      let ordersData = [];
      let suppliersData = [];
      
      // Use acting_as_store_email or acting_as_user_email if admin is controlling a user
      const workingEmail = currentUser.acting_as_store_email || currentUser.acting_as_user_email || currentUser.email;
      const isAdminControlling = currentUser?.role === 'admin' && workingEmail !== currentUser.email;

      // Check if user is a store_user (worker/manager invited to someone else's store)
      // First check if saved on user object, then try to fetch from StoreUser entity
      let isStoreUser = currentUser.store_user_role && currentUser.store_user_owner_email;
      let storeOwnerEmail = currentUser.store_user_owner_email;
      
      if (!isStoreUser) {
        // Check StoreUser entity for this user
        try {
          const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: currentUser.email, is_active: true });
          if (storeUserRecords.length > 0) {
            const record = storeUserRecords[0];
            isStoreUser = true;
            storeOwnerEmail = record.owner_email;
          }
        } catch (e) {
          console.log("Could not fetch store user records");
        }
      }

      console.log(`[Orders] isAdminControlling: ${isAdminControlling}, isStoreUser: ${isStoreUser}, storeOwnerEmail: ${storeOwnerEmail}, workingEmail: ${workingEmail}`);

      // Compute viewer mode from StoreUser records or user flags
      let viewerMode = currentUser.store_user_role === 'viewer' || currentUser.store_user_read_only;
      try {
        const roleRecords = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
        if (roleRecords.length > 0) {
          const effective =
            roleRecords.find(r => r.role === 'viewer') ||
            roleRecords.find(r => r.role === 'worker') ||
            roleRecords[0];
          viewerMode = effective.role === 'viewer';
        }
      } catch (e) {
        console.log('[Orders] viewer-mode check failed:', e?.message || e);
      }
      setIsViewer(!!viewerMode);

      if (isAdminControlling) {
        // Admin controlling a user - load that user's data using the controlled user's email
        console.log(`[Orders] Admin controlling user, loading data for: ${workingEmail}`);
        
        // Also check if the controlled user is a store user (worker/manager)
        let controlledUserOwnerEmail = null;
        try {
          const controlledStoreUserRecords = await base44.asServiceRole?.entities?.StoreUser?.filter({ user_email: workingEmail, is_active: true }) || [];
          if (controlledStoreUserRecords.length > 0) {
            controlledUserOwnerEmail = controlledStoreUserRecords[0].owner_email;
            console.log(`[Orders] Controlled user is a store user, owner: ${controlledUserOwnerEmail}`);
          }
        } catch (e) {
          console.log("Could not fetch store user records for controlled user");
        }
        
        const targetEmail = controlledUserOwnerEmail || workingEmail;
        try {
          const { data } = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: targetEmail });
          if (data?.success) {
            ordersData = data.data.orders || [];
            suppliersData = data.data.suppliers || [];
            if (controlledUserOwnerEmail) {
              const { data: workerData } = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: workingEmail });
              if (workerData?.success) {
                ordersData = [...ordersData, ...(workerData.data.orders || [])];
                suppliersData = [...suppliersData, ...(workerData.data.suppliers || [])];
              }
            }
          }
        } catch (e) {
          console.error("Error loading admin data:", e);
        }
      } else if (isStoreUser && storeOwnerEmail) {
        // Store user - show owner's orders + this user's orders (drafts etc.)
        const [ownerSuppliers, ownerStoreSuppliers, ownerOrders, myOrders] = await Promise.all([
          base44.entities.Supplier.filter({ created_by: storeOwnerEmail }, "name"),
          base44.entities.Supplier.filter({ store_owner_email: storeOwnerEmail }, "name"),
          base44.entities.Order.filter({ $or: [{ created_by: storeOwnerEmail }, { store_owner_email: storeOwnerEmail }] }, "-created_date"),
          base44.entities.Order.filter({ $or: [{ created_by: currentUser.email }, { store_owner_email: currentUser.email }] }, "-created_date")
        ]);
        suppliersData = [...ownerSuppliers, ...ownerStoreSuppliers].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
        const merged = [...ownerOrders, ...myOrders];
        const seen = new Set();
        ordersData = merged.filter(o => {
          if (!o?.id || seen.has(o.id)) return false;
          seen.add(o.id);
          return true;
        });
      } else if (currentUser.chain_id && !currentUser.is_chain_head) {
        // Branch store in chain
        const chain = await base44.entities.Chain.filter({ id: currentUser.chain_id });
        if (chain.length > 0) {
          const headEmail = chain[0].head_store_user_email;
          // Load suppliers from head store + own, but only own orders
          const [headSuppliers, headStoreSuppliers, ownSuppliers, ownStoreSuppliers, ownOrders] = await Promise.all([
            base44.entities.Supplier.filter({ created_by: headEmail }, "name"),
            base44.entities.Supplier.filter({ store_owner_email: headEmail }, "name"),
            base44.entities.Supplier.filter({ created_by: currentUser.email }, "name"),
            base44.entities.Supplier.filter({ store_owner_email: currentUser.email }, "name"),
            base44.entities.Order.filter({ $or: [{ created_by: currentUser.email }, { store_owner_email: currentUser.email }] }, "-created_date")
          ]);
          suppliersData = [...headSuppliers, ...headStoreSuppliers, ...ownSuppliers, ...ownStoreSuppliers].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
          ordersData = ownOrders;
        }
      } else {
        // Head store or no chain - load all orders (including from branches if head)
        let allOrders = [];
        
        if (currentUser.is_chain_head && currentUser.chain_id) {
          // Head store - load own orders + branch orders
          const chainStores = await base44.entities.ChainStore.filter({ chain_id: currentUser.chain_id });
          const branchEmails = chainStores.filter(s => !s.is_head_store).map(s => s.user_email);
          
          const orderPromises = [
            base44.entities.Order.filter({ $or: [{ created_by: currentUser.email }, { store_owner_email: currentUser.email }] }, "-created_date")
          ];
          for (const email of branchEmails) {
            orderPromises.push(base44.entities.Order.filter({ $or: [{ created_by: email }, { store_owner_email: email }] }, "-created_date"));
          }
          const ordersArrays = await Promise.all(orderPromises);
          allOrders = ordersArrays.flat();
        } else {
          allOrders = await base44.entities.Order.filter({ $or: [{ created_by: currentUser.email }, { store_owner_email: currentUser.email }] }, "-created_date");
        }

        const [ownSuppliers, storeSuppliers] = await Promise.all([
          base44.entities.Supplier.filter({ created_by: currentUser.email }, "name"),
          base44.entities.Supplier.filter({ store_owner_email: currentUser.email }, "name")
        ]);
        const suppliers = [...ownSuppliers, ...storeSuppliers].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
        ordersData = allOrders;
        suppliersData = suppliers;
      }

      // Always include context user's drafts (supports admin-controlling + sub-users)
      let myDrafts = [];
      try {
        myDrafts = await base44.entities.Order.filter({ $or: [{ created_by: workingEmail }, { store_owner_email: workingEmail }], status: 'draft' }, "-created_date");
      } catch (_) { myDrafts = []; }

      // Fallback: fetch drafts by status only and filter client-side by creator
      let fallbackDrafts = [];
      try {
        const draftsByStatus = await base44.entities.Order.filter({ status: 'draft' }, "-created_date");
        fallbackDrafts = (draftsByStatus || []).filter(o => o?.created_by === workingEmail);
      } catch (_) { fallbackDrafts = []; }

      const mergedAll = [...ordersData, ...myDrafts, ...fallbackDrafts];
      const uniq = [];
      const seenIds = new Set();
      for (const o of mergedAll) {
        if (!o?.id || seenIds.has(o.id)) continue;
        seenIds.add(o.id);
        uniq.push(o);
      }
      console.log(`[Orders] Successfully loaded ${uniq.length} orders (after merging drafts), ${suppliersData.length} suppliers`);
      setOrders(uniq);
      setSuppliers(suppliersData);
      setCache('orders_v1', { orders: uniq, suppliers: suppliersData });

      setError(null);
      setRetryCount(0);
      setLoading(false);

    } catch (err) {
      console.error(`[Orders] Data loading error (attempt ${retryAttempt + 1}):`, err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        name: err.name,
        status: err.response?.status,
        stack: err.stack
      });
      
      const isNetworkError = 
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('internet') ||
        err.message?.toLowerCase().includes('connection') ||
        err.code === 'ERR_NETWORK' ||
        err.name === 'NetworkError' ||
        err.response?.status === 0 ||
        !navigator.onLine;
      
      // Retry on network errors up to 4 times
      if (isNetworkError && retryAttempt < 4) {
        console.log(`[Orders] Will retry data loading... (${retryAttempt + 1}/4)`);
        setRetryCount(retryAttempt + 1);
        const retryDelay = Math.min(3000 * Math.pow(1.5, retryAttempt), 15000);
        setTimeout(() => loadData(currentUser, retryAttempt + 1), retryDelay);
        return;
      }
      
      // Max retries reached or non-network error
      console.error("[Orders] Max retries reached or non-network error");
      setError(err.message || "Failed to load orders data");
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authTimeout = null;
    let initTimeout = null;

    const checkAuthAndLoadData = async (retryAttempt = 0) => {
      try {
        if (!mounted) return;
        
        const _cache = getCache('orders_v1');
        const _hasCache = !!(_cache && _cache.data);
        setAuthLoading(!_hasCache);
        setError(null);
        setRetryCount(retryAttempt);
        
        console.log(`[Orders] Authentication attempt ${retryAttempt + 1}`);
        
        // Check network connectivity
        if (!navigator.onLine) {
          throw new Error('No internet connection. Please check your network.');
        }
        
        // Exponential backoff for retry attempts
        if (retryAttempt > 0) {
          const delay = Math.min(3000 * Math.pow(1.5, retryAttempt - 1), 15000);
          console.log(`[Orders] Waiting ${delay}ms before auth retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log('[Orders] Calling base44.auth.me()...');
        const currentUser = await base44.auth.me();
        console.log("[Orders] User authenticated successfully:", currentUser.email);
        
        if (!mounted) return;
        
        setUser(currentUser);
        setAuthLoading(false);
        
        // One-time bulk delete sent orders for Studio A.K.A
        try {
          const flagKey = 'b44_deleted_sent_orders_studioaka55';
          const allowed = (currentUser.role === 'admin') || (currentUser.email === 'studioaka55@gmail.com');
          if (allowed && !localStorage.getItem(flagKey)) {
            const { data } = await base44.functions.invoke('deleteSentOrdersForUser', { targetEmail: 'studioaka55@gmail.com' });
            console.log('[Orders] Bulk delete sent orders:', data);
            localStorage.setItem(flagKey, '1');
          }
        } catch (e) {
          console.log('[Orders] deleteSentOrdersForUser failed:', e?.message || e);
        }
        
        if (mounted) {
          const c = getCache('orders_v1');
          const stale = isStale(c, 180000);
          if (stale) {
            await loadData(currentUser);
          } else {
            // Background refresh to catch status changes (e.g. from SupplyReceipt automations)
            loadData(currentUser, 0, true);
          }
        }
        
      } catch (error) {
        console.error(`[Orders] Authentication error (attempt ${retryAttempt + 1}):`, error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          name: error.name,
          status: error.response?.status,
          stack: error.stack
        });
        
        const isNetworkError = 
          error.message?.toLowerCase().includes('network') ||
          error.message?.toLowerCase().includes('internet') ||
          error.message?.toLowerCase().includes('connection') ||
          error.code === 'ERR_NETWORK' ||
          error.name === 'NetworkError' ||
          error.response?.status === 0 ||
          !navigator.onLine;
        
        if (isNetworkError && retryAttempt < 4 && mounted) {
          console.log(`[Orders] Will retry authentication... (${retryAttempt + 1}/4)`);
          const retryDelay = Math.min(3000 * Math.pow(1.5, retryAttempt), 15000);
          authTimeout = setTimeout(() => {
            if (mounted) {
              checkAuthAndLoadData(retryAttempt + 1);
            }
          }, retryDelay);
          return;
        }
        
        // Max retries reached
        console.error("[Orders] Max retries reached or non-network error");
        if (mounted) {
          setError(error.message || "Authentication failed");
          setAuthLoading(false);
        }
      }
    };

    if (mounted) {
      checkAuthAndLoadData();
    }
    
    return () => {
      mounted = false;
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
    };
  }, []);

  // Offline sync for orders
  useEffect(() => {
    if (!user) return;
    const processItem = async (item) => {
      const { action, payload, clientId } = item || {};
      if (action === 'create_or_update_order') {
        const draft = { ...(payload.orderData || {}), status: (payload.orderData?.status || 'draft') };
        if (payload.editingOrderId) {
          await base44.entities.Order.update(payload.editingOrderId, draft);
          setOrders(prev => prev.map(o => (o.id === payload.editingOrderId || o.id === clientId) ? { ...o, ...draft, __offline: false } : o));
        } else {
          const saved = await base44.entities.Order.create(draft);
          setOrders(prev => prev.map(o => (o.id === clientId) ? saved : o));
        }
      } else if (action === 'delete_order') {
        await base44.functions.invoke('deleteOrder', { orderId: payload.id });
        setOrders(prev => prev.filter(o => o.id !== payload.id));
      }
    };
    return offlineQueue.onOnline('orders', processItem);
  }, [user]);

  // Real-time sync for orders updated from the backend (e.g. automations)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        setOrders(prev => {
          const updated = prev.map(o => o.id === event.id ? { ...o, ...event.data } : o);
          const c = getCache('orders_v1');
          if (c?.data) setCache('orders_v1', { ...c.data, orders: updated });
          return updated;
        });
      }
    });
    return unsubscribe;
  }, [user]);

  // OS notification: orders left in draft for >24h (once per day)
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    try {
      const threshold = Date.now() - 24 * 60 * 60 * 1000;
      const staleDraft = orders.find(o => o.status === 'draft' && o.created_date && new Date(o.created_date).getTime() < threshold);
      if (staleDraft) {
        const key = 'notif_stale_draft_' + new Date().toISOString().slice(0,10);
        if (!localStorage.getItem(key)) {
          notifyOS({
            title: t('order_left_draft') || 'Order left as draft',
            body: `${t('order_number') || 'Order'} ${staleDraft.order_number || '—'} ${t('still_draft') || 'is still a draft after 24h'}`,
            tag: 'order-draft',
            url: createPageUrl('Orders')
          });
          localStorage.setItem(key, '1');
        }
      }
    } catch (_) {}
  }, [orders]);

  // Removed: 3-day no-order alert per user request
  // useEffect(() => {
  //   // Intentionally disabled to avoid showing blocking alerts
  // }, [orders, user, language]);

  const verifyDraftsNow = async () => {
    try {
      const { data } = await base44.functions.invoke('verifyDrafts', {});
      console.log('[verifyDrafts]', data);
      alert(`Drafts check for ${data.working_email}: Total ${data.merged_unique_count} (primary ${data.myDrafts_count}, fallback ${data.fallback_count})`);
    } catch (e) {
      console.log('[verifyDrafts] failed', e?.message || e);
      alert('Drafts check failed: ' + (e?.message || ''));
    }
  };

  const fixLatestDraft = async () => {
    try {
      const { data } = await base44.functions.invoke('markLatestDraftAsSent', {});
      if (data?.success) {
        alert(`Marked as sent: ${data.order?.order_number || ''}`);
      } else {
        alert('No draft found to fix');
      }
      await loadData(user);
    } catch (e) {
      alert('Fix failed: ' + (e?.message || ''));
    }
  };

  const handleManualRetry = () => {
    setError(null);
    setAuthLoading(true);
    setRetryCount(0);
    
    // Reload the entire page to ensure clean state
    window.location.reload();
  };

  const handleSubmit = async (orderData) => {
        if (isViewer) { return; }
        if (!orderData.restaurant_name) {
      alert(t('business_name_required'));
      return;
    }

    const workingEmail = user?.acting_as_store_email || user?.acting_as_user_email || user?.store_user_owner_email || user?.email;
    const enrichedOrderData = { ...orderData, store_owner_email: workingEmail, created_by: user?.email };

    // Offline: queue and update UI optimistically
    if (!navigator.onLine) {
      const clientId = 'temp-' + Date.now();
      const draftData = { ...enrichedOrderData, status: editingOrder?.status || 'draft' };
      offlineQueue.enqueue('orders', { action: 'create_or_update_order', payload: { orderData: draftData, editingOrderId: editingOrder?.id }, clientId });
      setShowForm(false);
      setEditingOrder(null);
      setOrders(prev => {
        if (editingOrder) {
          return prev.map(o => (o.id === editingOrder.id ? { ...o, ...draftData, __offline: true } : o));
        }
        return [{ ...draftData, id: clientId, __offline: true }, ...prev];
      });
      alert(t('saved_offline_will_sync') || 'Saved offline. Will sync automatically when back online.');
      return;
    }

    try {
      let savedOrder;
      if (editingOrder) {
        await base44.entities.Order.update(editingOrder.id, { ...enrichedOrderData, status: editingOrder.status || 'draft' });
        savedOrder = { ...editingOrder, ...enrichedOrderData, status: editingOrder.status || 'draft', id: editingOrder.id };
      } else {
        const draftData = { ...enrichedOrderData, status: 'draft' };
        savedOrder = await base44.entities.Order.create(draftData);
      }

      setShowForm(false);
      setEditingOrder(null);
      
      // Optimistic update so it's instantly available
      setOrders(prev => {
        const exists = prev.some(o => o.id === savedOrder.id);
        if (exists) return prev.map(o => o.id === savedOrder.id ? savedOrder : o);
        return [savedOrder, ...prev];
      });
      
      // Reload orders in background
      loadData(user, 0, true);
      
      setPreviewOrder(savedOrder);

    } catch (error) {
      console.error("Error saving order:", error);
      alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const handleSaveDraft = async (orderData) => {
    if (isViewer) { return; }
    const workingEmail = user?.acting_as_store_email || user?.acting_as_user_email || user?.store_user_owner_email || user?.email;
    const enrichedOrderData = { ...orderData, store_owner_email: workingEmail, created_by: user?.email };

    // Offline: queue draft save
    if (!navigator.onLine) {
      const clientId = 'temp-' + Date.now();
      const draft = { ...enrichedOrderData, status: 'draft' };
      offlineQueue.enqueue('orders', { action: 'create_or_update_order', payload: { orderData: draft, editingOrderId: editingOrder?.id }, clientId });
      setShowForm(false);
      setEditingOrder(null);
      setOrders(prev => {
        if (editingOrder) {
          return prev.map(o => (o.id === editingOrder.id ? { ...o, ...draft, __offline: true } : o));
        }
        return [{ ...draft, id: clientId, __offline: true }, ...prev];
      });
      return;
    }
    try {
      let savedOrder;
      if (editingOrder) {
        await base44.entities.Order.update(editingOrder.id, { ...enrichedOrderData, status: 'draft' });
        savedOrder = { ...editingOrder, ...enrichedOrderData, status: 'draft', id: editingOrder.id };
      } else {
        savedOrder = await base44.entities.Order.create({ ...enrichedOrderData, status: 'draft' });
      }
      setShowForm(false);
      setEditingOrder(null);
      setOrders(prev => {
        const exists = prev.some(o => o.id === savedOrder.id);
        if (exists) return prev.map(o => o.id === savedOrder.id ? savedOrder : o);
        return [savedOrder, ...prev];
      });
      loadData(user, 0, true);
    } catch (error) {
      console.error("Error saving draft:", error);
      alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const handleReceiveSubmit = async (receiptData) => {
    try {
      const cleanData = {
        ...receiptData,
        order_id: receiveOrder?.id || receiptData.order_id || null,
        order_number: receiveOrder?.order_number || receiptData.order_number || `INV-${Date.now()}`,
        supplier_name: receiveOrder?.supplier_name || receiptData.supplier_name || "Unknown",
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
        linked_receipt_id: receiptData.linked_receipt_id || ""
      };
      await base44.entities.SupplyReceipt.create(cleanData);

      const linkedOrderIds = [cleanData.order_id, ...(cleanData.linked_order_ids || [])].filter(Boolean);
      if (linkedOrderIds.length > 0) {
        await base44.functions.invoke('markOrdersDelivered', { orderIds: linkedOrderIds }).catch(() => {});
        setOrders(prev => prev.map(o => linkedOrderIds.includes(o.id) ? { ...o, status: 'delivered' } : o));
      }

      alert(t('receipt_saved_successfully'));
      setShowReceiveForm(false);
      setShowNoOrderReceiveForm(false);
      setReceiveOrder(null);
      await loadData(user);
    } catch (e) {
      console.error('Save receipt failed', e);
      alert((t('error_saving') || 'Error saving') + ': ' + (e?.message || e));
      throw e;
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleOpenPreview = (order) => {
    setPreviewOrder(order);
  };

  const handleResend = (order) => {
    handleOpenPreview(order);
  };

  const doEmailSend = async (order) => {
    try {
      if (!order) return;
      const num = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
      // Mark as sent via service-role so sub-users can update owner orders
      const { data } = await base44.functions.invoke('markOrderSent', {
        orderId: order.id,
        orderNumber: num
      });
      const updated = data?.order || {};

      // Optimistic UI update
      setOrders(prev => prev.map(o => {
        if (o.id !== (updated.id || order.id)) return o;
        const num = updated.order_number || o.order_number || `ORD-${(o.id || Date.now()).toString().slice(-8)}`;
        return { ...o, status: 'sent', order_number: num };
      }));

      // Fire-and-forget: email supplier (sendOrderEmail handles dedup + CC)
      try {
        base44.functions.invoke('sendOrderEmail', { orderId: updated.id || order.id, language })
          .then((res) => {
            if (res?.data?.success) {
              console.log('[Email] Order emailed (recipients merged, CC admin)');
            } else {
              console.warn('[Email] Failed to email order:', res?.data);
            }
          })
          .catch((err) => console.warn('[Email] Error emailing order:', err?.message || err));
      } catch (e) {
        console.warn('[Email] Skipped emailing supplier:', e?.message || e);
      }

      // Close preview and refresh list
      setPreviewOrder(null);
      await loadData(user);
    } catch (e) {
      console.error('Failed to send order:', e);
      alert((t('error_saving') || 'Error') + ': ' + (e?.message || ''));
    }
  };

  const handleSendNow = async (order) => {
    if (!order) return;

    // Open the window synchronously BEFORE any await to bypass Chrome's popup blocker
    const waWindow = window.open('', '_blank');

    // Send order via the explicit WhatsApp handler directly
    await sendOrderToWhatsApp(order, { forceImageShare: false, preOpenedWindow: waWindow });
    
    const ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
    
    // Always mark as sent and send email in the background (if supplier has email)
    base44.functions.invoke('markOrderSent', { orderId: order.id, orderNumber: ensuredNumber }).catch(() => {});
    
    const selectedSupplier = suppliers.find(s => s.name === order.supplier_name || s.id === order.supplier_id);
    if (selectedSupplier && selectedSupplier.email && selectedSupplier.email.trim() !== '') {
      base44.functions.invoke('sendOrderEmail', { orderId: order.id, language })
        .then(() => toast.success(language === 'he' ? 'ההזמנה נשלחה בהצלחה גם למייל של הספק!' : 'Order also sent to supplier email!'))
        .catch(() => {});
    }
    
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'sent', order_number: ensuredNumber } : o));

    setPreviewOrder(null);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // CRITICAL: DO NOT MODIFY THIS SHARE SHEET TEMPLATE WITHOUT EXPLICIT USER PERMISSION (CODE 2233)
  const sendOrderToWhatsApp = async (order, opts = {}) => {
    const ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
    const intro = language === 'he' ? `הזמנה חדשה ממסעדת "${order.restaurant_name || ''}"` : `You have received a new order from "${order.restaurant_name || ''}"`;
  const numLbl = safeT('order_number', 'מספר הזמנה', 'Order');
  
  // Format items for text
  const itemsText = (order.items || []).map(it => `• ${it.item_name || it.name || ''} - ${it.quantity} ${unitLabel(it.unit)}`).join('\n');
  
  const sentAtLbl = language === 'he' ? 'נשלח בתאריך' : 'Sent At';
  const sentAtVal = `${new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')} ${new Date().toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {hour: '2-digit', minute:'2-digit'})}`;
  const text = `${intro}\n\n*${numLbl}:* ${ensuredNumber}\n*${sentAtLbl}:* ${sentAtVal}\n\n*${safeT('items', 'פריטים', 'Items')}:*\n${itemsText}`;
    const isAndroid = /Android/i.test(navigator.userAgent || '') && !(/iPhone|iPad|iPod/i.test(navigator.userAgent || ''));
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    // No pre-opened tabs to avoid blockers/new-tab flashes
    const preOpened = null;

    // Normalize phone for WhatsApp (supports unsaved contacts)
    const rawPhone = String(order.supplier_phone || '').trim();
    const phone = (() => {
      if (!rawPhone) return '';
      let p = rawPhone.replace(/[^\d+]/g, '');
      if (p.startsWith('+')) p = p.slice(1);
      if (p.startsWith('00')) p = p.slice(2);
      if (p.startsWith('0')) p = '972' + p.slice(1);
      return p; // E.164 without '+' if possible
    })();

    const waWeb = phone
      ? `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    const apiUrl = phone
      ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    const deeplink = phone
      ? `whatsapp://send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`
      : `whatsapp://send?text=${encodeURIComponent(text)}`;
    const androidIntent = phone
      ? `intent://send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}#Intent;scheme=whatsapp;package=com.whatsapp;end`
      : `intent://send?text=${encodeURIComponent(text)}#Intent;scheme=whatsapp;package=com.whatsapp;end`;

    // Prepare a shareable JPG (skip on Android unless forced for image share); prefer pre-rendered file when available
    let file = (opts && opts.preparedFile) ? opts.preparedFile : null;
    if ((!isAndroid || (opts && opts.forceImageShare)) && !file) {
      const temp = document.createElement('div');
      temp.style.position = 'fixed';
      temp.style.left = '-9999px';
      temp.style.top = '0';
      temp.style.width = '800px';
      temp.style.background = 'white';
      temp.style.padding = '32px';
      temp.style.fontFamily = 'system-ui, sans-serif';
      temp.style.direction = (language === 'he' ? 'rtl' : 'ltr');
      temp.innerHTML = `
        <div style="background: linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:24px;border-radius:16px 16px 0 0;margin:-32px -32px 16px -32px;text-align:center;">
          <div style="font-size:24px;font-weight:800;">${t('order_preview') || 'Order'} #${ensuredNumber}</div>
          <div style="opacity:.9;margin-top:4px;">${t('supplier') || 'Supplier'}: ${order.supplier_name || ''}</div>
        </div>
        <div style="border:2px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0;">
          <div style="font-weight:700;color:#0f172a;margin-bottom:8px;">${t('order_from') || 'From'}: ${order.restaurant_name || ''}</div>
          ${order.restaurant_address ? `<div style=\"color:#334155\">${order.restaurant_address}</div>` : ''}
          ${order.delivery_date ? `<div style=\"margin-top:8px;color:#92400e;background:#fef3c7;padding:8px 12px;border-radius:8px;display:inline-block;\">${t('delivery_date') || 'Delivery'}: ${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</div>` : ''}
          <div style="margin-top:8px;color:#334155;display:block;">${language === 'he' ? 'נשלח בתאריך:' : 'Sent At:'} <span dir="ltr">${new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')} ${new Date().toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {hour: '2-digit', minute:'2-digit'})}</span></div>
        </div>
        <div style="border:2px solid #22c55e;border-radius:12px;padding:16px;margin:12px 0;">
          <div style="font-weight:800;color:#166534;margin-bottom:8px;">${t('items') || 'Items'}</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:${language==='he'?'right':'left'}">#</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('item') || 'Item'}</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('quantity') || 'Qty'}</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('unit') || 'Unit'}</th></tr></thead>
            <tbody>
              ${(order.items || []).map((it,i)=>`<tr style=\"background:${i%2===0?'#fff':'#f9fafb'}\"><td style=\"padding:8px;border-bottom:1px solid #e5e7eb\">${i+1}</td><td style=\"padding:8px;border-bottom:1px solid #e5e7eb\">${it.item_name||it.name||''}${it.catalog_number ? `<br/><span style="font-size:12px;color:#6b7280;font-weight:normal;">${language==='he'?'מק"ט:':'SKU:'} ${it.catalog_number}</span>` : ''}</td><td style=\"padding:8px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#059669\">${it.quantity||''}</td><td style=\"padding:8px;border-bottom:1px solid #e5e7eb\">${unitLabel(it.unit||'')}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

      `;
      document.body.appendChild(temp);
      try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(temp, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) file = new File([blob], `order-${ensuredNumber}.png`, { type: 'image/png' });
      } catch (e) {
        console.warn('[WhatsApp Share] Failed to render image, will proceed with text only:', e?.message || e);
      } finally {
        try { document.body.removeChild(temp); } catch {}
      }
    }

    // 1) Use system share ONLY when explicitly forcing image share (e.g. Android pre-rendered image)
    if (opts && opts.forceImageShare && navigator.share) {
      const canShareFiles = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
      if (canShareFiles) {
        try {
          await navigator.share({ files: [file], text, title: `You have received a new order from "${order.restaurant_name || ''}"` });
          return;
        } catch (e) {
          console.warn('[WA Image Share] Share failed, falling back:', e?.name || e);
          if (e.name !== 'AbortError') {
            try { await navigator.share({ text }); return; } catch (e2) {}
          } else {
            return;
          }
        }
      } else {
        try { await navigator.share({ text }); return; } catch (e2) {}
      }
    }

    // 2) Best-effort: copy image OR text to clipboard (Web/App)
    let copiedImage = false;
    let copiedText = false;
    // Some Android WebViews require a user gesture; this runs right after a button click
    if (file && navigator.clipboard && 'write' in navigator.clipboard) {
      try {
        // @ts-ignore ClipboardItem may not be typed in some environments
        await navigator.clipboard.write([new ClipboardItem({ [file.type]: file })]);
        copiedImage = true;
      } catch (_) {}
    }
    if (!copiedImage && navigator.clipboard && 'writeText' in navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        copiedText = true;
      } catch (_) {}
    }
    
    // Alert user on desktop if copied successfully
    if (copiedImage && !isAndroid && !isIOS) {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent);
      const pasteKey = isMac ? 'Cmd+V' : 'Ctrl+V';
      alert(language === 'he' 
        ? `התמונה הועתקה! וואטסאפ ייפתח כעת, פשוט לחץ ${pasteKey} בתוך הצ'אט כדי להדביק ולשלוח.` 
        : `Image copied! WhatsApp will open now, just press ${pasteKey} in the chat to paste and send.`);
    }

    // 3) Open WhatsApp app first, fall back to WhatsApp Web (works for unsaved numbers via wa.me)
    if (opts && opts.preOpenedWindow && !opts.preOpenedWindow.closed) {
      opts.preOpenedWindow.location.href = waWeb;
    } else if (isAndroid || isIOS) {
      // Fallback: use location.href for reliable mobile intents if no preOpenedWindow
      window.location.href = waWeb;
    } else {
      window.open(waWeb, '_blank', 'noopener,noreferrer');
    }


  };

  const handleConfirmSendEmail = async () => {
    if (!sendOptionOrder) return;
    const order = sendOptionOrder;
    setShowSendOptions(false);
    await doEmailSend(order);
    setSendOptionOrder(null);
  };

  const handleConfirmSendWhatsApp = async () => {
  if (!sendOptionOrder) return;
  const order = sendOptionOrder;
  setShowSendOptions(false);

  // Open the window synchronously BEFORE any await to bypass Chrome's popup blocker
  const waWindow = window.open('', '_blank');

  // Fallback: proceed to WhatsApp and update UI optimistically.
  setOrders(prev => prev.map(o => {
    if (o.id !== order.id) return o;
    const num = order.order_number || `ORD-${(o.id || Date.now()).toString().slice(-8)}`;
    return { ...o, status: 'sent', order_number: num };
  }));
  try { await sendOrderToWhatsApp(order, { preOpenedWindow: waWindow }); } catch (_) { if (waWindow) waWindow.close(); }
  setPreviewOrder(null);
  // Optionally retry in background without blocking UX
  setTimeout(() => {
    base44.functions.invoke('markOrderSent', { orderId: order.id, orderNumber: order.order_number })
      .catch(() => {});
      
    // Send email automatically
    const selectedSupplier = suppliers.find(s => s.name === order.supplier_name || s.id === order.supplier_id);
    if (selectedSupplier && selectedSupplier.email && selectedSupplier.email.trim() !== '') {
      base44.functions.invoke('sendOrderEmail', { orderId: order.id, language })
        .then(() => toast.success(language === 'he' ? 'ההזמנה נשלחה בהצלחה גם למייל של הספק!' : 'Order also sent to supplier email!'))
        .catch(() => {});
    }
  }, 1200);

  setSendOptionOrder(null);
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

    const handleConfirmSendStoreNext = async () => {
      if (!sendOptionOrder) return;
      const order = sendOptionOrder;
      setShowSendOptions(false);
      
      try {
        const { data } = await base44.functions.invoke('exportStoreNextXML', { orderId: order.id });
        if (data?.success && data?.xml) {
          // Download XML
          const blob = new Blob([data.xml], { type: 'application/xml' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `StoreNext_Order_${order.order_number || order.id}.xml`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          
          // Mark as sent
          base44.functions.invoke('markOrderSent', { orderId: order.id, orderNumber: order.order_number }).catch(() => {});
          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'sent' } : o));
          alert(language === 'he' ? 'קובץ ה-XML עבור StoreNext הורד בהצלחה. יש לטעון אותו במערכת StoreNext.' : 'StoreNext XML downloaded successfully. Please upload it to StoreNext.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          alert(language === 'he' ? 'שגיאה ביצירת קובץ StoreNext' : 'Error generating StoreNext file');
        }
      } catch (e) {
        alert((language === 'he' ? 'שגיאה: ' : 'Error: ') + (e?.message || ''));
      }
      setSendOptionOrder(null);
    };



  const handleDelete = async (order) => {
    if (isViewer) return;
    
    if (order.status !== 'draft') {
      const promptText = language === 'he' ? `הקלד "מחיקה" כדי לאשר את מחיקת ההזמנה ${order.order_number || '—'}` : `Type DELETE to confirm deletion of order ${order.order_number || '—'}`;
      const input = window.prompt(promptText);
      if (!input || (input.trim().toLowerCase() !== 'delete' && input.trim() !== 'מחיקה')) return;
    } else {
      const confirmText = language === 'he' ? 'האם אתה בטוח שברצונך למחוק את הטיוטה?' : 'Are you sure you want to delete this draft?';
      if (!window.confirm(confirmText)) return;
    }

    // Offline: queue delete and update UI
    if (!navigator.onLine) {
      offlineQueue.enqueue('orders', { action: 'delete_order', payload: { id: order.id } });
      setOrders(prev => prev.filter(o => o.id !== order.id));
      return;
    }
    try {
      await base44.entities.Order.delete(order.id);
      await loadData(user);
    } catch (error) {
      console.error('Error deleting order:', error);
      alert((t('error_saving') || 'Error') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const filteredOrders = orders.filter(order => {
        if (order.status === 'delivered' && statusFilter !== 'history') return false; // Hide received orders from Orders page
        
        const matchesSearch = (order.supplier_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
          (order.order_number || '').toLowerCase().includes((searchTerm || '').toLowerCase());
        const matchesStatus = statusFilter === "history" || order.status === statusFilter;
        const matchesSupplier = supplierFilter === "all" || ((order.supplier_name || '').toLowerCase().includes(supplierFilter.toLowerCase()));

        const dateStr = order.delivery_date || order.created_date || order.updated_date;
        const ds = dateStr ? new Date(dateStr) : null;
        let dsStr = '';
        if (ds && !isNaN(ds)) {
          const y = ds.getFullYear();
          const m = String(ds.getMonth() + 1).padStart(2, '0');
          const d = String(ds.getDate()).padStart(2, '0');
          dsStr = `${y}-${m}-${d}`;
        }
        const afterStart = !dateStart || (dsStr && dsStr >= dateStart);
        const beforeEnd = !dateEnd || (dsStr && dsStr <= dateEnd);
        const matchesDate = afterStart && beforeEnd;

        return matchesSearch && matchesStatus && matchesSupplier && matchesDate;
      });

  const sortedOrders = useMemo(() => {
    let sorted = [...filteredOrders];
    if (sortBy === 'supplier_asc') {
      sorted.sort((a, b) => (a.supplier_name || '').localeCompare(b.supplier_name || ''));
    } else if (sortBy === 'supplier_desc') {
      sorted.sort((a, b) => (b.supplier_name || '').localeCompare(a.supplier_name || ''));
    } else if (sortBy === 'cost_asc') {
      sorted.sort((a, b) => (a.total_cost || 0) - (b.total_cost || 0));
    } else if (sortBy === 'cost_desc') {
      sorted.sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0));
    } else if (sortBy === 'status_asc') {
      sorted.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    } else if (sortBy === 'status_desc') {
      sorted.sort((a, b) => (b.status || '').localeCompare(a.status || ''));
    }
    return sorted;
  }, [filteredOrders, sortBy]);











  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-gray-600" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
          {retryCount > 0 && (
            <p className="text-sm text-orange-600">
              {t('retrying') || 'מנסה שוב'} ({retryCount}/4)
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <NetworkErrorHandler 
        onRetry={handleManualRetry} 
        errorMessage={error}
      />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 2xl:p-12"
      onTouchStart={(e) => { if (window.scrollY <= 0) { startYRef.current = e.touches[0].clientY; setPullDist(0); } }}
      onTouchMove={(e) => { if (window.scrollY <= 0 && startYRef.current) { const d = e.touches[0].clientY - startYRef.current; setPullDist(d > 0 ? Math.min(d, 120) : 0); } }}
      onTouchEnd={async () => { if (pullDist > 70 && !refreshing) { setRefreshing(true); await loadData(user || (await base44.auth.me())); setTimeout(()=>{ setRefreshing(false); setPullDist(0); }, 300); } else { setPullDist(0); } startYRef.current = 0; }}
    >
      <div className="w-full">
        {/* Native-style Pull to Refresh Indicator */}
        <div 
          className="md:hidden fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-transform" 
          style={{ transform: `translateY(${refreshing ? 60 : pullDist - 40}px)`, opacity: pullDist > 10 || refreshing ? 1 : 0 }}
        >
          <div className="bg-white rounded-full shadow-lg h-10 w-10 flex items-center justify-center border border-gray-100">
            <Loader className={`w-5 h-5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} style={{ transform: !refreshing ? `rotate(${pullDist * 2}deg)` : 'none' }} />
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-[#1a1f36] tracking-tight">{safeT('orders_title', 'ניהול הזמנות', 'Orders Management')}</h1>
            <p className="text-gray-500 mt-2 text-lg">
              {language === 'he' ? `שלום ${user.acting_as_user_name || user.full_name}, צור ושלח הזמנות לספקים שלך` : `Hello ${user.acting_as_user_name || user.full_name}, create and send orders to your suppliers`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isViewer && (
              <>
                <Button
                  onClick={() => setShowNoOrderReceiveForm(true)}
                  variant="outline"
                  className="hidden md:inline-flex border-[#d4a373] text-[#d4a373] hover:bg-[#d4a373] hover:text-white h-12 px-6 rounded-2xl shadow-sm text-base font-bold transition-all"
                >
                  <PackageCheck className="w-5 h-5 ml-2 rtl:ml-2 rtl:mr-0" />
                  {safeT('receive_no_order', 'קבלת אספקה ללא הזמנה', 'Receive without order')}
                </Button>
                <Button
                  onClick={() => setShowForm(!showForm)}
                  className="hidden md:inline-flex bg-[#d4a373] hover:bg-[#b88c60] text-white h-12 px-6 rounded-2xl shadow-sm text-base font-bold transition-all hover:scale-105"
                >
                  <Plus className="w-5 h-5 ml-2 rtl:ml-2 rtl:mr-0" />
                  {safeT('new_order', 'הזמנה חדשה', 'New Order')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile No Order Receive and Filter */}
        <div className="md:hidden mb-4 flex gap-2">
          {!isViewer && (
            <Button
              onClick={() => setShowNoOrderReceiveForm(true)}
              className="flex-1 bg-[#d4a373] hover:bg-[#b88c60] text-white h-11 rounded-xl shadow-sm text-sm font-bold px-2"
            >
              <PackageCheck className="w-4 h-4 ml-1.5 rtl:ml-1.5 rtl:mr-0 flex-shrink-0" />
              <span className="truncate">{safeT('receive_no_order', 'קבלת אספקה ללא הזמנה', 'Receive without order')}</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            className={`h-11 border-gray-200 shadow-sm rounded-xl ${isViewer ? 'flex-1' : 'w-11 p-0 flex-shrink-0 bg-white'}`}
          >
            <CalendarIcon className={`w-4 h-4 text-gray-700 ${isViewer ? 'ml-2 rtl:ml-2 rtl:mr-0' : ''}`} />
            {isViewer && safeT('filter_by_date', 'סינון לפי תאריך', 'Filter by Date')}
          </Button>
        </div>

        {/* Mobile quick filters */}
        <div className="md:hidden mb-4 flex flex-col gap-2">
          <div className="relative w-full">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 rtl:right-auto rtl:left-3" />
            <Input
              placeholder={safeT('search_orders', 'חיפוש ספק או הזמנה...', 'Search...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pr-9 rtl:pr-3 rtl:pl-9 text-sm rounded-xl bg-white border-gray-200 shadow-sm focus-visible:ring-gray-300 w-full"
            />
          </div>
          <div className="flex gap-2 w-full justify-between">
            {['history','draft','sent'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-colors ${statusFilter===s ? 'bg-[#d4a373] text-white border-[#d4a373]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                {s==='history' ? safeT('order_history','היסטוריית הזמנות','Order History') :
                 s==='draft' ? t('status_draft') :
                 t('status_sent')}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
            {showForm && !isViewer && (
              <OrderForm
              order={editingOrder}
              suppliers={suppliers}
              onSubmit={handleSubmit}
              onSaveDraft={handleSaveDraft}
              onCancel={() => {
                setShowForm(false);
                setEditingOrder(null);
              }}
            />
            )}
            </AnimatePresence>

            <Dialog open={showReceiveForm} onOpenChange={(open) => { if (!open) { setShowReceiveForm(false); setReceiveOrder(null); } }}>
              <DialogContent className="max-w-3xl md:max-w-4xl w-[96vw] max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="sr-only">
                  <DialogTitle>Receive / Scan</DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                {receiveOrder && (
                  <div className="overflow-y-auto p-1">
                    <ReceiveSupplyForm
                      order={receiveOrder}
                      receipt={null}
                      suppliers={suppliers}
                      noOrderMode={false}
                      onSubmit={handleReceiveSubmit}
                      onCancel={() => { setShowReceiveForm(false); setReceiveOrder(null); }}
                      autoOpenUpload={true}
                    />
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={showNoOrderReceiveForm} onOpenChange={setShowNoOrderReceiveForm}>
              <DialogContent className="max-w-3xl md:max-w-4xl w-[96vw] max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="sr-only">
                  <DialogTitle>Receive / Scan Without Order</DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto p-1">
                  <ReceiveSupplyForm
                    order={null}
                    receipt={null}
                    suppliers={suppliers}
                    noOrderMode={true}
                    onSubmit={handleReceiveSubmit}
                    onCancel={() => setShowNoOrderReceiveForm(false)}
                    autoOpenUpload={true}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <div className="hidden md:flex flex-wrap items-center gap-3 mb-8">
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
                      setDateStart(s.toISOString().slice(0,10));
                      setDateEnd(e.toISOString().slice(0,10));
                    } else if (v === 'month') {
                      const s = new Date(now.getFullYear(), now.getMonth(), 1);
                      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      setDateStart(s.toISOString().slice(0,10));
                      setDateEnd(e.toISOString().slice(0,10));
                    } else if (v === 'year') {
                      const s = new Date(now.getFullYear(), 0, 1);
                      const e = new Date(now.getFullYear(), 11, 31);
                      setDateStart(s.toISOString().slice(0,10));
                      setDateEnd(e.toISOString().slice(0,10));
                    } else if (v === 'last_year') {
                      const s = new Date(now.getFullYear() - 1, 0, 1);
                      const e = new Date(now.getFullYear() - 1, 11, 31);
                      setDateStart(s.toISOString().slice(0,10));
                      setDateEnd(e.toISOString().slice(0,10));
                    } else if (v === 'all') {
                      setDateStart("");
                      setDateEnd("");
                    } else if (v === 'custom') {
                      // Keep current dateStart and dateEnd
                    }
                  }}
                >
                  <SelectTrigger className={`h-10 border-transparent shadow-none w-auto min-w-[120px] transition-colors rounded-xl ${datePreset !== 'custom' ? 'bg-white font-bold shadow-sm text-gray-900' : 'bg-transparent text-gray-600 font-medium hover:bg-gray-50'}`}>
                    <SelectValue placeholder={safeT('timeframe','תאריכים','Dates')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-gray-100">
                    <SelectItem value="all" className="rounded-lg">{safeT('all_time','כל הזמן','All time')}</SelectItem>
                    <SelectItem value="week" className="rounded-lg">{safeT('current_week','השבוע','This week')}</SelectItem>
                    <SelectItem value="month" className="rounded-lg">{safeT('current_month','החודש','This month')}</SelectItem>
                    <SelectItem value="year" className="rounded-lg">{safeT('current_year','מתחילת השנה','Year to date')}</SelectItem>
                    <SelectItem value="last_year" className="rounded-lg">{safeT('last_year','שנה שעברה','Last year')}</SelectItem>
                    <SelectItem value="custom" className="rounded-lg">{safeT('custom_range','מותאם אישית','Custom range')}</SelectItem>
                  </SelectContent>
                </Select>

                {datePreset === 'custom' && (
                  <div className="flex items-center gap-1.5 px-2 ml-1 border-l border-gray-200 rtl:border-l-0 rtl:border-r rtl:mr-1 animate-in fade-in zoom-in duration-200 flex-shrink-0">
                    <Input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="h-10 w-[135px] px-2 text-sm bg-white border-gray-200 shadow-sm rounded-xl flex-shrink-0"
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="h-10 w-[135px] px-2 text-sm bg-white border-gray-200 shadow-sm rounded-xl flex-shrink-0"
                    />
                  </div>
                )}
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 w-auto min-w-[150px] rounded-2xl bg-white border-gray-200 text-gray-700 shadow-sm font-medium hover:bg-gray-50 transition-colors">
                  <SelectValue placeholder={safeT('order_status', 'סטטוס הזמנה', 'Order status')} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-lg border-gray-100">
                  <SelectItem value="history" className="rounded-xl font-medium">{safeT('order_history','היסטוריית הזמנות','Order History')}</SelectItem>
                  <SelectItem value="draft" className="rounded-xl">{t('status_draft')}</SelectItem>
                  <SelectItem value="sent" className="rounded-xl">{t('status_sent')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative ml-auto rtl:ml-0 rtl:mr-auto min-w-[240px]">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 rtl:right-auto rtl:left-4" />
                <Input
                  placeholder={safeT('search_orders', 'חיפוש ספק או הזמנה...', 'Search...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-11 rtl:pr-4 rtl:pl-11 h-12 text-base rounded-2xl bg-white border-gray-200 shadow-sm focus-visible:ring-gray-300"
                />
              </div>
            </div>


        {/* Mobile View */}
        {!showForm && (
        <div className="md:hidden space-y-4 pb-24">
          {loading ? (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-2" />
              <p className="text-gray-600">{t('loading')}</p>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {t('no_orders_to_display')}
            </div>
          ) : statusFilter === 'history' ? (
            <div className="mb-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {sortedOrders.map((order) => {
                  const statusColors = {
                    sent: "bg-white text-gray-900 border-gray-200 shadow-sm",
                    draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
                    delivered: "bg-green-50 text-green-700 border-green-200 shadow-sm"
                  };

                  const statusLabels = {
                    sent: t('status_sent'),
                    draft: t('status_draft'),
                    delivered: safeT('status_delivered', 'סופק', 'Delivered')
                  };

                  return (
                    <div 
                      key={order.id} 
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => { if (!isViewer && order.status === 'draft') handleEdit(order); else handleOpenPreview(order); }}
                    >
                      {/* Right side (RTL) - Supplier & Cost */}
                      <div className="flex flex-col flex-1 min-w-0 pr-1">
                        <span className="font-bold text-gray-900 text-sm truncate">{order.supplier_name}</span>
                        <span className="text-sm font-bold text-green-600 mt-0.5">₪{(order.total_cost || 0).toFixed(2)}</span>
                      </div>

                      {/* Center - Status/Action */}
                      <div className="flex flex-col items-center flex-shrink-0 px-2">
                        {!isViewer && order.status === 'sent' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setReceiveOrder(order); setShowReceiveForm(true); }}
                            className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 rounded-full h-8 px-3 text-xs shadow-none"
                          >
                            <PackageCheck className="w-3 h-3 rtl:ml-1 ltr:mr-1" />
                            {safeT('receive_scan', 'קלוט', 'Receive')}
                          </Button>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[order.status]}`}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        )}
                      </div>

                      {/* Left side (RTL) - Date & Actions */}
                      <div className="flex flex-col items-end flex-shrink-0 min-w-[80px]">
                        <span className="text-[10px] text-gray-400 mb-0.5 whitespace-nowrap">
                          {language === 'he' ? 'הוזמן:' : 'Ordered:'} {order.created_date ? new Date(order.created_date).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit', year:'2-digit'}) : '-'}
                        </span>
                        <span className="text-xs text-gray-500 mb-1 font-medium whitespace-nowrap">
                          {language === 'he' ? 'לאספקה:' : 'Delivery:'} {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit', year:'2-digit'}) : '-'}
                        </span>
                        <div className="flex items-center -mr-2 rtl:-ml-2 rtl:mr-0">
                          {!isViewer && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleResend(order); }}
                              className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-full"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          {!isViewer && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleDelete(order); }}
                              className="h-8 w-8 text-gray-400 hover:text-red-600 rounded-full"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            ['today', 'future', 'past', 'draft'].map(section => {
              const todayStr = new Date().toISOString().split('T')[0];
              const sectionOrders = sortedOrders.filter(o => {
                if (section === 'draft') return o.status === 'draft';
                if (o.status !== 'sent' && o.status !== 'delivered') return false;
                const dateStr = o.delivery_date ? new Date(o.delivery_date).toISOString().split('T')[0] : '';
                if (section === 'today') return dateStr === todayStr;
                if (section === 'future') return dateStr > todayStr;
                if (section === 'past') return dateStr && dateStr < todayStr;
                return false;
              });

              if (sectionOrders.length === 0) return null;
              
              const sectionTitle = section === 'today' ? (language === 'he' ? 'הזמנות להיום' : 'Today') :
                                   section === 'future' ? (language === 'he' ? 'הזמנות עתידיות' : 'Future') :
                                   section === 'past' ? (language === 'he' ? 'הזמנות שלא נקלטו' : 'Past due') :
                                   (language === 'he' ? 'הזמנות בטיוטה' : 'Drafts');

              return (
                <div key={section} className="mb-6">
                  <h3 className="font-bold text-gray-700 mb-2 px-2 text-sm">{sectionTitle} ({sectionOrders.length})</h3>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {sectionOrders.map((order) => {
                      const statusColors = {
                        sent: "bg-white text-gray-900 border-gray-200 shadow-sm",
                        draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
                        delivered: "bg-green-50 text-green-700 border-green-200 shadow-sm"
                      };

                      const statusLabels = {
                        sent: t('status_sent'),
                        draft: t('status_draft'),
                        delivered: safeT('status_delivered', 'סופק', 'Delivered')
                      };

                      return (
                        <div 
                          key={order.id} 
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => { if (!isViewer && order.status === 'draft') handleEdit(order); else handleOpenPreview(order); }}
                        >
                          {/* Right side (RTL) - Supplier & Cost */}
                          <div className="flex flex-col flex-1 min-w-0 pr-1">
                            <span className="font-bold text-gray-900 text-sm truncate">{order.supplier_name}</span>
                            <span className="text-sm font-bold text-green-600 mt-0.5">₪{(order.total_cost || 0).toFixed(2)}</span>
                          </div>

                          {/* Center - Status/Action */}
                          <div className="flex flex-col items-center flex-shrink-0 px-2">
                            {!isViewer && order.status === 'sent' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setReceiveOrder(order); setShowReceiveForm(true); }}
                                className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 rounded-full h-8 px-3 text-xs shadow-none"
                              >
                                <PackageCheck className="w-3 h-3 rtl:ml-1 ltr:mr-1" />
                                {safeT('receive_scan', 'קלוט', 'Receive')}
                              </Button>
                            ) : (
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[order.status]}`}>
                                {statusLabels[order.status] || order.status}
                              </span>
                            )}
                          </div>

                          {/* Left side (RTL) - Date & Actions */}
                          <div className="flex flex-col items-end flex-shrink-0 min-w-[80px]">
                            <span className="text-[10px] text-gray-400 mb-0.5 whitespace-nowrap">
                              {language === 'he' ? 'הוזמן:' : 'Ordered:'} {order.created_date ? new Date(order.created_date).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit', year:'2-digit'}) : '-'}
                            </span>
                            <span className="text-xs text-gray-500 mb-1 font-medium whitespace-nowrap">
                              {language === 'he' ? 'לאספקה:' : 'Delivery:'} {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit', year:'2-digit'}) : '-'}
                            </span>
                            <div className="flex items-center -mr-2 rtl:-ml-2 rtl:mr-0">
                              {!isViewer && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => { e.stopPropagation(); handleResend(order); }}
                                  className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-full"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              )}
                              {!isViewer && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(order); }}
                                  className="h-8 w-8 text-gray-400 hover:text-red-600 rounded-full"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}

        {/* Mobile Filters Dialog */}
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogContent className="w-[92vw] max-w-md rounded-3xl p-0 overflow-hidden">
            <DialogHeader className="p-5 pb-4 border-b border-gray-100 bg-gray-50/50">
              <DialogTitle className="text-xl font-bold">{safeT('filter_by_date', 'סינון לפי תאריך', 'Filter by Date')}</DialogTitle>
            </DialogHeader>
            <div className="p-5 space-y-5">
              <div className="flex flex-col gap-3">
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
                      setDateStart(s.toISOString().slice(0,10));
                      setDateEnd(e.toISOString().slice(0,10));
                    } else if (v === 'month') {
                      const s = new Date(now.getFullYear(), now.getMonth(), 1);
                      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      setDateStart(s.toISOString().slice(0,10));
                      setDateEnd(e.toISOString().slice(0,10));
                    } else if (v === 'year') {
                      const s = new Date(now.getFullYear(), 0, 1);
                      const e = new Date(now.getFullYear(), 11, 31);
                      setDateStart(s.toISOString().slice(0,10));
                      setDateEnd(e.toISOString().slice(0,10));
                    } else if (v === 'last_year') {
                      const s = new Date(now.getFullYear() - 1, 0, 1);
                      const e = new Date(now.getFullYear() - 1, 11, 31);
                      setDateStart(s.toISOString().slice(0,10));
                      setDateEnd(e.toISOString().slice(0,10));
                    } else if (v === 'all') {
                      setDateStart("");
                      setDateEnd("");
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-lg">
                    <SelectValue placeholder={safeT('timeframe','תאריכים','Dates')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{safeT('all_time','כל הזמן','All time')}</SelectItem>
                    <SelectItem value="week">{safeT('current_week','השבוע','This week')}</SelectItem>
                    <SelectItem value="month">{safeT('current_month','החודש','This month')}</SelectItem>
                    <SelectItem value="year">{safeT('current_year','מתחילת השנה','Year to date')}</SelectItem>
                    <SelectItem value="last_year">{safeT('last_year','שנה שעברה','Last year')}</SelectItem>
                    <SelectItem value="custom">{safeT('custom_range','מותאם אישית','Custom range')}</SelectItem>
                  </SelectContent>
                </Select>

                {datePreset === 'custom' && (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <Input type="date" lang={language === 'he' ? 'he-IL' : undefined} value={dateStart} onChange={(e)=>setDateStart(e.target.value)} onPointerDown={(e)=>e.stopPropagation()} onClick={(e)=>e.stopPropagation()} className="h-11 rounded-lg flex-1" />
                    <span className="text-gray-500">–</span>
                    <Input type="date" lang={language === 'he' ? 'he-IL' : undefined} value={dateEnd} onChange={(e)=>setDateEnd(e.target.value)} onPointerDown={(e)=>e.stopPropagation()} onClick={(e)=>e.stopPropagation()} className="h-11 rounded-lg flex-1" />
                  </div>
                )}
              </div>
              <Button onClick={() => setFiltersOpen(false)} className="w-full h-12 text-base font-bold bg-[#d4a373] hover:bg-[#b88c60] text-white rounded-xl shadow-sm mt-4">{safeT('apply', 'החל', 'Apply')}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Desktop View */}
        {!showForm && (
        <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-gray-100 relative" dir={isRTL ? "rtl" : "ltr"}>
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-3xl" dir={isRTL ? "rtl" : "ltr"}>
            <table className="w-full relative" dir={isRTL ? "rtl" : "ltr"}>
              <thead className="bg-transparent border-b border-gray-100 sticky top-0 z-20">
                <tr>
                  <th className="px-6 py-5 text-left rtl:text-right text-sm font-bold text-gray-800 sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-start gap-1.5 cursor-pointer hover:text-black" onClick={() => setSortBy(sortBy === 'supplier_asc' ? 'supplier_desc' : 'supplier_asc')}>
                      {safeT('supplier','ספק','Supplier')}
                      <span className={`text-xs ${sortBy.startsWith('supplier') ? 'text-gray-900' : 'text-gray-400'}`}>
                        {sortBy === 'supplier_asc' ? '↑' : '↓'}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-5 text-left rtl:text-right text-sm font-bold text-gray-800 sticky top-0 bg-white z-10">
                    {safeT('created_date','תאריך הזמנה','Order date')}
                  </th>
                  <th className="px-6 py-5 text-left rtl:text-right text-sm font-bold text-gray-800 sticky top-0 bg-white z-10">
                    {safeT('delivery_date','תאריך אספקה','Delivery date')}
                  </th>
                  <th className="px-6 py-5 text-left rtl:text-right text-sm font-bold text-gray-800 sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-start gap-1.5 cursor-pointer hover:text-black" onClick={() => setSortBy(sortBy === 'cost_asc' ? 'cost_desc' : 'cost_asc')}>
                      {safeT('total_cost','עלות כוללת','Total cost')}
                      <span className={`text-xs ${sortBy.startsWith('cost') ? 'text-gray-900' : 'text-gray-400'}`}>
                        {sortBy === 'cost_asc' ? '↑' : '↓'}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-5 text-left rtl:text-right text-sm font-bold text-gray-800 sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-start gap-1.5 cursor-pointer hover:text-black" onClick={() => setSortBy(sortBy === 'status_asc' ? 'status_desc' : 'status_asc')}>
                      {safeT('status','סטטוס','Status')}
                      <span className={`text-xs ${sortBy.startsWith('status') ? 'text-gray-900' : 'text-gray-400'}`}>
                        {sortBy === 'status_asc' ? '↑' : '↓'}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-5 text-right rtl:text-left text-sm font-bold text-gray-800 sticky top-0 bg-white z-10">
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                <AnimatePresence>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <Loader className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-600">{t('loading')}</p>
                      </td>
                    </tr>
                  ) : statusFilter === 'history' ? (
                    <React.Fragment>
                      {sortedOrders.map((order) => {
                        const statusColors = {
                          sent: "bg-blue-50 text-blue-600",
                          draft: "bg-gray-100 text-gray-600"
                        };
    
                        const statusLabels = {
                          sent: t('status_sent'),
                          draft: t('status_draft'),
                          delivered: safeT('status_delivered', 'סופק', 'Delivered')
                        };

                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => { if (!isViewer && order.status === 'draft') handleEdit(order); else handleOpenPreview(order); }}
                          >
                      <td className="px-6 py-5 text-left rtl:text-right align-middle">
                        <div className="flex items-center gap-2">
                          <div className="text-base font-bold text-gray-900">{order.supplier_name}</div>
                          {!isViewer && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleResend(order); }}
                              className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-full"
                              title={safeT('send','שלח','Send')}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {order.restaurant_name && (
                          <div className="text-sm text-gray-400 mt-1">{order.restaurant_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-left rtl:text-right text-base text-gray-600 align-middle">
                        {order.created_date ? new Date(order.created_date).toLocaleDateString('he-IL') : '-'}
                      </td>
                      <td className="px-6 py-5 text-left rtl:text-right text-base text-gray-600 align-middle">
                        {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('he-IL') : '-'}
                      </td>
                      <td className="px-6 py-5 text-left rtl:text-right text-base font-bold text-gray-900 align-middle">
                        ₪{(order.total_cost || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-5 text-left rtl:text-right align-middle">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border border-gray-200 shadow-sm ${order.status === 'sent' ? 'text-gray-900 bg-white' : order.status === 'delivered' ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-700 bg-white'}`}>
                            {statusLabels[order.status] || order.status}
                            {order.status === 'draft' && <span className="ml-2 rtl:mr-2 rtl:ml-0">✓</span>}
                          </span>
                          {!isViewer && order.status === 'sent' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setReceiveOrder(order); setShowReceiveForm(true); }}
                              className="h-8 px-4 text-sm bg-green-50/50 border-green-200 text-green-700 hover:bg-green-100 rounded-full shadow-sm"
                            >
                              <PackageCheck className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                              {safeT('receive_scan', 'קלוט סחורה', 'Receive/Scan')}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right rtl:text-left align-middle">
                        <div className="flex items-center justify-end gap-2 pointer-events-auto">
                          {!isViewer && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleDelete(order); }}
                                className="h-9 w-9 text-gray-400 hover:text-red-600 rounded-xl"
                                title={safeT('delete','מחק','Delete')}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                        );
                      })}
                    </React.Fragment>
                  ) : ['today', 'future', 'past', 'draft'].map(section => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const sectionOrders = sortedOrders.filter(o => {
                      if (section === 'draft') return o.status === 'draft';
                      if (o.status !== 'sent' && o.status !== 'delivered') return false;
                      const dateStr = o.delivery_date ? new Date(o.delivery_date).toISOString().split('T')[0] : '';
                      if (section === 'today') return dateStr === todayStr;
                      if (section === 'future') return dateStr > todayStr;
                      if (section === 'past') return dateStr && dateStr < todayStr;
                      return false;
                    });
      
                    if (sectionOrders.length === 0) return null;
                    
                    const sectionTitle = section === 'today' ? (language === 'he' ? 'הזמנות להיום' : 'Today') :
                                         section === 'future' ? (language === 'he' ? 'הזמנות עתידיות' : 'Future') :
                                         section === 'past' ? (language === 'he' ? 'הזמנות שלא נקלטו' : 'Past due') :
                                         (language === 'he' ? 'הזמנות בטיוטה' : 'Drafts');

                    return (
                      <React.Fragment key={section}>
                        <tr>
                          <td colSpan="6" className="px-6 py-3 bg-gray-50/80 border-b border-t border-gray-100 font-bold text-gray-700 text-sm">
                            {sectionTitle} ({sectionOrders.length})
                          </td>
                        </tr>
                        {sectionOrders.map((order) => {
                          const statusColors = {
                            sent: "bg-blue-50 text-blue-600",
                            draft: "bg-gray-100 text-gray-600"
                          };
      
                          const statusLabels = {
                            sent: t('status_sent'),
                            draft: t('status_draft'),
                            delivered: safeT('status_delivered', 'סופק', 'Delivered')
                          };

                          return (
                            <tr
                              key={order.id}
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => { if (!isViewer && order.status === 'draft') handleEdit(order); else handleOpenPreview(order); }}
                            >
                        <td className="px-6 py-5 text-left rtl:text-right align-middle">
                          <div className="flex items-center gap-2">
                            <div className="text-base font-bold text-gray-900">{order.supplier_name}</div>
                            {!isViewer && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleResend(order); }}
                                className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-full"
                                title={safeT('send','שלח','Send')}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          {order.restaurant_name && (
                            <div className="text-sm text-gray-400 mt-1">{order.restaurant_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-left rtl:text-right text-base text-gray-600 align-middle">
                          {order.created_date ? new Date(order.created_date).toLocaleDateString('he-IL') : '-'}
                        </td>
                        <td className="px-6 py-5 text-left rtl:text-right text-base text-gray-600 align-middle">
                          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('he-IL') : '-'}
                        </td>
                        <td className="px-6 py-5 text-left rtl:text-right text-base font-bold text-gray-900 align-middle">
                          ₪{(order.total_cost || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-left rtl:text-right align-middle">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border border-gray-200 shadow-sm ${order.status === 'sent' ? 'text-gray-900 bg-white' : order.status === 'delivered' ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-700 bg-white'}`}>
                              {statusLabels[order.status] || order.status}
                              {order.status === 'draft' && <span className="ml-2 rtl:mr-2 rtl:ml-0">✓</span>}
                            </span>
                            {!isViewer && order.status === 'sent' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setReceiveOrder(order); setShowReceiveForm(true); }}
                                className="h-8 px-4 text-sm bg-green-50/50 border-green-200 text-green-700 hover:bg-green-100 rounded-full shadow-sm"
                              >
                                <PackageCheck className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                                {safeT('receive_scan', 'קלוט סחורה', 'Receive/Scan')}
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right rtl:text-left align-middle">
                          <div className="flex items-center justify-end gap-2 pointer-events-auto">
                            {!isViewer && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(order); }}
                                  className="h-9 w-9 text-gray-400 hover:text-red-600 rounded-xl"
                                  title={safeT('delete','מחק','Delete')}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {!loading && sortedOrders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {t('no_orders_to_display')}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Mobile FAB for new order */}
      {!isViewer && !showForm && (
        <Button
          onClick={() => setShowForm(true)}
          className={`fixed bottom-20 ${isRTL ? 'left-4' : 'right-4'} h-14 w-14 rounded-full shadow-lg bg-[#d4a373] hover:bg-[#b88c60] md:hidden z-40`}
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Send options chooser */}
      <Dialog open={showSendOptions} onOpenChange={setShowSendOptions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{safeT('choose_send_method','בחר אופן שליחה','Choose how to send')}</DialogTitle>
            <DialogDescription>{safeT('send_method_hint','בחר שיטת שליחה:','Choose a send method:')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowSendOptions(false)} className="order-last sm:order-first">{safeT('cancel', 'ביטול', 'Cancel')}</Button>
            <Button onClick={handleConfirmSendWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
              <MessageCircle className="w-4 h-4 mr-2" /> {language === 'he' ? 'וואטסאפ' : 'WhatsApp'}
            </Button>
            <Button onClick={handleConfirmSendEmail} className="bg-[#d4a373] hover:bg-[#b88c60] text-white">
              <Mail className="w-4 h-4 mr-2" /> {safeT('email', 'אימייל', 'Email')}
            </Button>
            <Button onClick={handleConfirmSendStoreNext} className="bg-[#005ea2] hover:bg-[#004e8a] text-white">
              <FileCode className="w-4 h-4 mr-2" /> {language === 'he' ? 'StoreNext (XML)' : 'StoreNext (XML)'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {previewOrder && (
        <OrderPreviewModal
          order={previewOrder}
          isOpen={!!previewOrder}
          onClose={() => setPreviewOrder(null)}
          onSend={(orderData) => {
            // Updated by the modal when share is successful
            const num = orderData?.order_number || previewOrder.order_number || `ORD-${(previewOrder.id || Date.now()).toString().slice(-8)}`;
            base44.functions.invoke('markOrderSent', { orderId: previewOrder.id, orderNumber: num }).catch(() => {});
            
            // Send email automatically
            const selectedSupplier = suppliers.find(s => s.name === previewOrder.supplier_name || s.id === previewOrder.supplier_id);
            if (selectedSupplier && selectedSupplier.email && selectedSupplier.email.trim() !== '') {
              base44.functions.invoke('sendOrderEmail', { orderId: previewOrder.id, language })
                .then(() => {
                  setTimeout(() => {
                    toast.success(language === 'he' ? 'ההזמנה נשלחה בהצלחה גם למייל של הספק!' : 'Order also sent to supplier email!');
                  }, 1500); // Slight delay so it shows after the share sheet finishes
                })
                .catch(() => {});
            }
            
            setOrders(prev => prev.map(o => o.id === previewOrder.id ? { ...o, status: 'sent', order_number: num } : o));
            setPreviewOrder(null);
          }}
          onSendEmail={async () => {
            const selectedSupplier = suppliers.find(s => s.name === previewOrder.supplier_name || s.id === previewOrder.supplier_id);
            if (!selectedSupplier || !selectedSupplier.email || selectedSupplier.email.trim() === '') {
              alert(language === 'he' ? 'לספק זה לא מוגדרת כתובת אימייל במערכת.' : 'This supplier does not have an email address configured.');
              return;
            }
            await doEmailSend(previewOrder);
            setTimeout(() => {
              alert(language === 'he' ? 'ההזמנה נשלחה בהצלחה לאימייל של הספק!' : 'Order sent successfully to supplier email!');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 500);
          }}
        />
      )}
    </div>
  );
}