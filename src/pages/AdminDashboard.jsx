import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader, Search, Users, ShoppingCart, Package, FileText, ChefHat, Calendar, TrendingDown, BarChart, Eye, ArrowLeft, Building2, Store, Crown, TestTube, LogIn, Instagram, Mail, Globe } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

import InstagramCampaign from "@/components/marketing/InstagramCampaign";
import InstagramCampaignDE from "@/components/marketing/InstagramCampaignDE";
import InstagramCampaignHE from "@/components/marketing/InstagramCampaignHE";
import PromoVideo from "./PromoVideo";
import BusinessSetupWizard from "@/components/onboarding/BusinessSetupWizard";
import TabitTesterModal from "@/components/emulator/TabitTesterModal";

export default function AdminDashboard() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [chains, setChains] = useState([]);
  const [chainStores, setChainStores] = useState([]);
  const [showChainsView, setShowChainsView] = useState(false);
  const [showMarketingView, setShowMarketingView] = useState(false);
  const [marketingLocale, setMarketingLocale] = useState('en');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLang, setInviteLang] = useState('he');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [showPromoKitModal, setShowPromoKitModal] = useState(false);
  const [promoKitStatus, setPromoKitStatus] = useState('idle');
  const [promoKitResult, setPromoKitResult] = useState(null);
  const [showBusinessSetupPreview, setShowBusinessSetupPreview] = useState(false);
  const [showSeoModal, setShowSeoModal] = useState(false);
  const [seoKeyword, setSeoKeyword] = useState("Smart Plate food cost app");
  const [seoDomain, setSeoDomain] = useState("foodcostapp.com");
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoResult, setSeoResult] = useState(null);
  const [showTabitTester, setShowTabitTester] = useState(false);

  const handleCheckSeo = async () => {
    try {
      setSeoLoading(true);
      setSeoResult(null);
      const response = await base44.functions.invoke('checkSeoRanking', { keyword: seoKeyword, domain: seoDomain });
      if (response.data.success) {
        setSeoResult(response.data.data);
      } else {
        alert("Error checking SEO: " + response.data.error);
      }
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSeoLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      if (user.role !== 'admin') {
        alert(language === 'he' ? 'גישה נדחתה - נדרשות הרשאות אדמין' : 'Access denied - Admin permissions required');
        window.location.href = '/';
        return;
      }

      const response = await base44.functions.invoke('getAdminData', {
        action: 'listUsers'
      });

      if (response.data.success) {
        setAllUsers(response.data.users);
      } else {
        throw new Error(response.data.error || 'Failed to load users');
      }

      // Load suppliers for chat bubble
      const suppliersData = await base44.entities.Supplier.filter({ created_by: user.email });
      setSuppliers(suppliersData);

      // Load chains data
      const chainsData = await base44.entities.Chain.list();
      setChains(chainsData);
      const storesData = await base44.entities.ChainStore.list();
      setChainStores(storesData);
      
    } catch (error) {
      console.error("Error loading admin data:", error);
      alert(language === 'he' ? 'שגיאה בטעינת נתונים' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (user) => {
    try {
      setLoading(true);
      setSelectedUser(user);
      
      const response = await base44.functions.invoke('getAdminData', {
        action: 'getUserData',
        userEmail: user.email
      });

      if (response.data.success) {
        setUserData(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to load user data');
      }
      
    } catch (error) {
      console.error("Error loading user data:", error);
      alert(language === 'he' ? 'שגיאה בטעינת נתוני משתמש' : 'Error loading user data');
    } finally {
      setLoading(false);
    }
  };

  const viewUserLive = async (user) => {
    try {
      setLoading(true);
      setViewingUser(user);
      setActiveSection("dashboard");
      
      const response = await base44.functions.invoke('getAdminData', {
        action: 'getFullUserData',
        userEmail: user.email
      });

      if (response.data.success) {
        setLiveData(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to load live data');
      }
      
    } catch (error) {
      console.error("Error loading live data:", error);
      alert(language === 'he' ? 'שגיאה בטעינת נתונים' : 'Error loading data');
      setViewingUser(null);
    } finally {
      setLoading(false);
    }
  };

  const exitLiveView = () => {
    setViewingUser(null);
    setLiveData(null);
    setActiveSection("dashboard");
  };

  // Admin-only: create Google Sheet for item alias matching
  const handleCreateAliasSheet = async () => {
    try {
      setLoading(true);
      const { data } = await base44.functions.invoke('createItemAliasSheet', { locale: language });
      if (data?.success && data?.url) {
        window.open(data.url, '_blank');
      } else {
        alert((language === 'he' ? 'שגיאה ביצירת גיליון' : 'Failed to create sheet') + (data?.error ? `: ${data.error}` : ''));
      }
    } catch (e) {
      alert((language === 'he' ? 'שגיאה ביצירת גיליון' : 'Error creating sheet') + `: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  // Send Owner Invite
  const handleSendOwnerInvite = async () => {
    if (!inviteEmail || !inviteName) {
      alert(language === 'he' ? 'נא למלא אימייל ושם מלא' : 'Please enter email and full name');
      return;
    }
    try {
      setSendingInvite(true);
      const { data } = await base44.functions.invoke('sendOwnerInvite', {
        email: inviteEmail.trim(),
        full_name: inviteName.trim(),
        language: inviteLang
      });
      if (data?.success) {
        alert(language === 'he' ? 'הזמנה נשלחה בהצלחה' : 'Invite sent successfully');
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteName('');
        setInviteLang('he');
      } else {
        throw new Error(data?.error || 'Failed to send invite');
      }
    } catch (e) {
      alert((language === 'he' ? 'שגיאה בשליחת ההזמנה' : 'Failed to send invite') + `: ${e?.message || e}`);
    } finally {
      setSendingInvite(false);
    }
  };

  // Switch to control a user's account (impersonate)
  const switchToUser = async (user) => {
    try {
      // Save admin's original email for returning
      await base44.auth.updateMe({
        admin_original_email: currentUser.email,
        acting_as_user_email: user.email,
        acting_as_user_name: user.full_name || user.email,
        acting_as_store_email: user.email,
        acting_as_store_name: user.business_name || user.full_name || user.email
      });

      // Force full page reload to Dashboard
      window.location.href = window.location.origin + '/pages/Dashboard';
      window.location.reload();
    } catch (error) {
      console.error("Error switching to user:", error);
      alert(language === 'he' ? 'שגיאה במעבר למשתמש' : 'Error switching to user');
    }
  };

  const filteredUsers = allUsers.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !selectedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#d4a373]" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">
              {language === 'he' ? 'גישה נדחתה' : 'Access Denied'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{language === 'he' ? 'רק מנהלים יכולים לגשת לדף זה' : 'Only administrators can access this page'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Live view sections
  const renderLiveView = () => {
    if (!liveData) return null;

    const sections = [
      { id: 'dashboard', label: language === 'he' ? 'דשבורד' : 'Dashboard', icon: BarChart },
      { id: 'schedules', label: language === 'he' ? 'לוחות משמרות' : 'Schedules', icon: Calendar },
      { id: 'workers', label: language === 'he' ? 'עובדים' : 'Workers', icon: Users },
      { id: 'orders', label: language === 'he' ? 'הזמנות' : 'Orders', icon: ShoppingCart },
      { id: 'receipts', label: language === 'he' ? 'תעודות' : 'Receipts', icon: FileText },
      { id: 'suppliers', label: language === 'he' ? 'ספקים' : 'Suppliers', icon: Package },
      { id: 'items', label: language === 'he' ? 'פריטים' : 'Items', icon: Package },
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-purple-600 to-[#d4a373] text-white">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold">{language === 'he' ? 'צפייה חיה' : 'Live View'}: {viewingUser.full_name}</h2>
                  <p className="text-purple-100">{viewingUser.email}</p>
                </div>
              </div>
              <Button onClick={exitLiveView} variant="secondary" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {language === 'he' ? 'חזור' : 'Back'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2">
          {sections.map(section => (
            <Button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              variant={activeSection === section.id ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </Button>
          ))}
        </div>

        {/* Section Content */}
        {activeSection === 'dashboard' && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'he' ? 'סיכום חודשי' : 'Monthly Summary'}</CardTitle>
            </CardHeader>
            <CardContent>
              {liveData.dashboardData?.length > 0 ? (
                <div className="space-y-4">
                  {liveData.dashboardData.slice(0, 3).map((data, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <p className="font-bold text-lg">{data.month}</p>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <p className="text-sm text-gray-500">{language === 'he' ? 'מכירות צפויות' : 'Predicted Sales'}</p>
                          <p className="font-semibold">₪{data.predicted_sales?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{language === 'he' ? 'מכירות בפועל' : 'Actual Sales'}</p>
                          <p className="font-semibold">₪{data.total_sales?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{language === 'he' ? 'יעד עבודה' : 'Labor Goal'}</p>
                          <p className="font-semibold">{data.labor_goal_percent || 25}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{language === 'he' ? 'אין נתונים' : 'No data'}</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === 'schedules' && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'he' ? 'לוחות משמרות' : 'Weekly Schedules'}</CardTitle>
            </CardHeader>
            <CardContent>
              {liveData.schedules?.length > 0 ? (
                <div className="space-y-4">
                  {liveData.schedules.slice(0, 5).map((schedule, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{language === 'he' ? 'שבוע' : 'Week'} {schedule.week_number}/{schedule.year}</p>
                          <p className="text-sm text-gray-500">{schedule.week_start_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{schedule.shifts?.length || 0} {language === 'he' ? 'משמרות' : 'shifts'}</p>
                          <p className="font-semibold">₪{schedule.total_cost?.toLocaleString() || 0}</p>
                          <Badge>{schedule.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{language === 'he' ? 'אין לוחות' : 'No schedules'}</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === 'workers' && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'he' ? 'עובדים' : 'Workers'} ({liveData.workers?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {liveData.workers?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveData.workers.map((worker, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{worker.full_name}</p>
                          <p className="text-sm text-gray-600">{worker.job_position_name}</p>
                          <p className="text-sm text-gray-500">{worker.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₪{worker.payment_amount?.toLocaleString() || 0}</p>
                          <p className="text-xs text-gray-500">{worker.payment_type}</p>
                          <Badge variant={worker.is_active ? 'default' : 'secondary'}>
                            {worker.is_active ? (language === 'he' ? 'פעיל' : 'Active') : (language === 'he' ? 'לא פעיל' : 'Inactive')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{language === 'he' ? 'אין עובדים' : 'No workers'}</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === 'orders' && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'he' ? 'הזמנות' : 'Orders'} ({liveData.orders?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {liveData.orders?.length > 0 ? (
                <div className="space-y-3">
                  {liveData.orders.slice(0, 10).map((order, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{order.order_number}</p>
                          <p className="text-sm text-gray-600">{order.supplier_name}</p>
                          <p className="text-xs text-gray-500">{new Date(order.created_date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <Badge>{order.status}</Badge>
                          <p className="font-semibold mt-1">₪{order.total_cost?.toFixed(2) || '0'}</p>
                          <p className="text-xs text-gray-500">{order.items?.length || 0} {language === 'he' ? 'פריטים' : 'items'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{language === 'he' ? 'אין הזמנות' : 'No orders'}</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === 'receipts' && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'he' ? 'תעודות משלוח' : 'Receipts'} ({liveData.receipts?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {liveData.receipts?.length > 0 ? (
                <div className="space-y-3">
                  {liveData.receipts.slice(0, 10).map((receipt, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{receipt.order_number}</p>
                          <p className="text-sm text-gray-600">{receipt.supplier_name}</p>
                          <p className="text-xs text-gray-500">{receipt.received_date}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={receipt.status === 'verified' ? 'default' : 'destructive'}>{receipt.status}</Badge>
                          <p className="font-semibold mt-1">₪{receipt.invoice_total?.toFixed(2) || '0'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{language === 'he' ? 'אין תעודות' : 'No receipts'}</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === 'suppliers' && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'he' ? 'ספקים' : 'Suppliers'} ({liveData.suppliers?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {liveData.suppliers?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveData.suppliers.map((supplier, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <p className="font-bold">{supplier.name}</p>
                      {supplier.contact_person && <p className="text-sm text-gray-600">{supplier.contact_person}</p>}
                      {supplier.phone && <p className="text-sm text-gray-500">📞 {supplier.phone}</p>}
                      {supplier.email && <p className="text-sm text-gray-500">📧 {supplier.email}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{language === 'he' ? 'אין ספקים' : 'No suppliers'}</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === 'items' && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'he' ? 'פריטים' : 'Items'} ({liveData.items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {liveData.items?.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'he' ? 'שם' : 'Name'}</TableHead>
                        <TableHead>{language === 'he' ? 'ספק' : 'Supplier'}</TableHead>
                        <TableHead>{language === 'he' ? 'יחידה' : 'Unit'}</TableHead>
                        <TableHead>{language === 'he' ? 'מחיר' : 'Price'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liveData.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.supplier_name}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>₪{item.price?.toFixed(2) || '0'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{language === 'he' ? 'אין פריטים' : 'No items'}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="w-full">
        {viewingUser ? (
          loading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-[#d4a373]" />
            </div>
          ) : (
            renderLiveView()
          )
        ) : (
          <>
            <div className="mb-8 flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {language === 'he' ? 'לוח בקרה אדמין' : 'Admin Dashboard'}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    {language === 'he' ? 'צפה ונהל את כל המשתמשים והנתונים' : 'View and manage all users and data'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end md:justify-start">
                  {/* Marketing */}
                  <Button
                    onClick={() => setShowChainsView(!showChainsView)}
                    variant={showChainsView ? "default" : "outline"}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    {language === 'he' ? 'ניהול רשתות' : 'Chain Management'}
                    {chains.length > 0 && <Badge variant="secondary">{chains.length}</Badge>}
                  </Button>
                  <Button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800"
                  >
                    <Mail className="w-4 h-4" />
                    {language === 'he' ? 'שליחת הזמנת בעלים' : 'Send Owner Invite'}
                  </Button>
                  <Button
                    onClick={() => { setShowPromoKitModal(true); setPromoKitStatus('uploading'); setPromoKitResult(null); }}
                    variant="outline"
                    className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <Instagram className="w-4 h-4" />
                    {language === 'he' ? 'ערכת היכרות (גוגל דרייב)' : 'Promo Kit (Drive)'}
                  </Button>
                  <Button
                    onClick={() => setShowBusinessSetupPreview(true)}
                    variant="outline"
                    className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    <Building2 className="w-4 h-4" />
                    {language === 'he' ? 'בדיקת אשף עסק' : 'Test Business Setup'}
                  </Button>
                  <Button
                    onClick={() => window.dispatchEvent(new Event('b44_test_onboarding'))}
                    variant="outline"
                    className="flex items-center gap-2 border-blue-500 text-[#d4a373] hover:bg-blue-50"
                  >
                    <Eye className="w-4 h-4" />
                    {language === 'he' ? 'בדיקת סיור היכרות' : 'Test Onboarding'}
                  </Button>
                  <Button
                    onClick={() => window.location.href = '#/pages/PromoLinks'}
                    variant="outline"
                    className="flex items-center gap-2 border-purple-500 text-purple-600 hover:bg-purple-50"
                  >
                    <Crown className="w-4 h-4" />
                    {language === 'he' ? 'קישורי פרומו VIP' : 'VIP Promo Links'}
                  </Button>
                  <Button
                    onClick={() => setShowSeoModal(true)}
                    variant="outline"
                    className="flex items-center gap-2 border-teal-500 text-teal-600 hover:bg-teal-50"
                  >
                    <Globe className="w-4 h-4" />
                    {language === 'he' ? 'בודק מיקומים בגוגל' : 'SEO Rank Checker'}
                  </Button>
                  <Button
                    onClick={() => setShowTabitTester(true)}
                    variant="outline"
                    className="flex items-center gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    <TestTube className="w-4 h-4" />
                    {language === 'he' ? 'בדיקת התחברות לטאביט' : 'Tabit Tester'}
                  </Button>
                </div>
              </div>

            {showChainsView && (
              <Card className="mb-6">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {language === 'he' ? 'רשתות במערכת' : 'Chains in System'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {chains.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      {language === 'he' ? 'אין רשתות במערכת עדיין' : 'No chains in system yet'}
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {chains.map((chain) => {
                        const stores = chainStores.filter(s => s.chain_id === chain.id);
                        const headStore = stores.find(s => s.is_head_store);
                        const branches = stores.filter(s => !s.is_head_store);
                        
                        return (
                          <div key={chain.id} className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                            <div className="flex items-center gap-3 mb-4">
                              <Crown className="w-6 h-6 text-yellow-500" />
                              <div>
                                <h3 className="text-xl font-bold text-purple-900">{chain.name}</h3>
                                <p className="text-sm text-purple-600">{chain.description || ''}</p>
                                <p className="text-xs text-gray-500">
                                  {language === 'he' ? 'מנהל ראשי:' : 'Head Admin:'} {chain.head_store_user_email}
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {headStore && (
                                <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Crown className="w-4 h-4 text-yellow-600" />
                                    <span className="font-semibold text-yellow-800">{headStore.store_name}</span>
                                    <Badge className="bg-yellow-200 text-yellow-800 text-xs">
                                      {language === 'he' ? 'סניף ראשי' : 'Head Store'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">{headStore.user_email}</p>
                                  {headStore.store_address && (
                                    <p className="text-xs text-gray-500">{headStore.store_address}</p>
                                  )}
                                </div>
                              )}
                              
                              {branches.map((store) => (
                                <div key={store.id} className="bg-white border rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Store className="w-4 h-4 text-gray-500" />
                                    <span className="font-semibold">{store.store_name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {language === 'he' ? 'סניף' : 'Branch'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">{store.user_email}</p>
                                  {store.store_address && (
                                    <p className="text-xs text-gray-500">{store.store_address}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-purple-200 flex gap-4 text-sm text-purple-700">
                              <span>{stores.length} {language === 'he' ? 'סניפים' : 'stores'}</span>
                              <span>•</span>
                              <span>{branches.length} {language === 'he' ? 'סניפי משנה' : 'branches'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {showMarketingView && (
              <Card className="mb-6 border-2 border-purple-200">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-[#d4a373] text-white rounded-t-lg">
                  <CardTitle className="flex items-center justify-between">
                    <span>Instagram Campaign</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant={marketingLocale==='en' ? 'secondary' : 'outline'} onClick={() => setMarketingLocale('en')}>English (UK+US)</Button>
                      <Button size="sm" variant={marketingLocale==='de' ? 'secondary' : 'outline'} onClick={() => setMarketingLocale('de')}>Deutsch (DE)</Button>
                      <Button size="sm" variant={marketingLocale==='he' ? 'secondary' : 'outline'} onClick={() => setMarketingLocale('he')}>עברית (IL)</Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {marketingLocale === 'de' ? <InstagramCampaignDE /> : marketingLocale === 'he' ? <InstagramCampaignHE /> : <InstagramCampaign />}
                </CardContent>
              </Card>
            )}

            {!selectedUser ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {language === 'he' ? 'כל המשתמשים' : 'All Users'}
                <Badge variant="outline" className="ml-2">{allUsers.length}</Badge>
              </CardTitle>
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder={language === 'he' ? 'חפש משתמש...' : 'Search users...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 space-y-2">
                <p className="text-sm text-blue-800">
                  👁️ {language === 'he' ? 'לחץ פעמיים על משתמש לצפייה חיה בכל הנתונים שלו' : 'Double-click on a user to view their live data'}
                </p>
                <p className="text-sm text-purple-800">
                  🎮 {language === 'he' ? 'לחץ על כפתור "שלוט" כדי לעבוד בתור המשתמש הזה (כל הפעולות יתבצעו בשמו)' : 'Click "Control" button to work as this user (all actions will be performed as them)'}
                </p>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'he' ? 'שם מלא' : 'Full Name'}</TableHead>
                      <TableHead>{language === 'he' ? 'אימייל' : 'Email'}</TableHead>
                      <TableHead>{language === 'he' ? 'עסק' : 'Business'}</TableHead>
                      <TableHead>{language === 'he' ? 'טלפון' : 'Phone'}</TableHead>
                      <TableHead>{language === 'he' ? 'תפקיד' : 'Role'}</TableHead>
                      <TableHead>{language === 'he' ? 'תאריך הצטרפות' : 'Joined'}</TableHead>
                      <TableHead>{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        onDoubleClick={() => viewUserLive(user)}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.business_name || '-'}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role || 'user'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(user.created_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                switchToUser(user);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                            >
                              <LogIn className="w-3 h-3" />
                              {language === 'he' ? 'שלוט' : 'Control'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(language === 'he' ? `תקן הרשאות עבור ${user.email}?` : `Fix permissions for ${user.email}?`)) {
                                  try {
                                    const result = await base44.functions.invoke('fixUserPermissions', { userEmail: user.email });
                                    if (result.data.success) {
                                      alert(language === 'he' ? '✅ הרשאות תוקנו בהצלחה! המשתמש צריך להתנתק ולהתחבר מחדש' : '✅ Permissions fixed! User needs to logout and login again');
                                    } else {
                                      alert('Error: ' + result.data.error);
                                    }
                                  } catch (error) {
                                    alert('Error: ' + error.message);
                                  }
                                }
                              }}
                              className="border-green-600 text-green-600 hover:bg-green-50"
                            >
                              🔧 {language === 'he' ? 'תקן' : 'Fix'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{selectedUser.full_name}</CardTitle>
                    <p className="text-gray-600 mt-1">{selectedUser.email}</p>
                    {selectedUser.business_name && (
                      <p className="text-sm text-gray-500 mt-1">
                        {language === 'he' ? 'עסק:' : 'Business:'} {selectedUser.business_name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserData(null);
                    }}
                  >
                    {language === 'he' ? 'חזור לרשימה' : 'Back to List'}
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-[#d4a373]" />
              </div>
            ) : userData && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold">{userData.orders.length}</p>
                          <p className="text-sm text-gray-600">{language === 'he' ? 'הזמנות' : 'Orders'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{userData.receipts.length}</p>
                          <p className="text-sm text-gray-600">{language === 'he' ? 'תעודות משלוח' : 'Receipts'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Package className="w-8 h-8 text-[#d4a373]" />
                        <div>
                          <p className="text-2xl font-bold">{userData.items.length}</p>
                          <p className="text-sm text-gray-600">{language === 'he' ? 'פריטים' : 'Items'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Users className="w-8 h-8 text-indigo-600" />
                        <div>
                          <p className="text-2xl font-bold">{userData.workers.length}</p>
                          <p className="text-sm text-gray-600">{language === 'he' ? 'עובדים' : 'Workers'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="orders" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="orders">{language === 'he' ? 'הזמנות' : 'Orders'}</TabsTrigger>
                    <TabsTrigger value="receipts">{language === 'he' ? 'תעודות' : 'Receipts'}</TabsTrigger>
                    <TabsTrigger value="items">{language === 'he' ? 'פריטים' : 'Items'}</TabsTrigger>
                    <TabsTrigger value="workers">{language === 'he' ? 'עובדים' : 'Workers'}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="orders">
                    <Card>
                      <CardHeader>
                        <CardTitle>{language === 'he' ? 'הזמנות' : 'Orders'}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {userData.orders.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">
                            {language === 'he' ? 'אין הזמנות' : 'No orders'}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {userData.orders.slice(0, 20).map((order) => (
                              <div key={order.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold">{order.order_number}</p>
                                    <p className="text-sm text-gray-600">{order.supplier_name}</p>
                                    <p className="text-sm text-gray-500">
                                      {new Date(order.created_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Badge>{order.status}</Badge>
                                    <p className="text-sm font-semibold mt-1">
                                      ₪{order.total_cost?.toFixed(2) || '0.00'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="receipts">
                    <Card>
                      <CardHeader>
                        <CardTitle>{language === 'he' ? 'תעודות משלוח' : 'Supply Receipts'}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {userData.receipts.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">
                            {language === 'he' ? 'אין תעודות משלוח' : 'No receipts'}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {userData.receipts.slice(0, 20).map((receipt) => (
                              <div key={receipt.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold">{receipt.order_number}</p>
                                    <p className="text-sm text-gray-600">{receipt.supplier_name}</p>
                                    <p className="text-sm text-gray-500">
                                      {new Date(receipt.received_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant={receipt.status === 'verified' ? 'default' : 'destructive'}>
                                      {receipt.status}
                                    </Badge>
                                    <p className="text-sm font-semibold mt-1">
                                      ₪{receipt.invoice_total?.toFixed(2) || '0.00'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="items">
                    <Card>
                      <CardHeader>
                        <CardTitle>{language === 'he' ? 'פריטים' : 'Items'}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {userData.items.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">
                            {language === 'he' ? 'אין פריטים' : 'No items'}
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {userData.items.map((item) => (
                              <div key={item.id} className="border rounded-lg p-3 flex justify-between items-center">
                                <div>
                                  <p className="font-semibold">{item.name}</p>
                                  <p className="text-sm text-gray-600">{item.supplier_name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold">₪{item.price?.toFixed(2) || '0.00'}</p>
                                  <p className="text-xs text-gray-500">{item.unit}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="workers">
                    <Card>
                      <CardHeader>
                        <CardTitle>{language === 'he' ? 'עובדים' : 'Workers'}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {userData.workers.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">
                            {language === 'he' ? 'אין עובדים' : 'No workers'}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {userData.workers.map((worker) => (
                              <div key={worker.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold">{worker.full_name}</p>
                                    <p className="text-sm text-gray-600">{worker.job_position_name}</p>
                                    {worker.phone && (
                                      <p className="text-sm text-gray-500">{worker.phone}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold">
                                      ₪{worker.payment_amount?.toFixed(0) || '0'}
                                    </p>
                                    <p className="text-xs text-gray-500">{worker.payment_type}</p>
                                    <Badge className="mt-1" variant={worker.is_active ? 'default' : 'secondary'}>
                                      {worker.is_active ? (language === 'he' ? 'פעיל' : 'Active') : (language === 'he' ? 'לא פעיל' : 'Inactive')}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
          )}
        </>
        )}
      </div>

      <Dialog open={showPromoKitModal} onOpenChange={(val) => { if(!val && promoKitStatus !== 'uploading') setShowPromoKitModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'he' ? 'העלאת ערכת היכרות' : 'Uploading Promo Kit'}</DialogTitle>
            <DialogDescription>
              {language === 'he' ? 'מייצר תמונות ומעלה לתיקייה ב-Google Drive...' : 'Generating images and uploading to Google Drive...'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center">
            {promoKitStatus === 'uploading' && (
              <div className="flex flex-col items-center gap-4">
                <Loader className="w-10 h-10 animate-spin text-green-600" />
                <p className="text-gray-600 font-medium text-center">
                  {language === 'he' ? 'נא להמתין כ-15 שניות, אנחנו מכינים את הקבצים...' : 'Please wait about 15 seconds, preparing files...'}
                </p>
              </div>
            )}
            {promoKitStatus === 'success' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-2xl">✓</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{language === 'he' ? 'הועלה בהצלחה!' : 'Uploaded Successfully!'}</h3>
                {promoKitResult?.sharedTo && (
                  <p className="text-sm text-gray-600">
                    {language === 'he' ? 'שותף עם:' : 'Shared with:'} <br/><span className="font-semibold">{promoKitResult.sharedTo}</span>
                  </p>
                )}
                <Button onClick={() => setShowPromoKitModal(false)} className="mt-4 w-full bg-gray-900 hover:bg-gray-800">
                  {language === 'he' ? 'סגור' : 'Close'}
                </Button>
              </div>
            )}
            {promoKitStatus === 'error' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-2xl">✗</span>
                </div>
                <h3 className="text-lg font-bold text-red-600">{language === 'he' ? 'שגיאה בהעלאה' : 'Upload Failed'}</h3>
                <p className="text-sm text-gray-600">{promoKitResult?.error || 'Unknown error'}</p>
                <Button onClick={() => setShowPromoKitModal(false)} className="mt-4 w-full bg-gray-900 hover:bg-gray-800">
                  {language === 'he' ? 'סגור' : 'Close'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -9999, opacity: 0.01, width: '1200px', height: '2500px', pointerEvents: 'none' }}>
        {promoKitStatus === 'uploading' && (
          <PromoVideo 
            autoUpload={true} 
            onClose={(result) => {
              if (result.success) {
                setPromoKitStatus('success');
                setPromoKitResult(result);
              } else {
                setPromoKitStatus('error');
                setPromoKitResult(result);
              }
            }} 
          />
        )}
      </div>

      <BusinessSetupWizard 
        user={currentUser} 
        forceShow={showBusinessSetupPreview} 
        onComplete={() => setShowBusinessSetupPreview(false)} 
      />

      <TabitTesterModal 
        isOpen={showTabitTester} 
        onClose={() => setShowTabitTester(false)} 
      />

      <Dialog open={showSeoModal} onOpenChange={setShowSeoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'he' ? 'בודק מיקומים בגוגל' : 'Google SEO Rank Checker'}</DialogTitle>
            <DialogDescription>
              {language === 'he' ? 'הכלי הזה משתמש בבינה מלאכותית שמחוברת לאינטרנט כדי לחפש את האתר שלך בגוגל ולמצוא את המיקום שלו.' : 'This tool uses internet-connected AI to search Google and find your ranking position.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'he' ? 'מילת מפתח לחיפוש' : 'Search Keyword'}</label>
              <Input
                value={seoKeyword}
                onChange={(e) => setSeoKeyword(e.target.value)}
                placeholder="e.g. Smart Plate food cost app"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'he' ? 'הדומיין שלך' : 'Your Domain'}</label>
              <Input
                value={seoDomain}
                onChange={(e) => setSeoDomain(e.target.value)}
                placeholder="e.g. foodcostapp.com"
              />
            </div>
            <Button 
              onClick={handleCheckSeo} 
              disabled={seoLoading} 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              {seoLoading ? (language === 'he' ? 'מחפש בגוגל...' : 'Searching Google...') : (language === 'he' ? 'בדוק מיקום עכשיו' : 'Check Rank Now')}
            </Button>

            {seoResult && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  {seoResult.found ? (
                    <span className="flex items-center gap-1 text-green-600 font-bold"><Globe className="w-4 h-4"/> Found in search results!</span>
                  ) : (
                    <span className="flex items-center gap-1 text-orange-600 font-bold"><Globe className="w-4 h-4"/> Not found in top results yet</span>
                  )}
                </div>
                {seoResult.found && seoResult.estimated_position && (
                  <p className="text-lg font-bold text-gray-900 mb-2">Estimated Position: #{seoResult.estimated_position}</p>
                )}
                <p className="text-sm text-gray-600">{seoResult.summary}</p>
                
                <p className="text-xs text-gray-500 mt-4 italic">
                  Note: Google indexing can take anywhere from a few days to a few weeks for a brand new domain. Keep checking back! This uses Gemini 3.1 Pro for live search which takes a few integration credits per run.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'he' ? 'שליחת הזמנת בעלים' : 'Send Owner Invite'}</DialogTitle>
            <DialogDescription>
              {language === 'he' ? 'שלח הזמנה לבעלים להצטרף למערכת' : 'Invite an owner to join the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={language === 'he' ? 'אימייל' : 'Email'}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Input
              placeholder={language === 'he' ? 'שם מלא' : 'Full name'}
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{language === 'he' ? 'שפה:' : 'Language:'}</span>
              <Select value={inviteLang} onValueChange={setInviteLang}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="he">עברית</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </Button>
            <Button onClick={handleSendOwnerInvite} disabled={sendingInvite} className="bg-gray-900 hover:bg-gray-800">
              {sendingInvite ? (language === 'he' ? 'שולח...' : 'Sending...') : (language === 'he' ? 'שלח הזמנה' : 'Send Invite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}