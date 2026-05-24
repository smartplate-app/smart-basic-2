import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { GlobalToaster } from "@/components/GlobalToaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/components/LanguageProvider'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import RecipesPage from './pages/Recipes';
import CogsReportsPage from './pages/CogsReports';
import MenuEngineeringPage from './pages/MenuEngineering';
import InstagramStoryGreek from './pages/InstagramStoryGreek';
import POSSettings from './pages/POSSettings';
import PriceChangesPage from './pages/PriceChanges';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AppLayoutRoute = () => {
const location = useLocation();
let pathToUse = location.pathname;
if (pathToUse === '/' && location.hash && location.hash.startsWith('#/')) {
  pathToUse = location.hash.substring(1);
}
const pathParts = pathToUse.split('/').filter(Boolean);
let currentPageName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'StoreLogin';
  
  return (
    <LayoutWrapper currentPageName={currentPageName}>
      <AnimatePresence mode="wait">
        <motion.div 
          key={location.pathname} 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.15 }}
          className="w-full h-full"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </LayoutWrapper>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const location = useLocation();

  const publicRoutes = [
    '/',
    '/index.html',

    '/GoogleCampaign',
    '/pages/GoogleCampaign',
    '/OAuthCallback',
    '/pages/OAuthCallback',
    '/PublicOrder',
    '/pages/PublicOrder',
    '/Register',
    '/pages/Register',
    '/SignIn',
    '/pages/SignIn',
    '/StoreLogin',
    '/pages/StoreLogin',
    '/WorkerPortal',
    '/pages/WorkerPortal',
    '/OrderDetails',
    '/pages/OrderDetails',
    '/RestaurantInvite',
    '/pages/RestaurantInvite',
    '/Diagnostics',
    '/pages/Diagnostics',
    '/LoginHelper',
    '/pages/LoginHelper',
    '/AuthKick',
    '/pages/AuthKick'
    ];

    const isPublicRoute = publicRoutes.some(route => 
    location.pathname.toLowerCase() === route.toLowerCase() || 
    location.pathname.toLowerCase().startsWith(route.toLowerCase() + '/')
    );

  let hasUserCache = false;
  try { hasUserCache = !!localStorage.getItem('b44_user_cache') && !sessionStorage.getItem('b44_logout_in_progress'); } catch {}

  // Show loading spinner while checking app public settings or auth (skip for public routes to prevent flicker)
  if ((isLoadingPublicSettings || isLoadingAuth) && (!isPublicRoute || hasUserCache)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (!isPublicRoute) {
      if (authError.type === 'user_not_registered') {
        return <UserNotRegisteredError />;
      } else if (authError.type === 'auth_required') {
        // Redirect to login automatically
        navigateToLogin();
        return null;
      }
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayoutRoute />}>
        <Route path="/" element={<Pages.StoreLogin />} />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route key={path} path={`/${path}`} element={<Page />} />
        ))}
        <Route path="/Recipes" element={<RecipesPage />} />
        <Route path="/CogsReports" element={<CogsReportsPage />} />
        <Route path="/MenuEngineering" element={<MenuEngineeringPage />} />
        <Route path="/InstagramStoryGreek" element={<InstagramStoryGreek />} />
        <Route path="/pos-settings" element={<POSSettings />} />
        <Route path="/PriceChanges" element={<PriceChangesPage />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <LanguageProvider>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <GlobalToaster />
          <VisualEditAgent />
        </LanguageProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App