import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, Warehouse as WarehouseIcon, RefreshCw, LayoutGrid, List, FileSpreadsheet, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence } from "framer-motion";
import { useLanguage } from "../components/LanguageProvider";
import NetworkErrorHandler from "../components/NetworkErrorHandler";

import CountForm from "../components/inventory/CountForm";
import CountCard from "../components/inventory/CountCard";
import CountListView from "../components/inventory/CountListView";
import WarehouseManagement from "../components/inventory/WarehouseManagement";
import ExcelInventoryImport from "../components/inventory/ExcelInventoryImport";
import MultiScreenshotCountImport from "../components/inventory/MultiScreenshotCountImport";

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
  const [viewMode, setViewMode] = useState("cards");
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showScreenshotImport, setShowScreenshotImport] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { t } = useLanguage();

  const loadData = async (userEmail, retryAttempt = 0) => {
    try {
      setLoading(true);
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
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("[MonthlyCount] Loading counts...");
      const countsData = await base44.entities.InventoryCount.filter({ created_by: userEmail }, "-count_date");
      setCounts(countsData);
      console.log(`[MonthlyCount] Successfully loaded ${countsData.length} counts`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("[MonthlyCount] Loading warehouses...");
      const warehousesData = await base44.entities.Warehouse.filter({ created_by: userEmail }, "name");
      setWarehouses(warehousesData);
      console.log(`[MonthlyCount] Successfully loaded ${warehousesData.length} warehouses`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("[MonthlyCount] Loading items...");
      const itemsData = await base44.entities.Item.filter({ created_by: userEmail }, "name");
      setItems(itemsData);
      console.log(`[MonthlyCount] Successfully loaded ${itemsData.length} items`);
      
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
        
        if (retryAttempt === 0) {
          console.log('[MonthlyCount] Initial delay for SDK initialization...');
          await new Promise(resolve => setTimeout(resolve, 1000));
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
        setAuthLoading(false);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
          
          await loadData(workingEmail);
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
    };
  }, [t]);

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
      
      console.log('[MonthlyCount] Reloading data...');
      await loadData(user.email);
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

  const filteredCounts = counts.filter(count => {
    const matchesSearch = count.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = warehouseFilter === "all" || count.warehouse_id === warehouseFilter;
    return matchesSearch && matchesWarehouse;
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
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => setShowWarehouseManagement(true)}
              variant="outline"
              className="border-gray-600 text-gray-700 hover:bg-gray-100"
            >
              <WarehouseIcon className="w-5 h-5 ml-2" />
              {t('manage_warehouses')}
            </Button>
            
            <Button
              onClick={() => setShowScreenshotImport(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Camera className="w-5 h-5 ml-2" />
              {t('import_from_screenshots') || 'ייבא מצילומי מסך'}
            </Button>

            <Button
              onClick={() => setShowExcelImport(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileSpreadsheet className="w-5 h-5 ml-2" />
              {t('import_from_excel') || 'ייבא מאקסל'}
            </Button>
            
            <div className="flex bg-white rounded-lg shadow-sm border">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('cards')}
                className={viewMode === 'cards' ? 'bg-gray-900 hover:bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-gray-900 hover:bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
            
            <Button
              onClick={() => {
                setShowCountForm(!showCountForm);
                setEditingCount(null);
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white"
              disabled={warehouses.length === 0}
            >
              <Plus className="w-5 h-5 ml-2" />
              {t('new_count')}
            </Button>
          </div>
        </div>

        {warehouses.length === 0 && !showWarehouseManagement && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <WarehouseIcon className="w-6 h-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">{t('no_warehouses')}</h3>
                <p className="text-sm text-yellow-800 mb-4">{t('create_warehouse_first')}</p>
                <Button
                  onClick={() => setShowWarehouseManagement(true)}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  <WarehouseIcon className="w-4 h-4 ml-2" />
                  {t('create_warehouse')}
                </Button>
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
                loadData(user.email);
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
              }}
              onWarehouseCatalogSaved={() => loadData(user.email)}
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
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <CountListView
                    counts={filteredCounts}
                    onEdit={handleEditCount}
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
      </div>
    </div>
  );
}