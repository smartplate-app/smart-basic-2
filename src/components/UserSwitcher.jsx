import React, { useState } from "react";
import { User } from "@/entities/User";
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
import { ChevronDown, LogOut, Users } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function UserSwitcher({ user, onUserChange }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t, language } = useLanguage();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await User.logout();
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSwitchUser = async () => {
    try {
      setIsLoggingOut(true);
      await User.logout();
      await User.login();
    } catch (error) {
      console.error("User switch failed:", error);
    } finally {
      setIsLoggingOut(false);
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
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className={`flex flex-col flex-1 ${language === 'he' ? 'items-end' : 'items-start'}`}>
            <span className="text-sm font-medium text-gray-900 max-w-32 truncate">
              {user.full_name}
            </span>
            <span className="text-xs text-gray-500 max-w-32 truncate">
              {user.email}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align={language === 'he' ? 'start' : 'end'} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {user.full_name}
            </p>
            <p className="text-xs text-gray-500">
              {user.email}
            </p>
            {user.role && (
              <p className="text-xs text-blue-600 font-medium">
                {user.role === 'admin' ? t('user_role_admin') : t('user_role_user')}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSwitchUser}
          disabled={isLoggingOut}
          className="cursor-pointer"
        >
          <Users className="w-4 h-4 ml-2" />
          {t('switch_user')}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700 hover:bg-red-50 focus:bg-red-50"
        >
          <LogOut className="w-4 h-4 ml-2" />
          {isLoggingOut ? t('logging_out') : t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}