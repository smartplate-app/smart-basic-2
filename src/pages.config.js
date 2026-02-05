/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminDashboard from './pages/AdminDashboard';
import ChainManagement from './pages/ChainManagement';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import IOSBuildGuide from './pages/IOSBuildGuide';
import InventoryTransfers from './pages/InventoryTransfers';
import InviteUser from './pages/InviteUser';
import Items from './pages/Items';
import JoinRestaurant from './pages/JoinRestaurant';
import KBMedia from './pages/KBMedia';
import LaborCost from './pages/LaborCost';
import LinkChecker from './pages/LinkChecker';
import MonthlyCount from './pages/MonthlyCount';
import OrderDetails from './pages/OrderDetails';
import Orders from './pages/Orders';
import PublicOrder from './pages/PublicOrder';
import Register from './pages/Register';
import RestaurantInvite from './pages/RestaurantInvite';
import SalesPerHour from './pages/SalesPerHour';
import SalesPrediction from './pages/SalesPrediction';
import SignIn from './pages/SignIn';
import StoreLogin from './pages/StoreLogin';
import StoreUsers from './pages/StoreUsers';
import Suppliers from './pages/Suppliers';
import SupplyReceipts from './pages/SupplyReceipts';
import Support from './pages/Support';
import TestInviteLinks from './pages/TestInviteLinks';
import TestInvites from './pages/TestInvites';
import Tips from './pages/Tips';
import UserProfile from './pages/UserProfile';
import Users from './pages/Users';
import Warehouses from './pages/Warehouses';
import WasteReports from './pages/WasteReports';
import Welcome from './pages/Welcome';
import WelcomeIncognito from './pages/WelcomeIncognito';
import WelcomePublic from './pages/WelcomePublic';
import WorkerPortal from './pages/WorkerPortal';
import WorkerSchedule from './pages/WorkerSchedule';
import ChainDashboard from './pages/ChainDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "ChainManagement": ChainManagement,
    "Dashboard": Dashboard,
    "Home": Home,
    "IOSBuildGuide": IOSBuildGuide,
    "InventoryTransfers": InventoryTransfers,
    "InviteUser": InviteUser,
    "Items": Items,
    "JoinRestaurant": JoinRestaurant,
    "KBMedia": KBMedia,
    "LaborCost": LaborCost,
    "LinkChecker": LinkChecker,
    "MonthlyCount": MonthlyCount,
    "OrderDetails": OrderDetails,
    "Orders": Orders,
    "PublicOrder": PublicOrder,
    "Register": Register,
    "RestaurantInvite": RestaurantInvite,
    "SalesPerHour": SalesPerHour,
    "SalesPrediction": SalesPrediction,
    "SignIn": SignIn,
    "StoreLogin": StoreLogin,
    "StoreUsers": StoreUsers,
    "Suppliers": Suppliers,
    "SupplyReceipts": SupplyReceipts,
    "Support": Support,
    "TestInviteLinks": TestInviteLinks,
    "TestInvites": TestInvites,
    "Tips": Tips,
    "UserProfile": UserProfile,
    "Users": Users,
    "Warehouses": Warehouses,
    "WasteReports": WasteReports,
    "Welcome": Welcome,
    "WelcomeIncognito": WelcomeIncognito,
    "WelcomePublic": WelcomePublic,
    "WorkerPortal": WorkerPortal,
    "WorkerSchedule": WorkerSchedule,
    "ChainDashboard": ChainDashboard,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};