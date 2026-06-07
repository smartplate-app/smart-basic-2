import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, PackageCheck, Loader, ArrowLeft, AlertCircle, ClipboardList, Trash2 } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import OrderForm from "../components/orders/OrderForm";
import ReceiveSupplyForm from "../components/orders/ReceiveSupplyForm";
import WorkerInventoryCount from "../components/worker/WorkerInventoryCount";
import WorkerWasteForm from "../components/worker/WorkerWasteForm";

export default function WorkerPortal() {
  const [view, setView] = useState('menu');
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [ownerEmail, setOwnerEmail] = useState(null);
  const [businessName, setBusinessName] = useState(null);
  const [role, setRole] = useState('worker');
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ownerParam = urlParams.get('owner');
    const roleParam = urlParams.get('role') || 'worker';

    if (!ownerParam) {
      setError('Invalid access link - missing owner parameter');
      setLoading(false);
      return;
    }

    setRole(roleParam);

    // Read branding stored right after PIN verification
    try {
      const storedName = sessionStorage.getItem('wp_business_name');
      const storedEmail = sessionStorage.getItem('wp_owner_email');
      const storedRole = sessionStorage.getItem('wp_role');
      if (storedName) setBusinessName(storedName);
      if (storedEmail) setOwnerEmail(storedEmail);
      if (storedRole && storedRole !== roleParam) setRole(storedRole);
    } catch {}

    setOwnerId(ownerParam);
    loadData(ownerParam);
  }, []);

  const loadData = async (ownerId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await base44.functions.invoke('workerPortalData', {
        ownerId: ownerId,
        action: 'load'
      });
      if (response.data.error) {
        setError(response.data.error);
        return;
      }
      setSuppliers(response.data.suppliers || []);
      setOrders(response.data.orders || []);
      setItems(response.data.items || []);
      if (response.data.ownerEmail) setOwnerEmail(response.data.ownerEmail);
      if (response.data.businessName) setBusinessName(response.data.businessName);
    } catch (error) {
      setError('Error loading data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = async (orderData) => {
    try {
      const response = await base44.functions.invoke('workerPortalData', {
        ownerId,
        action: 'createOrder',
        ...orderData
      });
      if (response.data.error) { alert(response.data.error); return; }
      alert(t('order_saved_successfully') || 'ההזמנה נשמרה!');
      setView('menu');
      await loadData(ownerId);
    } catch (error) {
      alert(t('error_saving') || 'שגיאה: ' + error.message);
    }
  };

  const handleReceiptSubmit = async (receiptData) => {
    try {
      const response = await base44.functions.invoke('workerPortalData', {
        ownerId,
        action: 'createReceipt',
        ...receiptData
      });
      if (response.data.error) { alert(response.data.error); return; }
      alert(t('receipt_saved_successfully') || 'הקבלה נשמרה!');
      setView('menu');
      await loadData(ownerId);
    } catch (error) {
      alert(t('error_saving') || 'שגיאה: ' + error.message);
    }
  };

  const handleCountSubmit = async (countData) => {
    const response = await base44.functions.invoke('workerPortalData', {
      ownerId,
      action: 'createCount',
      ...countData
    });
    if (response.data.error) throw new Error(response.data.error);
  };

  const handleWasteSubmit = async (wasteData) => {
    const response = await base44.functions.invoke('workerPortalData', {
      ownerId,
      action: 'createWaste',
      ...wasteData
    });
    if (response.data.error) throw new Error(response.data.error);
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
              <AlertCircle className="w-6 h-6" /> Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{error}</p>
            <Button onClick={() => loadData(ownerId)} className="mt-4 w-full">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manager portal — redirect to ManagerPortal
  if (role === 'manager') {
    const urlParams = new URLSearchParams(window.location.search);
    const ownerParam = urlParams.get('owner');
    window.location.replace('/ManagerPortal?owner=' + ownerParam);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
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
          <Button onClick={() => setView('menu')} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('cancel')}
          </Button>
          <OrderForm order={null} suppliers={suppliers} onSubmit={handleOrderSubmit} onCancel={() => setView('menu')} />
        </div>
      </div>
    );
  }

  if (view === 'receive') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Header />
          <Button onClick={() => setView('menu')} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('cancel')}
          </Button>
          <ReceiveSupplyForm order={null} receipt={null} suppliers={suppliers} onSubmit={handleReceiptSubmit} onCancel={() => setView('menu')} />
        </div>
      </div>
    );
  }

  if (view === 'count') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Header />
          <WorkerInventoryCount
            items={items}
            ownerId={ownerId}
            onBack={() => setView('menu')}
            onSubmit={handleCountSubmit}
          />
        </div>
      </div>
    );
  }

  if (view === 'waste') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Header />
          <WorkerWasteForm
            items={items}
            ownerId={ownerId}
            onBack={() => setView('menu')}
            onSubmit={handleWasteSubmit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Header />
        <div className="text-center mb-8" dir="rtl">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">פורטל עובדים</h1>
          <p className="text-gray-600">יש לך גישה ליצירת הזמנות, קליטת אספקה וספירת מלאי.</p>
          {suppliers.length > 0 && (
            <p className="text-sm text-green-600 mt-2">✓ {suppliers.length} ספקים זמינים</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" dir="rtl">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setView('order')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                </div>
                <span>צור הזמנה</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">צור הזמנות חדשות לספקים</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setView('receive')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <PackageCheck className="w-8 h-8 text-green-600" />
                </div>
                <span>קבלה מהזמנה</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">קלוט אספקה שהתקבלה</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setView('count')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <ClipboardList className="w-8 h-8 text-amber-600" />
                </div>
                <span>ספירת מלאי</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">ספירה שבועית / חודשית של פריטים</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setView('waste')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <span>דיווח פחת</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">דווח על פריטים שנזרקו או פגו</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}