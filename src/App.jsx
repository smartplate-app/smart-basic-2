import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, Outlet } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import WelcomePublic from './pages/WelcomePublic';
import RecipesPage from './pages/Recipes';
import CogsReportsPage from './pages/CogsReports';
import MenuEngineeringPage from './pages/MenuEngineering';
import InstagramStoryGreek from './pages/InstagramStoryGreek';
import POSSettings from './pages/POSSettings';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AppLayoutRoute = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  let currentPageName = pathParts[pathParts.length - 1];
  if (!currentPageName || currentPageName === '') {
    currentPageName = 'WelcomePublic';
  }
  return (
    <LayoutWrapper currentPageName={currentPageName}>
      <Outlet />
    </LayoutWrapper>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const location = useLocation();

  const publicRoutes = [
    '/',
    '/index.html',
    '/WelcomePublic',
    '/pages/WelcomePublic',
    '/Welcome',
    '/pages/Welcome',
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
    '/pages/AuthKick',
    '/WelcomeIncognito',
    '/pages/WelcomeIncognito'
  ];
  
  const isPublicRoute = publicRoutes.some(route => 
    location.pathname.toLowerCase() === route.toLowerCase() || 
    location.pathname.toLowerCase().startsWith(route.toLowerCase() + '/') ||
    location.pathname.toLowerCase().includes('welcomepublic') ||
    location.pathname.toLowerCase().includes('welcomeincognito')
  );

  // Show loading spinner while checking app public settings or auth (skip for public routes to prevent flicker)
  if ((isLoadingPublicSettings || isLoadingAuth) && !isPublicRoute) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
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
        <Route path="/" element={<WelcomePublic />} />
        <Route path="/WelcomePublic" element={<WelcomePublic />} />
        <Route path="/pages/WelcomePublic" element={<WelcomePublic />} />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route key={path} path={`/${path}`} element={<Page />} />
        ))}
        <Route path="/Recipes" element={<RecipesPage />} />
        <Route path="/CogsReports" element={<CogsReportsPage />} />
        <Route path="/MenuEngineering" element={<MenuEngineeringPage />} />
        <Route path="/InstagramStoryGreek" element={<InstagramStoryGreek />} />
        <Route path="/pos-settings" element={<POSSettings />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App