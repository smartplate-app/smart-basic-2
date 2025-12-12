import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence } from "framer-motion";
import { useLanguage } from "../components/LanguageProvider";

import ItemForm from "../components/items/ItemForm";
import ItemCard from "../components/items/ItemCard";
import NetworkErrorHandler from "../components/NetworkErrorHandler";
import ItemEditModal from "../components/items/ItemEditModal";
import ItemListView from "../components/items/ItemListView";

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
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState("cards");

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

      if (isStoreUser && storeOwnerEmail) {
        // Store user - load data from the store owner
        console.log('[Items] Loading as STORE USER from owner:', storeOwnerEmail);
        const [ownerItems, ownerSuppliers, ownerWarehouses] = await Promise.all([
          base44.entities.Item.filter({ created_by: storeOwnerEmail }, "-created_date"),
          base44.entities.Supplier.filter({ created_by: storeOwnerEmail }, "name"),
          base44.entities.Warehouse.filter({ created_by: storeOwnerEmail }, "name")
        ]);
        console.log('[Items] Loaded from owner:', {
          items: ownerItems.length,
          suppliers: ownerSuppliers.length,
          warehouses: ownerWarehouses.length
        });
        itemsData = ownerItems;
        suppliersData = ownerSuppliers;
        warehousesData = ownerWarehouses;
      } else if (currentUser.chain_id && !currentUser.is_chain_head) {
        // Branch store in chain
        const chain = await base44.entities.Chain.filter({ id: currentUser.chain_id });
        if (chain.length > 0) {
          const headEmail = chain[0].head_store_user_email;
          // Load from head store + own data
          const [headItems, headSuppliers, headWarehouses, ownItems, ownSuppliers, ownWarehouses] = await Promise.all([
            base44.entities.Item.filter({ created_by: headEmail }, "-created_date"),
            base44.entities.Supplier.filter({ created_by: headEmail }, "name"),
            base44.entities.Warehouse.filter({ created_by: headEmail }, "name"),
            base44.entities.Item.filter({ created_by: currentUser.email }, "-created_date"),
            base44.entities.Supplier.filter({ created_by: currentUser.email }, "name"),
            base44.entities.Warehouse.filter({ created_by: currentUser.email }, "name")
          ]);
          itemsData = [...headItems, ...ownItems];
          suppliersData = [...headSuppliers, ...ownSuppliers];
          warehousesData = [...headWarehouses, ...ownWarehouses];
        }
      } else {
        // Head store or no chain
        const [items, suppliers, warehouses] = await Promise.all([
          base44.entities.Item.filter({ created_by: currentUser.email }, "-created_date"),
          base44.entities.Supplier.filter({ created_by: currentUser.email }, "name"),
          base44.entities.Warehouse.filter({ created_by: currentUser.email }, "name")
        ]);
        itemsData = items;
        suppliersData = suppliers;
        warehousesData = warehouses;
      }

      setItems(itemsData);
      setSuppliers(suppliersData);
      setWarehouses(warehousesData);
      console.log(`[Items] Loaded ${itemsData.length} items, ${suppliersData.length} suppliers`);
      
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
    try {
      if (!user) {
        alert(t('error_no_logged_in_user') || "Error: No user logged in");
        return;
      }
      
      const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...cleanData } = itemData;
      
      console.log('[Items] User data:', { 
        email: user.email, 
        store_user_owner_email: user.store_user_owner_email,
        store_user_role: user.store_user_role 
      });
      
      // If user is a manager/worker, use backend function to create with owner's email
      if (user.store_user_owner_email) {
        console.log('[Items] Manager creating item with owner email:', user.store_user_owner_email);
        console.log('[Items] Item data:', cleanData);
        const response = await base44.functions.invoke('createItemForStore', {
          itemData: cleanData,
          storeEmail: user.store_user_owner_email
        });
        console.log('[Items] Backend function response:', response);
        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to create item');
        }
        console.log('[Items] Item created successfully, reloading data...');
      } else {
        console.log('[Items] Owner creating item directly');
        await base44.entities.Item.create(cleanData);
      }
      setShowForm(false);
      
      // Force reload with fresh user data
      const refreshedUser = await base44.auth.me();
      console.log('[Items] Refreshed user data before reload:', {
        email: refreshedUser.email,
        store_user_owner_email: refreshedUser.store_user_owner_email
      });
      setUser(refreshedUser);
      await loadData(refreshedUser);
      console.log('[Items] Data reloaded, items count:', items.length);
    } catch (error) {
      console.error("Error creating item:", error);
      alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const handleModalSave = async (itemData) => {
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

  const handleDelete = async (item) => {
    if (!confirm(`${t('delete')} ${item.name}?`)) {
      return;
    }

    try {
      await base44.entities.Item.delete(item.id);
      await loadData(user);
    } catch (error) {
      console.error("Error deleting item:", error);
      alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.catalog_number && item.catalog_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSupplier = selectedSupplier === "all" || item.supplier_id === selectedSupplier;
    return matchesSearch && matchesSupplier;
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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('items_title')}</h1>
            <p className="text-gray-600 mt-2">{t('items_greeting', { name: user.full_name })}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
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
              onClick={() => {
                setShowForm(!showForm);
                setEditingItem(null);
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              <Plus className="w-5 h-5 ml-2" />
              {t('add_new_item')}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showForm && (
            <ItemForm
              item={null}
              suppliers={suppliers}
              warehouses={warehouses}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
              }}
              onWarehouseCreated={() => user && loadData(user)}
            />
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <ItemListView
                    items={filteredItems}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    suppliers={suppliers}
                    warehouses={warehouses}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

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
    </div>
  );
}