import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Save, WifiOff, Upload, FileSpreadsheet, Loader, ArrowUpDown, ArrowUp, ArrowDown, Search, RefreshCw } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { base44 } from "@/api/base44Client";
import { Item } from "@/entities/Item";

const LOCAL_STORAGE_KEY = 'offline_count_draft';

export default function CountForm({ count, warehouses, items: initialItems, onSubmit, onCancel, onWarehouseCatalogSaved }) {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState(() => {
    if (count) {
      const migratedItems = count.items.map(item => ({
        ...item,
        warehouse_id: item.warehouse_id || count.warehouse_id || "unspecified"
      }));
      return { ...count, items: migratedItems };
    }
    return {
      warehouse_id: "",
      warehouse_name: "",
      count_date: new Date().toISOString().split('T')[0],
      count_type: "monthly",
      items: [],
      total_inventory_value: 0,
      name: "",
      notes: "",
      status: "in_progress"
    };
  });

  const [currentWarehouseTab, setCurrentWarehouseTab] = useState(() => {
    if (count?.items?.length > 0 && count.items[0].warehouse_id) {
      return count.items[0].warehouse_id;
    }
    return count?.warehouse_id || (warehouses && warehouses.length > 0 ? warehouses[0].id : "all_summary");
  });

  const [items, setItems] = useState(initialItems || []);
  const [reloadingItems, setReloadingItems] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [filteredAvailableItems, setFilteredAvailableItems] = useState([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [warehouseOptions, setWarehouseOptions] = useState(warehouses || []);
  const [availableSearch, setAvailableSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exportingSheets, setExportingSheets] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItemData, setCustomItemData] = useState({ name: '', price: '' });
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const isSavingRef = React.useRef(false);
  const isSubmittedRef = React.useRef(false);
  const formDataRef = React.useRef(formData);
  const [dbSavedAt, setDbSavedAt] = useState(null);
  const dirtyItemsRef = React.useRef(new Map());
  
  const isCompleted = formData.status === 'completed';

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const handleExportToSheets = async () => {
    try {
      setExportingSheets(true);
      
      const title = formData.name || formData.warehouse_name || (language === 'he' ? 'ספירת מלאי' : 'Inventory Count');
      
      // Export ALL warehouses and their catalog items, merged with actual counts
      const itemsToExport = [];
      const processedCountedIds = new Set();
      
      warehouseOptions.forEach(wh => {
        const catalogItems = items.filter(item => 
          (wh.catalog_items && wh.catalog_items.includes(item.id)) ||
          item.warehouse_id === wh.id ||
          (item.warehouse_ids && item.warehouse_ids.includes(wh.id))
        );
        
        const countedItemsForWh = formData.items.filter(i => i.warehouse_id === wh.id);
        const mergedItemsMap = new Map();
        
        // Add catalog items (empty counts)
        catalogItems.forEach(item => {
          mergedItemsMap.set(item.id, {
            item_id: item.id,
            item_name: item.name,
            warehouse_id: wh.id,
            warehouse_name: wh.name,
            counted_quantity: "",
            unit: item.unit,
            price_per_unit: Number(item.price || 0) * (1 - (Number(item.discount || 0) / 100)),
            total_cost: 0,
            notes: ""
          });
        });
        
        // Override with actual counts
        countedItemsForWh.forEach(countedItem => {
          mergedItemsMap.set(countedItem.item_id, {
            ...countedItem,
            warehouse_name: wh.name
          });
          processedCountedIds.add(`${countedItem.item_id}_${wh.id}`);
        });
        
        itemsToExport.push(...Array.from(mergedItemsMap.values()));
      });
      
      // Add any counted items that didn't match a warehouse or weren't processed
      formData.items.forEach(countedItem => {
        if (!processedCountedIds.has(`${countedItem.item_id}_${countedItem.warehouse_id}`)) {
          const wh = warehouseOptions.find(w => w.id === countedItem.warehouse_id);
          itemsToExport.push({
            ...countedItem,
            warehouse_name: wh ? wh.name : (countedItem.warehouse_id === 'all_summary' ? 'Summary' : 'Other')
          });
        }
      });
      
      const { data } = await base44.functions.invoke('exportSingleCountToSheets', {
        title,
        items: itemsToExport,
        total_value: formData.total_inventory_value
      });
      
      if (data?.success && data?.spreadsheetUrl) {
        window.open(data.spreadsheetUrl, '_blank');
      } else {
        alert(t('error_saving') || 'Export failed');
      }
    } catch (e) {
      console.error('Export error:', e);
      alert((t('error_saving') || 'Error') + ': ' + (e?.message || ''));
    } finally {
      setExportingSheets(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    
    const sortedItems = [...formData.items].sort((a, b) => {
      if (key === 'total_cost') {
        const costA = Number(a.total_cost) || 0;
        const costB = Number(b.total_cost) || 0;
        return direction === 'asc' ? (costA - costB) : (costB - costA);
      }
      return 0;
    });
    
    setFormData(prev => ({ ...prev, items: sortedItems }));
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for existing draft on load
  useEffect(() => {
    const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (draft) {
      setHasDraft(true);
    }
  }, []);

  // Keep local warehouse options in sync with props
  useEffect(() => {
    setWarehouseOptions(warehouses || []);
  }, [warehouses]);

  useEffect(() => {
    if (initialItems && initialItems.length > items.length) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const saveToLocalStorage = () => {
    const dataToSave = {
      ...formData,
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
      setHasDraft(true);
      alert(language === 'he' ? '✓ הנתונים נשמרו מקומית בהצלחה!' : '✓ Data saved locally!');
    } catch (err) {
      console.error('LocalStorage quota exceeded', err);
      alert(language === 'he' ? 'שגיאה: המקום לאחסון מקומי מלא. לא ניתן לשמור גיבוי.' : 'Error: Local storage is full. Cannot save draft.');
    }
  };

  const loadFromLocalStorage = () => {
    const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (draft) {
      const parsed = JSON.parse(draft);
      const { savedAt, ...draftData } = parsed;
      setFormData(draftData);
      alert(language === 'he' ? `✓ נטען טיוטה מ-${new Date(savedAt).toLocaleString('he-IL')}` : `✓ Loaded draft from ${new Date(savedAt).toLocaleString()}`);
    }
  };

  const clearLocalStorage = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setHasDraft(false);
  };

  // Recalculate total whenever items change
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    setFormData(prev => ({ ...prev, total_inventory_value: total }));
  }, [formData.items]);

  // Create initial draft immediately on mount if it's a new count
  useEffect(() => {
    let isMounted = true;
    if (!formDataRef.current.id && !isOffline && navigator.onLine) {
      const createInitialDraft = async () => {
        try {
          if (isSavingRef.current) return;
          isSavingRef.current = true;
          
          const currentData = formDataRef.current;
          const cleanedData = {
            ...currentData,
            warehouse_name: currentData.warehouse_name || (language === 'he' ? 'טיוטה חדשה' : 'New Draft'),
            items: currentData.items.map(item => ({
              ...item,
              counted_quantity: item.counted_quantity === "" || item.counted_quantity == null ? 0 : Number(item.counted_quantity),
              price_per_unit: item.price_per_unit === "" || item.price_per_unit == null ? 0 : Number(item.price_per_unit),
              total_cost: Number(item.total_cost) || 0
            }))
          };
          
          const newCount = await base44.entities.InventoryCount.create({ ...cleanedData, status: 'in_progress' });
          if (isMounted) {
            setFormData(prev => ({ ...prev, id: newCount.id }));
            setDbSavedAt(new Date());
          }
        } catch (error) {
          console.error("Initial draft creation failed:", error);
        } finally {
          isSavingRef.current = false;
        }
      };
      createInitialDraft();
    }
    return () => { isMounted = false; };
  }, [isOffline, language]);

  // Handle unmount explicit save (e.g. switching tabs or clicking X)
  useEffect(() => {
    return () => {
      if (!isOffline && navigator.onLine && formDataRef.current?.id && !isSubmittedRef.current) {
        const currentData = formDataRef.current;
        const cleanedData = {
          ...currentData,
          warehouse_name: currentData.warehouse_name || (language === 'he' ? 'טיוטה חדשה' : 'New Draft'),
          items: currentData.items.map(item => ({
            ...item,
            counted_quantity: item.counted_quantity === "" || item.counted_quantity == null ? 0 : Number(item.counted_quantity),
            price_per_unit: item.price_per_unit === "" || item.price_per_unit == null ? 0 : Number(item.price_per_unit),
            total_cost: Number(item.total_cost) || 0
          }))
        };
        // Fire and forget
        base44.entities.InventoryCount.update(currentData.id, cleanedData).catch(console.error);
      }
    };
  }, [isOffline, language]);

  // Auto-save draft to local storage and Database (Delta Sync)
  useEffect(() => {
    const timer = setInterval(async () => {
      const currentData = formDataRef.current;
      if (!currentData.warehouse_id && currentData.items.length === 0 && !currentData.name) return;

      // 1. Save locally for offline backup
      const dataToSave = {
        ...currentData,
        savedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
        setHasDraft(true);
      } catch (err) {
        console.warn('LocalStorage auto-save failed:', err);
      }

      // 2. Auto-save to Database via backend sync function if online
      if (!isOffline && navigator.onLine && currentData.id) {
        const dirtyItems = Array.from(dirtyItemsRef.current.values());
        if (dirtyItems.length > 0) {
          if (isSavingRef.current) return;
          isSavingRef.current = true;
          try {
            dirtyItemsRef.current.clear();
            const cleanedDirtyItems = dirtyItems.map(item => ({
              ...item,
              counted_quantity: item.counted_quantity === "" || item.counted_quantity == null ? 0 : Number(item.counted_quantity),
              price_per_unit: item.price_per_unit === "" || item.price_per_unit == null ? 0 : Number(item.price_per_unit),
              total_cost: Number(item.total_cost) || 0
            }));

            await base44.functions.invoke('syncActiveCountItems', {
              currentCountId: currentData.id,
              updatedItems: cleanedDirtyItems
            });
            setDbSavedAt(new Date());
          } catch (error) {
            console.error("DB Auto-save failed:", error);
            // Restore dirty items if failed
            dirtyItems.forEach(item => dirtyItemsRef.current.set(`${item.item_id}_${item.warehouse_id}`, item));
          } finally {
            isSavingRef.current = false;
          }
        }
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [isOffline]);

  // Real-time collaborative sync subscription
  useEffect(() => {
    if (!formData.id || isOffline || !navigator.onLine) return;

    const unsubscribe = base44.entities.InventoryCount.subscribe((event) => {
      // Sync from ANY updated inventory count (to catch merges from syncActiveCountItems for other counts too)
      if (event.type === 'update' || event.type === 'create') {
        const serverData = event.data;
        if (!serverData || !serverData.items) return;
        
        // We only pull items from counts that belong to us/our store (syncActiveCountItems updates all our in_progress counts anyway)
        // If it's our exact count ID, definitely merge it.
        if (event.id === formData.id) {
          setFormData(prev => {
            const newItems = [...prev.items];
            let changed = false;
            
            serverData.items.forEach(serverItem => {
              const dirtyKey = `${serverItem.item_id}_${serverItem.warehouse_id}`;
              if (dirtyItemsRef.current.has(dirtyKey)) return; // Skip actively edited items
              
              const localIndex = newItems.findIndex(i => i.item_id === serverItem.item_id && i.warehouse_id === serverItem.warehouse_id);
              if (localIndex >= 0) {
                const localItem = newItems[localIndex];
                const incomingTime = serverItem.last_updated_at || 0;
                const localTime = localItem.last_updated_at || 0;
                
                if (incomingTime >= localTime && (localItem.counted_quantity !== serverItem.counted_quantity || localItem.notes !== serverItem.notes)) {
                  newItems[localIndex] = { ...localItem, ...serverItem };
                  changed = true;
                }
              } else {
                newItems.push(serverItem);
                changed = true;
              }
            });
            
            if (changed) {
              const total = newItems.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);
              return { ...prev, items: newItems, total_inventory_value: total };
            }
            return prev;
          });
        }
      }
    });
    
    return unsubscribe;
  }, [formData.id, isOffline]);

  // Effect to populate filteredAvailableItems for the "Add Item" dropdown
  useEffect(() => {
    const term = (availableSearch || '').trim().toLowerCase();
    const newFilteredItems = items.filter(item => {
      const isNotInCount = !formData.items.some(countItem => countItem.item_id === item.id && countItem.warehouse_id === currentWarehouseTab);
      const matches = !term || (item.name || '').toLowerCase().includes(term);
      return isNotInCount && matches;
    });
    setFilteredAvailableItems(newFilteredItems);
  }, [items, formData.items, availableSearch, currentWarehouseTab]);

  const reloadItems = async () => {
    try {
      setReloadingItems(true);
      const user = await base44.auth.me();
      let workingEmail = user.email;
      if (user.role === 'admin' && user.acting_as_user_email) {
          const { data } = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: user.acting_as_user_email });
          if (data?.success && data.data?.items) {
             setItems(data.data.items);
             return;
          }
      }
      
      workingEmail = user.acting_as_store_email || user.store_user_owner_email || user.email;
      const fetchedItems = await base44.entities.Item.filter({ created_by: workingEmail }, "name");
      setItems(fetchedItems || []);
    } catch (e) {
      console.error("Failed to reload items", e);
    } finally {
      setReloadingItems(false);
    }
  };

  // Auto-populate when current warehouse tab changes and has no items, OR when items are added to catalog but not in count yet
  useEffect(() => {
    if (currentWarehouseTab === "all_summary" || !currentWarehouseTab) return;
    
    const warehouse = warehouseOptions.find(w => w.id === currentWarehouseTab);
    
    if (warehouse) {
      const existingItemIds = new Set(formData.items.filter(i => i.warehouse_id === currentWarehouseTab).map(i => i.item_id));
      
      const missingCatalogItems = items.filter(item => {
        const inCatalog = warehouse.catalog_items && warehouse.catalog_items.includes(item.id);
        const inPrimary = item.warehouse_id === currentWarehouseTab;
        const inMulti = item.warehouse_ids && item.warehouse_ids.includes(currentWarehouseTab);
        return (inCatalog || inPrimary || inMulti) && !existingItemIds.has(item.id);
      });
      
      if (missingCatalogItems.length > 0) {
        const newItems = missingCatalogItems.map(item => ({
          item_id: item.id,
          item_name: item.name,
          warehouse_id: currentWarehouseTab,
          counted_quantity: "",
          unit: item.unit,
          price_per_unit: Number(item.price || 0) * (1 - (Number(item.discount || 0) / 100)),
          total_cost: 0,
          notes: ""
        }));
        
        setFormData(prev => {
          let newWarehouseName = prev.warehouse_name;
          let newWarehouseId = prev.warehouse_id;
          if (!prev.warehouse_id) {
            newWarehouseId = "multi";
            newWarehouseName = language === 'he' ? "ספירה מרובת מחסנים" : "Multi-Warehouse Count";
          }
          return {
            ...prev,
            warehouse_id: newWarehouseId,
            warehouse_name: newWarehouseName,
            items: [...prev.items, ...newItems]
          };
        });
      }
    }
  }, [currentWarehouseTab, warehouseOptions, items, formData.items.length, language]);

  // Removed old auto-populate logic to prevent redundancy

  const handleWarehouseChange = (warehouseId) => {
    setCurrentWarehouseTab(warehouseId);
  };

  const handleCreateWarehouse = async () => {
    const name = prompt(t('warehouse_name') || 'Warehouse name');
    if (!name) return;
    const created = await base44.entities.Warehouse.create({ name, catalog_items: [] });
    setWarehouseOptions(prev => [...prev, created]);
    if (typeof onWarehouseCatalogSaved === 'function') {
      onWarehouseCatalogSaved();
    }
    setCurrentWarehouseTab(created.id);
  };

   const handleSaveToWarehouseCatalog = async () => {
    if (!formData.warehouse_id || formData.items.length === 0) {
      alert(t('warehouse_required') + ' ' + t('and') + ' ' + t('items'));
      return;
    }

    if (!confirm(`${t('save')} ${formData.items.length} ${t('items')} ${t('to_warehouse')} "${formData.warehouse_name}"?`)) {
      return;
    }

    try {
      setSavingCatalog(true);
      
      const itemUpdates = formData.items.map(async (countItem) => {
        const itemToUpdate = items.find(i => i.id === countItem.item_id);
        if (itemToUpdate) {
          const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...cleanData } = itemToUpdate;
          await Item.update(countItem.item_id, {
            ...cleanData,
            warehouse_id: formData.warehouse_id,
            warehouse_name: formData.warehouse_name
          });
        }
      });
      await Promise.all(itemUpdates);

      alert(language === 'he' 
        ? `נשמרו בהצלחה ${formData.items.length} פריטים לקטלוג המחסן "${formData.warehouse_name}"`
        : `Successfully saved ${formData.items.length} items to "${formData.warehouse_name}" catalog`);
      
      if (onWarehouseCatalogSaved) {
        onWarehouseCatalogSaved();
      }
    } catch (error) {
      console.error("Error saving to warehouse catalog:", error);
      alert(t('error_saving'));
    } finally {
      setSavingCatalog(false);
    }
  };



  const updateItemQuantity = (itemId, warehouseId, quantity) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const index = newItems.findIndex(i => i.item_id === itemId && i.warehouse_id === warehouseId);
      if (index === -1) return prev;
      const qty = parseFloat(quantity) || 0;
      const price = parseFloat(newItems[index].price_per_unit) || 0;
      newItems[index] = { 
        ...newItems[index], 
        counted_quantity: quantity,
        counted_cases: "",
        counted_units: "",
        total_cost: qty * price,
        last_updated_at: Date.now()
      };
      dirtyItemsRef.current.set(`${itemId}_${warehouseId}`, newItems[index]);
      return { ...prev, items: newItems };
    });
  };

  const updateItemQuantitySplit = (itemId, warehouseId, field, value, upp) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const index = newItems.findIndex(i => i.item_id === itemId && i.warehouse_id === warehouseId);
      if (index === -1) return prev;
      
      const current = newItems[index];
      
      let currentCases = current.counted_cases;
      let currentUnits = current.counted_units;
      
      if (currentCases == null || currentUnits == null) {
        if (typeof current.counted_quantity === 'number' && current.counted_quantity > 0) {
          currentCases = Math.floor(current.counted_quantity);
          currentUnits = Math.round((current.counted_quantity - currentCases) * (upp || 1));
        } else {
          currentCases = "";
          currentUnits = "";
        }
      }

      const newValues = {
        counted_cases: field === 'cases' ? value : currentCases,
        counted_units: field === 'units' ? value : currentUnits
      };
      
      const c = parseFloat(newValues.counted_cases) || 0;
      const u = parseFloat(newValues.counted_units) || 0;
      const totalQty = c + (u / (upp || 1));
      
      const price = parseFloat(current.price_per_unit) || 0;
      
      newItems[index] = { 
        ...current,
        ...newValues,
        counted_quantity: (newValues.counted_cases === '' && newValues.counted_units === '') ? '' : totalQty,
        total_cost: totalQty * price,
        last_updated_at: Date.now()
      };
      dirtyItemsRef.current.set(`${itemId}_${warehouseId}`, newItems[index]);
      return { ...prev, items: newItems };
    });
  };

  const updateItemPrice = (itemId, warehouseId, price) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const index = newItems.findIndex(i => i.item_id === itemId && i.warehouse_id === warehouseId);
      if (index === -1) return prev;
      const priceValue = parseFloat(price) || 0;
      const qty = parseFloat(newItems[index].counted_quantity) || 0;
      newItems[index] = { 
        ...newItems[index], 
        price_per_unit: price,
        total_cost: qty * priceValue,
        last_updated_at: Date.now()
      };
      dirtyItemsRef.current.set(`${itemId}_${warehouseId}`, newItems[index]);
      return { ...prev, items: newItems };
    });
  };

  const updateItemNotes = (itemId, warehouseId, notes) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const index = newItems.findIndex(i => i.item_id === itemId && i.warehouse_id === warehouseId);
      if (index === -1) return prev;
      newItems[index] = { ...newItems[index], notes, last_updated_at: Date.now() };
      dirtyItemsRef.current.set(`${itemId}_${warehouseId}`, newItems[index]);
      return { ...prev, items: newItems };
    });
  };

  const removeItem = (itemId, warehouseId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => !(i.item_id === itemId && i.warehouse_id === warehouseId))
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    isSubmittedRef.current = true;
    // Clear local storage after successful submit
    clearLocalStorage();
    
    // Clean up empty fields to avoid backend validation errors
    const cleanedData = {
      ...formData,
      items: formData.items.map(item => ({
        ...item,
        counted_quantity: item.counted_quantity === "" || item.counted_quantity == null ? 0 : Number(item.counted_quantity),
        price_per_unit: item.price_per_unit === "" || item.price_per_unit == null ? 0 : Number(item.price_per_unit),
        total_cost: Number(item.total_cost) || 0
      }))
    };

    onSubmit(cleanedData);
  };

  let displayedItems = [];
  if (currentWarehouseTab === "all_summary") {
    const grouped = {};
    formData.items.forEach(item => {
      if (!grouped[item.item_id]) {
        grouped[item.item_id] = { ...item, counted_quantity: item.counted_quantity === "" ? 0 : Number(item.counted_quantity), total_cost: item.total_cost || 0 };
      } else {
        grouped[item.item_id].counted_quantity += (item.counted_quantity === "" ? 0 : Number(item.counted_quantity));
        grouped[item.item_id].total_cost += (item.total_cost || 0);
        if (item.notes) {
          grouped[item.item_id].notes = grouped[item.item_id].notes ? `${grouped[item.item_id].notes}, ${item.notes}` : item.notes;
        }
      }
    });
    displayedItems = Object.values(grouped);
  } else {
    displayedItems = formData.items.filter(item => item.warehouse_id === currentWarehouseTab);
  }
  
  if (sortConfig.key === 'total_cost') {
    displayedItems.sort((a, b) => {
      const costA = Number(a.total_cost) || 0;
      const costB = Number(b.total_cost) || 0;
      return sortConfig.direction === 'asc' ? (costA - costB) : (costB - costA);
    });
  }

  const finalDisplayedItems = displayedItems.filter((item) => {
    const originalItem = items.find(i => i.id === item.item_id);
    return !tableSearchTerm || 
      (item.item_name || '').toLowerCase().includes(tableSearchTerm.toLowerCase()) || 
      (originalItem?.nickname || '').toLowerCase().includes(tableSearchTerm.toLowerCase());
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8"
    >
      <Card className="shadow-lg border-0">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-bold">
            {count ? t('edit_count') : t('new_count')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleExportToSheets} disabled={exportingSheets || formData.items.length === 0} className="hidden md:flex border-green-600 text-green-600 hover:bg-green-50">
              {exportingSheets ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              {language === 'he' ? 'ייצא פירוט ל-Sheets' : 'Export items to Sheets'}
            </Button>
            {isOffline && (
              <span className="flex items-center gap-1 text-orange-600 text-sm font-medium animate-pulse">
                <WifiOff className="w-4 h-4" />
                {language === 'he' ? 'אופליין' : 'Offline'}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col md:grid md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={language === 'he' ? 'שם ספירה (למשל: סוף חודש דצמבר)' : 'Count Name (e.g., December month-end)'}
                  className="h-11 font-normal text-gray-700 bg-gray-50 border-gray-200"
                  disabled={isCompleted}
                />
              </div>

              <div className="md:col-span-2">
                <div className="relative">
                  <div className="absolute top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none ltr:left-3 rtl:right-3 bg-gray-50 px-1">
                    {language === 'he' ? 'תאריך:' : 'Date:'}
                  </div>
                  <Input
                    id="count_date"
                    type="date"
                    value={formData.count_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, count_date: e.target.value }))}
                    className="h-11 rtl:pr-12 ltr:pl-12 font-normal text-gray-700 bg-gray-50 border-gray-200"
                    disabled={isCompleted}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Select
                  id="count_type"
                  value={formData.count_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, count_type: value }))}
                  disabled={isCompleted}
                >
                  <SelectTrigger className="h-11 w-full font-normal text-gray-700 bg-gray-50 border-gray-200">
                    <SelectValue placeholder={t('count_type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('count_type')}: {t('daily')}</SelectItem>
                    <SelectItem value="weekly">{t('count_type')}: {t('weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('count_type')}: {t('monthly')}</SelectItem>
                    <SelectItem value="quarterly">{t('count_type')}: {t('quarterly')}</SelectItem>
                    <SelectItem value="annual">{t('count_type')}: {t('annual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Select
                  id="status"
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="h-11 w-full font-normal text-gray-700 bg-gray-50 border-gray-200">
                    <SelectValue placeholder={t('status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">{language === 'he' ? 'סטטוס:' : 'Status:'} {t('status_in_progress')}</SelectItem>
                    <SelectItem value="completed">{language === 'he' ? 'סטטוס:' : 'Status:'} {t('status_completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-4 mt-2">
                <Select 
                   value={currentWarehouseTab} 
                   onValueChange={(val) => { if (val === "__create__") { handleCreateWarehouse(); return; } handleWarehouseChange(val); }}
                 >
                  <SelectTrigger id="warehouse" className="border-teal-200 bg-teal-50/50 hover:bg-teal-50 focus:ring-teal-500 font-medium text-teal-800 h-12 shadow-sm transition-colors cursor-pointer">
                    <SelectValue placeholder={language === 'he' ? 'בחר מחסן לספירה...' : 'Select Warehouse...'} />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all_summary" className="font-bold text-teal-700 bg-teal-50 mb-1 border-b border-teal-100">
                       {language === 'he' ? '📋 סיכום ספירה (כל המחסנים)' : '📋 Full Summary (All Warehouses)'}
                     </SelectItem>
                     {!isCompleted && <SelectItem value="__create__">+ {t('new_warehouse') || 'New Warehouse'}</SelectItem>}
                     {warehouseOptions.map(warehouse => (
                       <SelectItem key={warehouse.id} value={warehouse.id}>
                        <div className="flex items-center">
                          <span className="font-normal text-base">{language === 'he' ? 'מחסן:' : 'Warehouse:'} {warehouse.name}</span>
                          {warehouse.catalog_items && warehouse.catalog_items.length > 0 && (
                            <Badge variant="outline" className="ml-2 font-normal text-xs bg-gray-50">
                              {warehouse.catalog_items.length} {t('items')}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(currentWarehouseTab || formData.items.length > 0) && (
              <div className="space-y-4">


                {formData.items.length > 0 && (
                  <>
                    {!count && formData.warehouse_id !== "multi" && formData.warehouse_id !== "all_summary" && (
                      <div className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-cyan-900">
                              {language === 'he' ? 'שמור פריטים לקטלוג המחסן' : 'Save items to warehouse catalog'}
                            </p>
                            <p className="text-sm text-cyan-700">
                              {language === 'he' 
                                ? `שמור את ${formData.items.length} הפריטים כקטלוג הקבוע של "${formData.warehouse_name}"`
                                : `Save ${formData.items.length} items as the default catalog for "${formData.warehouse_name}"`}
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={handleSaveToWarehouseCatalog}
                            disabled={savingCatalog || isCompleted}
                            className="bg-cyan-600 hover:bg-cyan-700 w-full md:w-auto"
                          >
                            {savingCatalog ? (
                              <>
                                <Save className="w-4 h-4 mr-2 animate-spin" />
                                {t('saving')}
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                {language === 'he' ? 'שמור לקטלוג מחסן' : 'Save to Warehouse Catalog'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-2 mt-4 flex-wrap gap-2 sticky top-[64px] md:top-0 z-40 bg-white/95 backdrop-blur-sm py-3 border-b border-gray-100 shadow-sm -mx-4 md:mx-0 px-4 md:px-0">
                      <div className="relative flex-1 md:w-1/3 min-w-[150px]">
                        <Input
                          type="text"
                          placeholder={language === 'he' ? 'חפש פריט במחסן...' : 'Search item in warehouse...'}
                          value={tableSearchTerm}
                          onChange={(e) => setTableSearchTerm(e.target.value)}
                          className={`${language === 'he' || language === 'ar' ? 'pr-9' : 'pl-9'} bg-white font-medium`}
                        />
                        <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${language === 'he' || language === 'ar' ? 'right-3' : 'left-3'}`} />
                        {tableSearchTerm && (
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            className={`absolute top-1/2 -translate-y-1/2 h-6 w-6 ${language === 'he' || language === 'ar' ? 'left-2' : 'right-2'}`}
                            onClick={() => setTableSearchTerm('')}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      
                      {!isCompleted && currentWarehouseTab !== "all_summary" && (
                        <div className="flex shrink-0">
                          <Popover open={isSearchFocused} onOpenChange={(open) => {
                            setIsSearchFocused(open);
                            if (open) {
                              reloadItems();
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" className="bg-white whitespace-nowrap px-3 md:px-4 shadow-sm border-gray-200 text-gray-900 font-medium">
                                <Plus className={`w-4 h-4 ${language === 'he' || language === 'ar' ? 'ml-1 md:ml-2' : 'mr-1 md:mr-2'}`} />
                                <span>{language === 'he' ? 'הוסף פריט לספירה' : 'Add Item'}</span>
                                {reloadingItems && <Loader className={`w-3 h-3 animate-spin ${language === 'he' || language === 'ar' ? 'mr-1' : 'ml-1'}`} />}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-2" align={language === 'he' || language === 'ar' ? 'end' : 'start'}>
                              <Input
                                type="text"
                                placeholder={language === 'he' ? 'חפש פריט להוספה...' : 'Search items to add...'}
                                value={availableSearch}
                                onChange={(e) => setAvailableSearch(e.target.value)}
                                className="mb-2"
                              />
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {filteredAvailableItems.length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center py-4">
                                    {language === 'he' ? 'לא נמצאו פריטים' : 'No items found'}
                                  </p>
                                ) : (
                                  filteredAvailableItems.map(item => (
                                    <div 
                                      key={item.id}
                                      className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer group"
                                      onClick={() => {
                                        setFormData(prev => ({
                                          ...prev,
                                          items: [...prev.items, {
                                            item_id: item.id,
                                            item_name: item.name,
                                            warehouse_id: currentWarehouseTab,
                                            counted_quantity: "",
                                            unit: item.unit,
                                            price_per_unit: Number(item.price || 0) * (1 - (Number(item.discount || 0) / 100)),
                                            total_cost: 0,
                                            notes: ""
                                          }]
                                        }));
                                        setAvailableSearch('');
                                        setIsSearchFocused(false);
                                      }}
                                    >
                                      <div>
                                        <div className="font-medium text-sm">{item.nickname || item.name}</div>
                                        {item.nickname && <div className="text-xs text-gray-500">{item.name}</div>}
                                      </div>
                                      <Plus className="w-4 h-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  ))
                                )}
                              </div>
                              <div className="border-t mt-2 pt-2">
                                {!showCustomItemForm ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full text-blue-600 justify-start"
                                    onClick={() => {
                                      setShowCustomItemForm(true);
                                      setCustomItemData({ name: availableSearch, price: '' });
                                    }}
                                  >
                                    <Plus className={`w-4 h-4 ${language === 'he' || language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                    {language === 'he' ? 'הוסף פריט מותאם אישית' : 'Add custom item'}
                                  </Button>
                                ) : (
                                  <div className="space-y-2 p-2 bg-gray-50 rounded-md border border-gray-100">
                                    <Input 
                                      placeholder={language === 'he' ? 'שם הפריט' : 'Item name'} 
                                      value={customItemData.name}
                                      onChange={(e) => setCustomItemData(prev => ({...prev, name: e.target.value}))}
                                      className="h-8 text-sm"
                                    />
                                    <Input 
                                      type="number"
                                      placeholder={language === 'he' ? 'מחיר ליחידה' : 'Price per unit'} 
                                      value={customItemData.price}
                                      onChange={(e) => setCustomItemData(prev => ({...prev, price: e.target.value}))}
                                      className="h-8 text-sm"
                                    />
                                    <div className="flex gap-2 pt-1">
                                      <Button 
                                        type="button" 
                                        size="sm"
                                        disabled={creatingCustom}
                                        className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={async () => {
                                          if (!customItemData.name) return;
                                          setCreatingCustom(true);
                                          let newItemId = "custom_" + Date.now();
                                          try {
                                            const user = await base44.auth.me();
                                            const cleanData = {
                                              name: customItemData.name,
                                              supplier_id: "pending",
                                              supplier_name: language === 'he' ? "להשלמה" : "Pending",
                                              unit: "unit",
                                              price: parseFloat(customItemData.price) || 0,
                                            };
                                            const targetEmail = user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email;
                                            if (targetEmail) {
                                              const { data } = await base44.functions.invoke('createItemForStore', {
                                                itemData: cleanData,
                                                storeEmail: targetEmail
                                              });
                                              if (data?.success && data?.item?.id) {
                                                newItemId = data.item.id;
                                                setItems(prev => [...prev, data.item]);
                                              }
                                            } else {
                                              const createdItem = await base44.entities.Item.create(cleanData);
                                              if (createdItem?.id) {
                                                newItemId = createdItem.id;
                                                setItems(prev => [...prev, createdItem]);
                                              }
                                            }
                                          } catch (e) {
                                            console.error("Failed to create custom item in DB", e);
                                          }
                                          setCreatingCustom(false);

                                          setFormData(prev => ({
                                            ...prev,
                                            items: [...prev.items, {
                                              item_id: newItemId,
                                              item_name: customItemData.name,
                                              warehouse_id: currentWarehouseTab,
                                              counted_quantity: "",
                                              unit: "unit",
                                              price_per_unit: parseFloat(customItemData.price) || 0,
                                              total_cost: 0,
                                              notes: language === 'he' ? 'פריט מותאם אישית' : 'Custom item'
                                            }]
                                          }));
                                          setAvailableSearch('');
                                          setShowCustomItemForm(false);
                                          setCustomItemData({ name: '', price: '' });
                                          setIsSearchFocused(false);
                                        }}
                                      >
                                        {creatingCustom ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : (language === 'he' ? 'הוסף' : 'Add')}
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-8 text-xs bg-white text-gray-700"
                                        onClick={() => setShowCustomItemForm(false)}
                                      >
                                        {language === 'he' ? 'ביטול' : 'Cancel'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>

                    {/* Mobile View - Simple Rows */}
                    <div className="md:hidden flex flex-col border-t border-gray-200">
                      {finalDisplayedItems.map((item, index) => {
                        const originalItem = items.find(i => i.id === item.item_id);
                        return (
                          <div key={item.item_id + "_" + (item.warehouse_id || "summary") + "_" + index} className="py-2 border-b border-gray-100 flex items-center gap-2 px-1">
                            <div className="flex-1 min-w-0 flex flex-col">
                               <span className={`text-[13px] md:text-sm text-gray-900 leading-tight ${originalItem?.nickname ? 'font-bold' : 'font-medium'}`}>
                                 {originalItem?.nickname || item.item_name}
                               </span>
                               <span className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                                 {language === 'he' ? (item.unit === 'unit' ? 'יח\'' : item.unit === 'case' ? 'ארגז' : item.unit) : item.unit}
                                 {currentWarehouseTab === "all_summary" && (
                                   <> <span className="mx-1 text-gray-300">|</span> ₪{Number(item.price_per_unit || 0).toFixed(2)}</>
                                 )}
                               </span>
                            </div>
                            
                            <div className="flex flex-col items-end shrink-0 w-[105px] md:w-[120px]">
                               {currentWarehouseTab === "all_summary" ? (
                                  <div className="h-9 w-full bg-gray-50 border border-gray-200 rounded-md flex items-center justify-center font-bold text-base text-gray-900">
                                    {typeof item.counted_quantity === 'number' ? Number(item.counted_quantity).toFixed(2).replace(/\.00$/, '') : item.counted_quantity}
                                  </div>
                               ) : (
                                  (item.unit === 'case' || originalItem?.unit === 'case') ? (
                                    <div className="flex gap-1 w-full">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.counted_cases ?? (typeof item.counted_quantity === 'number' && item.counted_quantity > 0 ? Math.floor(item.counted_quantity) : '')}
                                        onChange={(e) => updateItemQuantitySplit(item.item_id, item.warehouse_id, 'cases', e.target.value, originalItem?.units_per_package)}
                                        className="w-full h-9 text-center font-bold text-base border-blue-300 focus:border-blue-600 focus:ring-blue-600 shadow-sm hide-arrows bg-blue-50/40 text-blue-900 px-0.5"
                                        placeholder={language === 'he' ? 'ארגז' : 'Case'}
                                        title={language === 'he' ? 'ארגזים' : 'Cases'}
                                        disabled={isCompleted}
                                      />
                                      <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.counted_units ?? (typeof item.counted_quantity === 'number' && item.counted_quantity > 0 ? Math.round((item.counted_quantity - Math.floor(item.counted_quantity)) * (originalItem?.units_per_package || 1)) : '')}
                                        onChange={(e) => updateItemQuantitySplit(item.item_id, item.warehouse_id, 'units', e.target.value, originalItem?.units_per_package)}
                                        className="w-full h-9 text-center font-bold text-base border-emerald-300 focus:border-emerald-600 focus:ring-emerald-600 shadow-sm hide-arrows bg-emerald-50/40 text-emerald-900 px-0.5"
                                        placeholder={language === 'he' ? 'יח\'' : 'Unit'}
                                        title={language === 'he' ? 'יחידות' : 'Units'}
                                        disabled={isCompleted}
                                      />
                                    </div>
                                  ) : (
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={item.counted_quantity === 0 && typeof item.counted_quantity === 'number' ? '' : item.counted_quantity}
                                      onChange={(e) => updateItemQuantity(item.item_id, item.warehouse_id, e.target.value)}
                                      className="w-full h-9 text-center font-bold text-lg border-blue-300 focus:border-blue-600 focus:ring-blue-600 shadow-sm hide-arrows bg-blue-50/40 text-blue-900"
                                      placeholder="0"
                                      disabled={isCompleted}
                                    />
                                  )
                               )}
                               <span className="text-[10px] font-medium text-green-600 mt-1">
                                 ₪{item.total_cost?.toFixed(2) || '0.00'}
                               </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop View - Table */}
                    <div className="hidden md:block border rounded-lg overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b">
                          <TableRow>
                            <TableHead className="px-2 py-3 md:px-4 md:py-4 text-xs md:text-sm whitespace-nowrap min-w-[120px]">{t('item_name')}</TableHead>
                            <TableHead className="px-2 py-3 md:px-4 md:py-4 text-xs md:text-sm whitespace-nowrap">{t('counted_quantity')}</TableHead>
                            <TableHead className="px-2 py-3 md:px-4 md:py-4 text-xs md:text-sm whitespace-nowrap">{t('unit')}</TableHead>
                            <TableHead className="px-2 py-3 md:px-4 md:py-4 text-xs md:text-sm whitespace-nowrap">{t('price_per_unit')}</TableHead>
                            <TableHead 
                              className="px-2 py-3 md:px-4 md:py-4 text-xs md:text-sm whitespace-nowrap cursor-pointer hover:bg-gray-50 transition-colors select-none group" 
                              onClick={() => handleSort('total_cost')}
                            >
                              <div className="flex items-center gap-1">
                                {t('total_cost')}
                                {sortConfig.key === 'total_cost' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                                ) : (
                                  <ArrowUpDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="px-2 py-3 md:px-4 md:py-4 text-xs md:text-sm min-w-[100px]">{t('notes')}</TableHead>
                            <TableHead className="px-2 py-3 md:px-4 md:py-4"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {finalDisplayedItems.map((item, index) => {
                            const originalItem = items.find(i => i.id === item.item_id);

                            return (
                              <TableRow key={item.item_id + "_" + (item.warehouse_id || "summary") + "_" + index}>
                                  <TableCell className="px-2 py-3 md:px-4 md:py-4 text-xs md:text-sm min-w-[120px] leading-snug font-normal text-gray-800">
                                  {originalItem?.nickname ? <span className="font-bold">{originalItem.nickname}</span> : item.item_name}
                                  {originalItem?.nickname && <span className="text-[11px] md:text-xs text-gray-500 block mt-0.5 leading-tight">{item.item_name}</span>}
                                </TableCell>
                                <TableCell className="px-2 py-3 md:px-4 md:py-4">
                                  {currentWarehouseTab === "all_summary" ? (
                                    <span className="font-bold text-sm md:text-lg">
                                      {typeof item.counted_quantity === 'number' ? Number(item.counted_quantity).toFixed(2).replace(/\.00$/, '') : item.counted_quantity}
                                    </span>
                                  ) : (
                                    (item.unit === 'case' || originalItem?.unit === 'case') ? (
                                      <div className="flex gap-1 items-center w-32 md:w-40">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={item.counted_cases ?? (typeof item.counted_quantity === 'number' && item.counted_quantity > 0 ? Math.floor(item.counted_quantity) : '')}
                                          onChange={(e) => updateItemQuantitySplit(item.item_id, item.warehouse_id, 'cases', e.target.value, originalItem?.units_per_package)}
                                          className="w-full h-9 md:h-10 px-1 md:px-2 text-center font-bold text-sm md:text-base border-blue-300 focus:border-blue-600 bg-blue-50/40 text-blue-900 hide-arrows"
                                          placeholder={language === 'he' ? 'ארגזים' : 'Cases'}
                                          title={language === 'he' ? 'ארגזים' : 'Cases'}
                                          disabled={isCompleted}
                                        />
                                        <span className="text-gray-400 font-light">+</span>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={item.counted_units ?? (typeof item.counted_quantity === 'number' && item.counted_quantity > 0 ? Math.round((item.counted_quantity - Math.floor(item.counted_quantity)) * (originalItem?.units_per_package || 1)) : '')}
                                          onChange={(e) => updateItemQuantitySplit(item.item_id, item.warehouse_id, 'units', e.target.value, originalItem?.units_per_package)}
                                          className="w-full h-9 md:h-10 px-1 md:px-2 text-center font-bold text-sm md:text-base border-emerald-300 focus:border-emerald-600 bg-emerald-50/40 text-emerald-900 hide-arrows"
                                          placeholder={language === 'he' ? 'יחידות' : 'Units'}
                                          title={language === 'he' ? 'יחידות בודדות' : 'Loose units'}
                                          disabled={isCompleted}
                                        />
                                      </div>
                                    ) : (
                                      <Input
                                        type="number"
                                        min="0"
                                        step="any" 
                                        value={item.counted_quantity === 0 && typeof item.counted_quantity === 'number' ? '' : item.counted_quantity}
                                        onChange={(e) => updateItemQuantity(item.item_id, item.warehouse_id, e.target.value)}
                                        className="w-20 md:w-24 h-9 md:h-10 px-2 md:px-3 text-center font-bold text-sm md:text-base border-blue-300 focus:border-blue-600 bg-blue-50/40 text-blue-900 hide-arrows"
                                        placeholder="0"
                                        disabled={isCompleted}
                                      />
                                    )
                                  )}
                                </TableCell>
                                <TableCell className="px-2 py-3 md:px-4 md:py-4 text-xs md:text-sm whitespace-nowrap">{item.unit}</TableCell>
                                <TableCell className="px-2 py-3 md:px-4 md:py-4 text-gray-700 text-xs md:text-sm whitespace-nowrap">
                                  ₪{Number(item.price_per_unit || 0).toFixed(2)}
                                </TableCell>
                                <TableCell className="px-2 py-3 md:px-4 md:py-4 font-bold text-green-600 text-xs md:text-sm whitespace-nowrap">
                                  {item.total_cost?.toFixed(2) || '0.00'}
                                </TableCell>
                                <TableCell className="px-2 py-3 md:px-4 md:py-4">
                                  {currentWarehouseTab === "all_summary" ? (
                                    <span className="text-xs md:text-sm text-gray-500">{item.notes}</span>
                                  ) : (
                                    <Input
                                      value={item.notes || ''}
                                      onChange={(e) => updateItemNotes(item.item_id, item.warehouse_id, e.target.value)}
                                      placeholder={t('notes')}
                                      className="w-full min-w-[100px] md:min-w-[150px] h-9 md:h-10 text-xs md:text-sm"
                                      disabled={isCompleted}
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="px-2 py-3 md:px-4 md:py-4">
                                  {!isCompleted && currentWarehouseTab !== "all_summary" && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 md:h-10 md:w-10"
                                      onClick={() => removeItem(item.item_id, item.warehouse_id)}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-blue-900">
                          {t('total_inventory_value')}:
                        </span>
                        <span className="text-2xl font-bold text-blue-600">
                          ₪{formData.total_inventory_value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}





            <div className="sticky bottom-[56px] md:bottom-0 z-50 bg-white p-3 border-t border-gray-100 flex justify-end mt-6 -mx-4 md:-mx-6 -mb-6 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
              <Button type="submit" className="bg-[#d4a373] hover:bg-[#b88c60] w-full text-white text-base h-12 rounded-xl font-bold shadow-md" disabled={isOffline}>
                {count ? t('update_count') : t('save_count')}
              </Button>
            </div>
            {showScrollTop && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={scrollToTop}
                className="fixed bottom-[130px] md:bottom-20 right-4 z-50 rounded-full w-10 h-10 bg-white shadow-lg border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <ArrowUp className="w-5 h-5" />
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}