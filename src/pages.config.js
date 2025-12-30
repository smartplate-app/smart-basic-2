import AdminDashboard from './pages/AdminDashboard';
import ChainManagement from './pages/ChainManagement';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import InventoryTransfers from './pages/InventoryTransfers';
import InviteUser from './pages/InviteUser';
import Items from './pages/Items';
import JoinRestaurant from './pages/JoinRestaurant';
import LaborCost from './pages/LaborCost';
import MonthlyCount from './pages/MonthlyCount';
import OrderDetails from './pages/OrderDetails';
import Orders from './pages/Orders';
import PublicOrder from './pages/PublicOrder';
import Register from './pages/Register';
import RestaurantInvite from './pages/RestaurantInvite';
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
import Welcome from './pages/Welcome';
import WorkerPortal from './pages/WorkerPortal';
import WorkerSchedule from './pages/WorkerSchedule';
import LinkChecker from './pages/LinkChecker';
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
    "MonthlyCount": MonthlyCount,
    "OrderDetails": OrderDetails,
    "Orders": Orders,
    "PublicOrder": PublicOrder,
    "Register": Register,
    "RestaurantInvite": RestaurantInvite,
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
    "Welcome": Welcome,
    "WorkerPortal": WorkerPortal,
    "WorkerSchedule": WorkerSchedule,
    "LinkChecker": LinkChecker,
}

export const pagesConfig = {
    mainPage: "Orders",
    Pages: PAGES,
    Layout: __Layout,
};