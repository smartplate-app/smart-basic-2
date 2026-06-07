import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, LayoutGrid, List, Trash2, FileSpreadsheet, FileText, Wand2, MoreHorizontal, FileDown, FileUp, Check, ChevronDown, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AnimatePresence } from "framer-motion";
import { useLanguage } from "../components/LanguageProvider";

import ItemForm from "../components/items/ItemForm";
import ItemCard from "../components/items/ItemCard";
import NetworkErrorHandler from "../components/NetworkErrorHandler";
import ItemEditModal from "../components/items/ItemEditModal";
import ItemListView from "../components/items/ItemListView";
import BulkWarehouseModal from "../components/items/BulkWarehouseModal";
import ImportSuppliersItemsModal from "../components/items/ImportSuppliersItemsModal";
import CleanDuplicatesModal from "../components/items/CleanDuplicatesModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getCache, setCache, isStale } from "../components/utils/cache";

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [networkError, setNetworkError] = useState(null);
  const { t, language } = useLanguage();
  const safeT = (key, he, en) => {
    const v = t(key);
    if (language === 'he' && (v === key || !v)) return he;
    return (v === key || !v) ? (en ?? key) : v;
  };
  const [isViewer, setIsViewer] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("all");
  const [defaultSupplierId, setDefaultSupplierId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [supplierFilterOpen, setSupplierFilterOpen] = useState(false);
  const [showBulkWarehouseModal, setShowBulkWarehouseModal] = useState(false);

  // Hydrate from cache for instant UI
  React.useEffect(() => {
    const c = getCache('items_v1');
    if (c?.data) {
      setItems(c.data.items || []);
      setSuppliers(c.data.suppliers || []);
      setWarehouses(c.data.warehouses || []);
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('supplier_id') || params.get('supplierId');
    const add = params.get('add') || params.get('openForm');
    if (s) setDefaultSupplierId(s);
    // Do not open the form here; wait until suppliers are loaded to avoid empty supplier selection
  }, []);

  const loadData = async (currentUser, retryCount = 0) => {
    try {
      setLoading(true);
      setNetworkError(null);

      console.log(`[Items] Loading data (attempt ${retryCount + 1})...`);
      
      if (retryCount > 0) {
        const delay = Math.min(3000 * Math.pow(1.5, retryCount - 1), 15000);
        console.log(`[Items] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      let itemsData = [];
      let suppliersData = [];
      let warehousesData = [];
      
      // Check if user is a store_user (worker/manager invited to someone else's store)
      const isStoreUser = currentUser.store_user_role && currentUser.store_user_owner_email;
      const storeOwnerEmail = currentUser.store_user_owner_email;

      console.log('[Items] Loading check:', {
        isStoreUser,
        storeOwnerEmail,
        currentUserEmail: currentUser.email,
        store_user_role: currentUser.store_user_role
      });

      const effectiveEmail = currentUser.acting_as_store_email || currentUser.acting_as_user_email || currentUser.email;
      const isAdminControlling = currentUser?.role === 'admin' && effectiveEmail !== currentUser.email;

      if (isAdminControlling) {
        // Admin impersonation - load data securely from backend
        console.log('[Items] Loading as ADMIN impersonating:', effectiveEmail);
        const { data } = await base44.functions.invoke('getAdminData', { action: 'getUserData', userEmail: effectiveEmail });
        if (data?.success && data?.data) {
          itemsData = data.data.items || [];
          suppliersData = data.data.suppliers || [];
          warehousesData = data.data.inventory || []; // Wait, inventory is counts, getAdminData doesn't return warehouses! Let's update getAdminData too
          
          // Fix warehouse data by filtering properly
          warehousesData = data.data.warehouses || [];
        } else {
          throw new Error('Failed to load admin data');
        }
      } else if (isStoreUser && storeOwnerEmail) {
        // Store user - load data from the store owner
        console.log('[Items] Loading as STORE USER from owner:', storeOwnerEmail);
        const [ownerItems, ownItemsByStoreOwner, managerCreated, ownerSuppliers, managerSuppliers, ownerWarehouses, myWarehouses] = await Promise.all([
          base44.entities.Item.filter({ created_by: storeOwnerEmail }, "-created_date", 10000),
          base44.entities.Item.filter({ store_owner_email: storeOwnerEmail }, "-created_date", 10000),
          base44.entities.Item.filter({ created_by: effectiveEmail }, "-created_date", 10000),
          base44.entities.Supplier.filter({ created_by: storeOwnerEmail }, "name", 10000),
          base44.entities.Supplier.filter({ created_by: effectiveEmail }, "name", 10000),
          base44.entities.Warehouse.filter({ created_by: storeOwnerEmail }, "name", 10000),
          base44.entities.Warehouse.filter({ created_by: effectiveEmail }, "name", 10000)
        ]);
        console.log('[Items] Loaded from owner:', {
          ownerItems: ownerItems.length,
          ownItemsByStoreOwner: ownItemsByStoreOwner.length,
          managerCreated: managerCreated.length,
          suppliers: ownerSuppliers.length,
          warehouses: ownerWarehouses.length
        });
        // Combine items created by owner, items attributed to owner, and items the manager just created
        const allItems = [...ownerItems, ...ownItemsByStoreOwner, ...managerCreated];
        // Remove duplicates by id and sort by created_date descending (newest first)
        itemsData = Array.from(new Map(allItems.map(item => [item.id, item])).values())
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        
        const allSuppliers = [...ownerSuppliers, ...managerSuppliers];
        suppliersData = Array.from(new Map(allSuppliers.map(s => [s.id, s])).values());
        
        warehousesData = [...ownerWarehouses, ...myWarehouses];
      } else if (currentUser.chain_id && !currentUser.is_chain_head) {
        // Branch store in chain (with fallbacks)
        let effectiveChainId = currentUser.chain_id;
        if (!effectiveChainId) {
          // derive from ChainStore by email
          try {
            const myStores = await base44.entities.ChainStore.filter({ user_email: currentUser.email });
            if (myStores?.length) effectiveChainId = myStores[0].chain_id;
          } catch {}
        }
        if (effectiveChainId) {
          let headEmail = null;
          try {
            const chain = await base44.entities.Chain.filter({ id: effectiveChainId });
            headEmail = chain?.[0]?.head_store_user_email || null;
          } catch {}
          if (!headEmail) {
            try {
              const storesInChain = await base44.entities.ChainStore.filter({ chain_id: effectiveChainId });
              const headStore = storesInChain?.find(s => s.is_head_store);
              headEmail = headStore?.user_email || null;
            } catch {}
          }
          if (headEmail) {
            const [headItems, headSuppliers, headWarehouses, ownItems, ownSuppliers, ownWarehouses] = await Promise.all([
              base44.entities.Item.filter({ created_by: headEmail }, "-created_date", 10000),
              base44.entities.Supplier.filter({ created_by: headEmail }, "name", 10000),
              base44.entities.Warehouse.filter({ created_by: headEmail }, "name", 10000),
              base44.entities.Item.filter({ created_by: effectiveEmail }, "-created_date", 10000),
              base44.entities.Supplier.filter({ created_by: effectiveEmail }, "name", 10000),
              base44.entities.Warehouse.filter({ created_by: effectiveEmail }, "name", 10000)
            ]);
            const allItems = [...headItems, ...ownItems];
            itemsData = Array.from(new Map(allItems.map(i => [i.id, i])).values())
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            suppliersData = [...headSuppliers, ...ownSuppliers].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
            warehousesData = [...headWarehouses, ...ownWarehouses].filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
          } else {
            const [ownCreated, ownedByStore, suppliers, storeSuppliers, warehouses1, warehouses2] = await Promise.all([
              base44.entities.Item.filter({ created_by: effectiveEmail }, "-created_date", 10000),
              base44.entities.Item.filter({ store_owner_email: effectiveEmail }, "-created_date", 10000),
              base44.entities.Supplier.filter({ created_by: effectiveEmail }, "name", 10000),
              base44.entities.Supplier.filter({ store_owner_email: effectiveEmail }, "name", 10000),
              base44.entities.Warehouse.filter({ created_by: effectiveEmail }, "name", 10000),
              base44.entities.Warehouse.filter({ store_owner_email: effectiveEmail }, "name", 10000)
            ]);
            const allItems = [...ownCreated, ...ownedByStore];
            itemsData = Array.from(new Map(allItems.map(i => [i.id, i])).values())
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            suppliersData = [...suppliers, ...storeSuppliers].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
            warehousesData = [...warehouses1, ...warehouses2].filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
          }
        } else {
          const [ownCreated, ownedByStore, suppliers, storeSuppliers, warehouses1, warehouses2] = await Promise.all([
            base44.entities.Item.filter({ created_by: effectiveEmail }, "-created_date"),
            base44.entities.Item.filter({ store_owner_email: effectiveEmail }, "-created_date"),
            base44.entities.Supplier.filter({ created_by: effectiveEmail }, "name"),
            base44.entities.Supplier.filter({ store_owner_email: effectiveEmail }, "name"),
            base44.entities.Warehouse.filter({ created_by: effectiveEmail }, "name"),
            base44.entities.Warehouse.filter({ store_owner_email: effectiveEmail }, "name")
          ]);
          const allItems = [...ownCreated, ...ownedByStore];
          itemsData = Array.from(new Map(allItems.map(i => [i.id, i])).values())
            .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          suppliersData = [...suppliers, ...storeSuppliers].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
          warehousesData = [...warehouses1, ...warehouses2].filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
        }
      } else {
        // Head store or no chain - include items created by owner and items attributed to owner via store_owner_email
        const [ownCreated, ownedByStore, suppliers, storeSuppliers, warehouses1, warehouses2] = await Promise.all([
          base44.entities.Item.filter({ created_by: effectiveEmail }, "-created_date", 10000),
          base44.entities.Item.filter({ store_owner_email: effectiveEmail }, "-created_date", 10000),
          base44.entities.Supplier.filter({ created_by: effectiveEmail }, "name", 10000),
          base44.entities.Supplier.filter({ store_owner_email: effectiveEmail }, "name", 10000),
          base44.entities.Warehouse.filter({ created_by: effectiveEmail }, "name", 10000),
          base44.entities.Warehouse.filter({ store_owner_email: effectiveEmail }, "name", 10000)
        ]);
        const allItems = [...ownCreated, ...ownedByStore];
        itemsData = Array.from(new Map(allItems.map(i => [i.id, i])).values())
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        suppliersData = [...suppliers, ...storeSuppliers].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
        warehousesData = [...warehouses1, ...warehouses2].filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
      }

      // Deduplicate to prevent UI issues if the same entity was fetched multiple times
      itemsData = itemsData.filter((item, index, self) => self.findIndex(t => t.id === item.id) === index);
      suppliersData = suppliersData.filter((s, index, self) => self.findIndex(t => t.id === s.id) === index);
      warehousesData = warehousesData.filter((w, index, self) => self.findIndex(t => t.id === w.id) === index);

      // Ensure a 'General' warehouse exists and includes all items
      const ensured = await ensureGeneralWarehouse(currentUser, itemsData, warehousesData);
      const finalWarehouses = ensured || warehousesData;

      setItems(itemsData);
      setSuppliers(suppliersData);
      setWarehouses(finalWarehouses);
      setCache('items_v1', { items: itemsData, suppliers: suppliersData, warehouses: finalWarehouses });
      console.log(`[Items] Loaded ${itemsData.length} items, ${suppliersData.length} suppliers, ${finalWarehouses.length} warehouses`);

      setNetworkError(null);
    } catch (error) {
      console.error(`[Items] Error loading data (attempt ${retryCount + 1}):`, error);
      
      const isNetworkError = error.message?.includes('Network Error') || 
                            error.code === 'ERR_NETWORK' ||
                            error.name === 'NetworkError' ||
                            !navigator.onLine;
      
      if (isNetworkError && retryCount < 5) {
        console.log(`[Items] Retrying data load... (${retryCount + 1}/5)`);
        return loadData(currentUser, retryCount + 1);
      }
      
      setNetworkError(error.message || "Failed to load data");
      setItems([]);
      setSuppliers([]);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const ensureGeneralWarehouse = async (currentUser, itemsData, warehousesData) => {
    try {
      // Do not create/modify warehouses for sub-users (viewer/worker/managers under an owner)
      if (currentUser?.store_user_owner_email) {
        return warehousesData;
      }
      const name = 'General';
      let general = warehousesData.find(w => (w.name || '').toLowerCase() === name.toLowerCase());
      const allIds = itemsData.map(i => i.id);
      if (!general) {
        const created = await base44.entities.Warehouse.create({ name, catalog_items: allIds });
        return [...warehousesData, created];
      }
      const existing = Array.isArray(general.catalog_items) ? general.catalog_items : [];
      const missing = allIds.filter(id => !existing.includes(id));
      if (missing.length > 0 || existing.length !== allIds.length) {
        general = await base44.entities.Warehouse.update(general.id, { catalog_items: allIds });
        return warehousesData.map(w => (w.id === general.id ? general : w));
      }
      return warehousesData;
    } catch (e) {
      console.warn('[Items] ensureGeneralWarehouse failed:', e?.message || e);
      return warehousesData;
    }
  };

  useEffect(() => {
    let mounted = true;
    let initTimeout = null;
    
    const checkAuthAndLoadData = async (retryCount = 0) => {
      try {
        if (!mounted) return;
        
        setAuthLoading(true);
        setNetworkError(null);
        
        console.log(`[Items] Authentication attempt ${retryCount + 1}`);
        
        if (retryCount > 0) {
          const delay = Math.min(3000 * Math.pow(1.5, retryCount - 1), 15000);
          console.log(`[Items] Waiting ${delay}ms before auth retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const currentUser = await base44.auth.me();
        console.log("[Items] User authenticated:", currentUser.email);
        
        if (!mounted) return;
        
        setUser(currentUser);
        setIsViewer(currentUser.store_user_role === 'viewer' || currentUser.store_user_read_only === true);

        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (mounted) {
          const c = getCache('items_v1');
          const stale = isStale(c, 180000);
          const isImpersonating = currentUser?.acting_as_user_email || currentUser?.acting_as_store_email;
          if (stale || isImpersonating) {
            await loadData(currentUser);
          }
        }
      } catch (error) {
        console.error(`[Items] Authentication error (attempt ${retryCount + 1}):`, error);
        
        const isNetworkError = error.message?.includes('Network Error') || 
                              error.code === 'ERR_NETWORK' ||
                              error.name === 'NetworkError' ||
                              !navigator.onLine;
        
        if (isNetworkError && retryCount < 5 && mounted) {
          console.log(`[Items] Retrying authentication... (${retryCount + 1}/5)`);
          initTimeout = setTimeout(() => {
            if (mounted) {
              checkAuthAndLoadData(retryCount + 1);
            }
          }, Math.min(3000 * Math.pow(1.5, retryCount), 15000));
          return;
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
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
    };
  }, []);

  const handleSubmit = async (itemData) => {
    if (isViewer) return;
    if (!user) {
      alert(t('error_no_logged_in_user') || "Error: No user logged in");
      return;
    }

    const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...cleanData } = itemData;

    // 1) Create item (show error only if creation fails)
    try {
      const targetEmail = user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email;
      if (targetEmail) {
        const { data } = await base44.functions.invoke('createItemForStore', {
          itemData: cleanData,
          storeEmail: targetEmail
        });
        if (!data?.success) throw new Error(data?.error || 'Failed to create item');
      } else {
        await base44.entities.Item.create({ ...cleanData, created_by: user.email });
      }
      setShowForm(false);
    } catch (e) {
      console.error("Create item failed:", e);
      alert(t('error_saving') + ': ' + (e.message || 'Unknown error'));
      return;
    }

    // 2) Soft refresh (non-blocking, no alert on failure)
    try {
      const refreshedUser = await base44.auth.me();
      setUser(refreshedUser);
      await loadData(refreshedUser);
    } catch (e) {
      console.warn("Item created, but refresh failed:", e);
    }
  };

  const handleModalSave = async (itemData) => {
    if (isViewer) return;
    try {
      if (!user) {
        alert(t('error_no_logged_in_user') || "Error: No user logged in");
        return;
      }
      
      const targetId = itemData.id || editingItem?.id;
      
      if (!targetId) {
        console.error("No item to update");
        alert(t('error_saving') + ": No item to update");
        return;
      }
      const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...cleanData } = itemData;

      await base44.entities.Item.update(targetId, cleanData);

      // Sync warehouse catalog_items
      const currentWarehouseIds = cleanData.warehouse_ids || [];
      const oldWarehouseIds = editingItem?.warehouse_ids || [];
      
      const removedWarehouseIds = oldWarehouseIds.filter(wid => !currentWarehouseIds.includes(wid));
      const addedWarehouseIds = currentWarehouseIds.filter(wid => !oldWarehouseIds.includes(wid));

      // For removed warehouses, we also need to check any warehouse that might have this item in its catalog_items
      // even if it wasn't in item.warehouse_ids (to fix out-of-sync states).
      const allWarehousesToUpdate = [];
      
      for (const wh of warehouses) {
        const hasItemInCatalog = Array.isArray(wh.catalog_items) && wh.catalog_items.includes(targetId);
        const shouldBeInWarehouse = currentWarehouseIds.includes(wh.id);
        
        if (hasItemInCatalog && !shouldBeInWarehouse) {
          // Needs to be removed
          const newCatalog = wh.catalog_items.filter(itemId => itemId !== targetId);
          allWarehousesToUpdate.push(base44.entities.Warehouse.update(wh.id, { catalog_items: newCatalog }));
        } else if (!hasItemInCatalog && shouldBeInWarehouse) {
          // Needs to be added
          const newCatalog = [...(wh.catalog_items || []), targetId];
          allWarehousesToUpdate.push(base44.entities.Warehouse.update(wh.id, { catalog_items: newCatalog }));
        }
      }

      if (allWarehousesToUpdate.length > 0) {
        await Promise.all(allWarehousesToUpdate);
      }

      await loadData(user);
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
      alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleDelete = async (target) => {
    if (isViewer) return;
    const id = typeof target === 'string' ? target : target?.id;
    const name = typeof target === 'string' ? '' : (target?.name || '');
    if (!id) {
      alert(t('error_saving') + ': Invalid item');
      return;
    }
    if (!confirm(`${t('delete')} ${name}?`)) {
      return;
    }

    try {
      if (user?.store_user_owner_email || user?.acting_as_store_email) {
        const { data } = await base44.functions.invoke('deleteItemForStore', { itemId: id });
        if (!data?.success) throw new Error(data?.error || 'Failed to delete');
      } else {
        const exists = await base44.entities.Item.filter({ id });
        if (!exists?.length) throw new Error('Entity Item with ID ' + id + ' not found');
        await base44.entities.Item.delete(id);
      }
      await loadData(user);
    } catch (error) {
      console.error("Error deleting item:", error);
      alert((t('error_saving') || 'Error') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const handleBulkDelete = async () => {
    if (isViewer) return;
    if (selectedIds.length === 0) { setShowDeleteDialog(false); return; }
    setDeleting(true);
    try {
      if (user?.store_user_owner_email || user?.acting_as_store_email) {
        await Promise.all(selectedIds.map(id => base44.functions.invoke('deleteItemForStore', { itemId: id })));
      } else {
        await Promise.all(selectedIds.map(id => base44.entities.Item.delete(id)));
      }
      setSelectedIds([]);
      await loadData(user);
      setShowDeleteDialog(false);
    } catch (e) {
      console.error("Bulk delete failed:", e);
      alert((t('error_saving') || 'Error') + ': ' + (e.message || 'Failed to delete items'));
    } finally {
      setDeleting(false);
    }
  };

const handleCleanOrphans = async (ownerEmail) => {
    if (isViewer) return;
    const email = ownerEmail || user?.acting_as_store_email || user?.store_user_owner_email || user?.acting_as_user_email || user?.email;
    const { data } = await base44.functions.invoke('cleanOrphanItems', { targetEmail: email });
    if (!data?.success) {
      alert((t('error_saving') || 'Error') + ': ' + (data?.error || 'Failed to clean orphans'));
      return;
    }
    alert(`Deleted ${data.deleted} orphan items (of ${data.orphanCount}) for ${email}`);
    await loadData(user);
  };

  const handleExportToSheets = async () => {
    try {
      setExporting(true);
      const { data } = await base44.functions.invoke('exportItemsToSheets', {});
      if (data?.success && data?.url) {
        window.open(data.url, '_blank');
        alert('Exported to Google Sheets. Share or paste this link in your other system.');
      } else {
        alert('Export failed: ' + (data?.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Export failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const handleFindDuplicates = () => {
    if (isViewer) return;
    setShowCleanModal(true);
  };

  const handleConfirmDuplicatesDelete = async (idsToDelete, mappingToKeep) => {
    if (!idsToDelete || idsToDelete.length === 0) return;
    
    try {
      if (mappingToKeep && Object.keys(mappingToKeep).length > 0) {
        const { data } = await base44.functions.invoke('replaceAndDeleteItems', { 
          idsToDelete, 
          mappingToKeep 
        });
        if (!data?.success) {
          throw new Error(data?.error || 'Failed to replace and delete items');
        }
      } else {
        if (user?.store_user_owner_email || user?.acting_as_store_email) {
          await Promise.all(idsToDelete.map(id => base44.functions.invoke('deleteItemForStore', { itemId: id })));
        } else {
          await Promise.all(idsToDelete.map(id => base44.entities.Item.delete(id)));
        }
      }
      
      // Update local state and reload
      setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
      await loadData(user);
      
      alert(language === 'he' ? `נמחקו ${idsToDelete.length} פריטים בהצלחה.` : `Successfully deleted ${idsToDelete.length} items.`);
    } catch (e) {
      console.error("Duplicate delete failed:", e);
      throw e; // Modal handles alert
    }
  };

  const handleGenerateCatalogPdf = async () => {
    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.left = '-9999px';
      printContainer.style.top = '0';
      printContainer.style.width = '800px';
      printContainer.style.backgroundColor = 'white';
      printContainer.style.padding = '40px';
      printContainer.style.direction = language === 'he' ? 'rtl' : 'ltr';
      document.body.appendChild(printContainer);

      let html = `
        <div style="font-family: system-ui, -apple-system, sans-serif; color: #111827;">
          <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid blue-600; padding-bottom: 20px;">
            <h1 style="color: blue-600; margin: 0; font-size: 28px;">
              ${language === 'he' ? 'קטלוג פריטים' : 'Items Catalog'}
            </h1>
            <p style="color: #6b7280; margin-top: 10px; font-size: 14px;">
              ${new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')} | ${filteredItems.length} ${language === 'he' ? 'פריטים' : 'items'}
            </p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;">
      `;

      filteredItems.forEach(item => {
        const price = item.price_after_discount || item.price || 0;
        html += `
          <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; background-color: #f9fafb;">
            <div style="font-weight: 700; font-size: 18px; margin-bottom: 8px; color: #111827;">${item.name}</div>
            <div style="color: #4b5563; font-size: 14px; margin-bottom: 16px; display: flex; justify-content: space-between;">
              <span>${item.supplier_name || ''}</span>
              <span style="color: #9ca3af;">${item.catalog_number || ''}</span>
            </div>
            <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e5e7eb; padding-top: 12px;">
              <span style="font-size: 14px; color: #6b7280; background: #e5e7eb; padding: 4px 8px; border-radius: 6px;">
                ${item.units_per_package} ${t('unit_' + item.unit) || item.unit}
              </span>
              <span style="font-weight: 800; font-size: 20px; color: blue-600;">₪${price.toFixed(2)}</span>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;

      printContainer.innerHTML = html;

      const canvas = await html2canvas(printContainer, { 
        scale: 2, 
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save('catalog.pdf');
      document.body.removeChild(printContainer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(language === 'he' ? 'שגיאה ביצירת קובץ PDF' : 'Error generating PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

   const currentWarehouse = selectedWarehouseId !== 'all' ? warehouses.find(w => w.id === selectedWarehouseId) : null;
  const filteredItems = items.filter(item => {
    const searchStr = String(searchTerm || '').toLowerCase();
    const matchesSearch = !searchStr || 
                         String(item.name || '').toLowerCase().includes(searchStr) ||
                         String(item.description || '').toLowerCase().includes(searchStr) ||
                         String(item.catalog_number || '').toLowerCase().includes(searchStr);
    const matchesSupplier = selectedSupplier === "all" || item.supplier_id === selectedSupplier;
    const matchesWarehouse = !currentWarehouse || 
      (Array.isArray(currentWarehouse.catalog_items) && currentWarehouse.catalog_items.includes(item.id)) ||
      (Array.isArray(item.warehouse_ids) && item.warehouse_ids.includes(currentWarehouse.id)) ||
      (item.warehouse_id === currentWarehouse.id);
    return matchesSearch && matchesSupplier && matchesWarehouse;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-gray-600" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
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
          
          setTimeout(() => {
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
          }, 1000);
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
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 ${viewMode === 'list' ? 'sticky top-[56px] md:top-[72px] z-40 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70 border-b pt-4 pb-4' : ''}`}>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('items_title')}</h1>
            <p className="text-gray-600 mt-2">{t('items_greeting', { name: user.full_name })}</p>
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
                <DropdownMenuItem onClick={() => setShowImportModal(true)}>
                  <FileUp className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                  {language === 'he' ? 'ייבוא מגוגל שיטס' : 'Import from Google Sheets'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportToSheets}>
                  {exporting ? <Loader className="w-4 h-4 rtl:ml-2 ltr:mr-2 animate-spin" /> : <FileDown className="w-4 h-4 rtl:ml-2 ltr:mr-2" />}
                  {safeT('export_to_sheets','ייצוא ל-Google Sheets','Export to Google Sheets')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGenerateCatalogPdf} disabled={generatingPdf}>
                  {generatingPdf ? <Loader className="w-4 h-4 rtl:ml-2 ltr:mr-2 animate-spin" /> : <FileText className="w-4 h-4 rtl:ml-2 ltr:mr-2" />}
                  {language === 'he' ? 'הפק קטלוג' : 'Generate Catalog'}
                </DropdownMenuItem>
                {!isViewer && selectedIds.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowBulkWarehouseModal(true)}>
                      <LayoutGrid className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                      {language === 'he' ? 'שייך פריטים נבחרים למחסנים' : 'Assign selected to warehouses'}
                    </DropdownMenuItem>
                    {selectedWarehouseId !== 'all' && (
                      <DropdownMenuItem onClick={async () => {
                        const currentWh = warehouses.find(w => w.id === selectedWarehouseId);
                        if (!currentWh) return;
                        const existing = Array.isArray(currentWh.catalog_items) ? currentWh.catalog_items : [];
                        const next = existing.filter(id => !selectedIds.includes(id));
                        await base44.entities.Warehouse.update(currentWh.id, { catalog_items: next });
                        await Promise.all(selectedIds.map(async (itemId) => {
                          const item = items.find(i => i.id === itemId);
                          if (!item) return;
                          const currentWids = item.warehouse_ids || (item.warehouse_id ? [item.warehouse_id] : []);
                          const currentWnames = item.warehouse_names || (item.warehouse_name ? [item.warehouse_name] : []);
                          if (!currentWids.includes(currentWh.id)) return;
                          const newWids = currentWids.filter(id => id !== currentWh.id);
                          const newWnames = currentWnames.filter(name => name !== currentWh.name);
                          await base44.entities.Item.update(item.id, {
                            warehouse_ids: newWids,
                            warehouse_names: newWnames,
                            warehouse_id: newWids.length > 0 ? newWids[0] : "",
                            warehouse_name: newWnames.length > 0 ? newWnames[0] : ""
                          });
                        }));
                        setSelectedIds([]);
                        loadData(user);
                      }}>
                        <Trash2 className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-red-500" />
                        <span className="text-red-500">{language === 'he' ? `הסר ממחסן נוכחי (${warehouses.find(w => w.id === selectedWarehouseId)?.name || ''})` : `Remove from current warehouse (${warehouses.find(w => w.id === selectedWarehouseId)?.name || ''})`}</span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                {!isViewer && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleFindDuplicates}>
                      <Wand2 className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                      {language === 'he' ? 'נקה כפולים' : 'Clean Doubles'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {!isViewer && (
            <Button
              onClick={() => {
                setShowForm(!showForm);
                setEditingItem(null);
              }}
              className="bg-[#d4a373] hover:bg-[#b88c60] text-white"
            >
              <Plus className="w-5 h-5 rtl:ml-2 ltr:mr-2" />
              {t('add_new_item')}
            </Button>
            )}
          </div>
        </div>

        {(() => {
          const incompleteItems = items.filter(item => item.supplier_id === 'pending' || item.supplier_name === 'להשלמה' || item.supplier_name === 'Pending' || item.is_pending_completion === true || item.status === 'pending_completion');
          if (incompleteItems.length === 0) return null;
          
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">
                    {language === 'he' ? 'פריטים דורשי השלמה' : 'Items needing completion'}
                  </h3>
                  <p className="text-sm text-amber-800 mb-3">
                    {language === 'he' 
                      ? 'הפריטים הבאים נוספו במהלך קבלת אספקה/ספירת מלאי ויש להשלים את הגדרתם (לשייך לספק ולעדכן פרטים):' 
                      : 'The following items were added during supply receipt/inventory count and need to be completed:'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {incompleteItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          const fullItem = items.find(i => i.id === item.id) || item;
                          handleEdit(fullItem);
                        }}
                        className="bg-white border border-amber-300 shadow-sm rounded-md px-3 py-1.5 text-sm cursor-pointer hover:bg-amber-100 transition-colors flex items-center gap-2"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500 text-xs">₪{item.price || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <AnimatePresence>
          {!isViewer && showForm && (
            <ItemForm
              item={null}
              suppliers={suppliers}
              warehouses={warehouses}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
              }}
              onWarehouseCreated={() => user && loadData(user)}
              defaultSupplierId={defaultSupplierId}
            />
          )}
        </AnimatePresence>

        <div className="flex flex-col lg:flex-row gap-3 mb-6 bg-gray-50 py-3 px-2 md:px-3 items-center w-full">
          <div className="relative flex-1 w-full min-w-[150px]">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('search_items')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 h-10"
            />
          </div>
          <div className="flex-1 w-full min-w-[150px]">
            <Popover open={supplierFilterOpen} onOpenChange={setSupplierFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={supplierFilterOpen}
                  className="w-full justify-between bg-white text-gray-700 h-10"
                >
                  {selectedSupplier === "all" 
                    ? t('all_suppliers') 
                    : suppliers.find(s => s.id === selectedSupplier)?.name || t('all_suppliers')}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50 rtl:mr-2 rtl:ml-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('select_supplier') + '...'} />
                  <CommandList>
                    <CommandEmpty>{language === 'he' ? 'לא נמצאו ספקים' : 'No suppliers found'}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedSupplier("all");
                          setSupplierFilterOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 ${
                            selectedSupplier === "all" ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {t('all_suppliers')}
                      </CommandItem>
                      {suppliers
                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                        .map((supplier) => (
                          <CommandItem
                            key={supplier.id}
                            value={supplier.name || supplier.id}
                            onSelect={() => {
                              setSelectedSupplier(supplier.id);
                              setSupplierFilterOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 ${
                                selectedSupplier === supplier.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {supplier.name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 w-full min-w-[150px]">
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger className="h-10 bg-white">
                <SelectValue placeholder={t('warehouse') + ' — ' + t('filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{safeT('all_warehouses','כל המחסנים','All warehouses')}</SelectItem>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full lg:w-auto shrink-0">
            <Button
              variant="destructive"
              disabled={selectedIds.length === 0}
              onClick={() => setShowDeleteDialog(true)}
              className="w-full lg:w-auto h-10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {language === 'he' ? 'מחיקה' : 'Delete'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-12 h-12 animate-spin text-green-600" />
          </div>
        ) : (
          <>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">{t('no_items_to_display_items')}</div>
                <div className="text-gray-500">{t('start_by_adding_item')}</div>
              </div>
            ) : (
              <>
                {viewMode === 'cards' ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                      {filteredItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          selectable
                          selected={selectedIds.includes(item.id)}
                          onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <ItemListView
                    items={filteredItems}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    selectedIds={selectedIds}
                    onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    onToggleSelectAll={(list) => {
                      const ids = list.map(i => i.id);
                      const allSelected = ids.every(id => selectedIds.includes(id));
                      setSelectedIds(allSelected ? selectedIds.filter(id => !ids.includes(id)) : Array.from(new Set([...selectedIds, ...ids])));
                    }}
                    headerTopClass={viewMode === 'list' ? 'top-[120px] md:top-[140px]' : 'top-[64px] md:top-[84px]'}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      {!isViewer && (
      <ItemEditModal
        item={editingItem}
        suppliers={suppliers}
        warehouses={warehouses}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
        onSave={handleModalSave}
        onWarehouseCreated={() => user && loadData(user)}
      />
       )}

       <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>{language === 'he' ? 'מחיקת פריטים נבחרים' : 'Delete selected items'}</AlertDialogTitle>
             <AlertDialogDescription>
               {language === 'he' ? `האם למחוק ${selectedIds.length} פריטים שנבחרו? הפעולה אינה ניתנת לשחזור.` : `Delete ${selectedIds.length} selected items? This action cannot be undone.`}
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel disabled={deleting}>{language === 'he' ? 'בטל' : 'Cancel'}</AlertDialogCancel>
             <AlertDialogAction onClick={handleBulkDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
               {deleting ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
               {language === 'he' ? 'מחק' : 'Delete'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

       {!isViewer && (
         <BulkWarehouseModal
           isOpen={showBulkWarehouseModal}
           onClose={() => setShowBulkWarehouseModal(false)}
           selectedCount={selectedIds.length}
           warehouses={warehouses}
           onAssignToWarehouses={async (targetIds) => {
             if (!targetIds || targetIds.length === 0) return;
             
             const targetWarehouses = warehouses.filter(w => targetIds.includes(w.id));
             if (targetWarehouses.length === 0) return;

             // Update each warehouse's catalog_items
             await Promise.all(targetWarehouses.map(async (wh) => {
               const existing = Array.isArray(wh.catalog_items) ? wh.catalog_items : [];
               const next = Array.from(new Set([...existing, ...selectedIds]));
               return base44.entities.Warehouse.update(wh.id, { catalog_items: next });
             }));

             // Update each item
             await Promise.all(selectedIds.map(async (itemId) => {
               const item = items.find(i => i.id === itemId);
               if (!item) return;
               let currentWids = item.warehouse_ids || (item.warehouse_id ? [item.warehouse_id] : []);
               let currentWnames = item.warehouse_names || (item.warehouse_name ? [item.warehouse_name] : []);
               
               let updated = false;
               targetWarehouses.forEach(wh => {
                 if (!currentWids.includes(wh.id)) {
                   currentWids.push(wh.id);
                   currentWnames.push(wh.name);
                   updated = true;
                 }
               });

               if (updated) {
                 await base44.entities.Item.update(item.id, {
                   warehouse_ids: currentWids,
                   warehouse_names: currentWnames,
                   warehouse_id: item.warehouse_id || currentWids[0],
                   warehouse_name: item.warehouse_name || currentWnames[0]
                 });
               }
             }));

             setSelectedIds([]);
             loadData(user);
           }}
         />
       )}

        <ImportSuppliersItemsModal 
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => loadData(user)}
        />

        <CleanDuplicatesModal
          isOpen={showCleanModal}
          onClose={() => setShowCleanModal(false)}
          items={items}
          onDelete={handleConfirmDuplicatesDelete}
        />
    </div>
  );
}