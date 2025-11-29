import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Scan, Loader, FileSpreadsheet, Store, ArrowLeft } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useLanguage } from "../components/LanguageProvider";
import NetworkErrorHandler from "../components/NetworkErrorHandler";
import SupplierForm from "../components/suppliers/SupplierForm";
import SupplierCard from "../components/suppliers/SupplierCard";
import SupplierListScanner from "../components/suppliers/SupplierListScanner";
import AppHelpChat from "../components/AppHelpChat";
import SupplierItemsExcel from "../components/suppliers/SupplierItemsExcel";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [networkError, setNetworkError] = useState(null);
  const [showExcelPanel, setShowExcelPanel] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const { t, language } = useLanguage();

  const loadData = async (currentUser, retryCount = 0) => {
                try {
                  setLoading(true);
                  setNetworkError(null);

                  // Add delay before retry only
                  if (retryCount > 0) {
                    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }

                  let suppliersData = [];
                  let itemsData = [];

                  // Determine which email to use (acting as store or own)
                  const workingEmail = currentUser.acting_as_store_email || currentUser.email;
                  const isActingAsStore = !!currentUser.acting_as_store_email;
                  
                  // Check if user is a store_user (worker/manager invited to someone else's store)
                  const isStoreUser = currentUser.store_user_role && currentUser.store_user_owner_email;
                  const storeOwnerEmail = currentUser.store_user_owner_email;

                  if (isStoreUser && storeOwnerEmail) {
                    // Store user - load suppliers from the store owner
                    const [ownerSuppliers, ownerItems] = await Promise.all([
                      base44.entities.Supplier.filter({ created_by: storeOwnerEmail }, '-created_date'),
                      base44.entities.Item.filter({ created_by: storeOwnerEmail })
                    ]);
                    suppliersData = ownerSuppliers;
                    itemsData = ownerItems;
                  } else if ((currentUser.chain_id && !currentUser.is_chain_head) || isActingAsStore) {
                    // Branch store - get suppliers from chain head + own
                    const chain = await base44.entities.Chain.filter({ id: currentUser.chain_id });
                    if (chain.length > 0) {
                      const headEmail = chain[0].head_store_user_email;
                      // Load from head store + store's own suppliers (including those with store_owner_email)
                      const [headSuppliers, headItems, ownSuppliers, ownItems, storeSuppliers, storeItems] = await Promise.all([
                        base44.entities.Supplier.filter({ created_by: headEmail }, '-created_date'),
                        base44.entities.Item.filter({ created_by: headEmail }),
                        base44.entities.Supplier.filter({ created_by: workingEmail }, '-created_date'),
                        base44.entities.Item.filter({ created_by: workingEmail }),
                        base44.entities.Supplier.filter({ store_owner_email: workingEmail }, '-created_date'),
                        base44.entities.Item.filter({ created_by: workingEmail })
                      ]);
                      // Combine all suppliers, avoiding duplicates
                      const allSuppliers = [...headSuppliers, ...ownSuppliers, ...storeSuppliers];
                      const uniqueSuppliers = allSuppliers.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
                      suppliersData = uniqueSuppliers;
                      itemsData = [...headItems, ...ownItems, ...storeItems].filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i);
                    }
                  } else {
                    // Head store or no chain - load own suppliers + any with store_owner_email
                    const [ownSuppliers, ownItems, storeSuppliers] = await Promise.all([
                      base44.entities.Supplier.filter({ created_by: workingEmail }, '-created_date'),
                      base44.entities.Item.filter({ created_by: workingEmail }),
                      base44.entities.Supplier.filter({ store_owner_email: workingEmail }, '-created_date')
                    ]);
                    const allSuppliers = [...ownSuppliers, ...storeSuppliers];
                    suppliersData = allSuppliers.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
                    itemsData = ownItems;
                  }

                  setSuppliers(suppliersData);
                  setAllItems(itemsData);

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

              setAuthLoading(true);
              setNetworkError(null);

              // Add delay before retry only
              if (retryCount > 0) {
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
                await new Promise(resolve => setTimeout(resolve, delay));
              }

              const currentUser = await base44.auth.me();

                        if (mounted) {
                          setUser(currentUser);
                          await loadData(currentUser);
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
        // Prevent double submission
        if (isSaving) return;

        try {
          setIsSaving(true);

          if (editingSupplier) {
            await base44.entities.Supplier.update(editingSupplier.id, supplierData);
          } else {
            // If acting as a store, we need to create the supplier with that store's email
            // This requires using asServiceRole to set created_by properly
            if (user.acting_as_store_email) {
              // Create supplier with the branch store's email as created_by
              await base44.functions.invoke('createSupplierForStore', {
                supplierData,
                storeEmail: user.acting_as_store_email
              });
            } else {
              await base44.entities.Supplier.create(supplierData);
            }
          }
          setShowForm(false);
          setEditingSupplier(null);
          await loadData(user);
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
    setShowScanner(false);
  };

  const handleDelete = async (supplierId) => {
    if (!confirm(t('delete') + '?')) {
      return;
    }
    
    try {
      await base44.entities.Supplier.delete(supplierId);
      await loadData(user);
    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
            alt="Smart Plate"
            className="h-20 object-contain animate-pulse"
          />
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
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
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => {
                setShowExcelPanel(!showExcelPanel);
                setShowForm(false);
                setShowScanner(false);
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              {language === 'he' ? 'ייבוא/ייצוא אקסל' : 'Excel Import/Export'}
            </Button>
            <Button
              onClick={() => {
                setShowScanner(!showScanner);
                setShowForm(false);
                setShowExcelPanel(false);
              }}
              className="bg-gray-700 hover:bg-gray-800 text-white"
            >
              <Scan className="w-5 h-5 mr-2" />
              {t('scan_supplier_list')}
            </Button>
            <Button
              onClick={() => {
                setEditingSupplier(null);
                setShowForm(!showForm);
                setShowScanner(false);
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('add_new_supplier')}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showExcelPanel && (
            <SupplierItemsExcel
              suppliers={suppliers}
              items={allItems}
              onItemsAdded={() => loadData(user)}
              onClose={() => setShowExcelPanel(false)}
            />
          )}

          {showScanner && (
            <SupplierListScanner
              onSuppliersAdded={() => {
                                setShowScanner(false);
                                loadData(user);
                              }}
              onClose={() => setShowScanner(false)}
            />
          )}

          {showForm && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onImportComplete={() => loadData(user)}
              />
            ))}
          </div>
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