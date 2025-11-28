import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Package, ShoppingCart, Warehouse, Menu, BarChart2, ChefHat, TrendingDown, UserCircle, PackageCheck, Shield, AlertCircle, MessageCircle, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import UserSwitcher from "./components/UserSwitcher";
import { LanguageProvider, useLanguage } from "./components/LanguageProvider";
import LanguageSwitcher from "./components/LanguageSwitcher";
import WorkerInvite from "./components/WorkerInvite";
import AppHelpChat from "./components/AppHelpChat";
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

  const navigationItems = [
            { title: t('labor_cost_management'), url: createPageUrl("LaborCost"), icon: Users, adminOnly: false, workerHidden: true },
            { title: t('nav_orders'), url: createPageUrl("Orders"), icon: ShoppingCart, adminOnly: false, workerHidden: false },
            { title: t('dashboard'), url: createPageUrl("Dashboard"), icon: BarChart2, adminOnly: false, workerHidden: true },
            { title: t('nav_receipts'), url: createPageUrl("SupplyReceipts"), icon: PackageCheck, adminOnly: false, workerHidden: false },
            { title: t('nav_suppliers'), url: createPageUrl("Suppliers"), icon: Users, adminOnly: false, workerHidden: true },
            { title: t('nav_items'), url: createPageUrl("Items"), icon: Package, adminOnly: false, workerHidden: true },
            { title: t('warehouse_management'), url: createPageUrl("Warehouses"), icon: Warehouse, adminOnly: false, workerHidden: true },
            { title: t('nav_monthly_count'), url: createPageUrl("MonthlyCount"), icon: Warehouse, adminOnly: false, workerHidden: false },
            { title: language === 'he' ? 'ניהול רשת' : 'Chain Management', url: createPageUrl("ChainManagement"), icon: TrendingUp, adminOnly: false, workerHidden: true },
            { title: language === 'he' ? 'משתמשי החנות' : 'Store Users', url: createPageUrl("StoreUsers"), icon: Users, adminOnly: false, workerHidden: true },
            { title: language === 'he' ? 'דוח הזמנות ספקים' : 'Supplier Orders Report', url: createPageUrl("Reports"), icon: BarChart2, adminOnly: false, workerHidden: true },
            { title: t('user_profile'), url: createPageUrl("UserProfile"), icon: UserCircle, adminOnly: false, workerHidden: false },
            { title: t('nav_users'), url: createPageUrl("Users"), icon: Shield, adminOnly: true, workerHidden: true },
            { title: language === 'he' ? 'לוח בקרה אדמין' : 'Admin Dashboard', url: createPageUrl("AdminDashboard"), icon: Shield, adminOnly: true, workerHidden: true }
          ];

  React.useEffect(() => {
    if (currentPageName !== 'OrderDetails' && currentPageName !== 'WorkerPortal' && currentPageName !== 'Register') {
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

          // Check if online before attempting
          if (!navigator.onLine) {
            throw new Error('No internet connection - please check your network');
          }

          // Reduced initial wait for faster mobile loading
          if (attemptNumber === 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // Add exponential backoff delay for retries
          if (attemptNumber > 0) {
            const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 8000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Additional check before attempting auth
          if (!navigator.onLine) {
            throw new Error('Connection lost - please check your network');
          }

          const currentUser = await base44.auth.me();
      
      setUser(currentUser);
                  setError(null);
                  setRetryCount(0);

                  // Check if user is a store user (worker/manager) for someone else's store
                  try {
                    const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: currentUser.email, is_active: true });
                    if (storeUserRecords.length > 0) {
                      const storeUserRecord = storeUserRecords[0];
                      setStoreUserRole(storeUserRecord.role);
                      // Save store info to user context
                      if (!currentUser.store_user_role) {
                        await base44.auth.updateMe({
                          store_user_role: storeUserRecord.role,
                          store_user_owner_email: storeUserRecord.owner_email,
                          store_user_store_name: storeUserRecord.store_name
                        });
                      }
                    }
                  } catch (storeUserError) {
                    console.log("No store user record found");
                  }

                  const currentPath = location.pathname;
      if (currentPath === '/' || currentPath === '/pages' || currentPath === '' || currentPath === '/pages/') {
        console.log("[Layout] Redirecting to Dashboard page");
        window.location.href = createPageUrl("Dashboard");
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
      
      if (isNetworkError && attemptNumber < 4) { // Reduced to 4 retries
        console.log(`[Layout] Will retry authentication... (${attemptNumber + 1}/4)`);
        const retryDelay = Math.min(3000 * Math.pow(2, attemptNumber), 20000);
        setTimeout(() => loadAuth(attemptNumber + 1), retryDelay);
        return;
      }
      
      console.error("[Layout] Max retries reached or non-network error");
      setError(err.message || "Failed to load app");
      setAuthLoading(false);
    }
  };

  const isWorker = storeUserRole === 'worker' || user?.store_user_role === 'worker';

      const visibleNavigationItems = navigationItems.filter(item => {
        // Admin-only items
        if (item.adminOnly && user?.role !== 'admin') return false;
        // Worker-hidden items
        if (item.workerHidden && isWorker) return false;
        return true;
      });

  const isRTL = language === 'he' || language === 'ar';

  if (currentPageName === 'WorkerPortal' || currentPageName === 'OrderDetails' || currentPageName === 'Register') {
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
      <header className={`bg-white border-b px-4 py-3 flex items-center justify-between md:hidden sticky top-0 z-30 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-5 h-5 text-gray-900" />
        </button>
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
          alt="Smart Plate"
          className="h-10 object-contain"
        />
        <div style={{ width: '40px' }}></div>
      </header>

      <div className="flex">
        <aside className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-white border-${isRTL ? 'l' : 'r'} border-gray-200 flex flex-col transform transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
          <div className="p-4 border-b border-gray-200 hidden md:block">
            <div className={`flex items-center justify-center ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
                alt="Smart Plate"
                className="h-16 object-contain flex-shrink-0"
              />
            </div>
          </div>
          
          <div className="p-4 border-b border-gray-200">
            {user && (
              <div className="w-full space-y-2">
                <UserSwitcher user={user} onUserChange={setUser} />
                <button
                  onClick={() => setShowWorkerInvite(!showWorkerInvite)}
                  style={{
                    backgroundColor: '#25D366',
                    border: 'none',
                    width: '100%',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '500',
                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#128C7E'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#25D366'}
                >
                  <svg 
                    width="14" 
                    height="14" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span style={{ lineHeight: '1.2' }}>{t('invite_worker')}</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="p-4 border-b border-gray-200">
            <LanguageSwitcher />
          </div>

          <nav className="p-4 flex-grow overflow-y-auto">
            <ul className="space-y-2">
              {visibleNavigationItems.map((item) => (
                <li key={item.title}>
                  <Link 
                    to={item.url} 
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isRTL ? 'flex-row-reverse text-right' : ''} ${
                      location.pathname === item.url ? 'bg-gray-900 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto">
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