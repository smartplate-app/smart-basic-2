import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Package, ShoppingCart, Warehouse, Menu, BarChart2, ChefHat, TrendingDown, UserCircle, PackageCheck, Shield, AlertCircle, MessageCircle, TrendingUp, DollarSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import UserSwitcher from "./components/UserSwitcher";
import { LanguageProvider, useLanguage } from "./components/LanguageProvider";
import LanguageSwitcher from "./components/LanguageSwitcher";
import WorkerInvite from "./components/WorkerInvite";
import AppHelpChat from "./components/AppHelpChat";
import OfflineNotification from "./components/OfflineNotification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, WifiOff } from "lucide-react";

const AppLayout = ({ children, currentPageName }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [showWorkerInvite, setShowWorkerInvite] = React.useState(false);
  const [error, setError] = React.useState(null);
      const [retryCount, setRetryCount] = React.useState(0);
      const [storeUserRole, setStoreUserRole] = React.useState(null); // null = owner, 'manager', or 'worker'
      const { t, language } = useLanguage();
  const [navSearchTerm, setNavSearchTerm] = React.useState("");

  const navigationItems = [
            { title: t('nav_orders'), url: createPageUrl("Orders"), icon: ShoppingCart, adminOnly: false, workerHidden: false },
            { title: t('dashboard'), url: createPageUrl("Dashboard"), icon: BarChart2, adminOnly: false, workerHidden: true },
            { title: t('nav_receipts'), url: createPageUrl("SupplyReceipts"), icon: PackageCheck, adminOnly: false, workerHidden: false },
            { title: t('nav_suppliers'), url: createPageUrl("Suppliers"), icon: Users, adminOnly: false, workerHidden: true },
            { title: t('nav_items'), url: createPageUrl("Items"), icon: Package, adminOnly: false, workerHidden: true },
            { title: t('warehouse_management'), url: createPageUrl("Warehouses"), icon: Warehouse, adminOnly: false, workerHidden: true },
            { title: t('nav_monthly_count'), url: createPageUrl("MonthlyCount"), icon: Warehouse, adminOnly: false, workerHidden: false },
            { title: language === 'he' ? 'רשימת משימות' : 'To-Do List', url: createPageUrl("ToDoList"), icon: ChefHat, adminOnly: false, workerHidden: false },
            { title: language === 'he' ? 'סידור עבודה' : 'Labor Cost', url: createPageUrl("LaborCost"), icon: Users, adminOnly: false, workerHidden: true },
            { title: language === 'he' ? 'ניהול טיפים' : 'Tips Management', url: createPageUrl("Tips"), icon: DollarSign, adminOnly: false, workerHidden: true },
            { title: language === 'he' ? 'משתמשי המסעדה' : 'Restaurant Users', url: createPageUrl("StoreUsers"), icon: Users, adminOnly: false, workerHidden: true },

            { title: t('user_profile'), url: createPageUrl("UserProfile"), icon: UserCircle, adminOnly: false, workerHidden: false },
            { title: t('nav_users'), url: createPageUrl("Users"), icon: Shield, adminOnly: true, workerHidden: true },
            { title: language === 'he' ? 'לוח בקרה אדמין' : 'Admin Dashboard', url: createPageUrl("AdminDashboard"), icon: Shield, adminOnly: true, workerHidden: true },
            { title: language === 'he' ? 'בדיקת הזמנות' : 'Test Invites', url: createPageUrl("TestInviteLinks"), icon: Shield, adminOnly: true, workerHidden: true }
          ];

  React.useEffect(() => {
    if (currentPageName !== 'OrderDetails' && currentPageName !== 'WorkerPortal' && currentPageName !== 'Register' && currentPageName !== 'RestaurantInvite') {
      loadAuth();
    } else {
      setAuthLoading(false);
    }
  }, [currentPageName]);
  
  React.useEffect(() => {
    document.documentElement.dir = language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const loadAuth = async (attemptNumber = 0) => {
        try {
          setAuthLoading(true);
          setError(null);
          setRetryCount(attemptNumber);

          // Add delay only for retries
          if (attemptNumber > 0) {
            const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }



          const currentUser = await base44.auth.me();

          setUser(currentUser);
                  setError(null);
                  setRetryCount(0);

                  // Check if user is a store user (worker/manager) for someone else's store
                  // Always check StoreUser entity to verify they still have access
                  try {
                    const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: currentUser.email });
                    const activeRecord = storeUserRecords.find(r => r.is_active === true);

                    if (activeRecord) {
                      console.log('[Layout] Found active StoreUser record:', { role: activeRecord.role, owner: activeRecord.owner_email });
                      setStoreUserRole(activeRecord.role);
                      // Save store info to user context
                      await base44.auth.updateMe({
                        store_user_role: activeRecord.role,
                        store_user_owner_email: activeRecord.owner_email,
                        store_user_store_name: activeRecord.store_name,
                        store_user_revoked: false
                      });
                    } else if (storeUserRecords.length > 0 && storeUserRecords.every(r => !r.is_active)) {
                      // User has StoreUser records but all are inactive (access revoked)
                      console.log('[Layout] StoreUser records exist but all inactive - access revoked');
                      await base44.auth.updateMe({
                        store_user_role: null,
                        store_user_owner_email: null,
                        store_user_store_name: null,
                        store_user_revoked: true
                      });
                      setStoreUserRole(null);
                    } else if (currentUser.store_user_owner_email && storeUserRecords.length === 0) {
                      // User was a store user but record was completely deleted
                      console.log('[Layout] StoreUser record deleted - access revoked');
                      await base44.auth.updateMe({
                        store_user_role: null,
                        store_user_owner_email: null,
                        store_user_store_name: null,
                        store_user_revoked: true
                      });
                      setStoreUserRole(null);
                    } else {
                      console.log('[Layout] No StoreUser record found, user is regular owner');
                    }
                  } catch (storeUserError) {
                    console.error("[Layout] Error checking store user record:", storeUserError);
                  }

                  const currentPath = location.pathname;
                                          if (currentPath === '/' || currentPath === '/pages' || currentPath === '' || currentPath === '/pages/') {
                                            console.log("[Layout] Redirecting to Orders page");
                                            window.location.href = createPageUrl("Orders");
                                          }
      
      setAuthLoading(false);
    } catch (err) {
      console.error(`[Layout] Authentication error (attempt ${attemptNumber + 1}):`, err);
      console.error("[Layout] Error details:", {
        message: err.message,
        code: err.code,
        name: err.name,
        status: err.response?.status,
        online: navigator.onLine,
        stack: err.stack
      });
      
      const isNetworkError = 
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('internet') ||
        err.message?.toLowerCase().includes('connection') ||
        err.message?.toLowerCase().includes('failed to fetch') ||
        err.code === 'ERR_NETWORK' ||
        err.name === 'NetworkError' ||
        err.response?.status === 0 ||
        !navigator.onLine;
      
      if (isNetworkError && attemptNumber < 2) {
        console.log(`[Layout] Will retry authentication... (${attemptNumber + 1}/2)`);
        setTimeout(() => loadAuth(attemptNumber + 1), 2000);
        return;
      }
      
      console.error("[Layout] Max retries reached or non-network error");
      setError(err.message || "Failed to load app");
      setAuthLoading(false);
    }
  };

  const isWorker = storeUserRole === 'worker' || user?.store_user_role === 'worker';
    const isAdminControllingUser = user?.admin_original_email && user?.acting_as_user_email;

              const visibleNavigationItems = navigationItems.filter(item => {
                // Admin-only items
                if (item.adminOnly && user?.role !== 'admin') return false;
                // Worker-hidden items
                if (item.workerHidden && isWorker) return false;
                return true;
              });

  const filteredNavigationItems = visibleNavigationItems.filter(item =>
    item.title.toLowerCase().includes(navSearchTerm.toLowerCase())
  );

    const exitAdminControl = async () => {
      try {
        await base44.auth.updateMe({
          admin_original_email: null,
          acting_as_user_email: null,
          acting_as_user_name: null,
          acting_as_store_email: null,
          acting_as_store_name: null
        });
        window.location.href = '/pages/AdminDashboard';
      } catch (error) {
        console.error("Error exiting admin control:", error);
      }
    };

  const isRTL = language === 'he' || language === 'ar';

  if (currentPageName === 'WorkerPortal' || currentPageName === 'OrderDetails' || currentPageName === 'Register' || currentPageName === 'RestaurantInvite') {
        return <>{children}</>;
      }


  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
            alt="Smart Plate"
            className="h-20 object-contain animate-pulse"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="text-lg text-gray-700 font-medium">
              {language === 'he' ? 'טוען מערכת...' : language === 'ar' ? 'تحميل النظام...' : 'Loading system...'}
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-orange-600">
                {language === 'he' ? `ניסיון ${retryCount + 1}/4` : `Attempt ${retryCount + 1}/4`}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Check if user's store access was revoked
  if (user?.store_user_revoked) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="bg-orange-50 border-b">
            <CardTitle className="text-orange-700 flex items-center justify-center gap-2">
              <AlertCircle className="w-6 h-6" />
              {language === 'he' ? 'הגישה הוסרה' : 'Access Revoked'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="text-center">
              <p className="text-lg text-gray-700 mb-4">
                {language === 'he' 
                  ? 'אין לך יותר גישה למסעדה הזו.' 
                  : 'You no longer have access to this restaurant.'}
              </p>
              <p className="text-gray-500 mb-6">
                {language === 'he' 
                  ? 'בהצלחה בהמשך הדרך! 🙏' 
                  : 'Good luck on your journey! 🙏'}
              </p>
              <Button 
                onClick={async () => {
                  await base44.auth.updateMe({ store_user_revoked: false });
                  await base44.auth.logout();
                }} 
                className="w-full bg-gray-900 hover:bg-gray-800"
              >
                {language === 'he' ? 'התנתק' : 'Logout'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="bg-red-50 border-b">
            <CardTitle className="text-red-700 flex items-center justify-center gap-2">
              <WifiOff className="w-6 h-6" />
              {language === 'he' ? 'שגיאת חיבור' : language === 'ar' ? 'خطأ في الاتصال' : 'Connection Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start gap-2 text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
              <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="font-medium mb-1">
                  {language === 'he' 
                    ? 'לא ניתן להתחבר למערכת'
                    : language === 'ar'
                    ? 'تعذر الاتصال بالنظام'
                    : 'Cannot connect to system'}
                </p>
                <p className="text-xs text-gray-500 break-words">
                  {error}
                </p>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="font-semibold mb-2">
                {language === 'he' ? 'פתרונות אפשריים:' : language === 'ar' ? 'حلول ممكنة:' : 'Possible solutions:'}
              </p>
              <ul className={`list-disc space-y-1 ${isRTL ? 'list-inside mr-4' : 'list-inside ml-4'}`}>
                <li>{language === 'he' ? 'בדוק את חיבור האינטרנט שלך' : language === 'ar' ? 'تحقق من اتصال الإنترنت' : 'Check your internet connection'}</li>
                <li>{language === 'he' ? 'כבה VPN אם פעיל' : language === 'ar' ? 'أوقف تشغيل VPN إذا كان نشطًا' : 'Disable VPN if active'}</li>
                <li>{language === 'he' ? 'נסה דפדפן אחר (Chrome מומלץ)' : language === 'ar' ? 'جرب متصفحًا آخر (يُنصح بـ Chrome)' : 'Try a different browser (Chrome recommended)'}</li>
                <li>{language === 'he' ? 'נקה את cache של הדפדפן' : language === 'ar' ? 'امسح ذاكرة التخزين المؤقت للمتصفح' : 'Clear browser cache'}</li>
                <li>{language === 'he' ? 'המתן 30 שניות ונסה שוב' : language === 'ar' ? 'انتظر 30 ثانية وحاول مرة أخرى' : 'Wait 30 seconds and try again'}</li>
              </ul>
            </div>
            
            <Button 
              onClick={() => {
                setError(null);
                setRetryCount(0);
                window.location.reload();
              }} 
              className="w-full bg-gray-900 hover:bg-gray-800"
            >
              <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'he' ? 'רענן את הדף' : language === 'ar' ? 'إعادة تحميل الصفحة' : 'Reload Page'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
        <div className="min-h-screen bg-gray-50">
          {/* Admin Control Banner */}
          {isAdminControllingUser && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-40">
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-lg">🎮</span>
                <span className="font-bold">
                  {language === 'he' ? 'שולט כעת ב:' : 'Controlling:'} {user.acting_as_user_name}
                </span>
                <span className="text-purple-200 text-sm">({user.acting_as_user_email})</span>
              </div>
              <button
                onClick={exitAdminControl}
                className="bg-white text-purple-700 px-4 py-1 rounded-lg font-bold hover:bg-purple-100 transition-colors"
              >
                {language === 'he' ? '🔙 חזור לאדמין' : '🔙 Back to Admin'}
              </button>
            </div>
          )}

          <header className={`bg-white border-b px-4 py-3 flex items-center justify-between md:hidden sticky ${isAdminControllingUser ? 'top-10' : 'top-0'} z-30 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button 
                          onClick={() => setSidebarOpen(!sidebarOpen)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                        >
                          <Menu className="w-5 h-5 text-gray-900" />
                        </button>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2">
                            <img 
                              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
                              alt="Smart Plate"
                              className="h-10 object-contain"
                            />
                            {user?.restaurant_logo && (
                              <>
                                <span className="text-gray-300 text-lg">+</span>
                                <img 
                                  src={user.restaurant_logo} 
                                  alt="Restaurant Logo"
                                  className="h-10 w-10 object-contain rounded-lg"
                                />
                              </>
                            )}
                          </div>
                          <span className="text-sm font-bold text-gray-500 tracking-wide">BASIC</span>
                        </div>
                        <div style={{ width: '40px' }}></div>
                      </header>

      <div className="flex">
        <aside className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-white border-${isRTL ? 'l' : 'r'} border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
          <div className="p-4 border-b border-gray-200 hidden md:block">
                            <div className={`flex flex-col items-center justify-center ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                              <div className="flex items-center gap-3">
                                <img 
                                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
                                  alt="Smart Plate"
                                  className="h-14 object-contain flex-shrink-0"
                                />
                                {user?.restaurant_logo && (
                                  <>
                                    <span className="text-gray-300 text-2xl">+</span>
                                    <img 
                                      src={user.restaurant_logo} 
                                      alt="Restaurant Logo"
                                      className="h-14 w-14 object-contain rounded-lg"
                                    />
                                  </>
                                )}
                              </div>
                              <span className="text-lg font-bold text-gray-500 mt-2 tracking-wide">BASIC</span>
                            </div>
                          </div>
          
          <div className="p-4 border-b border-gray-200">
            {user && (
              <div className="w-full space-y-2">
                <UserSwitcher user={user} onUserChange={setUser} />
              </div>
            )}
          </div>
          
          <div className="p-4 border-b border-gray-200">
            <LanguageSwitcher />
          </div>

          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-gray-400`} />
              <Input
                type="text"
                placeholder={language === 'he' ? 'חפש דף...' : 'Search page...'}
                value={navSearchTerm}
                onChange={(e) => setNavSearchTerm(e.target.value)}
                className={`text-sm h-9 ${isRTL ? 'pr-9' : 'pl-9'}`}
              />
            </div>
          </div>

          <nav className="p-4 flex-grow overflow-y-auto">
            <ul className="space-y-2">
              {filteredNavigationItems.map((item) => (
                <li key={item.title}>
                  <a 
                    href={item.url} 
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isRTL ? 'flex-row-reverse text-right' : ''} ${
                      location.pathname === item.url || location.pathname.includes(item.url.split('/').pop()) ? 'bg-gray-900 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden touch-none" 
            onClick={() => setSidebarOpen(false)}
            onTouchStart={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 min-w-0 w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {showWorkerInvite && (
              <div className="p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                  <WorkerInvite onClose={() => setShowWorkerInvite(false)} />
                </div>
              </div>
            )}
            {children}
          </div>
        </main>

        {/* Global Help Chat - except on Suppliers and AdminDashboard which have their own */}
                      {currentPageName !== 'Suppliers' && currentPageName !== 'AdminDashboard' && (
                        <AppHelpChat currentPage={currentPageName} />
                      )}

                      {/* Offline notification for data-sensitive pages */}
                      <OfflineNotification pageName={currentPageName} />
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <LanguageProvider>
      <AppLayout currentPageName={currentPageName}>{children}</AppLayout>
    </LanguageProvider>
  )
}