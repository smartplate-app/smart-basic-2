import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, Warehouse as WarehouseIcon, RefreshCw, LayoutGrid, List, FileSpreadsheet, Camera, Upload, Merge, MoreHorizontal, FileDown, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AnimatePresence } from "framer-motion";
import { useLanguage } from "../components/LanguageProvider";
import NetworkErrorHandler from "../components/NetworkErrorHandler";

import CountForm from "../components/inventory/CountForm";
import CountCard from "../components/inventory/CountCard";
import CountListView from "../components/inventory/CountListView";
import WarehouseManagement from "../components/inventory/WarehouseManagement";
import ExcelInventoryImport from "../components/inventory/ExcelInventoryImport";
import MultiScreenshotCountImport from "../components/inventory/MultiScreenshotCountImport";
import { getCache, setCache, isStale } from "../components/utils/cache";

export default function MonthlyCountPage() {
  const [counts, setCounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [showCountForm, setShowCountForm] = useState(false);
  const [showWarehouseManagement, setShowWarehouseManagement] = useState(false);
  const [editingCount, setEditingCount] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [networkError, setNetworkError] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showNewCountOptions, setShowNewCountOptions] = useState(false);
  const [showScreenshotImport, setShowScreenshotImport] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { t, language } = useLanguage();
  const [exportStartDate, setExportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);
  const [generatingSheet, setGeneratingSheet] = useState(false);
  const [importingSheet, setImportingSheet] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedCountsForMerge, setSelectedCountsForMerge] = useState([]);
  const [isViewer, setIsViewer] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportDatePreset, setExportDatePreset] = useState("month");
  const [exportingSingleSheetId, setExportingSingleSheetId] = useState(null);

  // Hydrate from cache for instant UI
  useEffect(() => {
    const c = getCache('monthly_count_v1');
    if (c?.data) {
      setCounts(c.data.counts || []);
      setWarehouses(c.data.warehouses || []);
      setItems(c.data.items || []);
      setLoading(false);
    }
  }, []);

  const loadData = async (userEmail, retryAttempt = 0, isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setNetworkError(null);
      setRetryCount(retryAttempt);
      
      console.log(`[MonthlyCount] Loading data (attempt ${retryAttempt + 1})...`);
      
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network.');
      }
      
      if (retryAttempt > 0) {
        const delay = Math.min(3000 * Math.pow(1.5, retryAttempt - 1), 15000);
        console.log(`[MonthlyCount] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      let countsData = [];
      let warehousesData = [];
      let itemsData = [];

      try {
        const currentUserReq = await base44.auth.me();
        const isAdminControlling = currentUserReq?.role === 'admin' && userEmail !== currentUserReq.email;

        if (isAdminControlling) {
            console.log("[MonthlyCount] Loading as admin impersonating...");
            const { data } = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: userEmail });
            if (data?.success) {
                countsData = data.data.inventory || [];
                warehousesData = data.data.warehouses || [];
                itemsData = data.data.items || [];
            }
        } else {
            console.log("[MonthlyCount] Loading data in parallel...");
            const query = { $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] };
            // Use service role for store users (workers/managers) so RLS doesn't block them from seeing the owner's data
            const isStoreUser = currentUserReq.store_user_owner_email || currentUserReq.acting_as_store_email;
            const api = isStoreUser ? base44.asServiceRole.entities : base44.entities;
            const [fetchedCounts, fetchedWarehouses, fetchedItems] = await Promise.all([
              api.InventoryCount.filter(query, "-count_date", 10000),
              api.Warehouse.filter(query, "name", 10000),
              api.Item.filter(query, "name", 10000)
            ]);
            countsData = fetchedCounts || [];
            warehousesData = fetchedWarehouses || [];
            itemsData = fetchedItems || [];
        }
      } catch (e) {
          console.error("Error fetching admin data for counts", e);
      }

      setCounts(countsData);
      console.log(`[MonthlyCount] Successfully loaded ${countsData.length} counts`);
      
      setWarehouses(warehousesData);
      console.log(`[MonthlyCount] Successfully loaded ${warehousesData.length} warehouses`);
      
      setItems(itemsData);
      console.log(`[MonthlyCount] Successfully loaded ${itemsData.length} items`);

      setCache('monthly_count_v1', { counts: countsData, warehouses: warehousesData, items: itemsData });
      
      setNetworkError(null);
      setRetryCount(0);
    } catch (error) {
      console.error(`[MonthlyCount] Error loading data (attempt ${retryAttempt + 1}):`, error);
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
      
      if (isNetworkError && retryAttempt < 5) {
        console.log(`[MonthlyCount] Will retry data loading... (${retryAttempt + 1}/5)`);
        const retryDelay = Math.min(3000 * Math.pow(1.5, retryAttempt), 15000);
        setTimeout(() => loadData(userEmail, retryAttempt + 1), retryDelay);
        return;
      }
      
      console.error("[MonthlyCount] Max retries reached or non-network error");
      setNetworkError(error.message || 'Failed to load data');
      setCounts([]);
      setWarehouses([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let retryTimeout = null;
    let initTimeout = null;
    let unsubscribeCounts = null;
    
    const checkAuthAndLoadData = async (retryAttempt = 0) => {
      try {
        if (!mounted) return;
        
        setAuthLoading(true);
        setNetworkError(null);
        setRetryCount(retryAttempt);
        
        console.log(`[MonthlyCount] Authentication attempt ${retryAttempt + 1}`);
        
        if (!navigator.onLine) {
          throw new Error('No internet connection. Please check your network.');
        }
        
        if (retryAttempt > 0) {
          const delay = Math.min(3000 * Math.pow(1.5, retryAttempt - 1), 15000);
          console.log(`[MonthlyCount] Waiting ${delay}ms before auth retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log('[MonthlyCount] Calling base44.auth.me()...');
        const currentUser = await base44.auth.me();
        console.log("[MonthlyCount] User authenticated successfully:", currentUser.email);
        
        if (!mounted) return;
        
        setUser(currentUser);
        setIsViewer(currentUser.store_user_role === 'viewer' || currentUser.store_user_role === 'worker' || currentUser.store_user_read_only === true);
        setAuthLoading(false);
        
        if (mounted) {
          // Determine the working email based on user type
          let workingEmail = currentUser.acting_as_store_email || currentUser.email;
          
          // Check if user is a store user (worker/manager)
          let storeOwnerEmail = currentUser.store_user_owner_email;
          if (!storeOwnerEmail) {
            try {
              const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: currentUser.email, is_active: true });
              if (storeUserRecords.length > 0) {
                storeOwnerEmail = storeUserRecords[0].owner_email;
              }
            } catch (e) {
              console.log("Could not fetch store user records");
            }
          }
          
          // If store user, load data from owner's email
          if (storeOwnerEmail) {
            workingEmail = storeOwnerEmail;
          }
          
          const c = getCache('monthly_count_v1');
          const stale = isStale(c, 180000);
          const isImpersonating = currentUser?.acting_as_user_email || currentUser?.acting_as_store_email;
          
          // Always fetch in background to ensure we see newly auto-saved drafts
          const hasCachedCounts = c?.data?.counts?.length > 0;
          if (c?.data && hasCachedCounts && !isImpersonating && !stale) {
            loadData(workingEmail, 0, true).catch(console.error);
          } else {
            await loadData(workingEmail);
          }
          
          // Setup real-time subscription for the counts list
          unsubscribeCounts = base44.entities.InventoryCount.subscribe((event) => {
            if (!mounted) return;
            setCounts(prevCounts => {
              if (event.type === 'create') {
                if (!prevCounts.find(c => c.id === event.id) && event.data.created_by === workingEmail) {
                  return [event.data, ...prevCounts];
                }
              } else if (event.type === 'update') {
                return prevCounts.map(c => c.id === event.id ? { ...c, ...event.data } : c);
              } else if (event.type === 'delete') {
                return prevCounts.filter(c => c.id !== event.id);
              }
              return prevCounts;
            });
          });
        }
      } catch (error) {
        console.error(`[MonthlyCount] Authentication error (attempt ${retryAttempt + 1}):`, error);
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
        
        if (isNetworkError && retryAttempt < 5 && mounted) {
          console.log(`[MonthlyCount] Will retry authentication... (${retryAttempt + 1}/5)`);
          const retryDelay = Math.min(3000 * Math.pow(1.5, retryAttempt), 15000);
          retryTimeout = setTimeout(() => {
            if (mounted) {
              checkAuthAndLoadData(retryAttempt + 1);
            }
          }, retryDelay);
          return;
        }
        
        console.error("[MonthlyCount] Max retries reached or non-network error");
        if (mounted) {
          setNetworkError(error.message || "Authentication failed");
          setAuthLoading(false);
        }
      }
    };

    initTimeout = setTimeout(() => {
      if (mounted) {
        checkAuthAndLoadData();
      }
    }, 100);
    
    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      if (unsubscribeCounts) {
        unsubscribeCounts();
      }
    };
  }, []); // Removed 't' dependency to prevent infinite fetch loops causing rate limits

  const handleCountSubmit = async (countData) => {
    const isExistingCount = editingCount && editingCount.id;

    try {
      console.log('[MonthlyCount] Saving count:', countData);
      
      if (isExistingCount) {
        await base44.entities.InventoryCount.update(editingCount.id, countData);
        console.log('[MonthlyCount] Count updated successfully');
      } else {
        await base44.entities.InventoryCount.create(countData);
        console.log('[MonthlyCount] Count created successfully');
      }
      
      setShowCountForm(false);
      setEditingCount(null);
      
      const reloadEmail = user.store_user_owner_email || user.acting_as_store_email || user.email;
      console.log('[MonthlyCount] Reloading data...');
      await loadData(reloadEmail);
      console.log('[MonthlyCount] Data reloaded successfully');
      
    } catch (error) {
      console.error("Error saving count:", error);
      alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const handleEditCount = (count) => {
    setEditingCount(count);
    setShowCountForm(true);
  };

  const handleNewDailyCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const dailyItems = [];
    
    // For express count, put each item in the first warehouse that has it in its catalog,
    // or 'unspecified' if none.
    items.forEach(item => {
      let wId = "unspecified";
      const w = warehouses.find(wh => wh.catalog_items?.includes(item.id));
      if (w) wId = w.id;
      
      dailyItems.push({
        item_id: item.id,
        item_name: item.name,
        warehouse_id: wId,
        counted_quantity: 0,
        unit: item.unit,
        price_per_unit: item.price || 0,
        total_cost: 0,
        notes: ""
      });
    });

    setEditingCount({
      warehouse_id: "multi",
      warehouse_name: language === 'he' ? "ספירת אקספרס" : "Express Count",
      count_date: today,
      count_type: "daily",
      items: dailyItems,
      total_inventory_value: 0,
      name: "",
      notes: "",
      status: "in_progress"
    });
    setShowCountForm(true);
  };

  const handleDeleteCount = async (count) => {
    const id = typeof count === 'string' ? count : count?.id;
    if (!id) return;
    try {
      const { data } = await base44.functions.invoke('deleteInventoryCount', { countId: id });
      if (!data?.success) throw new Error(data?.error || 'Failed to delete count');
      const reloadEmail = user.store_user_owner_email || user.acting_as_store_email || user.email;
      await loadData(reloadEmail);
    } catch (error) {
      console.error('Error deleting count:', error);
      alert((t('error_saving') || 'Error') + ': ' + (error.message || 'Unknown'));
    }
  };

  const handleExcelImport = (importedData) => {
    console.log('[MonthlyCount] Excel import received:', importedData);
    setEditingCount({
      warehouse_id: importedData.warehouse_id || "",
      warehouse_name: importedData.warehouse_name,
      count_date: new Date().toISOString().split('T')[0],
      count_type: "monthly",
      items: importedData.items,
      total_inventory_value: importedData.total_inventory_value,
      notes: "",
      status: "in_progress"
    });
    setShowCountForm(true);
    setShowExcelImport(false);
  };

  const handleScreenshotImport = (importedData) => {
    console.log('[MonthlyCount] Screenshot import received:', importedData);
    console.log('[MonthlyCount] Items:', importedData.items);
    console.log('[MonthlyCount] Total value:', importedData.total_inventory_value);
    
    setEditingCount({
      warehouse_id: importedData.warehouse_id || "",
      warehouse_name: importedData.warehouse_name,
      count_date: new Date().toISOString().split('T')[0],
      count_type: "monthly",
      items: importedData.items,
      total_inventory_value: importedData.total_inventory_value,
      screenshot_urls: importedData.screenshot_urls || [],
      notes: "",
      status: "in_progress"
    });
    setShowCountForm(true);
    setShowScreenshotImport(false);
    
    console.log('[MonthlyCount] Count form should now be visible');
  };

  const handleExportToSheets = async () => {
    try {
      setExporting(true);
      setExportProgress(10);
      
      const progressInterval = setInterval(() => {
        setExportProgress(p => p < 90 ? p + 10 : p);
      }, 500);

      const { data } = await base44.functions.invoke('exportCountsToSheets', {
        start_date: exportStartDate,
        end_date: exportEndDate
      });
      
      clearInterval(progressInterval);
      setExportProgress(100);

      if (data?.success && data?.spreadsheetUrl) {
         alert(language === 'he' ? 'הספירות יוצאו בהצלחה ל-Google Drive שלך!' : 'Counts exported successfully to your Google Drive!');
         const url = data.spreadsheetUrl;
         const a = document.createElement('a');
         a.href = url;
         a.target = '_blank';
         a.rel = 'noopener noreferrer';
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         
         // Fallback for Android WebView / APK to force intent
         setTimeout(() => {
           if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
             window.location.href = url;
           }
         }, 500);
      } else {
        alert(t('error_saving') || 'Export failed');
      }
    } catch (e) {
      console.error('Export error:', e);
      alert((t('error_saving') || 'Error') + ': ' + (e?.message || ''));
    } finally {
      setTimeout(() => {
        setExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  const handleGenerateCountSheet = async () => {
    try {
      setGeneratingSheet(true);
      const payload = warehouseFilter !== 'all' ? { warehouse_id: warehouseFilter, language } : { language };
      const { data } = await base44.functions.invoke('generateInventoryCountSheet', payload);
      if (data?.sheet?.webViewLink) {
         const url = data.sheet.webViewLink;
         const a = document.createElement('a');
         a.href = url;
         a.target = '_blank';
         a.rel = 'noopener noreferrer';
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         
         // Fallback for Android WebView / APK to force intent
         setTimeout(() => {
           if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
             window.location.href = url;
           }
         }, 500);
      }
      alert((t('export_completed') || 'Generated') + (data?.sheet?.webViewLink ? `\n${data.sheet.webViewLink}` : ''));
    } catch (e) {
      alert((t('error_saving') || 'Error') + ': ' + (e?.message || ''));
    } finally {
      setGeneratingSheet(false);
    }
  };

  const handleImportCountFromSheet = async () => {
    try {
      const url = window.prompt(t('paste_sheet_url') || 'Paste Google Sheet URL');
      if (!url) return;
      setImportingSheet(true);
      const name = window.prompt(t('count_name') || 'Count name (optional)') || '';
      const date = window.prompt(t('count_date') || 'Count date (YYYY-MM-DD)', new Date().toISOString().slice(0,10)) || '';
      const { data } = await base44.functions.invoke('importInventoryCountFromSheet', { sheet_url: url, count_name: name, count_date: date });
      if (data?.success) {
        alert(t('import_completed') || 'Import completed');
        const reloadEmail = user.store_user_owner_email || user.acting_as_store_email || user.email;
        await loadData(reloadEmail);
        if (data?.count) {
          setEditingCount(data.count);
          setShowCountForm(true);
        }
      } else {
        alert((t('error_saving') || 'Error') + ': ' + (data?.error || ''));
      }
    } catch (e) {
      alert((t('error_saving') || 'Error') + ': ' + (e?.message || ''));
    } finally {
      setImportingSheet(false);
    }
  };

  const handleExportSingleSheet = async (count) => {
    try {
      setExportingSingleSheetId(count.id);
      const payload = {
        title: count.name || count.warehouse_name,
        items: count.items || [],
        total_value: count.total_inventory_value || 0,
        language
      };
      
      const { data } = await base44.functions.invoke('exportSingleCountToSheets', payload);
      
      if (data?.success && data?.spreadsheetUrl) {
         // Optionally remove the alert so the redirect is totally seamless
         // alert((language === 'he' ? 'יוצא בהצלחה! פותח את הגיליון...' : 'Exported successfully! Opening sheet...'));
         const url = data.spreadsheetUrl;
         
         const a = document.createElement('a');
         a.href = url;
         a.target = '_blank';
         a.rel = 'noopener noreferrer';
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         
         // Fallback for Android WebView / APK to force intent and open Google Drive
         setTimeout(() => {
           if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
             window.location.href = url;
           }
         }, 500);

      } else {
        alert(t('error_saving') || 'Export failed');
      }
    } catch (e) {
      alert((t('error_saving') || 'Error') + ': ' + (e?.message || ''));
    } finally {
      setExportingSingleSheetId(null);
    }
  };

  // Export current count via HTML (best Hebrew support). Open window first to avoid popup blockers.
  const handleExportPdf = async (count) => {
    const win = window.open('about:blank', '_blank');
    if (win) {
      win.document.write('<!doctype html><html><body style="font-family:sans-serif;padding:24px;">Loading…</body></html>');
      win.document.close();
    }
    try {
      const { data } = await base44.functions.invoke('exportInventoryCountHtml', { count_id: count.id });
      if (win) {
        win.document.open();
        win.document.write(typeof data === 'string' ? data : String(data));
        win.document.close();
      } else {
        // Fallback: open blob URL
        const blob = new Blob([typeof data === 'string' ? data : String(data)], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (e) {
      if (win) {
        win.document.open();
        win.document.write(`<pre style="color:#b91c1c;">${(t('error_saving') || 'Error')}: ${e?.message || e}</pre>`);
        win.document.close();
      } else {
        alert((t('error_saving') || 'Error') + ': ' + (e?.message || e));
      }
    }
  };

  /* handleSendPdf removed per request */

  const filteredCounts = counts.filter(count => {
    const searchTarget = (count.warehouse_name || count.name || "").toLowerCase();
    const matchesSearch = searchTarget.includes(searchTerm.toLowerCase());
    const matchesWarehouse = warehouseFilter === "all" || count.warehouse_id === warehouseFilter;
    return matchesSearch && matchesWarehouse;
  });

  const completedCounts = filteredCounts.filter(c => c.status === 'completed');
  let lastCountValue = 0;
  if (completedCounts.length > 0) {
    const latestDate = completedCounts.reduce((max, c) => (!max || c.count_date > max) ? c.count_date : max, "");
    lastCountValue = completedCounts.filter(c => c.count_date === latestDate).reduce((sum, c) => sum + (c.total_inventory_value || 0), 0);
  } else if (filteredCounts.length > 0) {
    const latestDate = filteredCounts.reduce((max, c) => (!max || c.count_date > max) ? c.count_date : max, "");
    lastCountValue = filteredCounts.filter(c => c.count_date === latestDate).reduce((sum, c) => sum + (c.total_inventory_value || 0), 0);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">

          <Loader className="w-12 h-12 animate-spin text-gray-900" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
          {retryCount > 0 && (
            <p className="text-sm text-orange-600 text-center px-4">
              {t('retrying') || 'מנסה שוב'} ({retryCount}/5)
            </p>
          )}
        </div>
      </div>
    );
  }

  if (networkError && !user) {
    return (
      <NetworkErrorHandler 
        onRetry={() => {
          setNetworkError(null);
          setAuthLoading(true);
          setRetryCount(0);
          
          window.location.reload();
        }} 
        errorMessage={networkError}
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
            <h1 className="text-3xl font-bold text-gray-900">{t('monthly_count_title')}</h1>
            <p className="text-gray-600 mt-2">{t('monthly_count_greeting', { name: user.full_name })}</p>
          </div>
          <div className="flex gap-3 flex-wrap items-center w-full md:w-auto mt-4 md:mt-0">
            <div className="flex bg-white rounded-lg shadow-sm border">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('cards')}
                className={viewMode === 'cards' ? 'bg-[#d4a373] hover:bg-[#b88c60] text-white' : 'text-gray-600 hover:bg-gray-100'}
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-[#d4a373] hover:bg-[#b88c60] text-white' : 'text-gray-600 hover:bg-gray-100'}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreHorizontal className="w-4 h-4" />
                  {language === 'he' ? 'פעולות נוספות' : 'More Actions'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={language === 'he' ? 'start' : 'end'} className="w-56">
                <DropdownMenuItem onClick={handleGenerateCountSheet} disabled={generatingSheet}>
                  <FileSpreadsheet className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                  {generatingSheet ? (t('generating') || 'Generating...') : (language === 'he' ? 'יצירת גיליון ספירה' : 'Generate Count Sheet')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImportCountFromSheet} disabled={importingSheet}>
                  <Upload className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                  {importingSheet ? (t('importing') || 'Importing...') : (language === 'he' ? 'ייבוא מגיליון (קישור)' : 'Import from Sheet URL')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                  <FileDown className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                  {language === 'he' ? 'ייצוא היסטוריית ספירות' : 'Export Counts History'}
                </DropdownMenuItem>
                {!isViewer && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowWarehouseManagement(true)}>
                      <WarehouseIcon className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                      {t('manage_warehouses')}
                    </DropdownMenuItem>
                  </>
                )}
                {!isViewer && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowMergeModal(true)} className="text-purple-600 focus:text-purple-600">
                      <Merge className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                      {language === 'he' ? 'מזג ספירות' : 'Merge Counts'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {!isViewer && (
              <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                <Button 
                  onClick={() => { setShowCountForm(true); setEditingCount(null); }}
                  className="bg-[#d4a373] hover:bg-[#b88c60] text-white flex-1 md:flex-none shadow-sm h-11 md:h-10" 
                  disabled={warehouses.length === 0}
                >
                  <Plus className={`w-4 h-4 ${language === 'he' ? 'ml-2' : 'mr-2'}`} />
                  {t('new_count') || 'New Count'}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-11 md:h-10 px-3 bg-white border-gray-200">
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={language === 'he' ? 'start' : 'end'} className="w-56">
                    <DropdownMenuItem onClick={() => { setShowExcelImport(true); setShowNewCountOptions(false); }} className="py-3">
                      <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                      <div className="flex flex-col">
                        <span>{language === 'he' ? 'ייבא מאקסל' : 'Import from Excel'}</span>
                        <span className="text-xs text-gray-500">{language === 'he' ? 'העלה קובץ ספירה מהקופה' : 'Upload POS count file'}</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {warehouses.length === 0 && !showWarehouseManagement && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <WarehouseIcon className="w-6 h-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">{t('no_warehouses')}</h3>
                <p className="text-sm text-yellow-800 mb-4">{t('create_warehouse_first')}</p>
                {!isViewer && (
                  <Button
                    onClick={() => setShowWarehouseManagement(true)}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    <WarehouseIcon className="w-4 h-4 ml-2" />
                    {t('create_warehouse')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showWarehouseManagement && (
            <WarehouseManagement
              warehouses={warehouses}
              onClose={() => {
                setShowWarehouseManagement(false);
                const reloadEmail = user.store_user_owner_email || user.acting_as_store_email || user.email;
                loadData(reloadEmail);
              }}
            />
          )}

          {showExcelImport && (
            <ExcelInventoryImport
              warehouses={warehouses}
              onImport={handleExcelImport}
              onCancel={() => setShowExcelImport(false)}
            />
          )}

          {showScreenshotImport && (
            <MultiScreenshotCountImport
              warehouses={warehouses}
              onImport={handleScreenshotImport}
              onCancel={() => setShowScreenshotImport(false)}
            />
          )}

          {showCountForm && (
            <CountForm
              count={editingCount}
              warehouses={warehouses}
              items={items}
              onSubmit={handleCountSubmit}
              onCancel={() => {
                setShowCountForm(false);
                setEditingCount(null);
                const reloadEmail = user.store_user_owner_email || user.acting_as_store_email || user.email;
                loadData(reloadEmail); // Reload to show any auto-saved drafts
              }}
              onWarehouseCatalogSaved={() => { const reloadEmail = user.store_user_owner_email || user.acting_as_store_email || user.email; loadData(reloadEmail); }}
            />
          )}
        </AnimatePresence>

        {warehouses.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t('search_counts')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('select_warehouse')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_warehouses')}</SelectItem>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                <span className="text-emerald-900 font-semibold">{language === 'he' ? 'ערך ספירת מלאי אחרונה' : 'Last Inventory Count Value'}</span>
                <span className="text-emerald-700 font-bold">₪{lastCountValue.toFixed(2)}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col justify-center items-center py-12 gap-3">
                <Loader className="w-12 h-12 animate-spin text-gray-900" />
                <p className="text-gray-600">{t('loading')}</p>
                {retryCount > 0 && (
                  <p className="text-sm text-orange-600">
                    {t('retrying') || 'מנסה שוב'} ({retryCount}/5)
                  </p>
                )}
              </div>
            ) : (
              <>
                {viewMode === 'cards' ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <AnimatePresence>
                      {filteredCounts.map((count) => (
                        <CountCard
                          key={count.id}
                          count={count}
                          onEdit={handleEditCount}
                          onDelete={handleDeleteCount}
                          onExportSheet={handleExportSingleSheet}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <CountListView
                    counts={filteredCounts}
                    onEdit={handleEditCount}
                    onDelete={handleDeleteCount}
                    onExport={handleExportPdf}
                    onExportSheet={handleExportSingleSheet}
                    exportingSheetId={exportingSingleSheetId}
                  />
                )}

                {!loading && filteredCounts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-lg mb-2">{t('no_counts_to_display')}</div>
                    <div className="text-gray-500">{t('start_by_creating_count')}</div>
                  </div>
                )}
              </>
            )}
          </>
        )}
        
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'he' ? 'ייצוא היסטוריית ספירות' : 'Export Counts History'}</DialogTitle>
              <DialogDescription>
                {language === 'he' ? 'בחר את הטווח שממנו תרצה לייצא את נתוני הספירות שבוצעו.' : 'Select the date range to export count data from.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'he' ? 'טווח תאריכים' : 'Date Range'}</label>
                <Select value={exportDatePreset} onValueChange={(v) => {
                  setExportDatePreset(v);
                  const now = new Date();
                  if (v === 'week') {
                    const s = new Date(now); s.setDate(s.getDate() - s.getDay());
                    const e = new Date(s); e.setDate(s.getDate() + 6);
                    setExportStartDate(s.toISOString().slice(0,10)); setExportEndDate(e.toISOString().slice(0,10));
                  } else if (v === 'month') {
                    const s = new Date(now.getFullYear(), now.getMonth(), 1);
                    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setExportStartDate(s.toISOString().slice(0,10)); setExportEndDate(e.toISOString().slice(0,10));
                  } else if (v === 'year') {
                    const s = new Date(now.getFullYear(), 0, 1);
                    const e = new Date(now.getFullYear(), 11, 31);
                    setExportStartDate(s.toISOString().slice(0,10)); setExportEndDate(e.toISOString().slice(0,10));
                  } else if (v === 'last_year') {
                    const s = new Date(now.getFullYear() - 1, 0, 1);
                    const e = new Date(now.getFullYear() - 1, 11, 31);
                    setExportStartDate(s.toISOString().slice(0,10)); setExportEndDate(e.toISOString().slice(0,10));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'he' ? 'בחר טווח' : 'Select range'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">{language === 'he' ? 'החודש' : 'This Month'}</SelectItem>
                    <SelectItem value="week">{language === 'he' ? 'השבוע' : 'This Week'}</SelectItem>
                    <SelectItem value="year">{language === 'he' ? 'מתחילת השנה' : 'Year to Date'}</SelectItem>
                    <SelectItem value="last_year">{language === 'he' ? 'שנה שעברה' : 'Last Year'}</SelectItem>
                    <SelectItem value="custom">{language === 'he' ? 'טווח תאריכים מותאם...' : 'Custom Range...'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {exportDatePreset === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <Input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} />
                  <span>-</span>
                  <Input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} />
                </div>
              )}
            </div>
            {exporting && exportProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 my-4">
                <div className="bg-[#d4a373] h-2.5 rounded-full transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>{t('cancel') || 'Cancel'}</Button>
              <Button onClick={() => { handleExportToSheets(); }} disabled={exporting || filteredCounts.length === 0} className="bg-[#d4a373] hover:bg-[#b88c60] text-white relative overflow-hidden">
                {exporting ? <Loader className="w-4 h-4 animate-spin rtl:ml-2 ltr:mr-2 z-10" /> : <FileSpreadsheet className="w-4 h-4 rtl:ml-2 ltr:mr-2 z-10" />}
                <span className="z-10">{t('save_to_google_sheets') || 'Save to Google Sheets'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showMergeModal} onOpenChange={(open) => { setShowMergeModal(open); if(!open) setSelectedCountsForMerge([]); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{language === 'he' ? 'מיזוג ספירות (מצב אדמין)' : 'Merge Counts (Admin Mode)'}</DialogTitle>
              <DialogDescription>
                {language === 'he' ? 'בחר את הספירות שתרצה לאחד לאחת. הפעולה תיצור ספירה חדשה משולבת (הספירות המקוריות יישמרו כגיבוי).' : 'Select counts to merge into one. This will create a new combined count (the original counts will be kept as backups).'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-start mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todaysCounts = counts.filter(c => c.count_date === today).map(c => c.id);
                  if (todaysCounts.length > 0) {
                    setSelectedCountsForMerge(todaysCounts);
                  } else {
                    alert(language === 'he' ? 'לא נמצאו ספירות פתוחות להיום' : 'No open counts found for today');
                  }
                }}
              >
                {language === 'he' ? 'בחר את הספירות של היום' : "Select Today's Counts"}
              </Button>
            </div>
            <div className="space-y-4 my-4">
              {counts.length === 0 ? (
                <p className="text-gray-500">{language === 'he' ? 'אין ספירות זמינות' : 'No counts available'}</p>
              ) : (
                counts.map(c => (
                  <div key={c.id} className="flex items-center space-x-3 rtl:space-x-reverse border p-3 rounded-md">
                    <Checkbox 
                      id={`merge-${c.id}`} 
                      checked={selectedCountsForMerge.includes(c.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedCountsForMerge([...selectedCountsForMerge, c.id]);
                        else setSelectedCountsForMerge(selectedCountsForMerge.filter(id => id !== c.id));
                      }}
                    />
                    <label htmlFor={`merge-${c.id}`} className="flex-1 cursor-pointer flex justify-between items-center ml-2 rtl:mr-2">
                      <div>
                        <span className="font-semibold block">{c.name || c.warehouse_name || 'Unnamed Count'}</span>
                        <span className="text-sm text-gray-500">{c.count_date} • {c.items?.length || 0} items</span>
                      </div>
                      <span className="font-bold">₪{(c.total_inventory_value || 0).toFixed(2)}</span>
                    </label>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMergeModal(false)}>{t('cancel') || 'Cancel'}</Button>
              <Button 
                onClick={async () => {
                  if (selectedCountsForMerge.length < 2) {
                    alert(language === 'he' ? 'בחר לפחות 2 ספירות למיזוג' : 'Select at least 2 counts to merge');
                    return;
                  }
                  if (!confirm(language === 'he' ? 'האם אתה בטוח שברצונך לאחד ספירות אלו? תיווצר ספירה חדשה והספירות הישנות יישמרו כגיבוי ולא יימחקו.' : 'Are you sure you want to merge these counts? A new count will be created and the old ones will be kept as backups.')) return;
                  try {
                    setShowMergeModal(false);
                    setLoading(true);
                    const mergedName = language === 'he' ? 'סיכום מחסן ראשי' : 'Head Warehouse Summary';
                    const response = await base44.functions.invoke('mergeInventoryCounts', { 
                        countIds: selectedCountsForMerge,
                        mergedName: mergedName
                    });
                    
                    if (!response.data.success) {
                        throw new Error(response.data.error || 'Failed to merge counts');
                    }
                    
                    setSelectedCountsForMerge([]);
                    alert(language === 'he' ? 'הספירות מוזגו בהצלחה' : 'Counts merged successfully');
                    const targetEmail = user.store_user_owner_email || user.acting_as_store_email || user.acting_as_user_email || user.email;
                     await loadData(targetEmail);
                  } catch (error) {
                    console.error(error);
                    alert("Error merging counts: " + error.message);
                    setLoading(false);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={selectedCountsForMerge.length < 2}
              >
                {t('merge_counts') || 'Merge'} ({selectedCountsForMerge.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}