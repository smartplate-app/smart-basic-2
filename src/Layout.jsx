import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Package, ShoppingCart, Warehouse, Menu, BarChart2, ChefHat, TrendingDown, UserCircle, PackageCheck, Shield, AlertCircle, MessageCircle, TrendingUp, DollarSign, Search, X, ChevronLeft, ChevronRight, ArrowLeftRight, Share } from "lucide-react";
import { base44 } from "@/api/base44Client";
import UserSwitcher from "./components/UserSwitcher";
import { LanguageProvider, useLanguage } from "./components/LanguageProvider";
import LanguageSwitcher from "./components/LanguageSwitcher";
import WorkerInvite from "./components/WorkerInvite";
import AppHelpChat from "./components/AppHelpChat";
import OfflineNotification from "./components/OfflineNotification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RefreshCw, WifiOff, Copy, ExternalLink } from "lucide-react";

const AppLayout = ({ children, currentPageName }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showWorkerInvite, setShowWorkerInvite] = useState(false);
  const [error, setError] = useState(null);
      const [retryCount, setRetryCount] = useState(0);
      const [storeUserRole, setStoreUserRole] = useState(null); // null = owner, 'manager', or 'worker'
      const { t, language } = useLanguage();
  const [navSearchTerm, setNavSearchTerm] = useState("");
  const [isIncognito, setIsIncognito] = useState(false);
  // PWA install (global)
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);



  // Keep sidebar visible; adjust only width via CSS
  useEffect(() => {
    setShowDesktopSidebar(true);
  }, []);

  // Detect incognito/private mode (best-effort) to avoid auto-redirects
  useEffect(() => {
    (async () => {
      try {
        if ('storage' in navigator && navigator.storage && navigator.storage.estimate) {
          const { quota } = await navigator.storage.estimate();
          if (quota && quota < 120 * 1024 * 1024) {
            setIsIncognito(true);
          }
        }
      } catch {}
    })();
  }, []);

  // Global PWA install listeners (iOS guide when no prompt)
  useEffect(() => {
    const checkInstalled = () => {
      const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      // @ts-ignore - iOS Safari only
      const iosStandalone = 'standalone' in navigator && navigator.standalone;
      setIsPwaInstalled(Boolean(standalone || iosStandalone));
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(Boolean(isiOS));
    };
    checkInstalled();

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    const onAppInstalled = () => {
      setIsPwaInstalled(true);
      setInstallPromptEvent(null);
      try { localStorage.setItem('b44_installed', '1'); } catch {}
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  // Fast boot: hydrate user from cache to skip initial loader (especially for PWA)
  useEffect(() => {
    if (user) return;
    try {
      const s = localStorage.getItem('b44_user_cache');
      if (s) {
        const cached = JSON.parse(s);
        setUser(cached);
        setAuthLoading(false);
      }
    } catch {}
  }, []);

  const handlePwaInstall = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    try { await installPromptEvent.userChoice; } finally { setInstallPromptEvent(null); }
  };

  // Vanity path: map /welcome -> hash-based public Welcome (no-auth)
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (window.location.hash && window.location.hash.startsWith('#/pages/WelcomePublic')) return;
    if (path === '/welcome') {
      const target = '/#/pages/WelcomePublic';
      if (window.location.href.indexOf(target) === -1) {
        window.location.replace(target);
      }
    }
  }, [location.pathname]);

  // Redirect unauthenticated visitors at root to the public Welcome page (preserve ?preview=1)
  // Do not override when a hash-based page is already specified; skip entirely in incognito
  useEffect(() => {
    const currentPath = location.pathname;
    const params = new URLSearchParams(window.location.search);
    const preview = params.get('preview');
    if (isIncognito) return; // never redirect in incognito
    if (window.location.hash && window.location.hash.startsWith('#/pages/')) {
      return; // respect hash router target to avoid loops
    }
    if (currentPath === '/' || currentPath === '/pages' || currentPath === '' || currentPath === '/pages/') {
      base44.auth.isAuthenticated().then((auth) => {
        if (!auth) {
          const url = new URL(createPageUrl('Welcome'), window.location.origin);
          if (preview === '1') url.searchParams.set('preview', '1');
          window.location.href = url.pathname + url.search;
        }
      }).catch(() => {
        const url = new URL(createPageUrl('Welcome'), window.location.origin);
        if (preview === '1') url.searchParams.set('preview', '1');
        window.location.href = url.pathname + url.search;
      });
    }
  }, [location.pathname, isIncognito]);

  const navigationItems = [
  // Weekly Schedule (Labor Cost) first
  { title: language === 'he' ? 'עלויות כח אדם' : 'Labor Cost', url: createPageUrl("LaborCost"), icon: Users, adminOnly: false, workerHidden: true },
  // Dashboard second
  { title: t('dashboard'), url: createPageUrl("Dashboard"), icon: BarChart2, adminOnly: false, workerHidden: true },
  { title: language === 'he' ? 'מכירות לפי שעה' : 'Sales per Hour', url: createPageUrl("SalesPerHour"), icon: BarChart2, adminOnly: false, workerHidden: true }
  // Then the rest
  { title: t('nav_orders'), url: createPageUrl("Orders"), icon: ShoppingCart, adminOnly: false, workerHidden: false },
  { title: t('nav_receipts'), url: createPageUrl("SupplyReceipts"), icon: PackageCheck, adminOnly: false, workerHidden: false },
  { title: t('nav_suppliers'), url: createPageUrl("Suppliers"), icon: Users, adminOnly: false, workerHidden: true },
  { title: t('nav_items'), url: createPageUrl("Items"), icon: Package, adminOnly: false, workerHidden: true },
  { title: t('warehouse_management'), url: createPageUrl("Warehouses"), icon: Warehouse, adminOnly: false, workerHidden: true },
  { title: t('nav_monthly_count'), url: createPageUrl("MonthlyCount"), icon: Warehouse, adminOnly: false, workerHidden: false },
  { title: language === 'he' ? 'דיווח בזבוז' : 'Waste', url: createPageUrl("WasteReports"), icon: TrendingDown, adminOnly: false, workerHidden: false },
  { title: language === 'he' ? 'רשימת משימות' : 'To-Do List', url: createPageUrl("ToDoList"), icon: ChefHat, adminOnly: false, workerHidden: false },
  { title: language === 'he' ? 'העברות מלאי' : 'Inventory Transfers', url: createPageUrl("InventoryTransfers"), icon: ArrowLeftRight, adminOnly: false, workerHidden: true },
  { title: language === 'he' ? 'משתמשי המסעדה' : 'Restaurant Users', url: createPageUrl("StoreUsers"), icon: Users, adminOnly: false, workerHidden: true },

  { title: t('user_profile'), url: createPageUrl("UserProfile"), icon: UserCircle, adminOnly: false, workerHidden: false },
  { title: (language === 'he' ? 'ניהול רשת' : 'Chain'), url: createPageUrl("ChainManagement"), icon: Warehouse, adminOnly: false, workerHidden: true },
  { title: t('nav_users'), url: createPageUrl("Users"), icon: Shield, adminOnly: true, workerHidden: true },
  { title: language === 'he' ? 'לוח בקרה אדמין' : 'Admin Dashboard', url: createPageUrl("AdminDashboard"), icon: Shield, adminOnly: true, workerHidden: true },
  { title: language === 'he' ? 'בדיקת הזמנות' : 'Test Invites', url: createPageUrl("TestInviteLinks"), icon: Shield, adminOnly: true, workerHidden: true },
  { title: language === 'he' ? 'תצוגת ברוך הבא (אינקוגניטו)' : 'Welcome Incognito', url: "/functions/welcomePublic", icon: Shield, adminOnly: true, workerHidden: true },
  { title: language === 'he' ? 'בודק קישורים' : 'Link Checker', url: createPageUrl("LinkChecker"), icon: Shield, adminOnly: true, workerHidden: true },
  { title: language === 'he' ? 'דף ברוך הבא (תצוגה)' : 'Welcome (Preview)', url: createPageUrl("Welcome"), icon: Shield, adminOnly: true, workerHidden: true }
  ];

  useEffect(() => {
    if (currentPageName !== 'OrderDetails' && currentPageName !== 'WorkerPortal' && currentPageName !== 'Register' && currentPageName !== 'RestaurantInvite' && currentPageName !== 'Welcome' && currentPageName !== 'PublicOrder') {
      loadAuth();
    } else {
      setAuthLoading(false);
    }
  }, [currentPageName]);
  
  useEffect(() => {
    document.documentElement.dir = language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const loadAuth = async (attemptNumber = 0) => {
        try {
          const fastBoot = (isPwaInstalled || isIOS || localStorage.getItem('b44_installed') === '1') && localStorage.getItem('b44_user_cache');
          if (!fastBoot) {
            setAuthLoading(true);
          }
          setError(null);
          setRetryCount(attemptNumber);

          // Add delay only for retries
          if (attemptNumber > 0) {
            const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }



          let currentUser = await base44.auth.me();

          setUser(currentUser);
                  try { localStorage.setItem('b44_user_cache', JSON.stringify(currentUser)); } catch {}
                  setError(null);
                  setRetryCount(0);

                  // Check if user is a store user (worker/manager) for someone else's store
                  // Always check StoreUser entity to verify they still have access
                  try {
                    const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: currentUser.email });
                    const activeRecords = storeUserRecords.filter(r => r.is_active === true);

                    if (activeRecords.length > 0) {
                        // Prefer the lowest privilege if multiple records exist: viewer < worker < manager
                        const effectiveRecord =
                          activeRecords.find(r => r.role === 'viewer') ||
                          activeRecords.find(r => r.role === 'worker') ||
                          activeRecords[0];

                        console.log('[Layout] Effective StoreUser record:', { role: effectiveRecord.role, owner: effectiveRecord.owner_email });
                        setStoreUserRole(effectiveRecord.role);
                        // Save store info to user context
                        await base44.auth.updateMe({
                          store_user_role: effectiveRecord.role,
                          store_user_owner_email: effectiveRecord.owner_email,
                          store_user_store_name: effectiveRecord.store_name,
                          store_user_read_only: effectiveRecord.role === 'viewer',
                          store_user_revoked: false
                        });
                        // Refresh local copy immediately so subsequent logic sees store-user context
                        currentUser = await base44.auth.me();
                        setUser(currentUser);
                        // For viewer/worker, ensure no standalone business context is set accidentally
                        if (effectiveRecord.role !== 'manager') {
                          if (currentUser.business_name || currentUser.chain_id) {
                            await base44.auth.updateMe({ business_name: null, chain_id: null, is_chain_head: false });
                            currentUser = await base44.auth.me();
                            setUser(currentUser);
                          }
                        }

                        } else if (storeUserRecords.length > 0 && storeUserRecords.every(r => !r.is_active)) {
                        // User has StoreUser records but all are inactive (access revoked)
                        console.log('[Layout] StoreUser records exist but all inactive - access revoked');
                        await base44.auth.updateMe({
                          store_user_role: null,
                          store_user_owner_email: null,
                          store_user_store_name: null,
                          store_user_read_only: false,
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
                      try {
                        if (currentUser?.store_user_role || currentUser?.store_user_read_only) {
                          await base44.auth.updateMe({
                            store_user_role: null,
                            store_user_owner_email: null,
                            store_user_store_name: null,
                            store_user_read_only: false
                          });
                          currentUser = await base44.auth.me();
                          setUser(currentUser);
                          setStoreUserRole(null);
                        }
                      } catch (e) {
                        console.log('[Layout] Cleanup store_user flags for owner failed:', e?.message || e);
                      }
                    }
                  } catch (storeUserError) {
                    console.error("[Layout] Error checking store user record:", storeUserError);
                  }

                  // One-time cleanup for user who requested worker removal
                  try {
                    if (currentUser?.email === 'nitsan.bennet@gmail.com') {
                      const flagKey = 'b44_removed_worker_' + currentUser.email;
                      if (!localStorage.getItem(flagKey)) {
                        const { data } = await base44.functions.invoke('removeStoreMembership', { userEmail: currentUser.email });
                        console.log('[Layout] removeStoreMembership result:', data);
                        localStorage.setItem(flagKey, '1');
                        // Refresh local user context
                        const refreshed = await base44.auth.me();
                        setUser(refreshed);
                        setStoreUserRole(null);
                      }
                    }
                  } catch (cleanupErr) {
                    console.log('[Layout] Cleanup worker membership failed:', cleanupErr?.message || cleanupErr);
                  }

                  // One-time cleanup of standalone data for sub-user (dankraicer)
                  try {
                    const allowedToClean = (currentUser?.role === 'admin') || (currentUser?.email === 'studioaka55@gmail.com');
                    const flagKey2 = 'b44_cleaned_user_dankraicer';
                    if (allowedToClean && !localStorage.getItem(flagKey2)) {
                      const { data } = await base44.functions.invoke('cleanUserStandaloneData', { targetEmail: 'dankraicer@gmail.com' });
                      console.log('[Layout] cleanUserStandaloneData result:', data);
                      localStorage.setItem(flagKey2, '1');
                    }
                  } catch (e) {
                    console.log('[Layout] cleanUserStandaloneData failed:', e?.message || e);
                  }

                  // Auto-attach chain context for branch managers on first login (service-role)
                  try {
                    if (!currentUser.chain_id) {
                      const { data } = await base44.functions.invoke('getChainContextForUser', {});
                      if (data?.success && data?.found) {
                        await base44.auth.updateMe({
                          chain_id: data.chain_id,
                          is_chain_head: !!data.is_head_store,
                          business_name: data.store_name
                        });
                        // Refresh local copy
                        currentUser = await base44.auth.me();
                        setUser(currentUser);
                      }
                    }
                  } catch (e) {
                    console.log('[Layout] Could not attach chain context:', e?.message || e);
                  }

                  const currentPath = location.pathname;
                  // Respect hash-based page targets (Welcome/WelcomePublic); also never redirect in incognito
                  if (isIncognito || (window.location.hash && (window.location.hash.startsWith('#/pages/Welcome') || window.location.hash.startsWith('#/pages/WelcomePublic')))) {
                    // do not override incognito/public welcome
                  } else if (currentPath === '/' || currentPath === '/pages' || currentPath === '' || currentPath === '/pages/') {
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
      
      if (isNetworkError && attemptNumber < 2) {
        console.log(`[Layout] Will retry authentication... (${attemptNumber + 1}/2)`);
        setTimeout(() => loadAuth(attemptNumber + 1), 2000);
        return;
      }
      
      // Redirect unauthenticated users to Welcome (access request page)
      const unauthorized = err?.response?.status === 401 || String(err?.message || '').toLowerCase().includes('unauthorized') || err?.code === 'AUTH_REQUIRED';
      if (unauthorized) {
        window.location.href = createPageUrl('Welcome');
        return;
      }
      
      console.error("[Layout] Max retries reached or non-network error");
      setError(err.message || "Failed to load app");
      setAuthLoading(false);
    }
  };

  const isWorker = (() => {
    // If viewing another restaurant (acting_as_store), respect that role
    if (user?.acting_as_store_email) {
      return (storeUserRole === 'worker' || user?.store_user_role === 'worker');
    }
    // If the user has no own business (pure store-user account), treat accordingly
    const hasOwnRestaurant = !!user?.business_name;
    if (!hasOwnRestaurant) {
      return (storeUserRole === 'worker' || user?.store_user_role === 'worker');
    }
    // Viewer should never be considered worker
    if (storeUserRole === 'viewer' || user?.store_user_role === 'viewer') {
      return false;
    }
    // Otherwise, user is in their own (owner/head) context → not a worker
    return false;
  })();
    const isAdminControllingUser = user?.admin_original_email && user?.acting_as_user_email;

    const isViewer = (!user?.is_chain_head) && (storeUserRole === 'viewer' || user?.store_user_role === 'viewer' || user?.store_user_read_only === true);

    useEffect(() => {
      if (!user) return;
      const viewer = (storeUserRole === 'viewer' || user?.store_user_role === 'viewer');
      if (!viewer) return;

      const handler = (e) => {
        const target = e.target;
        const el = target && target.closest && target.closest('button, [type="submit"]');
        if (!el) return;
        const txt = (el.innerText || el.textContent || '').toLowerCase();
        const blockedWords = language === 'he'
          ? ['הוסף','צור','ערוך','עדכן','שמור','מחק','הסר','שלח','ייבא','יבא','העלה','סרוק','הכן','קבל','חדש','פרסם','אשר','שנה','קלוט','ייצא','יצוא']
          : language === 'ar'
          ? ['إضافة','إنشاء','تعديل','تحديث','حفظ','حذف','إزالة','إرسال','استيراد','تحميل','مسح','تحضير','استلام','جديد','نشر','تأكيد']
          : ['add','create','edit','update','save','delete','remove','send','import','upload','scan','prepare','receive','new','publish','confirm'];
        const blocked = blockedWords.some(k => txt.includes(k));
        if (blocked) {
          e.preventDefault();
          e.stopPropagation();
          alert(language === 'he' ? 'מצב צפייה בלבד - אין לך הרשאות לשנות' : 'View-only mode: you do not have permission to make changes.');
        }
      };

      document.addEventListener('click', handler, true);
      return () => document.removeEventListener('click', handler, true);
    }, [user, storeUserRole, language]);



    // Re-check viewer role on route change (keeps role up-to-date after admin edits)
    useEffect(() => {
      if (!user) return;
      (async () => {
        try {
          const recs = await base44.entities.StoreUser.filter({ user_email: user.email });
          const active = recs.filter(r => r.is_active !== false);
          const effective =
            active.find(r => r.role === 'viewer') ||
            active.find(r => r.role === 'worker') ||
            active[0];
          setStoreUserRole(effective?.role || null);
          if (effective?.role === 'viewer') {
            await base44.auth.updateMe({ store_user_role: 'viewer', store_user_read_only: true });
          }
        } catch {}
      })();
    }, [location.pathname]);

              const visibleNavigationItems = navigationItems.filter(item => {
                // Admin-only items
                if (item.adminOnly && user?.role !== 'admin') return false;
                // Viewers can see all non-admin pages
                if (isViewer) return true;
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

  if (currentPageName === 'WorkerPortal' || currentPageName === 'OrderDetails' || currentPageName === 'Register' || currentPageName === 'RestaurantInvite' || currentPageName === 'Welcome' || currentPageName === 'WelcomePublic' || currentPageName === 'PublicOrder') {
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
  if ((storeUserRole === 'viewer' || user?.store_user_role === 'viewer') && !user?.store_user_read_only) {
    // Ensure read-only flag is set if user is viewer (redundant safety)
    base44.auth.updateMe({ store_user_read_only: true });
  }

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

          {isViewer && (
            <div className="bg-amber-50 text-amber-800 px-4 py-2 flex items-center justify-between sticky top-0 z-40 border-b border-amber-200">
              <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                <span className="font-semibold">{language === 'he' ? 'מצב צפייה בלבד' : 'View-only access'}</span>
                <span className="text-amber-700 ml-2 rtl:mr-2 rtl:ml-0">{language === 'he' ? 'ניתן לצפות בכל הדפים אך לא לבצע שינויים' : 'You can view all pages but cannot make changes.'}</span>
              </div>
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
                          <span className="text-sm font-bold text-black tracking-wide">SIMPLE</span>
                        </div>
                        <div style={{ width: '40px' }}></div>
                      </header>

      <div className="flex">
        <aside data-viewer={isViewer ? '1' : '0'} className={`z-50 bg-white border-${isRTL ? 'l' : 'r'} border-gray-200 h-screen w-52 sm:w-56 md:w-64 lg:w-72 transition-transform duration-300 ${sidebarOpen ? `fixed top-0 ${isRTL ? 'right-0' : 'left-0'} translate-x-0 flex flex-col` : 'hidden'} md:sticky md:top-0 md:flex md:flex-col`}>
          <div className="p-4 border-b border-gray-200 hidden md:flex md:flex-row md:items-center md:justify-between">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowDesktopSidebar(false)}
                              className="hidden md:flex h-8 w-8 hover:bg-gray-100 rounded-lg"
                              title={language === 'he' ? 'הסתר תפריט' : 'Hide menu'}
                            >
                              {isRTL ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                            </Button>
                            <div className={`flex flex-col items-center justify-center flex-1 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
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
                              <span className="text-lg font-bold text-black mt-2 tracking-wide">SIMPLE</span>
                            </div>
                            <div className="w-8"></div>
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

          {!isPwaInstalled && (
            <div className="p-4 border-b border-gray-200">
              {installPromptEvent ? (
                <Button
                  variant="outline"
                  onClick={handlePwaInstall}
                  className={`w-full flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {language === 'he' ? 'התקן אפליקציה' : 'Install App'}
                </Button>
              ) : (
                isIOS && (
                  <Button
                    variant="outline"
                    onClick={() => setShowIosGuide(true)}
                    className={`w-full flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Share className="w-4 h-4" />
                    {language === 'he' ? 'הוסף למסך הבית' : 'Add to Home Screen'}
                  </Button>
                )
              )}
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="p-4 border-b border-gray-200">
              <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} gap-2`}>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const url = `${window.location.origin}/functions/welcomePublic`;
                    navigator.clipboard.writeText(url);
                    alert(language === 'he' ? 'קישור ציבורי הועתק' : 'Public link copied');
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {language === 'he' ? 'העתק קישור ציבורי' : 'Copy public link'}
                </Button>
                <a href="/functions/welcomePublic" target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {language === 'he' ? 'פתח דף ציבורי' : 'Open public page'}
                  </Button>
                </a>
              </div>
            </div>
          )}

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
                      location.pathname === item.url || location.pathname.includes(item.url.split('/').pop()) ? 'bg-gray-900 text-white font-bold' : 'text-gray-900 hover:bg-gray-100'
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
            className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden touch-none" 
            onClick={() => setSidebarOpen(false)}
            onTouchStart={() => setSidebarOpen(false)}
          />
        )}

        {/* Desktop Sidebar Toggle Button */}
        {!showDesktopSidebar && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDesktopSidebar(true)}
            className={`hidden md:flex fixed ${isRTL ? 'right-4' : 'left-4'} top-4 z-30 shadow-lg bg-white hover:bg-gray-50`}
          >
            <Menu className="h-4 w-4 mr-2" />
            {language === 'he' ? 'תפריט' : 'Menu'}
          </Button>
        )}

        <main className="flex-1 min-w-0 w-full overflow-x-hidden">
            {showWorkerInvite && (
              <div className="p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                  <WorkerInvite onClose={() => setShowWorkerInvite(false)} />
                </div>
              </div>
            )}
            <div className={`${showDesktopSidebar ? '' : 'sidebar-hidden'} ${isViewer ? 'viewer-readonly' : ''}`}>
              {children}
            </div>
            <style>{`
              .sidebar-hidden > * {
                padding-left: 0 !important;
                padding-right: 0 !important;
              }
              /* Viewer read-only hard guard: disables interactive controls within page content */
              .viewer-readonly button,
              .viewer-readonly [type="submit"],
              .viewer-readonly input,
              .viewer-readonly select,
              .viewer-readonly textarea,
              .viewer-readonly [role="switch"],
              .viewer-readonly [role="button"] {
                pointer-events: none !important;
                opacity: 0.6 !important;
                cursor: not-allowed !important;
              }
              .viewer-readonly .ql-toolbar,
              .viewer-readonly .ql-editor {
                pointer-events: none !important;
              }

            `}</style>
        </main>

        {/* Global Help Chat - except on Suppliers and AdminDashboard which have their own */}
                      {currentPageName !== 'Suppliers' && currentPageName !== 'AdminDashboard' && (
                        <AppHelpChat currentPage={currentPageName} />
                      )}

                      {/* Offline notification for data-sensitive pages */}
                      <OfflineNotification pageName={currentPageName} />

                      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>{language === 'he' ? 'הוספת האפליקציה למסך הבית' : 'Add the app to your Home Screen'}</DialogTitle>
                            <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                              {language === 'he' ? 'באייפון/iPad אין כפתור התקנה אוטומטי. עקבו אחרי השלבים:' : 'On iPhone/iPad there is no automatic install prompt. Follow these steps:'}
                            </DialogDescription>
                          </DialogHeader>
                          <div className={`space-y-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="flex items-center gap-3">
                              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a006cfeba8053be10f189/b1f6773e1_IMG_0299.png" alt="App Icon" className="h-10 w-10 rounded-lg border" />
                              <span className="text-gray-600">{language === 'he' ? 'האייקון שיופיע במסך הבית' : 'This is the icon that will appear on your home screen.'}</span>
                            </div>
                            <ol className="list-decimal ml-5 space-y-2 rtl:mr-5 rtl:ml-0">
                              <li>{language === 'he' ? 'לחצו על כפתור השיתוף בספארי (ריבוע עם חץ למעלה).' : 'Tap the Share button in Safari (square with an up arrow).'}</li>
                              <li>{language === 'he' ? 'גללו ובחרו "הוסף למסך הבית".' : 'Scroll and choose "Add to Home Screen".'}</li>
                              <li>{language === 'he' ? 'אשרו עם "הוסף".' : 'Confirm by tapping "Add".'}</li>
                            </ol>
                          </div>
                        </DialogContent>
                      </Dialog>

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