import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, RefreshCw, Edit, AlertCircle, Trash2, Mail, MessageCircle, Share, Copy, FileCode, MoreHorizontal, PackageCheck } from "lucide-react";
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

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [sortBy, setSortBy] = useState("none");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [pregeneratedShareFile, setPregeneratedShareFile] = useState(null);
  const [pregeneratedPngBlob, setPregeneratedPngBlob] = useState(null);
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
    const map = { unit: 'יחידה', liter: 'ליטר', kg: 'ק"ג', case: 'ארגז' };
    return map[u] || u;
  };


  const [isViewer, setIsViewer] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const startYRef = useRef(0);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [receiveOrder, setReceiveOrder] = useState(null);
  // Send options chooser
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [sendOptionOrder, setSendOptionOrder] = useState(null);
  const [androidShareFile, setAndroidShareFile] = useState(null);


  // Hydrate from cache for instant UI, then optionally revalidate
  useEffect(() => {
    const c = getCache('orders_v1');
    if (c?.data) {
      setOrders(c.data.orders || []);
      setSuppliers(c.data.suppliers || []);
      setLoading(false);
    }
  }, []);

  // Pre-generate share image to avoid losing user gesture on iOS Safari
  // CRITICAL: DO NOT MODIFY THIS SHARE SHEET TEMPLATE WITHOUT EXPLICIT USER PERMISSION (CODE 2233)
  useEffect(() => {
    if (!previewOrder) {
      setPregeneratedShareFile(null);
      setPregeneratedPngBlob(null);
      return;
    }

    let isCancelled = false;
    const generate = async () => {
      const order = previewOrder;
      const ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
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
          <div style="font-size:28px;font-weight:800;">${order.supplier_name || ''}</div>
          <div style="opacity:.9;margin-top:4px;">${t('order_preview') || 'Order'} #${ensuredNumber}</div>
        </div>
        <div style="border:2px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0;">
          <div style="font-weight:700;color:#0f172a;margin-bottom:8px;">${t('order_from') || 'From'}: ${order.restaurant_name || ''}</div>
          ${order.restaurant_address ? `<div style="color:#334155">${order.restaurant_address}</div>` : ''}
          ${order.delivery_date ? `<div style="margin-top:8px;color:#92400e;background:#fef3c7;padding:8px 12px;border-radius:8px;display:inline-block;">${t('delivery_date') || 'Delivery'}: ${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</div>` : ''}
        </div>
        <div style="border:2px solid #22c55e;border-radius:12px;padding:16px;margin:12px 0;">
          <div style="font-weight:800;color:#166534;margin-bottom:8px;">${t('items') || 'Items'}</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:${language==='he'?'right':'left'}">#</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('item') || 'Item'}</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('quantity') || 'Qty'}</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('unit') || 'Unit'}</th></tr></thead>
            <tbody>
              ${(order.items || []).map((it,i)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'}"><td style="padding:8px;border-bottom:1px solid #e5e7eb">${i+1}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${it.item_name||it.name||''}${it.catalog_number ? `<br/><span style="font-size:12px;color:#6b7280;font-weight:normal;">${language==='he'?'מק"ט:':'SKU:'} ${it.catalog_number}</span>` : ''}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#059669">${it.quantity||''}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${it.unit||''}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280;">
          <p style="font-size: 12px; margin: 0; text-transform: uppercase;">SMART PLATE - THE ULTIMATE FOOD & LABOR COST APP FOR RESTAURANTS</p>
        </div>
      `;
      document.body.appendChild(temp);
      try {
        const canvas = await html2canvas(temp, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
        if (isCancelled) return;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob && !isCancelled) {
          const file = new File([blob], `order-${ensuredNumber}.jpg`, { type: 'image/jpeg' });
          setPregeneratedShareFile(file);
          setPregeneratedPngBlob(pngBlob);
        }
      } catch (e) {
        console.warn('Pre-generation failed', e);
      } finally {
        try { document.body.removeChild(temp); } catch {}
      }
    };
    generate();
    return () => { isCancelled = true; };
  }, [previewOrder, language, t]);

  const loadData = async (currentUser, retryAttempt = 0) => {
    try {
      setLoading(true);
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
      const isAdminControlling = !!(currentUser.acting_as_store_email || currentUser.acting_as_user_email);

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
          const controlledStoreUserRecords = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
          if (controlledStoreUserRecords.length > 0) {
            controlledUserOwnerEmail = controlledStoreUserRecords[0].owner_email;
            console.log(`[Orders] Controlled user is a store user, owner: ${controlledUserOwnerEmail}`);
          }
        } catch (e) {
          console.log("Could not fetch store user records for controlled user");
        }
        
        // If controlled user is a store user, load from their owner
        const dataEmails = controlledUserOwnerEmail ? [controlledUserOwnerEmail, workingEmail] : [workingEmail];
        console.log(`[Orders] Loading data from: ${dataEmails.join(', ')}`);
        
        const orderPromises = dataEmails.map(e => base44.entities.Order.filter({ created_by: e }, "-created_date"));
        const targetEmail = controlledUserOwnerEmail || workingEmail;
        const [ordersArrays, ownSuppliers, storeSuppliers] = await Promise.all([
          Promise.all(orderPromises),
          base44.entities.Supplier.filter({ created_by: targetEmail }, "name"),
          base44.entities.Supplier.filter({ store_owner_email: targetEmail }, "name")
        ]);
        const mergedOrders = ordersArrays.flat();
        const seenIds = new Set();
        ordersData = mergedOrders.filter(o => {
          if (!o?.id || seenIds.has(o.id)) return false;
          seenIds.add(o.id);
          return true;
        });
        const userSuppliers = [...ownSuppliers, ...storeSuppliers].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
        suppliersData = userSuppliers;
        console.log(`[Orders] Loaded ${userSuppliers.length} suppliers for controlled user`);
      } else if (isStoreUser && storeOwnerEmail) {
        // Store user - show owner's orders + this user's orders (drafts etc.)
        const [ownerSuppliers, ownerStoreSuppliers, ownerOrders, myOrders] = await Promise.all([
          base44.entities.Supplier.filter({ created_by: storeOwnerEmail }, "name"),
          base44.entities.Supplier.filter({ store_owner_email: storeOwnerEmail }, "name"),
          base44.entities.Order.filter({ created_by: storeOwnerEmail }, "-created_date"),
          base44.entities.Order.filter({ created_by: currentUser.email }, "-created_date")
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
            base44.entities.Order.filter({ created_by: currentUser.email }, "-created_date")
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
            base44.entities.Order.filter({ created_by: currentUser.email }, "-created_date")
          ];
          for (const email of branchEmails) {
            orderPromises.push(base44.entities.Order.filter({ created_by: email }, "-created_date"));
          }
          const ordersArrays = await Promise.all(orderPromises);
          allOrders = ordersArrays.flat();
        } else {
          allOrders = await base44.entities.Order.filter({ created_by: currentUser.email }, "-created_date");
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
        myDrafts = await base44.entities.Order.filter({ created_by: workingEmail, status: 'draft' }, "-created_date");
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
        await base44.entities.Order.delete(payload.id);
        setOrders(prev => prev.filter(o => o.id !== payload.id));
      }
    };
    return offlineQueue.onOnline('orders', processItem);
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

    // Offline: queue and update UI optimistically
    if (!navigator.onLine) {
      const clientId = 'temp-' + Date.now();
      const draftData = { ...orderData, status: editingOrder?.status || 'draft' };
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
        await base44.entities.Order.update(editingOrder.id, { ...orderData, status: editingOrder.status || 'draft' });
        savedOrder = { ...editingOrder, ...orderData, status: editingOrder.status || 'draft', id: editingOrder.id };
      } else {
        const draftData = { ...orderData, status: 'draft' };
        savedOrder = await base44.entities.Order.create(draftData);
      }

      setShowForm(false);
      setEditingOrder(null);
      
      // Reload orders
      await loadData(user);
      
      setPreviewOrder(savedOrder);

    } catch (error) {
      console.error("Error saving order:", error);
      alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const handleSaveDraft = async (orderData) => {
    if (isViewer) { return; }
    // Offline: queue draft save
    if (!navigator.onLine) {
      const clientId = 'temp-' + Date.now();
      const draft = { ...orderData, status: 'draft' };
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
        await base44.entities.Order.update(editingOrder.id, { ...orderData, status: 'draft' });
        savedOrder = { ...editingOrder, ...orderData, status: 'draft', id: editingOrder.id };
      } else {
        savedOrder = await base44.entities.Order.create({ ...orderData, status: 'draft' });
      }
      setShowForm(false);
      setEditingOrder(null);
      await loadData(user);
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
        status: receiptData.status || "pending",
        is_refund: !!receiptData.is_refund,
        needs_review: !!receiptData.needs_review,
        review_note: receiptData.review_note || "",
        refund_received: !!receiptData.refund_received,
        reviewed: !!receiptData.reviewed,
        linked_receipt_id: receiptData.linked_receipt_id || ""
      };
      await base44.entities.SupplyReceipt.create(cleanData);
      alert(t('receipt_saved_successfully'));
      setShowReceiveForm(false);
      setReceiveOrder(null);
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
    const selectedSupplier = suppliers.find(s => s.name === order.supplier_name || s.id === order.supplier_id);
    if (selectedSupplier && selectedSupplier.minimum_order_amount > 0 && order.total_cost < selectedSupplier.minimum_order_amount && order.status === 'draft') {
      alert(language === 'he' ? `לא ניתן לשלוח את ההזמנה. לספק זה מוגדר מינימום להזמנה של ₪${selectedSupplier.minimum_order_amount}. אנא הוסף פריטים להזמנה.` : `Cannot send order. This supplier has a minimum order amount of ₪${selectedSupplier.minimum_order_amount}.`);
      if (!isViewer) handleEdit(order);
      return;
    }
    setPreviewOrder(order);
  };

  const handleResend = (order) => {
    handleOpenPreview(order);
  };

  const doEmailSend = async (order) => {
    try {
      if (!order) return;
      // Mark as sent via service-role so sub-users can update owner orders
      const { data } = await base44.functions.invoke('markOrderSent', {
        orderId: order.id,
        orderNumber: order.order_number
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
        base44.functions.invoke('sendOrderEmail', { orderId: updated.id || order.id })
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

    const ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
    const text = `You have received a new order from "${order.restaurant_name || ''}"\n\n*${safeT('order_number', 'מספר הזמנה', 'Order')}:* ${ensuredNumber}`;
    
    // Always mark as sent and send email in the background (if supplier has email)
    base44.functions.invoke('markOrderSent', { orderId: order.id, orderNumber: ensuredNumber }).catch(() => {});
    try { base44.functions.invoke('sendOrderEmail', { orderId: order.id }).catch(() => {}); } catch (e) {}
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'sent', order_number: ensuredNumber } : o));

    const selectedSupplier = suppliers.find(s => s.name === order.supplier_name || s.id === order.supplier_id);
    if (selectedSupplier && selectedSupplier.email && selectedSupplier.email.trim() !== '') {
      console.log('Order email sent to supplier in background');
    }

    // CRITICAL: DO NOT MODIFY THIS SHARE SHEET TEMPLATE WITHOUT EXPLICIT USER PERMISSION (CODE 2233)
    let file = pregeneratedShareFile;
    let pngBlob = pregeneratedPngBlob;

    if (!file) {
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
          <div style="font-size:28px;font-weight:800;">${order.supplier_name || ''}</div>
          <div style="opacity:.9;margin-top:4px;">${t('order_preview') || 'Order'} #${ensuredNumber}</div>
        </div>
        <div style="border:2px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0;">
          <div style="font-weight:700;color:#0f172a;margin-bottom:8px;">${t('order_from') || 'From'}: ${order.restaurant_name || ''}</div>
          ${order.restaurant_address ? `<div style="color:#334155">${order.restaurant_address}</div>` : ''}
          ${order.delivery_date ? `<div style="margin-top:8px;color:#92400e;background:#fef3c7;padding:8px 12px;border-radius:8px;display:inline-block;">${t('delivery_date') || 'Delivery'}: ${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</div>` : ''}
        </div>
        <div style="border:2px solid #22c55e;border-radius:12px;padding:16px;margin:12px 0;">
          <div style="font-weight:800;color:#166534;margin-bottom:8px;">${t('items') || 'Items'}</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:${language==='he'?'right':'left'}">#</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('item') || 'Item'}</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('quantity') || 'Qty'}</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('unit') || 'Unit'}</th></tr></thead>
            <tbody>
              ${(order.items || []).map((it,i)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'}"><td style="padding:8px;border-bottom:1px solid #e5e7eb">${i+1}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${it.item_name||it.name||''}${it.catalog_number ? `<br/><span style="font-size:12px;color:#6b7280;font-weight:normal;">${language==='he'?'מק"ט:':'SKU:'} ${it.catalog_number}</span>` : ''}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#059669">${it.quantity||''}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${it.unit||''}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280;">
          <p style="font-size: 12px; margin: 0; text-transform: uppercase;">SMART PLATE - THE ULTIMATE FOOD & LABOR COST APP FOR RESTAURANTS</p>
        </div>
      `;
      document.body.appendChild(temp);
      try {
        const canvas = await html2canvas(temp, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          file = new File([blob], `order-${ensuredNumber}.jpg`, { type: 'image/jpeg' });
        }
      } catch (e) {
        console.warn('Failed to generate image', e);
      } finally {
        try { document.body.removeChild(temp); } catch {}
      }
    }
    
    if (file) {
      // Try native share with the image file attached
      if (navigator.share) {
        try {
          if (navigator.canShare && !navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `You have received a new order from "${order.restaurant_name || ''}"`,
              text: text
            });
          } else {
            await navigator.share({
              files: [file],
              title: `You have received a new order from "${order.restaurant_name || ''}"`,
              text: text
            });
          }
          setPreviewOrder(null);
          if (selectedSupplier && selectedSupplier.email && selectedSupplier.email.trim() !== '') {
            setTimeout(() => {
              alert(language === 'he' ? `ההזמנה שותפה, וגם נשלחה במקביל למייל של הספק: ${selectedSupplier.email}` : `Order shared, and also sent in parallel to supplier email: ${selectedSupplier.email}`);
            }, 500);
          }
          return;
        } catch (shareErr) {
          console.warn('Share failed', shareErr);
          // Fallback to clipboard if share fails
        }
      }
      
      // Fallback for Desktop: Try to copy to clipboard first
      let copied = false;
      if (navigator.clipboard && window.ClipboardItem && pngBlob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/plain': new Blob([text], { type: 'text/plain' }),
              'image/png': pngBlob
            })
          ]);
          copied = true;
        } catch (err) {
          console.warn('Clipboard copy with text failed, trying image only', err);
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': pngBlob
              })
            ]);
            copied = true;
          } catch (err2) {
            console.warn('Clipboard copy failed', err2);
          }
        }
      }

      if (copied) {
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent);
        const pasteKey = isMac ? 'Cmd+V' : 'Ctrl+V';
        alert(language === 'he' 
          ? `התמונה הועתקה! וואטסאפ ייפתח כעת, פשוט לחץ ${pasteKey} בתוך הצ'אט כדי להדביק ולשלוח.\n\n(במידה ולספק יש אימייל, ההזמנה נשלחה גם לשם במקביל)` 
          : `Image copied! WhatsApp will open now, just press ${pasteKey} in the chat to paste and send.\n\n(If the supplier has an email, it was also sent there)`);
        
        const rawPhone = String(order.supplier_phone || '').trim();
        let phone = rawPhone.replace(/[^\d+]/g, '');
        if (phone.startsWith('+')) phone = phone.slice(1);
        if (phone.startsWith('00')) phone = phone.slice(2);
        
        const waUrl = phone ? `https://wa.me/${phone}` : `https://wa.me/`;
        window.open(waUrl, '_blank');
      } else {
        // If clipboard copy failed or isn't supported, fallback to download
        const url = window.URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order-${ensuredNumber}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        if (selectedSupplier && selectedSupplier.email && selectedSupplier.email.trim() !== '') {
            alert(language === 'he' ? 'ההזמנה ירדה למכשיר ונשלחה במייל לספק.' : 'Order downloaded and sent to supplier email.');
        }
      }
      
      setPreviewOrder(null);
      return;
    }

    // Fallback if image generation completely fails
    try {
      if (navigator.share) {
        await navigator.share({
          title: `You have received a new order from "${order.restaurant_name || ''}"`,
          text: text
        });
        if (selectedSupplier && selectedSupplier.email && selectedSupplier.email.trim() !== '') {
          setTimeout(() => {
            alert(language === 'he' ? `ההזמנה שותפה, וגם נשלחה במקביל למייל של הספק: ${selectedSupplier.email}` : `Order shared, and also sent in parallel to supplier email: ${selectedSupplier.email}`);
          }, 500);
        }
      }
      setPreviewOrder(null);
    } catch (e) {
      console.warn('Native share failed', e);
    }
  };

  // CRITICAL: DO NOT MODIFY THIS SHARE SHEET TEMPLATE WITHOUT EXPLICIT USER PERMISSION (CODE 2233)
  const sendOrderToWhatsApp = async (order, opts = {}) => {
    const ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
    const intro = `You have received a new order from "${order.restaurant_name || ''}"`;
  const numLbl = safeT('order_number', 'מספר הזמנה', 'Order');
  const text = `${intro}\n\n*${numLbl}:* ${ensuredNumber}`;
    const isAndroid = /Android/i.test(navigator.userAgent || '');
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
        </div>
        <div style="border:2px solid #22c55e;border-radius:12px;padding:16px;margin:12px 0;">
          <div style="font-weight:800;color:#166534;margin-bottom:8px;">${t('items') || 'Items'}</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:${language==='he'?'right':'left'}">#</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('item') || 'Item'}</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('quantity') || 'Qty'}</th><th style="padding:8px;text-align:${language==='he'?'right':'left'}">${t('unit') || 'Unit'}</th></tr></thead>
            <tbody>
              ${(order.items || []).map((it,i)=>`<tr style=\"background:${i%2===0?'#fff':'#f9fafb'}\"><td style=\"padding:8px;border-bottom:1px solid #e5e7eb\">${i+1}</td><td style=\"padding:8px;border-bottom:1px solid #e5e7eb\">${it.item_name||it.name||''}${it.catalog_number ? `<br/><span style="font-size:12px;color:#6b7280;font-weight:normal;">${language==='he'?'מק"ט:':'SKU:'} ${it.catalog_number}</span>` : ''}</td><td style=\"padding:8px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#059669\">${it.quantity||''}</td><td style=\"padding:8px;border-bottom:1px solid #e5e7eb\">${it.unit||''}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280;">
          <p style="font-size: 12px; margin: 0; text-transform: uppercase;">SMART PLATE - THE ULTIMATE FOOD & LABOR COST APP FOR RESTAURANTS</p>
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
    if (opts && opts.forceImageShare) {
      const canShareFiles = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
      if (canShareFiles) {
        try {
          await navigator.share({ files: [file], text, title: `You have received a new order from "${order.restaurant_name || ''}"` });
          return;
        } catch (e) {
          console.warn('[WA Image Share] Share failed, falling back:', e?.name || e);
        }
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
    // In editor preview (iframe) or desktop browsers, open in a new tab to avoid wa.me X-Frame-Options blocking
    const tryOpenChain = (urls, stepMs = 1200) => {
      let switched = false;
      const onHide = () => { switched = true; };
      document.addEventListener('visibilitychange', onHide, { once: true });

      const openLink = (url) => {
        if (opts && opts.preOpenedWindow && !opts.preOpenedWindow.closed) {
          opts.preOpenedWindow.location.href = url;
        } else if (window.self !== window.top) {
          window.open(url, '_blank');
        } else {
          try { window.location.href = url; }
          catch { window.location.assign(url); }
        }
      };

      const tryNext = (i) => {
        if (i >= urls.length || switched) return;
        openLink(urls[i]);
        setTimeout(() => { if (!switched) tryNext(i + 1); }, stepMs);
      };
      tryNext(0);
    };


    if (isAndroid) {
      tryOpenChain([deeplink, apiUrl, waWeb, androidIntent]);
    } else if (isIOS) {
      tryOpenChain([deeplink, waWeb]);
    } else {
      // Desktop: use api.whatsapp.com which handles the app deep link better, then fallback to web
      tryOpenChain([apiUrl, waWeb]);
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
    // Pre-open a tab synchronously to avoid popup blockers and iframe embedding (Firefox/Preview)
    const isAndroid = /Android/i.test(navigator.userAgent || '');
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    const isIframe = window.self !== window.top;
    let preOpenedWindow = null;
    if (!isAndroid && !isIOS || isIframe) {
      try { preOpenedWindow = window.open('about:blank', '_blank'); } catch (_) {}
    }
    try {
      const { data } = await base44.functions.invoke('markOrderSent', {
        orderId: order.id,
        orderNumber: order.order_number
      });
      const updated = data?.order || {};
      setOrders(prev => prev.map(o => {
        if (o.id !== (updated.id || order.id)) return o;
        const num = updated.order_number || o.order_number || `ORD-${(o.id || Date.now()).toString().slice(-8)}`;
        return { ...o, status: 'sent', order_number: num };
      }));
      try { base44.functions.invoke('sendOrderEmail', { orderId: updated.id || order.id }).catch(() => {}); } catch (e) {}
      sendOrderToWhatsApp(updated.id ? updated : order, { preOpenedWindow });
      setPreviewOrder(null);
      await loadData(user);
    } catch (e) {
      // Preview sandbox sometimes returns 404 for freshly deployed functions.
      // Fallback: proceed to WhatsApp and update UI optimistically.
      console.warn('markOrderSent failed, proceeding with WA fallback:', e?.message || e);
      setOrders(prev => prev.map(o => {
        if (o.id !== order.id) return o;
        const num = order.order_number || `ORD-${(o.id || Date.now()).toString().slice(-8)}`;
        return { ...o, status: 'sent', order_number: num };
      }));
      try { sendOrderToWhatsApp(order, { preOpenedWindow }); } catch (_) {}
      setPreviewOrder(null);
      // Optionally retry in background without blocking UX
      setTimeout(() => {
        base44.functions.invoke('markOrderSent', { orderId: order.id, orderNumber: order.order_number })
          .catch(() => {});
      }, 1200);
    } finally {
      setSendOptionOrder(null);
    }
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
        } else {
          alert(language === 'he' ? 'שגיאה ביצירת קובץ StoreNext' : 'Error generating StoreNext file');
        }
      } catch (e) {
        alert((language === 'he' ? 'שגיאה: ' : 'Error: ') + (e?.message || ''));
      }
      setSendOptionOrder(null);
    };

    const handleConfirmSendWhatsAppImage = async () => {
      if (!sendOptionOrder) return;
      const order = sendOptionOrder;
      setShowSendOptions(false);

      // Optimistic UI (do not block user gesture)
      setOrders(prev => prev.map(o => {
        if (o.id !== order.id) return o;
        const num = order.order_number || `ORD-${(o.id || Date.now()).toString().slice(-8)}`;
        return { ...o, status: 'sent', order_number: num };
      }));

      // Trigger share immediately using the pre-rendered file when available
      try { sendOrderToWhatsApp(order, { forceImageShare: true, preparedFile: androidShareFile }); } catch (_) {}
      setPreviewOrder(null);

      // Background: mark as sent and refresh (no blocking)
      setTimeout(() => {
        base44.functions.invoke('markOrderSent', { orderId: order.id, orderNumber: order.order_number }).catch(() => {});
        try { base44.functions.invoke('sendOrderEmail', { orderId: order.id }).catch(() => {}); } catch (e) {}
        loadData(user).catch(() => {});
      }, 200);

      setSendOptionOrder(null);
    };

  const handleDelete = async (order) => {
    if (isViewer) return;
    const input = window.prompt(`Type DELETE to confirm deletion of order ${order.order_number || '—'}`);
    if (!input || input.trim().toLowerCase() !== 'delete') return;
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
        const matchesSearch = (order.supplier_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
          (order.order_number || '').toLowerCase().includes((searchTerm || '').toLowerCase());
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        const matchesSupplier = supplierFilter === "all" || ((order.supplier_name || '').toLowerCase() === supplierFilter.toLowerCase());
        const matchesCustomer = (customerFilter || '').trim() === '' || (order.restaurant_name || '').toLowerCase().includes(customerFilter.toLowerCase());

        const dateStr = order.delivery_date || order.created_date || order.updated_date;
        const ds = dateStr ? new Date(dateStr) : null;
        const dsStr = ds ? ds.toISOString().slice(0,10) : '';
        const afterStart = !dateStart || (dsStr && dsStr >= dateStart);
        const beforeEnd = !dateEnd || (dsStr && dsStr <= dateEnd);
        const matchesDate = afterStart && beforeEnd;

        return matchesSearch && matchesStatus && matchesSupplier && matchesCustomer && matchesDate;
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
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
            alt="Smart Plate"
            className="h-20 object-contain animate-pulse"
          />
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
      className="min-h-screen bg-gray-50 p-4 md:p-8 2xl:p-12"
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{safeT('orders_title', 'ניהול הזמנות', 'Orders Management')}</h1>
            <p className="text-gray-600 mt-2">{t('orders_greeting', { name: (user.acting_as_user_name || user.full_name) })}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={verifyDraftsNow}
              className="h-11 md:h-10 px-4 rounded-lg"
            >
              {safeT('status_draft', 'טיוטה', 'Draft')} ✓
            </Button>
            {(user.acting_as_store_email || user.acting_as_user_email) && !isViewer && (
              <Button
                variant="outline"
                onClick={fixLatestDraft}
                className="h-11 md:h-10 px-4 rounded-lg"
              >
                {safeT('fix_last_draft', 'תקן טיוטה → נשלח', 'Fix last draft → sent')}
              </Button>
            )}
            {!isViewer && (
              <Button
                onClick={() => setShowForm(!showForm)}
                className="hidden md:inline-flex bg-[#d4a373] hover:bg-[#b88c60] text-white h-11 md:h-10 px-5 rounded-lg"
              >
                <Plus className="w-5 h-5 ml-2" />
                {safeT('new_order', 'הזמנה חדשה', 'New Order')}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Filters Drawer trigger */}
        <div className="md:hidden mb-4">
          <Button variant="outline" onClick={() => setFiltersOpen(true)} className="w-full">
            {safeT('filters', 'סינון', 'Filters')}
          </Button>
        </div>

        {/* Mobile quick filters */}
        <div className="md:hidden mb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4">
          <div className="flex gap-2 pb-1 w-max after:content-[''] after:w-4 after:flex-shrink-0 before:content-[''] before:w-4 before:flex-shrink-0">
            {['all','draft','sent','confirmed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-sm rounded-full border flex-shrink-0 whitespace-nowrap ${statusFilter===s ? 'bg-[#d4a373] text-white border-[#d4a373]' : 'bg-white text-gray-700 border-gray-300'}`}
              >
                {s==='all' ? safeT('all_statuses','כל הסטטוסים','All') :
                 s==='draft' ? t('status_draft') :
                 s==='sent' ? t('status_sent') :
                 s==='confirmed' ? t('status_confirmed') :
                 t('status_delivered')}
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

            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={safeT('search_orders', 'חיפוש הזמנות...', 'Search orders...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 h-11 md:h-10 text-base rounded-lg"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 md:h-10 rounded-lg">
                  <SelectValue placeholder={safeT('order_status', 'סטטוס הזמנה', 'Order status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{safeT('all_statuses','כל הסטטוסים','All statuses')}</SelectItem>
                  <SelectItem value="draft">{t('status_draft')}</SelectItem>
                  <SelectItem value="sent">{t('status_sent')}</SelectItem>
                  <SelectItem value="confirmed">{t('status_confirmed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="h-11 md:h-10 rounded-lg">
                  <SelectValue placeholder={safeT('supplier', 'ספק', 'Supplier')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{safeT('all', 'הכל', 'All')}</SelectItem>
                  {Array.from(new Set((suppliers || []).map(s => s.name).filter(Boolean))).map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={safeT('customer_name', 'שם לקוח', 'Customer name')}
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="h-11 md:h-10 rounded-lg"
              />
              <div className="flex items-center bg-gray-50/50 border border-gray-200 rounded-lg p-1 shadow-sm md:w-auto w-full overflow-x-auto">
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
                  <SelectTrigger className={`h-11 md:h-8 border-transparent shadow-none w-auto min-w-[120px] transition-colors ${datePreset !== 'custom' ? 'bg-white font-medium shadow-sm rounded-md text-gray-900' : 'bg-transparent text-gray-600'}`}>
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
                  <div className="flex items-center gap-1.5 px-2 ml-1 border-l border-gray-200 rtl:border-l-0 rtl:border-r rtl:mr-1 animate-in fade-in zoom-in duration-200">
                    <Input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="h-11 md:h-8 w-32 px-2 text-sm bg-white border-transparent shadow-sm rounded-md"
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="h-11 md:h-8 w-32 px-2 text-sm bg-white border-transparent shadow-sm rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>


         {/* Mobile View */}
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
          ) : (
            filteredOrders.map((order) => {
              const statusColors = {
                sent: "bg-blue-50 text-blue-700 border-blue-200",
                confirmed: "bg-green-50 text-green-700 border-green-200",
                delivered: "bg-purple-50 text-purple-700 border-purple-200",
                draft: "bg-yellow-50 text-yellow-700 border-yellow-200"
              };

              const statusLabels = {
                sent: t('status_sent'),
                confirmed: t('status_confirmed'),
                delivered: t('status_delivered'),
                draft: t('status_draft')
              };

              return (
                <Card 
                  key={order.id} 
                  className="p-4 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleOpenPreview(order)}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-900">{order.supplier_name}</div>
                        <div className="text-sm text-gray-500">{order.order_number || '—'}</div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${statusColors[order.status]}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    
                    {order.delivery_date && (
                      <div className="text-sm text-gray-600">
                        {safeT('delivery_date','תאריך אספקה','Delivery date')}: {new Date(order.delivery_date).toLocaleDateString('he-IL')}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-gray-600">{safeT('total_cost','עלות כוללת','Total cost')}:</span>
                      <span className="text-lg font-bold text-green-600">₪{(order.total_cost || 0).toFixed(2)}</span>
                    </div>
                    
                    {!isViewer && (
                      <div className="pt-3 border-t mt-3 flex items-center justify-between">
                        {order.status === 'sent' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setReceiveOrder(order); setShowReceiveForm(true); }}
                            className="text-green-700 border-green-200 bg-green-50/50 hover:bg-green-100 rounded-lg h-9 px-4"
                          >
                            <PackageCheck className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                            {safeT('receive_scan', 'קלוט סחורה', 'Receive/Scan')}
                          </Button>
                        ) : (
                          <div></div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleResend(order); }}
                            className="h-9 w-9 text-gray-500 hover:text-gray-900 rounded-full"
                          >
                            <Share className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-gray-900 rounded-full" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(order); }}>
                                <Edit className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-gray-500" />
                                {safeT('edit', 'עריכה', 'Edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(order); }} className="text-red-600 focus:text-red-600">
                                <Trash2 className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                                {safeT('delete', 'מחק', 'Delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Mobile Filters Drawer */}
        <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{safeT('filters', 'סינון', 'Filters')}</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={safeT('search_orders', 'חיפוש הזמנות...', 'Search orders...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 h-11 text-base rounded-lg"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder={safeT('order_status', 'סטטוס הזמנה', 'Order status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{safeT('all_statuses','כל הסטטוסים','All statuses')}</SelectItem>
                  <SelectItem value="draft">{t('status_draft')}</SelectItem>
                  <SelectItem value="sent">{t('status_sent')}</SelectItem>
                  <SelectItem value="confirmed">{t('status_confirmed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder={safeT('supplier', 'ספק', 'Supplier')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{safeT('all', 'הכל', 'All')}</SelectItem>
                  {Array.from(new Set((suppliers || []).map(s => s.name).filter(Boolean))).map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={safeT('customer_name', 'שם לקוח', 'Customer name')}
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="h-11 rounded-lg"
              />
              <div className="flex flex-col gap-2">
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
                    <Input type="date" lang={language === 'he' ? 'he-IL' : undefined} value={dateStart} onChange={(e)=>setDateStart(e.target.value)} className="h-11 rounded-lg flex-1" />
                    <span className="text-gray-500">–</span>
                    <Input type="date" lang={language === 'he' ? 'he-IL' : undefined} value={dateEnd} onChange={(e)=>setDateEnd(e.target.value)} className="h-11 rounded-lg flex-1" />
                  </div>
                )}
              </div>
              <Button onClick={() => setFiltersOpen(false)} className="w-full">{safeT('apply', 'החל', 'Apply')}</Button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Desktop View */}
        <div className="hidden md:block bg-white rounded-lg shadow relative">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full relative">
              <thead className="bg-transparent border-b border-gray-100 sticky top-0 z-20">
                <tr>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 sticky top-0 bg-white/95 backdrop-blur z-10">
                    <div className="flex items-center justify-start rtl:justify-end gap-1 cursor-pointer hover:text-gray-900" onClick={() => setSortBy(sortBy === 'supplier_asc' ? 'supplier_desc' : 'supplier_asc')}>
                      {safeT('supplier','ספק','Supplier')}
                      <span className={`text-[10px] ${sortBy.startsWith('supplier') ? 'text-gray-900' : 'text-gray-400'}`}>
                        {sortBy === 'supplier_asc' ? '↑' : sortBy === 'supplier_desc' ? '↓' : '⇅'}
                      </span>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 sticky top-0 bg-white/95 backdrop-blur z-10">
                    {safeT('order_number','מספר הזמנה','Order #')}
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 sticky top-0 bg-white/95 backdrop-blur z-10">
                    {safeT('delivery_date','תאריך אספקה','Delivery date')}
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 sticky top-0 bg-white/95 backdrop-blur z-10">
                    <div className="flex items-center justify-start rtl:justify-end gap-1 cursor-pointer hover:text-gray-900" onClick={() => setSortBy(sortBy === 'cost_asc' ? 'cost_desc' : 'cost_asc')}>
                      {safeT('total_cost','עלות כוללת','Total cost')}
                      <span className={`text-[10px] ${sortBy.startsWith('cost') ? 'text-gray-900' : 'text-gray-400'}`}>
                        {sortBy === 'cost_asc' ? '↑' : sortBy === 'cost_desc' ? '↓' : '⇅'}
                      </span>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 sticky top-0 bg-white/95 backdrop-blur z-10">
                    <div className="flex items-center justify-start rtl:justify-end gap-1 cursor-pointer hover:text-gray-900" onClick={() => setSortBy(sortBy === 'status_asc' ? 'status_desc' : 'status_asc')}>
                      {safeT('status','סטטוס','Status')}
                      <span className={`text-[10px] ${sortBy.startsWith('status') ? 'text-gray-900' : 'text-gray-400'}`}>
                        {sortBy === 'status_asc' ? '↑' : sortBy === 'status_desc' ? '↓' : '⇅'}
                      </span>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 sticky top-0 bg-white/95 backdrop-blur z-10">
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
                  ) : sortedOrders.map((order) => {
                    const statusColors = {
                      sent: "bg-blue-50 text-blue-600",
                      confirmed: "bg-green-50 text-green-600",
                      delivered: "bg-purple-50 text-purple-600",
                      draft: "bg-gray-100 text-gray-600"
                    };

                    const statusLabels = {
                      sent: t('status_sent'),
                      confirmed: t('status_confirmed'),
                      delivered: t('status_delivered'),
                      draft: t('status_draft')
                    };

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => handleOpenPreview(order)}
                        onDoubleClick={() => { if (!isViewer) handleEdit(order); }}
                      >
                        <td className="px-4 py-4 text-right align-middle">
                          <div className="text-sm font-semibold text-gray-900">{order.supplier_name}</div>
                          {order.restaurant_name && (
                            <div className="text-xs text-gray-400 mt-0.5">{order.restaurant_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-gray-500 align-middle">
                          {order.order_number || '—'}
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-gray-600 align-middle">
                          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('he-IL') : '-'}
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-bold text-gray-900 align-middle">
                          ₪{(order.total_cost || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-4 text-right align-middle">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border-none ${statusColors[order.status]}`}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right align-middle">
                          <div className="flex items-center justify-end gap-2 pointer-events-auto">
                            {!isViewer && order.status === 'sent' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setReceiveOrder(order); setShowReceiveForm(true); }}
                                className="h-8 px-3 text-xs bg-green-50/50 border-green-200 text-green-700 hover:bg-green-100 rounded-lg shadow-sm"
                              >
                                <PackageCheck className="w-3 h-3 rtl:ml-1 ltr:mr-1" />
                                {safeT('receive_scan', 'קלוט סחורה', 'Receive/Scan')}
                              </Button>
                            )}
                            {!isViewer && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => { e.stopPropagation(); handleResend(order); }}
                                  className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-lg"
                                  title={safeT('share','שתף','Share')}
                                >
                                  <Share className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-lg" onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-40">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(order); }}>
                                      <Edit className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-gray-500" />
                                      {safeT('edit', 'עריכה', 'Edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(order); }} className="text-red-600 focus:text-red-600">
                                      <Trash2 className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                                      {safeT('delete', 'מחק', 'Delete')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
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
      </div>

      {/* Mobile FAB for new order */}
      {!isViewer && (
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
            {typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '') && (
              <Button onClick={handleConfirmSendWhatsAppImage} disabled={!androidShareFile} className="bg-[#25D366] hover:bg-[#128C7E] text-white disabled:opacity-60 disabled:cursor-not-allowed">
                <MessageCircle className="w-4 h-4 mr-2" /> {(!androidShareFile) ? (language === 'he' ? 'מכין תמונה…' : 'Preparing image…') : (language === 'he' ? 'וואטסאפ (תמונה)' : 'WhatsApp (image)')}
              </Button>
            )}
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
          onSend={() => handleSendNow(previewOrder)}
          onSendEmail={async () => {
            const selectedSupplier = suppliers.find(s => s.name === previewOrder.supplier_name || s.id === previewOrder.supplier_id);
            if (!selectedSupplier || !selectedSupplier.email || selectedSupplier.email.trim() === '') {
              alert(language === 'he' ? 'לספק זה לא מוגדרת כתובת אימייל במערכת.' : 'This supplier does not have an email address configured.');
              return;
            }
            await doEmailSend(previewOrder);
            setTimeout(() => {
              alert(language === 'he' ? 'ההזמנה נשלחה בהצלחה לאימייל של הספק!' : 'Order sent successfully to supplier email!');
            }, 500);
          }}
        />
      )}
    </div>
  );
}