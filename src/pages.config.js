import AdminDashboard from './pages/AdminDashboard';
import ChainManagement from './pages/ChainManagement';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import InventoryTransfers from './pages/InventoryTransfers';
import InviteUser from './pages/InviteUser';
import Items from './pages/Items';
import JoinRestaurant from './pages/JoinRestaurant';
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
import TestInviteLinks from './pages/TestInviteLinks';
import TestInvites from './pages/TestInvites';
import Tips from './pages/Tips';
import ToDoList from './pages/ToDoList';
import UserProfile from './pages/UserProfile';
import Users from './pages/Users';
import Warehouses from './pages/Warehouses';
import WasteReports from './pages/WasteReports';
import Welcome from './pages/Welcome';
import WelcomeIncognito from './pages/WelcomeIncognito';
import WelcomePublic from './pages/WelcomePublic';
import WorkerPortal from './pages/WorkerPortal';
import WorkerSchedule from './pages/WorkerSchedule';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "ChainManagement": ChainManagement,
    "Dashboard": Dashboard,
    "Home": Home,
    "InventoryTransfers": InventoryTransfers,
    "InviteUser": InviteUser,
    "Items": Items,
    "JoinRestaurant": JoinRestaurant,
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
    "TestInviteLinks": TestInviteLinks,
    "TestInvites": TestInvites,
    "Tips": Tips,
    "ToDoList": ToDoList,
    "UserProfile": UserProfile,
    "Users": Users,
    "Warehouses": Warehouses,
    "WasteReports": WasteReports,
    "Welcome": Welcome,
    "WelcomeIncognito": WelcomeIncognito,
    "WelcomePublic": WelcomePublic,
    "WorkerPortal": WorkerPortal,
    "WorkerSchedule": WorkerSchedule,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};