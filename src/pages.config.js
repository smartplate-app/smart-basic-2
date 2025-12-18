import Suppliers from './pages/Suppliers';
import Items from './pages/Items';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import SupplyReceipts from './pages/SupplyReceipts';
import MonthlyCount from './pages/MonthlyCount';
import Warehouses from './pages/Warehouses';
import UserProfile from './pages/UserProfile';
import LaborCost from './pages/LaborCost';
import Dashboard from './pages/Dashboard';
import WorkerPortal from './pages/WorkerPortal';
import WorkerSchedule from './pages/WorkerSchedule';
import AdminDashboard from './pages/AdminDashboard';
import Users from './pages/Users';
import Register from './pages/Register';
import SalesPrediction from './pages/SalesPrediction';
import StoreUsers from './pages/StoreUsers';
import TestInvites from './pages/TestInvites';
import PublicOrder from './pages/PublicOrder';
import InviteUser from './pages/InviteUser';
import JoinRestaurant from './pages/JoinRestaurant';
import TestInviteLinks from './pages/TestInviteLinks';
import RestaurantInvite from './pages/RestaurantInvite';
import ToDoList from './pages/ToDoList';
import StoreLogin from './pages/StoreLogin';
import Tips from './pages/Tips';
import ChainManagement from './pages/ChainManagement';
import InventoryTransfers from './pages/InventoryTransfers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Suppliers": Suppliers,
    "Items": Items,
    "Orders": Orders,
    "OrderDetails": OrderDetails,
    "SupplyReceipts": SupplyReceipts,
    "MonthlyCount": MonthlyCount,
    "Warehouses": Warehouses,
    "UserProfile": UserProfile,
    "LaborCost": LaborCost,
    "Dashboard": Dashboard,
    "WorkerPortal": WorkerPortal,
    "WorkerSchedule": WorkerSchedule,
    "AdminDashboard": AdminDashboard,
    "Users": Users,
    "Register": Register,
    "SalesPrediction": SalesPrediction,
    "StoreUsers": StoreUsers,
    "TestInvites": TestInvites,
    "PublicOrder": PublicOrder,
    "InviteUser": InviteUser,
    "JoinRestaurant": JoinRestaurant,
    "TestInviteLinks": TestInviteLinks,
    "RestaurantInvite": RestaurantInvite,
    "ToDoList": ToDoList,
    "StoreLogin": StoreLogin,
    "Tips": Tips,
    "ChainManagement": ChainManagement,
    "InventoryTransfers": InventoryTransfers,
}

export const pagesConfig = {
    mainPage: "Orders",
    Pages: PAGES,
    Layout: __Layout,
};