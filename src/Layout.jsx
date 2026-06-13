import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { createPageUrl } from "@/utils";
import { Users, Package, ShoppingCart, Warehouse, Menu, BarChart2, TrendingDown, UserCircle, PackageCheck, Shield, AlertCircle, MessageCircle, TrendingUp, DollarSign, Search, X, ChevronLeft, ChevronRight, ArrowLeftRight, Video, Share, Sun, Moon, ChefHat, BarChart3, Calculator, UserCog } from "lucide-react";
import { base44 } from "@/api/base44Client";
import UserSwitcher from "./components/UserSwitcher";
import { LanguageProvider, useLanguage } from "./components/LanguageProvider";
import LanguageSwitcher from "./components/LanguageSwitcher";
import WorkerInvite from "./components/WorkerInvite";
import OnboardingModal from "./components/onboarding/OnboardingModal";
import BusinessSetupWizard from "./components/onboarding/BusinessSetupWizard";
import OfflineNotification from "./components/OfflineNotification";
import AppHelpChat from "./components/AppHelpChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RefreshCw, WifiOff, Copy, ExternalLink } from "lucide-react";

const AppLayout = ({ children, currentPageName }) => {
const location = useLocation();
const [sidebarOpen, setSidebarOpen] = useState(false);
const [showDesktopSidebar, setShowDesktopSidebar] = useState(true);
const [user, setUser] = useState(null);
const [authLoading, setAuthLoading] = useState(() => {
  const isPublic = (
    currentPageName === 'OrderDetails' ||
    currentPageName === 'WorkerPortal' ||
    currentPageName === 'Register' ||
    currentPageName === 'RestaurantInvite' ||
    currentPageName === 'PublicOrder' ||
    currentPageName === 'OAuthCallback' ||
    currentPageName === 'Diagnostics' ||
    currentPageName === 'LoginHelper' ||
    currentPageName === 'AuthKick'
  );
    let hasCache = false;
    try { hasCache = !!localStorage.getItem('b44_user_cache') && !sessionStorage.getItem('b44_logout_in_progress'); } catch {}
    return !isPublic || hasCache;
  });
  const [showWorkerInvite, setShowWorkerInvite] = useState(false);
  const [error, setError] = useState(null);
      const [retryCount, setRetryCount] = useState(0);
      const [storeUserRole, setStoreUserRole] = useState(null); // null = owner, 'manager', or 'worker'
      const { t, language } = useLanguage();
  const [navSearchTerm, setNavSearchTerm] = useState("");
  const [isIncognito, setIsIncognito] = useState(false);
  const [customNavOrder, setCustomNavOrder] = useState([]);

  useEffect(() => {
    if (user?.id) {
      try {
        const saved = localStorage.getItem(`b44_nav_order_${user.id}`);
        if (saved) {
          setCustomNavOrder(JSON.parse(saved));
        }
      } catch(e) {}
    }
  }, [user?.id]);
  // PWA install (global)
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);
  const hasLoadedAuth = useRef(false);
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

  // Fast boot: hydrate user from cache, but keep authLoading true until verified to avoid 403 storms
  useEffect(() => {
    if (user) return;
    try {
      const s = localStorage.getItem('b44_user_cache');
      if (s) {
        const cached = JSON.parse(s);
        setUser(cached);
        // Do NOT setAuthLoading(false) here; wait for loadAuth() to validate session
      }
    } catch {}
  }, []);

  const handlePwaInstall = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    try { await installPromptEvent.userChoice; } finally { setInstallPromptEvent(null); }
  };







  // APK/WebView guard: if spinner lasts too long, fail open to public page (prevents stuck state)
  useEffect(() => {
  const p = new URLSearchParams(window.location.search);
  if (p.get('preview') === '1') return;
  if (!authLoading || user || localStorage.getItem('b44_user_cache')) return;
  const timer = setTimeout(() => {
  try {
    if (authLoading && !user) {
      sessionStorage.setItem('b44_login_cooldown_until', String(Date.now() + 2 * 60 * 1000));
      window.location.href = "/app-login" + window.location.search;
    }
  } catch {}
  }, 8000);
  return () => clearTimeout(timer);
  }, [authLoading, user]);

  const navigationItems = [
          { title: language === 'he' ? 'לוח בקרה אדמין' : 'Admin Dashboard', url: createPageUrl("AdminDashboard"), icon: Shield, adminOnly: true, workerHidden: true },
          { title: language === 'he' ? 'מתכונים' : 'Recipes', url: createPageUrl("Recipes"), icon: ChefHat, adminOnly: false, workerHidden: false },
          // Dashboard first
          { title: t('dashboard'), url: createPageUrl("Dashboard"), icon: BarChart2, adminOnly: false, workerHidden: true },
          ...(user?.is_chain_head && user?.chain_id ? [{ title: language === 'he' ? 'דשבורד רשת' : 'Chain Dashboard', url: createPageUrl("ChainDashboard"), icon: BarChart2, adminOnly: false, workerHidden: false }] : []),
          // Core pages
          { title: t('nav_orders'), url: createPageUrl("Orders"), icon: ShoppingCart, adminOnly: false, workerHidden: false },
          { title: language === 'he' ? 'משרד אחורי' : 'Back Office', url: createPageUrl("SupplyReceipts"), icon: PackageCheck, adminOnly: false, workerHidden: false },
          { title: t('nav_suppliers'), url: createPageUrl("Suppliers"), icon: Users, adminOnly: false, workerHidden: false },
          // The rest
          { title: t('nav_items'), url: createPageUrl("Items"), icon: Package, adminOnly: false, workerHidden: true },
          { title: t('warehouse_management'), url: createPageUrl("Warehouses"), icon: Warehouse, adminOnly: false, workerHidden: true },
          { title: t('nav_monthly_count'), url: createPageUrl("MonthlyCount"), icon: Warehouse, adminOnly: false, workerHidden: false },
          { title: language === 'he' ? 'דוחות COGS' : 'COGS Reports', url: createPageUrl("CogsReports"), icon: BarChart3, adminOnly: false, workerHidden: true },
          { title: language === 'he' ? 'היסטוריית מחירים' : 'Price Changes', url: createPageUrl("PriceChanges"), icon: TrendingUp, adminOnly: false, workerHidden: true },
          { title: language === 'he' ? 'דיווח זריקות' : 'Waste', url: createPageUrl("WasteReports"), icon: TrendingDown, adminOnly: false, workerHidden: true },
          { title: language === 'he' ? 'מחשבון הנדסת תפריט' : 'Menu Engineering Calculator', url: createPageUrl("MenuEngineering"), icon: Calculator, adminOnly: false, workerHidden: true },
          { title: language === 'he' ? 'העברות מלאי' : 'Inventory Transfers', url: createPageUrl("InventoryTransfers"), icon: ArrowLeftRight, adminOnly: false, workerHidden: true },
          { title: language === 'he' ? 'פורטל עובדים' : 'Worker Portal', url: createPageUrl("StoreUsers"), icon: Users, adminOnly: false, workerHidden: true },
          { title: language === 'he' ? 'סידור עבודה' : 'Weekly Schedule', url: createPageUrl("LaborCost"), icon: Users, adminOnly: false, workerHidden: true },

          { title: t('user_profile'), url: createPageUrl("UserProfile"), icon: UserCircle, adminOnly: false, workerHidden: false },
          // Hidden diagnostics (not shown in nav), access via /#/pages/Diagnostics
          { title: language === 'he' ? 'תמיכה' : 'Support', url: createPageUrl("Support"), icon: MessageCircle, adminOnly: false, workerHidden: false },
          { title: language === 'he' ? 'מדיה לתמיכה' : 'KB Media', url: createPageUrl("KBMedia"), icon: Video, adminOnly: true, workerHidden: true },
          { title: language === 'he' ? 'תצוגת התחברות' : 'Login Preview', url: createPageUrl("PromoPreview"), icon: Video, adminOnly: true, workerHidden: true },
          { title: (language === 'he' ? 'מנהלים' : 'Managers'), url: createPageUrl("ManagersSection"), icon: UserCog, adminOnly: false, workerHidden: true },
          { title: t('nav_users'), url: createPageUrl("Users"), icon: Shield, adminOnly: true, workerHidden: true },
          { title: language === 'he' ? 'בדיקת הזמנות' : 'Test Invites', url: createPageUrl("TestInviteLinks"), icon: Shield, adminOnly: true, workerHidden: true },
          { title: language === 'he' ? 'בודק קישורים' : 'Link Checker', url: createPageUrl("LinkChecker"), icon: Shield, adminOnly: true, workerHidden: true },
          { title: language === 'he' ? 'אסטרטגיית אינסטגרם' : 'IG Strategy', url: createPageUrl("InstagramBlueprint"), icon: Share, adminOnly: true, workerHidden: true },
          { title: language === 'he' ? 'סטורי יוונית' : 'Greek Story', url: createPageUrl("InstagramStoryGreek"), icon: Share, adminOnly: true, workerHidden: true },
          { title: language === 'he' ? 'קישורי פרומו VIP' : 'VIP Promo Links', url: createPageUrl("PromoLinks"), icon: Shield, adminOnly: true, workerHidden: true }
          ];

  useEffect(() => {
    if (
      currentPageName !== 'OrderDetails' &&
      currentPageName !== 'WorkerPortal' &&
      currentPageName !== 'Register' &&
      currentPageName !== 'RestaurantInvite' &&
      currentPageName !== 'PublicOrder' &&
      currentPageName !== 'OAuthCallback' &&
      currentPageName !== 'LoginHelper' &&
      currentPageName !== 'AuthKick'
    ) {
      if (!hasLoadedAuth.current) {
        hasLoadedAuth.current = true;
        loadAuth();
      }
    } else {
      setAuthLoading(false);
    }
  }, [currentPageName]);



  // Consolidated OAuth return stabilizer (older Android/Chrome safe)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const oauthBack = params.has('code') || params.has('state');
      // Avoid double-handling: or if we're already on OAuthCallback
      if (!oauthBack) return;
      if ((location.pathname || '').includes('OAuthCallback')) return;
      if (sessionStorage.getItem('b44_oauth_in_progress') === '1') return;
      if (sessionStorage.getItem('b44_oauth_finalized') === '1') return;

      const forceHash = localStorage.getItem('b44_emulate_force_hash') === '1';
      const disableHistory = localStorage.getItem('b44_emulate_disable_history') === '1';
      sessionStorage.setItem('b44_oauth_in_progress', '1');
      sessionStorage.setItem('b44_oauth_finalized', '1');

      (async () => {
        try {
          // Retry auth a few times (slow WebViews)
          for (let i = 0; i < 5; i++) {
            const authed = await base44.auth.isAuthenticated();
            if (authed) break;
            await new Promise(r => setTimeout(r, 400 * Math.pow(1.5, i)));
          }
        } catch {}
        if (!disableHistory) { try { window.history.replaceState({}, '', location.pathname); } catch {} }
        const target = forceHash ? ('/#/pages/OAuthCallback' + window.location.search) : (createPageUrl('OAuthCallback') + window.location.search);
        // Primary redirect to lightweight OAuth finalizer page (use replace to avoid history loop)
        window.location.replace(target);
        // Hash fallback for older WebViews/Chrome when not forcing already
        if (!forceHash) {
          setTimeout(() => {
            if (!(location.pathname || '').includes('OAuthCallback')) {
              window.location.replace('/#/pages/OAuthCallback' + window.location.search);
            }
          }, 1200);
        }
        // Clear flags after a short grace period
        setTimeout(() => { try { sessionStorage.removeItem('b44_oauth_in_progress'); } catch {} }, 4000);
        setTimeout(() => { try { sessionStorage.removeItem('b44_oauth_finalized'); } catch {} }, 15000);
      })();
    } catch {}
  }, [location.search, currentPageName]);

        // Post-login fallback (WebView/APK) – ensure we land on Dashboard after OAuth
        useEffect(() => {
          try {
            const params = new URLSearchParams(window.location.search);
            const oauthBack = params.has('code') || params.has('state');
            const hasHashTarget = window.location.hash && window.location.hash.startsWith('#/pages/');
            if (hasHashTarget) return;
            if (sessionStorage.getItem('b44_oauth_in_progress') === '1') return;
            (async () => {
              try {
                const authed = await base44.auth.isAuthenticated();
                const atRoot = location.pathname === '/' || location.pathname === '' || location.pathname === '/pages' || location.pathname === '/pages/';
                if (authed && oauthBack) {
                  try { window.history.replaceState({}, '', createPageUrl('Orders')); } catch {}
                  window.location.replace(createPageUrl('Orders'));
                }
              } catch {}
            })();
          } catch {}
        }, [location.pathname, location.search]);
  
  useEffect(() => {
            document.documentElement.dir = language?.startsWith('he') || language?.startsWith('ar') ? 'rtl' : 'ltr';
            document.documentElement.lang = language;
          }, [language]);

  // Restrict horizontal scroll only on specific pages
  useEffect(() => {
    if (currentPageName === 'Orders' || currentPageName === 'SupplyReceipts') {
      document.documentElement.classList.add('no-horizontal-scroll');
    } else {
      document.documentElement.classList.remove('no-horizontal-scroll');
    }
  }, [currentPageName]);



          // Enable lite mode for low-memory devices or very old Chrome versions
          useEffect(() => {
            try {
              let lite = false;
              const dm = (navigator && 'deviceMemory' in navigator) ? navigator.deviceMemory : null;
              if (typeof dm === 'number' && dm <= 2) lite = true; // ≤2GB RAM
              const m = (navigator.userAgent || '').match(/Chrome\/(\d+)/);
              if (m && parseInt(m[1], 10) < 90) lite = true; // old Chrome
              if (localStorage.getItem('b44_emulate_force_lite') === '1') lite = true; // Admin emulator flag
              if (lite) document.documentElement.classList.add('lite');
            } catch {}
          }, []);

  const loadAuth = async (attemptNumber = 0) => {
        try {
          const fastBoot = !!localStorage.getItem('b44_user_cache');
          if (!fastBoot && !user) {
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
                  try { sessionStorage.removeItem('b44_logout_in_progress'); } catch {}
                  try { sessionStorage.removeItem('b44_login_redirect'); sessionStorage.removeItem('b44_login_cooldown_until'); localStorage.removeItem('b44_login_cooldown_until'); } catch {}
                  try { localStorage.setItem('b44_user_cache', JSON.stringify(currentUser)); } catch {}
                  setError(null);
                  setRetryCount(0);
                  
                  setAuthLoading(false);

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

                    // For managers: set acting_as_store_email so all entity queries transparently
                    // scope to the owner's data (same mechanism as admin impersonation)
                    const isManagerRole = effectiveRecord.role === 'manager';
                    const updatePayload = {
                      store_user_role: effectiveRecord.role,
                      store_user_owner_email: effectiveRecord.owner_email,
                      store_user_store_name: effectiveRecord.store_name,
                      store_user_read_only: effectiveRecord.role === 'viewer',
                      store_user_revoked: false,
                    };
                    if (isManagerRole) {
                      updatePayload.acting_as_store_email = effectiveRecord.owner_email;
                      updatePayload.acting_as_store_name = effectiveRecord.store_name || '';
                    }

                    // Save store info to user context
                    await base44.auth.updateMe(updatePayload);
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

                  // We no longer check for Welcome page.
      
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
      
      // Redirect unauthenticated users
      const unauthorized = err?.response?.status === 401 || String(err?.message || '').toLowerCase().includes('unauthorized') || err?.code === 'AUTH_REQUIRED' || err?.response?.status === 403 || String(err?.message || '').toLowerCase().includes('logged in');
      if (unauthorized) {
        // If it's a public route, don't redirect
        const isPublic = [
          'OrderDetails', 'WorkerPortal', 'Register', 'RestaurantInvite',
          'PublicOrder', 'OAuthCallback', 'Diagnostics', 'LoginHelper', 'AuthKick'
        ].includes(currentPageName);
        
        if (isPublic) {
          setAuthLoading(false);
          return;
        }

        if (sessionStorage.getItem('b44_logout_in_progress') === '1') {
          setAuthLoading(false);
          try { sessionStorage.setItem('b44_login_cooldown_until', String(Date.now() + 60 * 1000)); } catch {}
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('code');
          cleanUrl.searchParams.delete('state');
          window.location.href = "/app-login" + window.location.search;
          return;
        }
        if (!user) setAuthLoading(false);
        let cooldownUntil = 0;
        try { cooldownUntil = Number(sessionStorage.getItem('b44_login_cooldown_until') || localStorage.getItem('b44_login_cooldown_until') || '0'); } catch {}
        const inCooldown = cooldownUntil > Date.now();
        const params = new URLSearchParams(window.location.search);
        const oauthBack = params.has('code') || params.has('state');
        if (attemptNumber < 2 || (inCooldown && attemptNumber < 4) || (oauthBack && attemptNumber < 5)) {
          setTimeout(() => loadAuth(attemptNumber + 1), 1200);
          return;
        }
        
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('code');
        cleanUrl.searchParams.delete('state');
        base44.auth.redirectToLogin(cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
        return;
      }
      
      console.error("[Layout] Max retries reached or non-network error");
      // Just redirect to login on ANY error if they don't have a user instead of showing "Connection error"
      if (!user && !localStorage.getItem('b44_user_cache')) {
         window.location.href = "/app-login" + window.location.search;
         return;
      }
      setError(err.message || "Failed to load app");
      setAuthLoading(false);
    }
  };

  const isWorker = (() => {
    const effectiveRole = storeUserRole || user?.store_user_role;
    // Only actual 'worker' role gets restricted nav — managers and owners see everything
    return effectiveRole === 'worker';
  })();
    const isAdminControllingUser = user?.admin_original_email && user?.acting_as_user_email;

    // Determine if the current page is allowed for workers to edit
    const isWorkerAllowedPage = 
      currentPageName === 'Orders' || 
      currentPageName === 'SupplyReceipts' || 
      currentPageName === 'MonthlyCount' ||
      currentPageName === 'Suppliers' ||
      currentPageName === 'Items' ||
      currentPageName === 'Warehouses';

    // Only the explicit 'viewer' role is read-only — workers and managers can do everything
    const isViewer = (!user?.is_chain_head) && (
      storeUserRole === 'viewer' || 
      user?.store_user_role === 'viewer'
    );

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
    // Throttle + run in idle time to avoid slowing navigation
    useEffect(() => {
      if (!user) return;
      const run = () => {
        try {
          const last = Number(sessionStorage.getItem('b44_role_check_ts') || '0');
          if (Date.now() - last < 180000) return; // skip if checked in last 3 minutes
          (async () => {
            try {
              const recs = await base44.entities.StoreUser.filter({ user_email: user.email });
              const active = recs.filter(r => r.is_active !== false);
              const effective = active.find(r => r.role === 'viewer') || active.find(r => r.role === 'worker') || active[0];
              setStoreUserRole(effective?.role || null);
              if (effective?.role === 'viewer') {
                await base44.auth.updateMe({ store_user_role: 'viewer', store_user_read_only: true });
              }
              sessionStorage.setItem('b44_role_check_ts', String(Date.now()));
            } catch {}
          })();
        } catch {}
      };
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        // @ts-ignore
        window.requestIdleCallback(run, { timeout: 1500 });
      } else {
        setTimeout(run, 600);
      }
    }, [location.pathname, user?.email]);

              const visibleNavigationItems = navigationItems.filter(item => {
                                    // Hide admin-only items from the sidebar unless the user is an admin
                                    if (item.adminOnly && user?.role !== 'admin') return false;
                                    // Hide additional admin-related pages not flagged as adminOnly
                                    const hideByUrl = (item.url || '').includes('ChainManagement');
                                    if (hideByUrl) return false;
                                    // Viewers can see all non-admin pages
                                    if (isViewer) return true;
                                    // Worker-hidden items
                                    if (item.workerHidden && isWorker) return false;
                                    return true;
                                  });

  const filteredNavigationItems = visibleNavigationItems.filter(item =>
    item.title.toLowerCase().includes(navSearchTerm.toLowerCase())
  );

  const orderedNavigationItems = React.useMemo(() => {
    let items = [...filteredNavigationItems];
    if (customNavOrder && customNavOrder.length > 0) {
      items.sort((a, b) => {
        const idxA = customNavOrder.indexOf(a.url);
        const idxB = customNavOrder.indexOf(b.url);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
    return items;
  }, [filteredNavigationItems, customNavOrder]);

  const handleNavDragEnd = (result) => {
    if (!result.destination) return;
    
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    
    const newItems = Array.from(orderedNavigationItems);
    const [removed] = newItems.splice(startIndex, 1);
    newItems.splice(endIndex, 0, removed);
    
    let currentFullOrder = customNavOrder.length > 0 ? [...customNavOrder] : navigationItems.map(i => i.url);
    currentFullOrder = currentFullOrder.filter(url => url !== removed.url);
    
    if (endIndex === 0) {
      currentFullOrder.unshift(removed.url);
    } else {
      const itemBefore = newItems[endIndex - 1];
      const idxBeforeInFull = currentFullOrder.indexOf(itemBefore.url);
      if (idxBeforeInFull !== -1) {
        currentFullOrder.splice(idxBeforeInFull + 1, 0, removed.url);
      } else {
        currentFullOrder.push(removed.url);
      }
    }
    
    setCustomNavOrder(currentFullOrder);
    if (user?.id) {
      try {
        localStorage.setItem(`b44_nav_order_${user.id}`, JSON.stringify(currentFullOrder));
      } catch(e) {}
    }
  };

    const exitAdminControl = async () => {
      try {
        await base44.auth.updateMe({
          admin_original_email: null,
          acting_as_user_email: null,
          acting_as_user_name: null,
          acting_as_store_email: null,
          acting_as_store_name: null
        });
        
        // Clear caches to prevent showing impersonated user's data
        Object.keys(localStorage).forEach(key => {
          if (key.endsWith('_v1') || key.endsWith('_v2')) {
            localStorage.removeItem(key);
          }
        });
        
        window.location.href = createPageUrl('AdminDashboard');
      } catch (error) {
        console.error("Error exiting admin control:", error);
      }
    };

  const isRTL = language === 'he' || language === 'ar';

  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = urlParams.get('preview') === '1';
  if (
  currentPageName === 'WorkerPortal' ||
  currentPageName === 'ManagerPortal' ||
  currentPageName === 'OrderDetails' ||
    currentPageName === 'Register' ||
    currentPageName === 'RestaurantInvite' ||
    currentPageName === 'PublicOrder' ||
    currentPageName === 'OAuthCallback' ||
    currentPageName === 'Diagnostics' ||
    currentPageName === 'LoginHelper' ||
    currentPageName === 'AuthKick'
  ) {
    return <>{children}</>;
  }


  
  const __previewParams = new URLSearchParams(window.location.search);
  if (__previewParams.get('preview') === '1') {
    return <>{children}</>;
  }
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
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
                  try {
                    sessionStorage.setItem('b44_logout_in_progress', '1');
                    localStorage.removeItem('b44_user_cache');
                    sessionStorage.removeItem('b44_oauth_in_progress');
                    sessionStorage.removeItem('b44_oauth_finalized');
                    sessionStorage.setItem('b44_login_cooldown_until', String(Date.now() + 60 * 1000));
                  } catch {}
                  try { await base44.auth.logout('/#/pages/Orders'); } catch {}
                  setTimeout(() => { window.location.replace('/#/pages/Orders'); }, 300);
                }} 
                className="w-full bg-[#d4a373] hover:bg-[#b88c60]"
              >
                {language === 'he' ? 'התנתק' : 'Logout'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !user && !localStorage.getItem('b44_user_cache')) {
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
              <ul className={'list-disc space-y-1 ' + (isRTL ? 'list-inside mr-4' : 'list-inside ml-4')}>
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
              className="w-full bg-[#d4a373] hover:bg-[#b88c60]"
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
        <div className="min-h-screen bg-gray-50 dark:bg-[#050a1a]">
          {/* Admin Control Banner */}
          {isAdminControllingUser && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 sticky top-0 z-40 text-center sm:text-left">
              <div className={'flex flex-wrap items-center justify-center sm:justify-start gap-1 ' + (isRTL ? 'sm:flex-row-reverse' : '')}>
                <span className="text-base sm:text-lg">🎮</span>
                <span className="font-bold text-sm sm:text-base">
                  {language === 'he' ? 'שולט כעת ב:' : 'Controlling:'} {user.acting_as_user_name}
                </span>
                <span className="text-purple-200 text-xs sm:text-sm break-all">({user.acting_as_user_email})</span>
              </div>
              <button
                onClick={exitAdminControl}
                className="bg-white text-purple-700 px-3 py-1 rounded-lg font-bold text-sm hover:bg-purple-100 transition-colors whitespace-nowrap shrink-0"
              >
                {language === 'he' ? '🔙 חזור' : '🔙 Back'}
              </button>
            </div>
          )}

          {isViewer && (
            <div className="bg-amber-50 text-amber-800 px-4 py-2 flex items-center justify-between sticky top-0 z-40 border-b border-amber-200">
              <div className={'text-sm ' + (isRTL ? 'text-right' : 'text-left')}>
                <span className="font-semibold">{language === 'he' ? 'מצב צפייה בלבד' : 'View-only access'}</span>
                <span className="text-amber-700 ml-2 rtl:mr-2 rtl:ml-0">{language === 'he' ? 'ניתן לצפות בכל הדפים אך לא לבצע שינויים' : 'You can view all pages but cannot make changes.'}</span>
              </div>
            </div>
          )}
          <header className={'bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between md:hidden sticky ' + (isAdminControllingUser ? 'top-10' : 'top-0') + ' z-30 ' + (isRTL ? 'flex-row-reverse' : '')} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                        <button 
                          onClick={() => setSidebarOpen(!sidebarOpen)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                        >
                          <Menu className="w-5 h-5 text-gray-900" />
                        </button>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2">
                            {user?.restaurant_logo ? (
                              <img 
                                src={user.restaurant_logo} 
                                alt="Restaurant Logo"
                                className="max-h-10 sm:max-h-12 w-auto max-w-[200px] object-contain rounded-lg"
                              />
                            ) : (
                              <div className="text-lg font-bold text-black dark:text-white tracking-wide">{user?.business_name || user?.store_user_store_name || 'System'}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {typeof window !== 'undefined' && window.history.length > 1 ? (
                            <button 
                              onClick={() => window.history.back()}
                              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                              title={language === 'he' ? 'חזרה' : 'Back'}
                            >
                              {isRTL ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                            </button>
                          ) : (
                            <div style={{ width: '40px' }}></div>
                          )}
                        </div>
                      </header>

      <div className="flex">
        <aside data-viewer={isViewer ? '1' : '0'} className={'z-50 bg-gray-100 dark:bg-[#0b1530] ' + (isRTL ? 'border-l' : 'border-r') + ' border-gray-200 dark:border-[#1e2a55] h-screen w-52 sm:w-56 md:w-64 lg:w-72 transition-transform duration-300 ' + (sidebarOpen ? (isRTL ? 'fixed top-0 right-0 translate-x-0 flex flex-col' : 'fixed top-0 left-0 translate-x-0 flex flex-col') : 'hidden') + ' md:sticky md:top-0 ' + (showDesktopSidebar ? 'md:flex md:flex-col' : 'md:hidden')}>
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
                            <div className={'flex flex-col items-center justify-center flex-1 ' + (isRTL ? 'flex-row-reverse text-right' : 'text-left')}>
                              <div className="flex items-center gap-3">
                                {user?.restaurant_logo ? (
                                  <img 
                                    src={user.restaurant_logo} 
                                    alt="Restaurant Logo"
                                    className="max-h-14 w-auto max-w-[200px] object-contain rounded-lg"
                                  />
                                ) : (
                                  <span className="text-xl font-bold text-black dark:text-white tracking-wide">{user?.business_name || user?.store_user_store_name || 'System'}</span>
                                )}
                              </div>
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
                  className={'w-full flex items-center justify-center gap-2 ' + (isRTL ? 'flex-row-reverse' : '')}
                                    >
                  {language === 'he' ? 'התקן אפליקציה' : 'Install App'}
                </Button>
              ) : (
                isIOS && (
                  <Button
                    variant="outline"
                    onClick={() => setShowIosGuide(true)}
                    className={'w-full flex items-center justify-center gap-2 ' + (isRTL ? 'flex-row-reverse' : '')}
                  >
                    <Share className="w-4 h-4" />
                    {language === 'he' ? 'הוסף למסך הבית' : 'Add to Home Screen'}
                  </Button>
                )
              )}
            </div>
          )}


          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className={'absolute top-2.5 ' + (isRTL ? 'right-3' : 'left-3') + ' h-4 w-4 text-gray-400'} />
              <Input
                type="text"
                placeholder={language === 'he' ? 'חפש דף...' : 'Search page...'}
                value={navSearchTerm}
                onChange={(e) => setNavSearchTerm(e.target.value)}
                className={'text-sm h-9 ' + (isRTL ? 'pr-9' : 'pl-9')}
              />
            </div>
          </div>

          <nav className="p-4 flex-grow overflow-y-auto" onClick={(e)=>{
            // Avoid full reload if user ctrl/cmd-clicks
            const a = e.target.closest('a'); if (a && a.target === '_blank') e.stopPropagation();
          }}>
            <DragDropContext onDragEnd={handleNavDragEnd}>
              <Droppable droppableId="sidebar-nav">
                {(provided) => (
                  <ul 
                    className="space-y-2"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {orderedNavigationItems.map((item, index) => (
                      <Draggable key={item.url} draggableId={item.url} index={index}>
                        {(provided, snapshot) => (
                          <li 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={snapshot.isDragging ? "opacity-90 scale-[1.02] bg-white dark:bg-[#0b1530] shadow-md rounded-lg transition-all z-50 list-none" : "transition-all list-none"}
                          >
                            <Link 
                              to={item.url}
                              preventScrollReset
                              onClick={() => setSidebarOpen(false)}
                              className={'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ' + (isRTL ? 'flex-row-reverse text-right ' : '') + ((location.pathname === item.url || location.pathname.includes(item.url.split('/').pop())) ? 'bg-[#d4a373] text-white font-bold dark:bg-[#d4a373]' : (item.isLightGray ? 'text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-[#0a1430]' : 'text-gray-900 hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-[#0a1430]'))}
                            >
                              <item.icon className="w-5 h-5" />
                              <span>{item.title}</span>
                            </Link>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
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
            className={isRTL ? 'hidden md:flex fixed right-4 top-4 z-30 shadow-lg bg-white hover:bg-gray-50' : 'hidden md:flex fixed left-4 top-4 z-30 shadow-lg bg-white hover:bg-gray-50'}
          >
            <Menu className="h-4 w-4 mr-2" />
            {language === 'he' ? 'תפריט' : 'Menu'}
          </Button>
        )}

        <main className="flex-1 min-w-0 w-full overflow-x-clip pb-20 md:pb-0 pb-safe">
            {showWorkerInvite && (
              <div className="p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                  <WorkerInvite onClose={() => setShowWorkerInvite(false)} />
                </div>
              </div>
            )}
            <div className={(showDesktopSidebar ? '' : 'sidebar-hidden') + ' ' + (isViewer ? 'viewer-readonly' : '') + ' app-content'}>
              {children}
            </div>
            <style
              dangerouslySetInnerHTML={{ __html: `:root { --app-bg: #f3f2f1; --app-card: #ffffff; --app-text: #212529; --primary: 30 54% 64%; --primary-foreground: 0 0% 100%; --secondary: 30 20% 90%; --secondary-foreground: 30 54% 64%; --accent: 30 20% 90%; --accent-foreground: 30 54% 64%; --ring: 30 54% 64%; }
.dark:root { --app-bg: #050a1a; --app-card: #0b1530; --app-surface: #0e1d3d; --app-muted: #0a1430; --app-text: #e6eaf7; --app-border: #1e2a55; }
html, body, #root { background: var(--app-bg); color: var(--app-text); }

/* Real dark mode overrides */
.dark html, .dark body, .dark #root { background: #050a1a !important; color: var(--app-text); }
.dark .bg-white, .dark [class*="bg-white"], .dark .card, .dark .shadow, .dark .border, .dark .radix-content { background-color: var(--app-surface) !important; }
.dark .bg-white\\/95 { background-color: rgba(11,21,48,0.95) !important; }
.dark .bg-white\\/80 { background-color: rgba(11,21,48,0.80) !important; }
.dark .bg-white\\/60 { background-color: rgba(11,21,48,0.60) !important; }
.dark .bg-white\\/40 { background-color: rgba(11,21,48,0.40) !important; }
.dark .bg-white\\/20 { background-color: rgba(11,21,48,0.20) !important; }
.dark .text-gray-900, .dark .text-gray-800, .dark .text-gray-700, .dark .text-gray-600 { color: #c8d2f2 !important; }
.dark .border-gray-200, .dark [class*="border-gray-200"], .dark .border { border-color: var(--app-border) !important; }
.dark input, .dark textarea, .dark select { background-color: var(--app-muted) !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
.dark .hover\\:bg-gray-100:hover { background-color: #0a1430 !important; }
.dark [role="menu"], .dark .radix-select-content, .dark .radix-dropdown-content { background-color: var(--app-surface) !important; border-color: var(--app-border) !important; }
.dark table { background-color: transparent; }
.dark tr { border-color: var(--app-border) !important; }
.dark .bg-amber-50, .dark .bg-blue-50, .dark .bg-red-50 { background-color: var(--app-surface) !important; }
.dark a { color: #9bb4ff; }
/* Keep order preview light (do not darken inside the embedded preview) */
.dark .order-preview-embed, 
.dark .order-preview-embed * { color-scheme: light !important; }
.dark .order-preview-embed, 
.dark .order-preview-embed .bg-white, 
.dark .order-preview-embed [class*=\"bg-white\"], 
.dark .order-preview-embed [class*=\"bg-gray-\"], 
.dark .order-preview-embed [class*=\"bg-slate-\"], 
.dark .order-preview-embed [class*=\"bg-zinc-\"], 
.dark .order-preview-embed [class*=\"bg-neutral-\"], 
.dark .order-preview-embed [class*=\"bg-stone-\"] { background-color: #ffffff !important; }
.dark .order-preview-embed, 
.dark .order-preview-embed [class*=\"text-gray-\"] { color: #0f172a !important; }
.dark .order-preview-embed [class*=\"border-\"], 
.dark .order-preview-embed .border { border-color: #e5e7eb !important; }
.dark .order-preview-embed iframe { filter: none !important; opacity: 1 !important; -webkit-font-smoothing: antialiased !important; text-rendering: optimizeLegibility !important; image-rendering: auto !important; backface-visibility: visible !important; transform: none !important; background: #ffffff !important; }
.dark .order-preview-embed, .dark .order-preview-embed .sticky { -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; text-rendering: optimizeLegibility !important; }
/* Force dark for light grays and whites */
.dark .bg-gray-50, .dark .bg-gray-200, .dark .bg-slate-50, .dark .bg-zinc-50, .dark .bg-neutral-50, .dark .bg-stone-50 { background-color: var(--app-surface) !important; }
aside.bg-gray-100 { background-color: #f3f4f6 !important; }
.dark aside.bg-gray-100 { background-color: var(--app-surface) !important; }
/* Any gradient backgrounds → dark gradient */
.dark [class*="bg-gradient-to-"] { background-image: linear-gradient(135deg, #0b1530 0%, #0e1d3d 100%) !important; }
/* Hover helpers that set white/gray */
.dark [class*="hover:bg-white"]:hover, .dark [class*="hover:bg-gray-50"]:hover, .dark [class*="hover:bg-gray-100"]:hover { background-color: #0a1430 !important; }
/* Card and popovers */
.dark .bg-card, .dark .bg-popover, .dark .popover-content { background-color: var(--app-surface) !important; }
/* Inputs placeholder */
.dark ::placeholder { color: #9fb0e0 !important; }

/* Disable text selection on UI controls */
button, a, nav, header, footer, [role="button"], .no-select, .sidebar-hidden { -webkit-user-select: none; -ms-user-select: none; user-select: none; }

/* Safe area helpers */
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.pt-safe { padding-top: env(safe-area-inset-top); }

.sidebar-hidden > * { padding-left: 0 !important; padding-right: 0 !important; }

/* Make sure the viewer container itself remains fully scrollable */
.viewer-readonly { touch-action: auto !important; pointer-events: auto !important; user-select: auto; }

/* Viewer read-only hard guard: disables interactive controls within page content */
.viewer-readonly button, .viewer-readonly [type="submit"], .viewer-readonly input, .viewer-readonly select, .viewer-readonly textarea, .viewer-readonly [role="switch"], .viewer-readonly [role="button"] { pointer-events: none !important; opacity: 0.6 !important; cursor: not-allowed !important; }
.viewer-readonly .ql-toolbar, .viewer-readonly .ql-editor { pointer-events: none !important; }
      /* Lite mode: disable animations and heavy effects for low-memory/old Chrome */
      .lite *, .lite *::before, .lite *::after { animation: none !important; transition: none !important; }
      .lite .animate-spin { animation: none !important; }
      .lite .backdrop-blur, .lite [class*="backdrop-blur"] { backdrop-filter: none !important; }
      ` }}
            />
        <style
                    dangerouslySetInnerHTML={{ __html: `@media (min-width: 1600px) {
  .app-content { overflow-x: visible !important; }
  .app-content [class*=\"max-w-\"] { max-width: 100% !important; }
  .app-content [class*=\"max-h-\"] { max-height: none !important; }
  .app-content [class*=\"overflow-hidden\"] { overflow: visible !important; }
  .app-content .overflow-x-hidden { overflow-x: auto !important; }
  .app-content table { table-layout: auto !important; width: 100% !important; }
}
@media (min-width: 1920px) {
  .app-content { padding-right: max(env(safe-area-inset-right), 0px); padding-left: max(env(safe-area-inset-left), 0px); }
}` }}
                  />
              </main>

        {/* Onboarding Modal */}
        <BusinessSetupWizard user={user} />
        <OnboardingModal user={user} />

        {/* Mobile Bottom Tab Bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 border-t dark:border-[#1e2a55] bg-white/95 dark:bg-[#0b1530]/95 backdrop-blur pb-safe z-40 dark:backdrop-blur-0">
          <div className={'grid grid-cols-4 text-xs ' + (isRTL ? 'text-right' : 'text-center')}>
            <Link 
              to={createPageUrl('Orders')} 
              onClick={(e) => { if (location.pathname === createPageUrl('Orders') || location.pathname === createPageUrl('Orders') + '/') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
              className={'flex flex-col items-center py-2 ' + (location.pathname.includes('Orders') ? 'text-[#d4a373]' : 'text-gray-600 dark:text-gray-300')}
            >
              <ShoppingCart className="h-5 w-5 mb-1" />
              <span>{language === 'he' ? 'הזמנות' : 'Orders'}</span>
            </Link>
            <Link 
              to={createPageUrl('MonthlyCount')} 
              onClick={(e) => { if (location.pathname === createPageUrl('MonthlyCount') || location.pathname === createPageUrl('MonthlyCount') + '/') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
              className={'flex flex-col items-center py-2 ' + (location.pathname.includes('MonthlyCount') ? 'text-[#d4a373]' : 'text-gray-600 dark:text-gray-300')}
            >
              <Warehouse className="h-5 w-5 mb-1" />
              <span>{language === 'he' ? 'ספירות' : 'Counts'}</span>
            </Link>
            <Link 
              to={createPageUrl('LaborCost')} 
              onClick={(e) => { if (location.pathname === createPageUrl('LaborCost') || location.pathname === createPageUrl('LaborCost') + '/') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
              className={'flex flex-col items-center py-2 ' + (location.pathname.includes('LaborCost') ? 'text-[#d4a373]' : 'text-gray-600 dark:text-gray-300')}
            >
              <Users className="h-5 w-5 mb-1" />
              <span>{language === 'he' ? 'סידור' : 'Schedule'}</span>
            </Link>
            <Link 
              to={createPageUrl('InventoryTransfers')} 
              onClick={(e) => { if (location.pathname === createPageUrl('InventoryTransfers') || location.pathname === createPageUrl('InventoryTransfers') + '/') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
              className={'flex flex-col items-center py-2 ' + (location.pathname.includes('InventoryTransfers') ? 'text-[#d4a373]' : 'text-gray-600 dark:text-gray-300')}
            >
              <ArrowLeftRight className="h-5 w-5 mb-1" />
              <span>{language === 'he' ? 'העברות מלאי' : 'Transfers'}</span>
            </Link>
          </div>
        </nav>

        <AppHelpChat 
          currentPage={currentPageName} 
          isOpen={showHelpChat} 
          onClose={() => setShowHelpChat(false)} 
        />

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
                          <div className={'space-y-3 text-sm ' + (isRTL ? 'text-right' : 'text-left')}>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-center justify-center bg-black text-white rounded-xl leading-none w-10 h-10 shadow-sm font-black tracking-widest text-[7px] text-center shrink-0">
                                <span>SMART</span>
                                <span className="mt-0.5">PLATE</span>
                              </div>
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
    <AppLayout currentPageName={currentPageName}>{children}</AppLayout>
  )
}