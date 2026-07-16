import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Scan, Loader, Store, ArrowLeft, Download, BarChart3, List, LayoutGrid } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useLanguage } from "../components/LanguageProvider";
import { createPageUrl } from "@/utils";
import NetworkErrorHandler from "../components/NetworkErrorHandler";
import SupplierForm from "../components/suppliers/SupplierForm";
import SupplierCard from "../components/suppliers/SupplierCard";
// import SupplierListScanner from "../components/suppliers/SupplierListScanner";
import SuppliersSheetsImport from "../components/suppliers/SuppliersSheetsImport";
import AppHelpChat from "../components/AppHelpChat";
import SupplierItemsExcel from "../components/suppliers/SupplierItemsExcel";
import { getCache, setCache, isStale } from "../components/utils/cache";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  // const [showScanner, setShowScanner] = useState(false);
  const [showSuppliersSheetPanel, setShowSuppliersSheetPanel] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [networkError, setNetworkError] = useState(null);
  const [showExcelPanel, setShowExcelPanel] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [dateRangeType, setDateRangeType] = useState('current_month'); // 'current_month', 'last_month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { t, language } = useLanguage();
  const [viewMode, setViewMode] = useState('list');

  const [isViewer, setIsViewer] = useState(false);

  // Hydrate from cache for instant UI, then only fetch if stale
  useEffect(() => {
    const c = getCache('suppliers_v2');
    if (c?.data) {
      setSuppliers(c.data.suppliers || []);
      setLoading(false);
    }
  }, []);

  const loadData = async (currentUser, retryCount = 0, isBackground = false) => {
                try {
                  if (!isBackground) setLoading(true);
                  setNetworkError(null);

                  // Add delay before retry only
                  if (retryCount > 0) {
                    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }

                  let suppliersData = [];
                  let itemsData = [];

                  // Determine which email to use (acting as store or own)
                  const targetEmail = currentUser.acting_as_store_email || currentUser.acting_as_user_email || currentUser.email;
                  const workingEmail = targetEmail;
                  const isActingAsStore = !!currentUser.acting_as_store_email;
                  
                  // Resolve if TARGET user is a store user (when admin controls someone, use their records)
                  // Also use store_user_owner_email from the user object (set by layout auth check) as fallback
                  let storeOwnerEmail = currentUser.store_user_owner_email || null;
                  try {
                    const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: targetEmail });
                    if (Array.isArray(storeUserRecords) && storeUserRecords.length > 0) {
                      const activeRec = storeUserRecords.find(r => r.is_active !== false) || storeUserRecords[0];
                      storeOwnerEmail = activeRec?.owner_email || storeOwnerEmail;
                    }
                  } catch {}
                  const isStoreUser = !!storeOwnerEmail;

                  const isAdminControlling = currentUser?.role === 'admin' && workingEmail !== currentUser.email;

                  if (isAdminControlling) {
                    console.log('[Suppliers] Loading as ADMIN impersonating:', workingEmail);
                    try {
                        const emailsToFetch = [workingEmail];
                        if (storeOwnerEmail) emailsToFetch.push(currentUser.email);
                        
                        const supPromises = emailsToFetch.flatMap(email => [
                            base44.entities.Supplier.filter({ created_by: email }, "name", 10000),
                            base44.entities.Supplier.filter({ store_owner_email: email }, "name", 10000)
                        ]);
                        const itsPromises = emailsToFetch.flatMap(email => [
                            base44.entities.Item.filter({ created_by: email }, "name", 10000),
                            base44.entities.Item.filter({ store_owner_email: email }, "name", 10000)
                        ]);
                        
                        const allSup = (await Promise.all(supPromises)).flat();
                        const allIts = (await Promise.all(itsPromises)).flat();
                        
                        suppliersData = Array.from(new Map(allSup.map(item => [item.id, item])).values());
                        itemsData = Array.from(new Map(allIts.map(item => [item.id, item])).values());
                    } catch(e) {
                        console.error("Admin data fetch error:", e);
                    }
                  } else if (isStoreUser && storeOwnerEmail) {
                    // Any store user (worker or manager): use service-role to bypass RLS, scoped to owner
                    const { data: mgData } = await base44.functions.invoke('getManagerData', { ownerEmail: storeOwnerEmail, entities: ['suppliers', 'items'] });
                    suppliersData = mgData?.data?.suppliers || [];
                    itemsData = mgData?.data?.items || [];
                  } else if ((currentUser.chain_id && !currentUser.is_chain_head) || isActingAsStore) {
                    // Branch store - get suppliers from chain head + own (with fallbacks)
                    // Derive chain by TARGET email first; only fallback to current user's chain when not controlling
                    let effectiveChainId = null;
                    try {
                      const myStores = await base44.entities.ChainStore.filter({ user_email: workingEmail });
                      if (myStores?.length) effectiveChainId = myStores[0].chain_id;
                    } catch {}
                    if (!effectiveChainId && workingEmail === (currentUser.email || '')) {
                      effectiveChainId = currentUser.chain_id || null;
                    }
                    if (effectiveChainId) {
                      let headEmail = null;
                      try {
                        const chainRec = await base44.entities.Chain.filter({ id: effectiveChainId });
                        headEmail = chainRec?.[0]?.head_store_user_email || null;
                      } catch {}
                      if (!headEmail) {
                        try {
                          const storesInChain = await base44.entities.ChainStore.filter({ chain_id: effectiveChainId });
                          const headStore = storesInChain?.find(s => s.is_head_store);
                          headEmail = headStore?.user_email || null;
                        } catch {}
                      }
                      if (headEmail) {
                        const [headSuppliers, headItems, ownSuppliers, ownItems, storeSuppliers, storeItems] = await Promise.all([
                          base44.entities.Supplier.filter({ created_by: headEmail }, '-created_date'),
                          base44.entities.Item.filter({ created_by: headEmail }),
                          base44.entities.Supplier.filter({ created_by: workingEmail }, '-created_date'),
                          base44.entities.Item.filter({ created_by: workingEmail }),
                          base44.entities.Supplier.filter({ store_owner_email: workingEmail }, '-created_date'),
                          base44.entities.Item.filter({ created_by: workingEmail })
                        ]);
                        const allSuppliers = [...headSuppliers, ...ownSuppliers, ...storeSuppliers];
                        suppliersData = allSuppliers.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
                        itemsData = [...headItems, ...ownItems, ...storeItems].filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i);
                      } else {
                        const [ownSuppliers, ownItems, storeSuppliers] = await Promise.all([
                          base44.entities.Supplier.filter({ created_by: workingEmail }, '-created_date'),
                          base44.entities.Item.filter({ created_by: workingEmail }),
                          base44.entities.Supplier.filter({ store_owner_email: workingEmail }, '-created_date')
                        ]);
                        const allSuppliers = [...ownSuppliers, ...storeSuppliers];
                        suppliersData = allSuppliers.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
                        itemsData = ownItems;
                      }
                    } else {
                      const [ownSuppliers, ownItems1, storeSuppliers, ownItems2] = await Promise.all([
                        base44.entities.Supplier.filter({ created_by: workingEmail }, '-created_date'),
                        base44.entities.Item.filter({ created_by: workingEmail }),
                        base44.entities.Supplier.filter({ store_owner_email: workingEmail }, '-created_date'),
                        base44.entities.Item.filter({ store_owner_email: workingEmail })
                      ]);
                      const allSuppliers = [...ownSuppliers, ...storeSuppliers];
                      suppliersData = allSuppliers.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
                      const allItems = [...ownItems1, ...ownItems2];
                      itemsData = allItems.filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i);
                    }
                  } else {
                    // Head store or no chain - load TARGET user's suppliers + any with store_owner_email
                    const [ownSuppliers, ownItems1, storeSuppliers, ownItems2] = await Promise.all([
                      base44.entities.Supplier.filter({ created_by: workingEmail }, '-created_date'),
                      base44.entities.Item.filter({ created_by: workingEmail }),
                      base44.entities.Supplier.filter({ store_owner_email: workingEmail }, '-created_date'),
                      base44.entities.Item.filter({ store_owner_email: workingEmail })
                    ]);
                    const allSuppliers = [...ownSuppliers, ...storeSuppliers];
                    suppliersData = allSuppliers.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
                    const allItems = [...ownItems1, ...ownItems2];
                    itemsData = allItems.filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i);
                  }

                  // Ensure we only show suppliers belonging to the TARGET context (controlled user/store)
                  const allowedEmails = new Set([workingEmail]);
                  if (storeOwnerEmail) allowedEmails.add(storeOwnerEmail);
                  try {
                    let effChainId = null;
                    try {
                      const stores2 = await base44.entities.ChainStore.filter({ user_email: workingEmail });
                      if (stores2?.length) effChainId = stores2[0].chain_id;
                    } catch {}
                    if (!effChainId && workingEmail === (currentUser.email || '')) {
                      effChainId = currentUser.chain_id || null;
                    }
                    if (effChainId) {
                      try {
                        const chainRec2 = await base44.entities.Chain.filter({ id: effChainId });
                        let headEmail2 = chainRec2?.[0]?.head_store_user_email || null;
                        if (!headEmail2) {
                          const storesInChain2 = await base44.entities.ChainStore.filter({ chain_id: effChainId });
                          const headStore2 = storesInChain2?.find(s => s.is_head_store);
                          headEmail2 = headStore2?.user_email || null;
                        }
                        if (headEmail2) allowedEmails.add(headEmail2);
                      } catch {}
                    }
                  } catch {}

                  console.log("SuppliersData BEFORE filter:", suppliersData.length, suppliersData);
                  suppliersData = suppliersData.filter((s) =>
                    allowedEmails.has(s.created_by) || (s.store_owner_email && allowedEmails.has(s.store_owner_email))
                  );
                  console.log("SuppliersData AFTER filter:", suppliersData.length);
                  console.log("allowedEmails:", Array.from(allowedEmails));
                  
                  itemsData = itemsData.filter((it) =>
                    allowedEmails.has(it.created_by) || (it.store_owner_email && allowedEmails.has(it.store_owner_email))
                  );

                  // Reverted admin filter

                  setSuppliers(suppliersData);
                  setAllItems(itemsData);
                  setCache('suppliers_v2', { suppliers: suppliersData });

                  setNetworkError(null);
        } catch (error) {
      console.error(`[Suppliers] Error loading data (attempt ${retryCount + 1}):`, error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        response: error.response
      });

      const isNetworkError = error.message === 'Network Error' || error.code === 'ERR_NETWORK';
      
      if (isNetworkError && retryCount < 3) { // Retry up to 3 times
        console.log(`[Suppliers] Retrying data load... (${retryCount + 1}/3)`);
        return loadData(currentUser, retryCount + 1);
      }
      
      setNetworkError(error.message || "Failed to load suppliers");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const checkAuthAndLoadData = async (retryCount = 0) => {
            try {
              if (!mounted) return;

              const _cache = getCache('suppliers_v2');
              const _hasCache = !!(_cache && _cache.data);
              setAuthLoading(!_hasCache);
              setNetworkError(null);

              // Add delay before retry only
              if (retryCount > 0) {
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
                await new Promise(resolve => setTimeout(resolve, delay));
              }

              const currentUser = await base44.auth.me();

                        if (mounted) {
                          setUser(currentUser);
                          setIsViewer(currentUser.store_user_role === 'viewer' || currentUser.store_user_read_only === true);
                          const c = getCache('suppliers_v2');
                          const stale = isStale(c, 180000);
                          // Force reload if impersonating or cache is stale
                          const isImpersonating = currentUser?.acting_as_user_email || currentUser?.acting_as_store_email;
                          if (stale || isImpersonating) {
                            await loadData(currentUser, 0, !!c?.data);
                          }
                        }
      } catch (error) {
        console.error(`[Suppliers] Authentication error (attempt ${retryCount + 1}):`, error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          response: error.response
        });
        
        const isNetworkError = error.message === 'Network Error' || 
                              error.code === 'ERR_NETWORK' ||
                              error.name === 'NetworkError';
        
        if (isNetworkError && retryCount < 3 && mounted) { // Retry up to 3 times
          console.log(`[Suppliers] Retrying authentication... (${retryCount + 1}/3)`);
          return checkAuthAndLoadData(retryCount + 1);
        }
        
        if (mounted) {
          setNetworkError(error.message || "Authentication failed");
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    checkAuthAndLoadData();
    
    return () => {
      mounted = false;
    };
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (supplierData) => {
        if (isViewer) return;
        // Prevent double submission
        if (isSaving) return;

        try {
          setIsSaving(true);

          if (editingSupplier) {
            await base44.entities.Supplier.update(editingSupplier.id, supplierData);
            // Stay on suppliers page when editing
            setShowForm(false);
            setEditingSupplier(null);
            await loadData(user);
          } else {
            // New supplier: create and then auto-open Items add form preselected to this supplier
            let newSupplierId = null;

            const targetEmail = user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email;
            if (targetEmail) {
              const { data } = await base44.functions.invoke('createSupplierForStore', {
                supplierData,
                storeEmail: targetEmail
              });
              newSupplierId = data?.supplier?.id || data?.created?.id || data?.supplier_id || data?.id || null;
            } else {
              const created = await base44.entities.Supplier.create({ ...supplierData, created_by: user.email });
              newSupplierId = created?.id || null;
            }

            if (!newSupplierId) {
              // Fallback: reload suppliers and try to find by name
              await loadData(user);
              const match = suppliers.find(s => s.name === supplierData.name);
              if (match) newSupplierId = match.id;
            }

            // Redirect to Items with supplier preselected and Add form open
            if (newSupplierId) {
              window.location.href = createPageUrl(`Items?supplier_id=${newSupplierId}&add=1`);
              return; // Stop further execution
            }

            // If cannot resolve supplier id, just close form and refresh
            setShowForm(false);
            setEditingSupplier(null);
            await loadData(user);
          }
        } catch (error) {
          console.error("Error saving supplier:", error);
          alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
        } finally {
          setIsSaving(false);
        }
      };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
    setShowSuppliersSheetPanel(false);
  };

  const handleDelete = async (supplierId) => {
    if (isViewer) return;
    if (!confirm(t('delete') + '?')) {
      return;
    }
    
    try {
      const { data } = await base44.functions.invoke('deleteSupplierAndItems', { supplierId });
      if (!data?.success) throw new Error(data?.error || 'Failed to delete');
      await loadData(user);
    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const handleExportSuppliers = () => {
    try {
      if (!suppliers || suppliers.length === 0) {
        alert(language === 'he' ? 'אין ספקים לייצוא' : 'No suppliers to export');
        return;
      }

      const headers = ['Supplier Name', 'Contact Name', 'Phone', 'Email', 'Minimum Order', 'Notes', 'Created Date'];
      const hebrewHeaders = ['שם ספק', 'איש קשר', 'טלפון', 'אימייל', 'מינימום הזמנה', 'הערות', 'תאריך יצירה'];
      
      const headerRow = (language === 'he' ? hebrewHeaders : headers).join(',');

      const rows = suppliers.map(supplier => {
        return [
          `"${(supplier.name || '').replace(/"/g, '""')}"`,
          `"${(supplier.contact_name || '').replace(/"/g, '""')}"`,
          `"${(supplier.phone || '').replace(/"/g, '""')}"`,
          `"${(supplier.email || '').replace(/"/g, '""')}"`,
          supplier.minimum_order || 0,
          `"${(supplier.notes || '').replace(/"/g, '""')}"`,
          supplier.created_date ? new Date(supplier.created_date).toLocaleDateString() : ''
        ].join(',');
      });

      const csvContent = "\uFEFF" + [headerRow, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `suppliers_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export error:", error);
      alert(language === 'he' ? 'שגיאה בייצוא ספקים' : 'Error exporting suppliers');
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const searchStr = String(searchTerm || '').toLowerCase();
    return !searchStr ||
      String(supplier.name || '').toLowerCase().includes(searchStr) ||
      String(supplier.phone || '').toLowerCase().includes(searchStr) ||
      String(supplier.email || '').toLowerCase().includes(searchStr);
  });

  const generateReport = async () => {
    try {
      setLoadingReport(true);
      setShowReport(true);
      
      const workingEmail = user.acting_as_store_email || user.acting_as_user_email || user.email;
      
      // Calculate date range
      let filterStartDate, filterEndDate;
      
      if (dateRangeType === 'current_month') {
        const now = new Date();
        filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        filterEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (dateRangeType === 'last_month') {
        const now = new Date();
        filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        filterEndDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      } else if (dateRangeType === 'custom') {
        filterStartDate = startDate;
        filterEndDate = endDate;
      }
      
      // Fetch all orders and receipts
      const [allOrders, allReceipts] = await Promise.all([
        base44.entities.Order.filter({ created_by: workingEmail }),
        base44.entities.SupplyReceipt.filter({ created_by: workingEmail })
      ]);
      
      // Filter by date range
      const orders = allOrders.filter(order => {
        if (!order.created_date) return false;
        const orderDate = order.created_date.split('T')[0];
        return orderDate >= filterStartDate && orderDate <= filterEndDate;
      });
      
      const receipts = allReceipts.filter(receipt => {
        if (!receipt.received_date) return false;
        return receipt.received_date >= filterStartDate && receipt.received_date <= filterEndDate;
      });
      
      // Group by supplier
      const supplierStats = {};
      
      // Process orders (already without VAT)
      orders.forEach(order => {
        const supplierId = order.supplier_id;
        const supplierName = order.supplier_name;
        
        if (!supplierStats[supplierId]) {
          supplierStats[supplierId] = {
            name: supplierName,
            totalOrdered: 0,
            totalReceived: 0
          };
        }
        
        supplierStats[supplierId].totalOrdered += (order.total_cost || 0);
      });
      
      // Process receipts (invoice_total includes VAT, need to remove it)
      const VAT_RATE = 1.17; // 17% VAT in Israel
      receipts.forEach(receipt => {
        const supplierId = receipt.supplier_id;
        const supplierName = receipt.supplier_name;
        
        if (!supplierStats[supplierId]) {
          supplierStats[supplierId] = {
            name: supplierName,
            totalOrdered: 0,
            totalReceived: 0
          };
        }
        
        // Remove VAT from invoice total
        const totalWithoutVat = (receipt.invoice_total || 0) / VAT_RATE;
        supplierStats[supplierId].totalReceived += totalWithoutVat;
      });
      
      setReportData(supplierStats);
    } catch (error) {
      console.error("Error generating report:", error);
      alert(language === 'he' ? 'שגיאה בהפקת הדוח' : 'Error generating report');
    } finally {
      setLoadingReport(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-gray-600" /> {/* Updated loader color to fit gray/white theme */}
          <p className="text-lg text-gray-700">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (networkError) {
    return (
      <NetworkErrorHandler 
        onRetry={() => {
          setNetworkError(null);
          setAuthLoading(true);
          
          if (user) {
                            loadData(user).finally(() => setAuthLoading(false));
                          } else {
                            base44.auth.me()
                              .then(currentUser => {
                                setUser(currentUser);
                                return loadData(currentUser);
                              })
              .catch(error => {
                console.error("Retry failed:", error);
                setNetworkError(error.message || "Failed to retry");
              })
              .finally(() => setAuthLoading(false));
          }
        }} 
        errorMessage={networkError}
      />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 2xl:p-12">
      <div className="w-full">
        {/* Acting as Store Banner */}
                      {user?.acting_as_store_name && (
                        <div className="mb-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Store className="w-5 h-5" />
                            <span className="font-bold">{language === 'he' ? 'עובד כסניף:' : 'Working as:'} {user.acting_as_store_name}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                          <h1 className="text-3xl font-bold text-gray-900">{t('suppliers_title')}</h1>
                          <p className="text-gray-600 mt-2">{t('suppliers_greeting', { name: user.acting_as_store_name || user.full_name })}</p>
                        </div>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex bg-white rounded-lg shadow-sm border rtl:ml-2 ltr:mr-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-100'}
                title={language === 'he' ? 'רשימה' : 'List'}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-100'}
                title={language === 'he' ? 'כרטיסים' : 'Grid'}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={generateReport}
              variant="outline"
              className="border-[#d4a373] text-[#d4a373] hover:bg-blue-50"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              {language === 'he' ? 'דוח הזמנות מול קבלות' : 'Orders vs Receipts Report'}
            </Button>

            {!isViewer && (
              <Button
                onClick={handleExportSuppliers}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-5 h-5 mr-2" />
                {language === 'he' ? 'ייצוא ספקים' : 'Export Suppliers'}
              </Button>
            )}
            {!isViewer && (
              <Button
                onClick={() => {
                  setShowSuppliersSheetPanel(!showSuppliersSheetPanel);
                  setShowForm(false);
                  setShowExcelPanel(false);
                }}
                className="bg-gray-700 hover:bg-gray-800 text-white"
              >
                <Download className="w-5 h-5 mr-2" />
                {language === 'he' ? 'ייבוא ספקים (Google Sheets)' : 'Import Suppliers (Sheets)'}
              </Button>
            )}
            {!isViewer && (
              <Button
                onClick={() => {
                  setEditingSupplier(null);
                  setShowForm(!showForm);
                  setShowSuppliersSheetPanel(false);
                }}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('add_new_supplier')}
              </Button>
            )}
          </div>
        </div>

        {(user?.role === 'admin' && (user?.acting_as_store_email || user?.acting_as_user_email)) && (
          <div className="mb-2 text-xs text-amber-700">
            {language === 'he' ? 'מציג ספקים עבור:' : 'Viewing suppliers for:'} {user.acting_as_store_email || user.acting_as_user_email}
          </div>
        )}

        {/* Orders vs Receipts Report */}
        {showReport && (
          <div className="mb-6 bg-white border rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {language === 'he' ? 'דוח הזמנות מול קבלות (ללא מע"מ)' : 'Orders vs Receipts Report (excl. VAT)'}
              </h2>
              <Button variant="ghost" onClick={() => setShowReport(false)}>✕</Button>
            </div>
            
            {/* Date Range Selector */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-right">
                    {language === 'he' ? 'בחר תקופה' : 'Select Period'}
                  </label>
                  <select
                    value={dateRangeType}
                    onChange={(e) => setDateRangeType(e.target.value)}
                    className="w-full p-2 border rounded-lg text-right"
                  >
                    <option value="current_month">{language === 'he' ? 'חודש נוכחי' : 'Current Month'}</option>
                    <option value="last_month">{language === 'he' ? 'חודש שעבר' : 'Last Month'}</option>
                    <option value="custom">{language === 'he' ? 'טווח מותאם אישית' : 'Custom Range'}</option>
                  </select>
                </div>
                
                {dateRangeType === 'custom' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-right">
                        {language === 'he' ? 'מתאריך' : 'From Date'}
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-right">
                        {language === 'he' ? 'עד תאריך' : 'To Date'}
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                onClick={generateReport}
                className="mt-4 bg-[#d4a373] hover:bg-[#b88c60]"
              >
                {language === 'he' ? 'עדכן דוח' : 'Update Report'}
              </Button>
            </div>
            
            {loadingReport ? (
              <div className="text-center py-8">
                <Loader className="w-8 h-8 animate-spin mx-auto text-gray-600" />
                <p className="mt-2 text-gray-600">{language === 'he' ? 'טוען...' : 'Loading...'}</p>
              </div>
            ) : reportData && Object.keys(reportData).length > 0 ? (
              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-3 text-right">{language === 'he' ? 'ספק' : 'Supplier'}</th>
                      <th className="border p-3 text-right">{language === 'he' ? 'סה"כ הוזמן' : 'Total Ordered'}</th>
                      <th className="border p-3 text-right">{language === 'he' ? 'סה"כ התקבל' : 'Total Received'}</th>
                      <th className="border p-3 text-right">{language === 'he' ? 'הפרש' : 'Difference'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reportData).map(([supplierId, data]) => {
                      const diff = data.totalOrdered - data.totalReceived;
                      return (
                        <tr key={supplierId} className="hover:bg-gray-50">
                          <td className="border p-3 font-medium">{data.name}</td>
                          <td className="border p-3 text-right">₪{data.totalOrdered.toFixed(2)}</td>
                          <td className="border p-3 text-right">₪{data.totalReceived.toFixed(2)}</td>
                          <td className={`border p-3 text-right font-bold ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {diff > 0 ? '+' : ''}₪{diff.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-200 font-bold">
                      <td className="border p-3">{language === 'he' ? 'סה"כ' : 'Total'}</td>
                      <td className="border p-3 text-right">
                        ₪{Object.values(reportData).reduce((sum, d) => sum + d.totalOrdered, 0).toFixed(2)}
                      </td>
                      <td className="border p-3 text-right">
                        ₪{Object.values(reportData).reduce((sum, d) => sum + d.totalReceived, 0).toFixed(2)}
                      </td>
                      <td className="border p-3 text-right">
                        ₪{(Object.values(reportData).reduce((sum, d) => sum + d.totalOrdered, 0) - Object.values(reportData).reduce((sum, d) => sum + d.totalReceived, 0)).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-sm text-gray-500 mt-3">
                  {language === 'he' 
                    ? '* הזמנות ללא מע"מ, קבלות מחושבות ללא מע"מ (17%)'
                    : '* Orders excl. VAT, receipts calculated excl. VAT (17%)'}
                </p>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                {language === 'he' ? 'אין נתונים להצגה' : 'No data to display'}
              </p>
            )}
          </div>
        )}

        <AnimatePresence>
          {!isViewer && showExcelPanel && (
            <SupplierItemsExcel
              suppliers={suppliers}
              items={allItems}
              onItemsAdded={() => loadData(user)}
              onClose={() => setShowExcelPanel(false)}
            />
          )}

          {!isViewer && showSuppliersSheetPanel && (
            <SuppliersSheetsImport
              onImportComplete={() => {
                setShowSuppliersSheetPanel(false);
                loadData(user);
              }}
              onClose={() => setShowSuppliersSheetPanel(false)}
            />
          )}

          {!isViewer && showForm && (
            <SupplierForm
              supplier={editingSupplier}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingSupplier(null);
              }}
            />
          )}
        </AnimatePresence>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder={t('search_suppliers')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader className="w-12 h-12 animate-spin text-gray-600 mx-auto mb-4" /> {/* Updated loader color to fit gray/white theme */}
            <p className="text-gray-600">{t('loading')}</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">{t('no_suppliers_to_display')}</p>
            <p className="text-gray-500">{t('start_by_adding_supplier')}</p>
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-visible hidden md:block mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-[0px] z-10">
                    <tr>
                      <th className={`p-3 font-semibold text-gray-600 ${language === 'he' ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'ספק' : 'Supplier'}</th>
                      <th className={`p-3 font-semibold text-gray-600 ${language === 'he' ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'איש קשר וטלפון' : 'Contact'}</th>
                      <th className={`p-3 font-semibold text-gray-600 ${language === 'he' ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'אימייל' : 'Email'}</th>
                      <th className={`p-3 font-semibold text-gray-600 ${language === 'he' ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'פריטים' : 'Items'}</th>
                      <th className={`p-3 font-semibold text-gray-600 ${language === 'he' ? 'text-right' : 'text-left'}`}>{t('created_at') || 'תאריך'}</th>
                      <th className={`p-3 font-semibold text-gray-600 text-left rtl:text-right`}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.map((supplier) => (
                      <SupplierCard key={supplier.id} supplier={supplier} itemCount={allItems.filter(i => i.supplier_id === supplier.id).length} onEdit={handleEdit} onDelete={handleDelete} onImportComplete={() => loadData(user)} viewMode="list" />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${viewMode === 'list' ? 'md:hidden' : ''}`}>
              {filteredSuppliers.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} itemCount={allItems.filter(i => i.supplier_id === supplier.id).length} onEdit={handleEdit} onDelete={handleDelete} onImportComplete={() => loadData(user)} viewMode="grid" />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Help Chat */}
                {user && (
                  <AppHelpChat 
                    currentPage="Suppliers"
                    suppliers={suppliers}
                    onSupplierAdded={() => loadData(user)}
                                          onItemAdded={() => loadData(user)}
                  />
                )}
    </div>
  );
}