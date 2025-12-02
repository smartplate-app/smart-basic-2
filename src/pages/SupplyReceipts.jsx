import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, PackageCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence } from "framer-motion";
import { useLanguage } from "../components/LanguageProvider";
import NetworkErrorHandler from "../components/NetworkErrorHandler";

import ReceiveSupplyForm from "../components/orders/ReceiveSupplyForm";
import ReceiptCard from "../components/receipts/ReceiptCard";

export default function SupplyReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  // 'showForm' will now control the manual receipt creation/editing form
  const [showForm, setShowForm] = useState(false);
  // 'showReceiveForm' is a new state to control the order selection list when receiving
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [showNoOrderForm, setShowNoOrderForm] = useState(false); // NEW STATE
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const { t } = useLanguage();

  const loadData = async (userEmail, storeOwnerEmail = null, retryCount = 0) => {
    try {
      setLoading(true);
      setNetworkError(false);

      // Artificial delay for demonstration/testing, remove in production if not needed
      await new Promise(resolve => setTimeout(resolve, 100));

      // If store user, load suppliers from owner but receipts/orders from working email
      const suppliersEmail = storeOwnerEmail || userEmail;
      
      const [receiptsData, ordersData, suppliersData] = await Promise.all([
        base44.entities.SupplyReceipt.filter({ created_by: suppliersEmail }, "-received_date"),
        base44.entities.Order.filter({ created_by: suppliersEmail }, "-created_date"),
        base44.entities.Supplier.filter({ created_by: suppliersEmail }, "name")
      ]);
      setReceipts(receiptsData);
      setOrders(ordersData);
      setSuppliers(suppliersData);
      
      console.log(`[SupplyReceipts] Loaded ${suppliersData.length} suppliers from ${suppliersEmail}`);
    } catch (error) {
      console.error("Error loading data:", error);

      if ((error.message === 'Network Error' || error.code === 'ERR_NETWORK') && retryCount < 3) {
        console.log(`Retrying data load... attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return loadData(userEmail, storeOwnerEmail, retryCount + 1);
      }

      setNetworkError(true);
      setReceipts([]);
      setOrders([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const checkAuthAndLoadData = async (retryCount = 0) => {
      try {
        if (isMounted) {
          setAuthLoading(true);
          setNetworkError(false);
        }

        // Artificial delay for demonstration/testing, remove in production if not needed
        await new Promise(resolve => setTimeout(resolve, 100));

        const currentUser = await base44.auth.me();

        if (isMounted) {
          setUser(currentUser);
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
          
          // Pass store owner email separately so we can load suppliers from owner
          await loadData(workingEmail, storeOwnerEmail);
        }
      } catch (error) {
        console.error("Authentication failed:", error);

        if ((error.message === 'Network Error' || error.code === 'ERR_NETWORK') && retryCount < 3) {
          console.log(`Retrying auth... attempt ${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
          if (isMounted) {
            return checkAuthAndLoadData(retryCount + 1);
          }
        }

        if (isMounted) {
          setNetworkError(true);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    checkAuthAndLoadData();

    // Cleanup function to set isMounted to false when the component unmounts
    return () => {
      isMounted = false;
    };
  }, []);

  const handleReceiptSubmit = async (receiptData) => {
    try {
      const cleanData = {
        ...receiptData,
        order_id: receiptData.order_id || null,
        order_number: receiptData.order_number || `INV-${Date.now()}`,
        supplier_name: receiptData.supplier_name || "Unknown",
        received_date: receiptData.received_date || new Date().toISOString().split('T')[0],
        verified_items: receiptData.verified_items || [],
        receipt_images: receiptData.receipt_images || [],
        invoice_total: parseFloat(receiptData.invoice_total) || 0,
        calculated_total: parseFloat(receiptData.calculated_total) || 0,
        status: receiptData.status || "pending"
      };

      if (editingReceipt) {
        await base44.entities.SupplyReceipt.update(editingReceipt.id, cleanData);
      } else {
        await base44.entities.SupplyReceipt.create(cleanData);
      }

      // Reset all form-related states
      setShowForm(false); // Closes manual/editing form
      setShowReceiveForm(false); // Closes order selection list
      setShowNoOrderForm(false); // Closes no-order form
      setSelectedOrder(null);
      setEditingReceipt(null);
      alert(t('receipt_saved_successfully'));
      await loadData(user.email);
    } catch (error) {
      console.error("Full error saving receipt:", error);
      const errorMsg = error?.response?.data?.message || error?.message || error.toString();
      alert(`${t('error_saving')}: ${errorMsg}`);
      throw error;
    }
  };

  const handleEditReceipt = (receipt) => {
    setEditingReceipt(receipt);
    setShowForm(true); // Editing always opens the manual form, now controlled by 'showForm'
    setShowReceiveForm(false); // Ensure order selection is closed
    setShowNoOrderForm(false); // Ensure no-order form is closed
    setSelectedOrder(null); // Clear any pre-selected order
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || receipt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <img
            src="https://smartplate.org/logo.png"
            alt="Smart Plate"
            className="h-20 object-contain animate-pulse"
          />
          <Loader className="w-12 h-12 animate-spin text-gray-600" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (networkError) {
    return <NetworkErrorHandler onRetry={() => window.location.reload()} />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('receipts_title')}</h1>
            <p className="text-gray-600 mt-2">{t('receipts_greeting', { name: user?.full_name || '' })}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => {
                setShowNoOrderForm(true); // Open the no-order receipt creation form
                setShowForm(false); // Close the manual receipt form if open
                setShowReceiveForm(false); // Close the order selection flow if open
                setEditingReceipt(null); // Clear editing state
                setSelectedOrder(null); // Clear any selected order
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <PackageCheck className="w-5 h-5 ml-2" />
              {t('supply_without_order')}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {/* Editing Form */}
          {showForm && editingReceipt && (
            <ReceiveSupplyForm
              order={null}
              receipt={editingReceipt}
              suppliers={suppliers}
              noOrderMode={true}
              onSubmit={handleReceiptSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingReceipt(null);
              }}
            />
          )}

          {/* Supply Without Order Form */}
          {showNoOrderForm && (
            <ReceiveSupplyForm
              order={null}
              receipt={null}
              suppliers={suppliers}
              noOrderMode={true}
              onSubmit={handleReceiptSubmit}
              onCancel={() => {
                setShowNoOrderForm(false);
              }}
            />
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder={t('search_receipts')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('receipt_status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_statuses')}</SelectItem>
              <SelectItem value="verified">{t('status_verified')}</SelectItem>
              <SelectItem value="has_issues">{t('status_has_issues')}</SelectItem>
              <SelectItem value="pending">{t('status_pending')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <AnimatePresence>
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : (
              filteredReceipts.map((receipt) => (
                <ReceiptCard
                  key={receipt.id}
                  receipt={receipt}
                  onEdit={handleEditReceipt}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {!loading && filteredReceipts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">{t('no_receipts_to_display')}</div>
            <div className="text-gray-500">{t('start_by_creating_receipt')}</div>
          </div>
        )}
      </div>
    </div>
  );
}