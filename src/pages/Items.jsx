import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, LayoutGrid, List, Trash2, FileSpreadsheet, FileText, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence } from "framer-motion";
import { useLanguage } from "../components/LanguageProvider";

import ItemForm from "../components/items/ItemForm";
import ItemCard from "../components/items/ItemCard";
import NetworkErrorHandler from "../components/NetworkErrorHandler";
import ItemEditModal from "../components/items/ItemEditModal";
import ItemListView from "../components/items/ItemListView";
import SelectionBar from "../components/items/SelectionBar";
import ImportSuppliersItemsModal from "../components/items/ImportSuppliersItemsModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [viewMode, setViewMode] = useState("cards");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("all");
  const [defaultSupplierId, setDefaultSupplierId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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

      if (isStoreUser && storeOwnerEmail) {
        // Store user - load data from the store owner
        console.log('[Items] Loading as STORE USER from owner:', storeOwnerEmail);
        const [ownerItems, ownItemsByStoreOwner, managerCreated, ownerSuppliers, managerSuppliers, ownerWarehouses, myWarehouses] = await Promise.all([
          base44.entities.Item.filter({ created_by: storeOwnerEmail }, "-created_date"),
          base44.entities.Item.filter({ store_owner_email: storeOwnerEmail }, "-created_date"),
          base44.entities.Item.filter({ created_by: effectiveEmail }, "-created_date"),
          base44.entities.Supplier.filter({ created_by: storeOwnerEmail }, "name"),
          base44.entities.Supplier.filter({ created_by: effectiveEmail }, "name"),
          base44.entities.Warehouse.filter({ created_by: storeOwnerEmail }, "name"),
          base44.entities.Warehouse.filter({ created_by: effectiveEmail }, "name")
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
              base44.entities.Item.filter({ created_by: headEmail }, "-created_date"),
              base44.entities.Supplier.filter({ created_by: headEmail }, "name"),
              base44.entities.Warehouse.filter({ created_by: headEmail }, "name"),
              base44.entities.Item.filter({ created_by: effectiveEmail }, "-created_date"),
              base44.entities.Supplier.filter({ created_by: effectiveEmail }, "name"),
              base44.entities.Warehouse.filter({ created_by: effectiveEmail }, "name")
            ]);
            itemsData = [...headItems, ...ownItems]
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            suppliersData = [...headSuppliers, ...ownSuppliers];
            warehousesData = [...headWarehouses, ...ownWarehouses];
          } else {
            const [ownCreated, ownedByStore, suppliers, warehouses] = await Promise.all([
              base44.entities.Item.filter({ created_by: effectiveEmail }, "-created_date"),
              base44.entities.Item.filter({ store_owner_email: effectiveEmail }, "-created_date"),
              base44.entities.Supplier.filter({ created_by: effectiveEmail }, "name"),
              base44.entities.Warehouse.filter({ created_by: effectiveEmail }, "name")
            ]);
            const allItems = [...ownCreated, ...ownedByStore];
            itemsData = Array.from(new Map(allItems.map(i => [i.id, i])).values())
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            suppliersData = suppliers;
            warehousesData = warehouses;
          }
        } else {
          const [ownCreated, ownedByStore, suppliers, warehouses] = await Promise.all([
            base44.entities.Item.filter({ created_by: effectiveEmail }, "-created_date"),
            base44.entities.Item.filter({ store_owner_email: effectiveEmail }, "-created_date"),
            base44.entities.Supplier.filter({ created_by: effectiveEmail }, "name"),
            base44.entities.Warehouse.filter({ created_by: effectiveEmail }, "name")
          ]);
          const allItems = [...ownCreated, ...ownedByStore];
          itemsData = Array.from(new Map(allItems.map(i => [i.id, i])).values())
            .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          suppliersData = suppliers;
          warehousesData = warehouses;
        }
      } else {
        // Head store or no chain - include items created by owner and items attributed to owner via store_owner_email
        const [ownCreated, ownedByStore, suppliers, warehouses] = await Promise.all([
          base44.entities.Item.filter({ created_by: effectiveEmail }, "-created_date"),
          base44.entities.Item.filter({ store_owner_email: effectiveEmail }, "-created_date"),
          base44.entities.Supplier.filter({ created_by: effectiveEmail }, "name"),
          base44.entities.Warehouse.filter({ created_by: effectiveEmail }, "name")
        ]);
        const allItems = [...ownCreated, ...ownedByStore];
        itemsData = Array.from(new Map(allItems.map(i => [i.id, i])).values())
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        suppliersData = suppliers;
        warehousesData = warehouses;
      }

      // Ensure a 'General' warehouse exists and includes all items
      const ensured = await ensureGeneralWarehouse(currentUser, itemsData, warehousesData);
      const finalWarehouses = ensured || warehousesData;

      setItems(itemsData);
      setSuppliers(suppliersData);
      setWarehouses(finalWarehouses);
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
          await loadData(currentUser);
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
        await base44.entities.Item.create(cleanData);
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
      if (!editingItem) {
        console.error("No item to update");
        alert(t('error_saving') + ": No item to update");
        return;
      }
      const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...cleanData } = itemData;

      await base44.entities.Item.update(editingItem.id, cleanData);
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

  const handleFindDuplicates = async () => {
    if (isViewer) return;
    if (window.confirm(language === 'he' ? 'האם אתה בטוח שברצונך למחוק פריטים כפולים? הפעולה אינה ניתנת לביטול.' : 'Are you sure you want to delete duplicate items? This cannot be undone.')) {
      setCleaning(true);
      try {
        const { data } = await base44.functions.invoke('findAndRemoveDuplicates', { type: 'items' });
        if (data?.success) {
          alert((language === 'he' ? 'נמחקו פריטים כפולים: ' : 'Deleted duplicate items: ') + data.deletedCount);
          await loadData(user);
        } else {
          alert(data?.error || 'Error');
        }
      } catch (e) {
        alert(e.message || 'Error');
      }
      setCleaning(false);
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
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.catalog_number && item.catalog_number.toLowerCase().includes(searchTerm.toLowerCase()));
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
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
            alt="Smart Plate"
            className="h-20 object-contain animate-pulse"
          />
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
          <div className="flex gap-3 flex-wrap items-center w-full">
            <div className="flex bg-white rounded-lg shadow-sm border">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('cards')}
                className={viewMode === 'cards' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-100'}
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-100'}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {language === 'he' ? 'ייבוא מגוגל שיטס' : 'Import from Google Sheets'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportToSheets}
              className="gap-2"
            >
              {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {safeT('export_to_sheets','ייצוא ל-Google Sheets','Export to Google Sheets')}
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateCatalogPdf}
              className="gap-2"
              disabled={generatingPdf}
            >
              {generatingPdf ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {language === 'he' ? 'הפק קטלוג' : 'Generate Catalog'}
            </Button>

            {!isViewer && (
              <Button
                variant="outline"
                onClick={handleFindDuplicates}
                disabled={cleaning}
                className="gap-2"
              >
                {cleaning ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {language === 'he' ? 'נקה כפולים' : 'Clean Doubles'}
              </Button>
            )}

            {!isViewer && (
            <Button
              onClick={() => {
                setShowForm(!showForm);
                setEditingItem(null);
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              <Plus className="w-5 h-5 ml-2" />
              {t('add_new_item')}
            </Button>
            )}
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 bg-gray-50 py-3 px-2 md:px-3 items-start">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder={t('search_items')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger>
              <SelectValue placeholder={t('select_supplier')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_suppliers')}</SelectItem>
              {suppliers.map(supplier => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center gap-2 w-full">
            <Button
              variant="destructive"
              disabled={selectedIds.length === 0}
              onClick={() => setShowDeleteDialog(true)}
              className="min-w-[120px]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {language === 'he' ? 'מחיקה' : 'Delete'}
            </Button>
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder={t('warehouse') + ' — ' + t('filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{safeT('all_warehouses','כל המחסנים','All warehouses')}</SelectItem>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              disabled={selectedWarehouseId === 'all'}
              onClick={async () => {
                if (selectedWarehouseId === 'all') return;
                const wh = warehouses.find(w => w.id === selectedWarehouseId);
                if (!wh) return;
                if (!confirm(`Delete warehouse "${wh.name}"?`)) return;
                try {
                  await base44.entities.Warehouse.delete(selectedWarehouseId);
                  setWarehouses(prev => prev.filter(w => w.id !== selectedWarehouseId));
                  setSelectedWarehouseId('all');
                } catch (e) {
                  alert((t('error_saving') || 'Error') + ': ' + (e.message || 'Failed to delete warehouse'));
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> {language === 'he' ? 'מחק מחסן' : 'Delete Warehouse'}
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
       <SelectionBar
        selectedCount={selectedIds.length}
        currentWarehouseName={selectedWarehouseId !== 'all' ? (warehouses.find(w => w.id === selectedWarehouseId)?.name || '') : ''}
        warehouses={warehouses}
        targetWarehouseId={selectedWarehouseId !== 'all' ? selectedWarehouseId : ''}
        onChangeTargetWarehouse={(id) => setSelectedWarehouseId(id)}
        onAddToCurrent={async () => {
          const targetId = selectedWarehouseId;
          if (!targetId || targetId === 'all') { alert(safeT('select_warehouse_first','בחר/י מחסן תחילה','Select a warehouse first')); return; }
          const wh = warehouses.find(w => w.id === targetId);
          if (!wh) return;
          const existing = Array.isArray(wh.catalog_items) ? wh.catalog_items : [];
          const next = Array.from(new Set([...existing, ...selectedIds]));
          const updated = await base44.entities.Warehouse.update(wh.id, { catalog_items: next });
          setWarehouses(prev => prev.map(w => w.id === wh.id ? updated : w));
          setSelectedIds([]);
        }}
        onCreateNew={async () => {
          const name = window.prompt('Warehouse name');
          if (!name) return;
          const created = await base44.entities.Warehouse.create({ name, catalog_items: selectedIds });
          setWarehouses(prev => [...prev, created]);
          setSelectedWarehouseId(created.id);
          setSelectedIds([]);
        }}
        />
        )}

        <ImportSuppliersItemsModal 
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => loadData(user)}
        />
    </div>
  );
}