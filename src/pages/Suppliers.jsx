import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Scan, Loader, FileSpreadsheet, Store, ArrowLeft, Download, BarChart3 } from "lucide-react";
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
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [dateRangeType, setDateRangeType] = useState('current_month'); // 'current_month', 'last_month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
                    // Store user - load suppliers from the store owner + ones with store_owner_email
                    const [ownerSuppliers, storeSuppliers, ownerItems, storeItems] = await Promise.all([
                      base44.entities.Supplier.filter({ created_by: storeOwnerEmail }, '-created_date'),
                      base44.entities.Supplier.filter({ store_owner_email: storeOwnerEmail }, '-created_date'),
                      base44.entities.Item.filter({ created_by: storeOwnerEmail }),
                      base44.entities.Item.filter({ store_owner_email: storeOwnerEmail })
                    ]);
                    const allSuppliers = [...ownerSuppliers, ...storeSuppliers];
                    suppliersData = allSuppliers.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
                    const allItems = [...ownerItems, ...storeItems];
                    itemsData = allItems.filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i);
                  } else if ((currentUser.chain_id && !currentUser.is_chain_head) || isActingAsStore) {
                    // Branch store - get suppliers from chain head + own (with fallbacks)
                    let effectiveChainId = currentUser.chain_id;
                    if (!effectiveChainId) {
                      try {
                        const myStores = await base44.entities.ChainStore.filter({ user_email: workingEmail });
                        if (myStores?.length) effectiveChainId = myStores[0].chain_id;
                      } catch {}
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
                      }
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
            } else if (user.store_user_owner_email) {
              // If user is a manager/worker, create with store owner's email
              await base44.functions.invoke('createSupplierForStore', {
                supplierData,
                storeEmail: user.store_user_owner_email
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
    String(supplier.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(supplier.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(supplier.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateReport = async () => {
    try {
      setLoadingReport(true);
      setShowReport(true);
      
      const workingEmail = user.acting_as_store_email || user.email;
      
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
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={generateReport}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              {language === 'he' ? 'דוח הזמנות מול קבלות' : 'Orders vs Receipts Report'}
            </Button>
            <Button
              onClick={() => {
                // Generate Excel template for items
                const headers = language === 'he' 
                  ? ['שם הפריט (חובה)', 'מק"ט (אופציונלי)', 'יחידה (kg/liter/unit/case)', 'מחיר', 'הנחה %', 'כמות באריזה']
                  : ['Item Name (required)', 'Catalog Number (optional)', 'Unit (kg/liter/unit/case)', 'Price', 'Discount %', 'Units Per Package'];
                
                const exampleRow = language === 'he'
                  ? ['עגבניות', '', 'kg', '5.90', '10', '1']
                  : ['Tomatoes', '', 'kg', '5.90', '10', '1'];
                
                const csvContent = [
                  headers.join(','),
                  exampleRow.join(',')
                ].join('\n');
                
                const BOM = '\uFEFF';
                const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = language === 'he' ? 'תבנית_פריטים.csv' : 'items_template.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Download className="w-5 h-5 mr-2" />
              {language === 'he' ? 'הורד תבנית אקסל' : 'Download Template'}
            </Button>
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
                className="mt-4 bg-blue-600 hover:bg-blue-700"
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
              <div className="overflow-x-auto">
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