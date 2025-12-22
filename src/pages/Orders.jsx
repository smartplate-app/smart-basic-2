import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, RefreshCw, Edit, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { useLanguage } from "../components/LanguageProvider";
import { Card, CardContent } from "@/components/ui/card";

import OrderForm from "../components/orders/OrderForm";
import OrderPreviewModal from "../components/orders/OrderPreviewModal";
import NetworkErrorHandler from "../components/NetworkErrorHandler";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const { t } = useLanguage();

        const isViewer = user?.store_user_role === 'viewer' || user?.store_user_read_only;

  // One-time cleanup of any leftover acting_as_store flags and worker linkage
  useEffect(() => {
    (async () => {
      try {
        if (!localStorage.getItem('b44_cleared_user_ctx')) {
          await base44.functions.invoke('clearUserContext', {});
          localStorage.setItem('b44_cleared_user_ctx', '1');
        }
        if (!localStorage.getItem('b44_purged_storeuser')) {
          await base44.functions.invoke('deleteMyStoreUserRecords', {});
          localStorage.setItem('b44_purged_storeuser', '1');
        }
        const refreshedUser = await base44.auth.me();
        setUser(refreshedUser);
      } catch (e) {
        console.log('[Orders] cleanup skipped:', e?.message || e);
      }
    })();
  }, []);

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
      
      // Use acting_as_store_email if admin is controlling a user
      const workingEmail = currentUser.acting_as_store_email || currentUser.email;
      const isAdminControlling = !!currentUser.acting_as_store_email;

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
        const dataEmail = controlledUserOwnerEmail || workingEmail;
        console.log(`[Orders] Loading data from: ${dataEmail}`);
        
        const [userOrders, userSuppliers] = await Promise.all([
          base44.entities.Order.filter({ created_by: dataEmail }, "-created_date"),
          base44.entities.Supplier.filter({ created_by: dataEmail }, "name")
        ]);
        ordersData = userOrders;
        suppliersData = userSuppliers;
        console.log(`[Orders] Loaded ${userSuppliers.length} suppliers for controlled user`);
      } else if (isStoreUser && storeOwnerEmail) {
        // Store user - load suppliers and orders from the store owner
        const [ownerSuppliers, ownerOrders] = await Promise.all([
          base44.entities.Supplier.filter({ created_by: storeOwnerEmail }, "name"),
          base44.entities.Order.filter({ created_by: storeOwnerEmail }, "-created_date")
        ]);
        suppliersData = ownerSuppliers;
        ordersData = ownerOrders;
      } else if (currentUser.chain_id && !currentUser.is_chain_head) {
        // Branch store in chain
        const chain = await base44.entities.Chain.filter({ id: currentUser.chain_id });
        if (chain.length > 0) {
          const headEmail = chain[0].head_store_user_email;
          // Load suppliers from head store + own, but only own orders
          const [headSuppliers, ownSuppliers, ownOrders] = await Promise.all([
            base44.entities.Supplier.filter({ created_by: headEmail }, "name"),
            base44.entities.Supplier.filter({ created_by: currentUser.email }, "name"),
            base44.entities.Order.filter({ created_by: currentUser.email }, "-created_date")
          ]);
          suppliersData = [...headSuppliers, ...ownSuppliers];
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

        const suppliers = await base44.entities.Supplier.filter({ created_by: currentUser.email }, "name");
        ordersData = allOrders;
        suppliersData = suppliers;
      }

      console.log(`[Orders] Successfully loaded ${ordersData.length} orders, ${suppliersData.length} suppliers`);
      setOrders(ordersData);
      setSuppliers(suppliersData);

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
        
        setAuthLoading(true);
        setError(null);
        setRetryCount(retryAttempt);
        
        console.log(`[Orders] Authentication attempt ${retryAttempt + 1}`);
        
        // Check network connectivity
        if (!navigator.onLine) {
          throw new Error('No internet connection. Please check your network.');
        }
        
        // Add initial delay on first load to ensure SDK is ready
        if (retryAttempt === 0) {
          console.log('[Orders] Initial delay to ensure SDK initialization...');
          await new Promise(resolve => setTimeout(resolve, 1000));
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
        
        // Delay before loading data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (mounted) {
          await loadData(currentUser);
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

    // Add small delay before starting to prevent race conditions
    initTimeout = setTimeout(() => {
      if (mounted) {
        checkAuthAndLoadData();
      }
    }, 100);
    
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

    try {
      let savedOrder;
      if (editingOrder) {
        await base44.entities.Order.update(editingOrder.id, orderData);
        savedOrder = { ...editingOrder, ...orderData, id: editingOrder.id };
      } else {
        const orderNumber = `ORD-${Date.now()}`;
        const completeOrderData = { ...orderData, order_number: orderNumber, status: 'sent' };
        savedOrder = await base44.entities.Order.create(completeOrderData);
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

  const handleEdit = (order) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleResend = (order) => {
    setPreviewOrder(order);
  };

  const sendOrderToWhatsApp = (order) => {
    if (!order.supplier_phone) {
      alert(t('whatsapp_missing_phone'));
      return;
    }

    const orderDetailsUrl = `${window.location.origin}${createPageUrl(`OrderDetails?id=${order.id}`)}`;

    const message = `${t('whatsapp_intro') || 'שלום, התקבלה הזמנה חדשה.'}\n\n` +
      `*${t('order_from')}:* ${order.restaurant_name}\n` +
      `*${t('order_number')}:* ${order.order_number}\n\n` +
      `*${t('whatsapp_link_text')}*\n` +
      `${orderDetailsUrl}\n\n` +
      `${t('whatsapp_confirmation')}`;

    const formatPhoneForWhatsApp = (phone) => {
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '972' + cleanPhone.substring(1);
      } else if (!cleanPhone.startsWith('972')) {
        cleanPhone = '972' + cleanPhone;
      }
      return cleanPhone;
    };

    const encodedMessage = encodeURIComponent(message);
    const whatsappPhone = formatPhoneForWhatsApp(order.supplier_phone);
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('orders_title')}</h1>
            <p className="text-gray-600 mt-2">{t('orders_greeting', { name: user.full_name })}</p>
          </div>
          <div className="flex gap-3">
            {!isViewer && (
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="w-5 h-5 ml-2" />
                {t('new_order')}
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
            {showForm && !isViewer && (
              <OrderForm
              order={editingOrder}
              suppliers={suppliers}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingOrder(null);
              }}
            />
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder={t('search_orders')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('order_status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_statuses')}</SelectItem>
              <SelectItem value="sent">{t('status_sent')}</SelectItem>
              <SelectItem value="confirmed">{t('status_confirmed')}</SelectItem>
              <SelectItem value="delivered">{t('status_delivered')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-2" />
              <p className="text-gray-600">{t('loading')}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
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
                <Card key={order.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-900">{order.order_number}</div>
                        <div className="text-sm text-gray-600">{order.supplier_name}</div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${statusColors[order.status]}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    
                    {order.delivery_date && (
                      <div className="text-sm text-gray-600">
                        {t('delivery_date')}: {new Date(order.delivery_date).toLocaleDateString('he-IL')}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-gray-600">{t('total_cost')}:</span>
                      <span className="text-lg font-bold text-green-600">₪{(order.total_cost || 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      {!isViewer && order.supplier_phone && (
                        <button
                          onClick={() => handleResend(order)}
                          className="flex-1 text-white text-sm font-medium rounded-md px-3 py-2 flex items-center justify-center"
                          style={{ backgroundColor: '#25D366' }}
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          WhatsApp
                        </button>
                      )}
                      {!isViewer && (
                        <Button
                          variant="outline"
                          onClick={() => handleEdit(order)}
                          className="flex-1"
                        >
                        <Edit className="w-4 h-4 mr-2" />
                        {t('edit')}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t('order_number')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t('supplier')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t('delivery_date')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t('total_cost')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t('status')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t('actions') || 'פעולות'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <Loader className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-600">{t('loading')}</p>
                      </td>
                    </tr>
                  ) : filteredOrders.map((order) => {
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
                      <tr
                        key={order.id}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onDoubleClick={() => { if (!isViewer) handleEdit(order); }}
                      >
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                          {order.restaurant_name && (
                            <div className="text-xs text-gray-500">{order.restaurant_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {order.supplier_name}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('he-IL') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                          ₪{(order.total_cost || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${statusColors[order.status]}`}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2 pointer-events-auto">
                            {!isViewer && order.supplier_phone && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResend(order);
                                }}
                                className="text-white text-xs font-medium rounded-md px-3 py-1.5 flex items-center justify-center shadow-sm transition-colors"
                                style={{
                                  backgroundColor: '#25D366',
                                  border: 'none'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#128C7E'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#25D366'}
                              >
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                WhatsApp
                              </button>
                            )}
                            {!isViewer && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(order);
                                }}
                                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                              >
                              <Edit className="w-3 h-3 mr-1" />
                              {t('edit')}
                            </Button>
                            )
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {!loading && filteredOrders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {t('no_orders_to_display')}
            </div>
          )}
        </div>
      </div>

      {previewOrder && (
        <OrderPreviewModal
          order={previewOrder}
          isOpen={!!previewOrder}
          onClose={() => setPreviewOrder(null)}
          onSend={() => {
            sendOrderToWhatsApp(previewOrder);
            setPreviewOrder(null);
          }}
        />
      )}
    </div>
  );
}