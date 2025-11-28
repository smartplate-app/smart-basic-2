
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Package, ShoppingCart, Warehouse, Menu, BarChart2, ChefHat, TrendingDown, UserCircle, PackageCheck, Shield, AlertCircle, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import UserSwitcher from "./components/UserSwitcher";
import { LanguageProvider, useLanguage } from "./components/LanguageProvider";
import LanguageSwitcher from "./components/LanguageSwitcher";
import WorkerInvite from "./components/WorkerInvite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AppLayout = ({ children, currentPageName }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [showWorkerInvite, setShowWorkerInvite] = React.useState(false);
  const [error, setError] = React.useState(null);
  const { t, language } = useLanguage();

  const navigationItems = [
    { title: t('labor_cost_management'), url: createPageUrl("LaborCost"), icon: Users, adminOnly: false },
    { title: t('nav_orders'), url: createPageUrl("Orders"), icon: ShoppingCart, adminOnly: false },
    { title: t('dashboard'), url: createPageUrl("Dashboard"), icon: BarChart2, adminOnly: false },
    { title: t('nav_receipts'), url: createPageUrl("SupplyReceipts"), icon: PackageCheck, adminOnly: false },
    { title: t('price_changes_report') || 'דוח שינויי מחירים', url: createPageUrl("PriceChangesReport"), icon: TrendingDown, adminOnly: false },
    { title: t('nav_suppliers'), url: createPageUrl("Suppliers"), icon: Users, adminOnly: false },
    { title: t('nav_items'), url: createPageUrl("Items"), icon: Package, adminOnly: false },
    { title: t('warehouse_management'), url: createPageUrl("Warehouses"), icon: Warehouse, adminOnly: false },
    { title: t('nav_monthly_count'), url: createPageUrl("MonthlyCount"), icon: Warehouse, adminOnly: false },
    { title: t('nav_recipes'), url: createPageUrl("Recipes"), icon: ChefHat, adminOnly: false },
    { title: t('nav_cogs'), url: createPageUrl("COGSReports"), icon: BarChart2, adminOnly: false },
    { title: t('nav_afc'), url: createPageUrl("AFCReports"), icon: TrendingDown, adminOnly: false },
    { title: t('monthly_salary_report'), url: createPageUrl("MonthlySalaryReport"), icon: Users, adminOnly: false },
    { title: t('nav_reconciliation'), url: createPageUrl("SupplierReconciliation"), icon: BarChart2, adminOnly: false },
    { title: t('nav_reports'), url: createPageUrl("Reports"), icon: BarChart2, adminOnly: false },
    { title: t('user_profile'), url: createPageUrl("UserProfile"), icon: UserCircle, adminOnly: false },
    { title: t('nav_users'), url: createPageUrl("Users"), icon: Shield, adminOnly: true },
    { title: language === 'he' ? 'לוח בקרה אדמין' : 'Admin Dashboard', url: createPageUrl("AdminDashboard"), icon: Shield, adminOnly: true }
  ];

  React.useEffect(() => {
    if (currentPageName !== 'OrderDetails' && currentPageName !== 'WorkerPortal') {
      loadAuth();
    } else {
      setAuthLoading(false);
    }
  }, [currentPageName]);
  
  React.useEffect(() => {
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const loadAuth = async (retryCount = 0) => {
    try {
      setAuthLoading(true);
      setError(null);
      
      console.log(`[Layout] Authentication attempt ${retryCount + 1}`);
      
      // Add delay before retry
      if (retryCount > 0) {
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
        console.log(`[Layout] Waiting for ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const currentUser = await base44.auth.me();
      console.log("[Layout] User authenticated:", currentUser.email);
      
      setUser(currentUser);
      setError(null); // Clear any previous error on successful auth
      
      if (location.pathname === '/' || location.pathname === '/pages') {
        window.location.href = createPageUrl("Orders");
      }
    } catch (err) {
      console.error(`[Layout] Authentication error (attempt ${retryCount + 1}):`, err);
      
      const isNetworkError = err.message?.includes('Network Error') || 
                            err.code === 'ERR_NETWORK' ||
                            err.name === 'NetworkError';
      
      if (isNetworkError && retryCount < 3) {
        console.log(`[Layout] Retrying authentication... (${retryCount + 1}/3)`);
        return loadAuth(retryCount + 1);
      }
      
      setError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const visibleNavigationItems = user && user.role === 'admin' 
    ? navigationItems 
    : navigationItems.filter(item => !item.adminOnly);

  const isRTL = language === 'he' || language === 'ar';

  if (currentPageName === 'WorkerPortal' || currentPageName === 'OrderDetails') {
    return <>{children}</>;
  }
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <img 
            src="https://smartplate.org/logo.png" 
            alt="Smart Plate"
            className="h-20 object-contain animate-pulse"
          />
          <p className="text-lg text-gray-700 font-medium">
            {language === 'he' ? 'טוען...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              {language === 'he' ? 'שגיאת חיבור' : 'Connection Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-semibold">
                {language === 'he' ? 'פתרונות אפשריים:' : 'Possible solutions:'}
              </p>
              <ul className={`list-disc space-y-1 ${language === 'he' ? 'list-inside mr-4' : 'list-inside ml-4'}`}>
                <li>{language === 'he' ? 'בדוק את חיבור האינטרנט' : 'Check your internet connection'}</li>
                <li>{language === 'he' ? 'רענן את הדף' : 'Refresh the page'}</li>
                <li>{language === 'he' ? 'כבה VPN אם פעיל' : 'Disable VPN if active'}</li>
                <li>{language === 'he' ? 'נסה דפדפן אחר' : 'Try a different browser'}</li>
              </ul>
            </div>
            <Button onClick={() => loadAuth()} className="w-full bg-gray-900 hover:bg-gray-800">
              {language === 'he' ? 'נסה שוב' : 'Try Again'}
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
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <img 
            src="https://smartplate.org/logo.png" 
            alt="Smart Plate"
            className="h-10 object-contain"
          />
          <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'}`}>
            <p className="text-sm font-bold text-gray-900">Smart Plate</p>
            <p className="text-[10px] text-gray-600 font-medium whitespace-nowrap">
              {language === 'he' ? 'עלות מזון ועבודה בצורה נכונה' : 'Food Cost & Labor Cost Done Right'}
            </p>
          </div>
        </div>
        <div className="w-12"></div>
      </header>

      <div className="flex">
        <aside className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-white border-${isRTL ? 'l' : 'r'} border-gray-200 flex flex-col transform transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
          <div className="p-4 border-b border-gray-200 hidden md:block">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <img 
                src="https://smartplate.org/logo.png" 
                alt="Smart Plate"
                className="h-16 object-contain flex-shrink-0"
              />
              <div className="flex flex-col">
                <p className="text-lg font-bold text-gray-900">Smart Plate</p>
                <p className="text-xs text-gray-600 font-medium">
                  {language === 'he' ? 'עלות מזון ועבודה בצורה נכונה' : 'Food Cost & Labor Cost Done Right'}
                </p>
              </div>
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
