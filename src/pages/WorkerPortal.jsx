import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, PackageCheck, Loader, ArrowLeft, AlertCircle } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import OrderForm from "../components/orders/OrderForm";
import ReceiveSupplyForm from "../components/orders/ReceiveSupplyForm";

export default function WorkerPortal() {
  const [view, setView] = useState('menu');
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [ownerEmail, setOwnerEmail] = useState(null);
  const [businessName, setBusinessName] = useState(null);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ownerParam = urlParams.get('owner');
    
    if (!ownerParam) {
      setError('Invalid access link - missing owner parameter');
      setLoading(false);
      return;
    }

    // Read branding stored right after PIN verification
    try {
      const storedName = sessionStorage.getItem('wp_business_name');
      const storedEmail = sessionStorage.getItem('wp_owner_email');
      if (storedName) setBusinessName(storedName);
      if (storedEmail) setOwnerEmail(storedEmail);
    } catch {}
    
    setOwnerId(ownerParam);
    loadData(ownerParam);
  }, []);

  const loadData = async (ownerId) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading data for owner:', ownerId);
      
      // Call backend function
      const response = await base44.functions.invoke('workerPortalData', {
        ownerId: ownerId,
        action: 'load'
      });
      
      console.log('Response:', response.data);
      
      if (response.data.error) {
        setError(response.data.error);
        return;
      }
      
      setSuppliers(response.data.suppliers || []);
      setOrders(response.data.orders || []);
      if (response.data.ownerEmail) setOwnerEmail(response.data.ownerEmail);
      if (response.data.businessName) setBusinessName(response.data.businessName);
      
      console.log('Loaded suppliers:', response.data.suppliers?.length);
      
    } catch (error) {
      console.error("Error loading data:", error);
      setError('Error loading data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = async (orderData) => {
    try {
      const response = await base44.functions.invoke('workerPortalData', {
        ownerId: ownerId,
        action: 'createOrder',
        ...orderData
      });
      
      if (response.data.error) {
        alert(response.data.error);
        return;
      }
      
      alert(t('order_saved_successfully') || 'Order saved successfully');
      setView('menu');
      await loadData(ownerId);
    } catch (error) {
      console.error("Error saving order:", error);
      alert(t('error_saving') || 'Error saving: ' + error.message);
    }
  };

  const handleReceiptSubmit = async (receiptData) => {
    try {
      const response = await base44.functions.invoke('workerPortalData', {
        ownerId: ownerId,
        action: 'createReceipt',
        ...receiptData
      });
      
      if (response.data.error) {
        alert(response.data.error);
        return;
      }
      
      alert(t('receipt_saved_successfully') || 'Receipt saved successfully');
      setView('menu');
      await loadData(ownerId);
    } catch (error) {
      console.error("Error saving receipt:", error);
      alert(t('error_saving') || 'Error saving: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-amber-50 p-6">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
          alt="Smart Plate"
          className="h-16 object-contain mb-2"
        />
        <span className="text-lg font-bold text-black tracking-wide">SMART PLATE BASIC</span>
        <span className="text-xs text-gray-500 tracking-wider mb-4">food cost app</span>
        {(businessName || ownerEmail) && (
          <div className="bg-amber-100 text-amber-800 border border-amber-200 px-5 py-2 rounded-full text-sm font-bold mb-4">
            🏪 {businessName || ownerEmail}
          </div>
        )}
        <Loader className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{error}</p>
            <Button 
              onClick={() => loadData(ownerId)} 
              className="mt-4 w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Header = () => (
    <div className="flex flex-col items-center gap-1 mb-6">
      <img 
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
        alt="Smart Plate"
        className="h-14 object-contain"
      />
      <span className="text-lg font-bold text-black tracking-wide">SMART PLATE BASIC</span>
      <span className="text-xs text-gray-500 tracking-wider">food cost app</span>
      {(businessName || ownerEmail) && (
        <div className="mt-2 bg-amber-100 text-amber-800 border border-amber-200 px-5 py-2 rounded-full text-sm font-bold">
          🏪 {businessName || ownerEmail}
        </div>
      )}
    </div>
  );

  if (view === 'order') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Header />
          <Button 
            onClick={() => setView('menu')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('cancel')}
          </Button>
          <OrderForm
            order={null}
            suppliers={suppliers}
            onSubmit={handleOrderSubmit}
            onCancel={() => setView('menu')}
          />
        </div>
      </div>
    );
  }

  if (view === 'receive') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Header />
          <Button 
            onClick={() => setView('menu')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('cancel')}
          </Button>
          <ReceiveSupplyForm
            order={null}
            receipt={null}
            suppliers={suppliers}
            onSubmit={handleReceiptSubmit}
            onCancel={() => setView('menu')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Header />
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('worker_portal')}</h1>
          <p className="text-gray-600">{t('worker_portal_note')}</p>
          {suppliers.length > 0 && (
            <p className="text-sm text-green-600 mt-2">
              ✓ {suppliers.length} {t('suppliers')} {t('available')}
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setView('order')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                </div>
                <span>{t('create_order')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{t('worker_create_order_desc')}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setView('receive')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <PackageCheck className="w-8 h-8 text-green-600" />
                </div>
                <span>{t('receive_supply')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{t('worker_receive_supply_desc')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}