import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, LogOut, Users, Store, Building2, Check } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function UserSwitcher({ user, onUserChange }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [storeUserRecords, setStoreUserRecords] = useState([]);
  const [switching, setSwitching] = useState(false);
  const { t, language } = useLanguage();
  
  useEffect(() => {
    loadStoreUserRecords();
  }, [user?.email]);
  
  const loadStoreUserRecords = async () => {
    try {
      if (!user?.email) return;
      const records = await base44.entities.StoreUser.filter({ user_email: user.email, is_active: true });
      setStoreUserRecords(records);
    } catch (error) {
      console.error('[UserSwitcher] Error loading store records:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      try {
        sessionStorage.setItem('b44_logout_in_progress', '1');
        localStorage.removeItem('b44_user_cache');
        sessionStorage.removeItem('b44_oauth_in_progress');
        sessionStorage.removeItem('b44_oauth_finalized');
        sessionStorage.setItem('b44_login_cooldown_until', String(Date.now() + 60 * 1000));
      } catch {}
      try { await base44.auth.logout('/#/pages/WelcomePublic'); } catch {}
      setTimeout(() => { window.location.replace('/#/pages/WelcomePublic'); }, 300);
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  const handleSwitchToOwnRestaurant = async () => {
    try {
      setSwitching(true);
      await base44.auth.updateMe({
        acting_as_store_email: null,
        acting_as_store_name: null
      });
      window.location.reload();
    } catch (error) {
      console.error('[UserSwitcher] Switch to own restaurant failed:', error);
      setSwitching(false);
    }
  };
  
  const handleSwitchToWorkerRestaurant = async (storeRecord) => {
    try {
      setSwitching(true);
      await base44.auth.updateMe({
        acting_as_store_email: storeRecord.owner_email,
        acting_as_store_name: storeRecord.store_name
      });
      window.location.reload();
    } catch (error) {
      console.error('[UserSwitcher] Switch to worker restaurant failed:', error);
      setSwitching(false);
    }
  };

  const handleSwitchToDemoAccount = async () => {
    try {
      setSwitching(true);
      await base44.auth.updateMe({
        admin_original_email: user.email,
        acting_as_user_email: 'demo@foodcostapp.com',
        acting_as_user_name: 'Demo Account',
        acting_as_store_email: 'demo@foodcostapp.com',
        acting_as_store_name: 'Demo Restaurant'
      });
      window.location.href = window.location.origin + '/pages/Dashboard';
      window.location.reload();
    } catch (error) {
      console.error('[UserSwitcher] Switch to demo failed:', error);
      setSwitching(false);
    }
  };

  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayUser = {
    full_name: user.acting_as_user_name || user.full_name,
    email: user.acting_as_user_email || user.email,
    role: user.acting_as_user_email ? 'user' : user.role
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg w-full"
          disabled={isLoggingOut}
        >
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
              {getInitials(displayUser.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className={`flex flex-col flex-1 ${language === 'he' ? 'items-end' : 'items-start'}`}>
            <span className="text-sm font-medium text-gray-900 max-w-32 truncate">
              {displayUser.full_name}
            </span>
            <span className="text-xs text-gray-500 max-w-32 truncate">
              {displayUser.email}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align={language === 'he' ? 'start' : 'end'} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {displayUser.full_name}
            </p>
            <p className="text-xs text-gray-500">
              {displayUser.email}
            </p>
            {displayUser.role && (
              <p className="text-xs text-blue-600 font-medium">
                {displayUser.role === 'admin' ? t('user_role_admin') : t('user_role_user')}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Show restaurant switching options if user works at other restaurants */}
        {storeUserRecords.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-gray-500">
              {language === 'he' ? 'החלף מסעדה' : 'Switch Restaurant'}
            </DropdownMenuLabel>
            
            {/* Own restaurant option - only show if user has business_name when not acting as someone */}
            {user.business_name && (
              <DropdownMenuItem 
                onClick={handleSwitchToOwnRestaurant}
                disabled={switching}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <Building2 className="w-4 h-4" />
                  <span className="flex-1">{user.business_name}</span>
                  {!user.acting_as_store_email && <Check className="w-4 h-4 text-green-600" />}
                </div>
              </DropdownMenuItem>
            )}
            
            {/* Worker restaurants */}
            {storeUserRecords.map((record) => (
              <DropdownMenuItem 
                key={record.id}
                onClick={() => handleSwitchToWorkerRestaurant(record)}
                disabled={switching}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <Store className="w-4 h-4" />
                  <div className="flex-1">
                    <div>{record.store_name}</div>
                    <div className="text-xs text-gray-500">
                      {record.role === 'manager' ? (language === 'he' ? 'מנהל' : 'Manager') : (language === 'he' ? 'עובד' : 'Worker')}
                    </div>
                  </div>
                  {user.acting_as_store_email === record.owner_email && <Check className="w-4 h-4 text-green-600" />}
                </div>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
          </>
        )}
        
        
        {user.role === 'admin' && !user.acting_as_user_email && (
          <>
            <DropdownMenuItem 
              onClick={handleSwitchToDemoAccount}
              disabled={switching}
              className="cursor-pointer text-purple-600 hover:text-purple-700 hover:bg-purple-50 focus:bg-purple-50"
            >
              <div className="flex items-center gap-2 w-full">
                <Store className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" />
                <span className="flex-1 text-left rtl:text-right">{language === 'he' ? 'הצג חשבון דמו' : 'View Demo Account'}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700 hover:bg-red-50 focus:bg-red-50"
        >
          <div className="flex items-center gap-2 w-full">
            <LogOut className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" />
            <span className="flex-1 text-left rtl:text-right">{isLoggingOut ? t('logging_out') : t('logout')}</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}