
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plane, LogOut, User, Settings, CreditCard } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { TravelModeDialog } from './travel-mode-dialog';
import { getUser, updateUser } from '@/services/user-service';
import type { User as UserType } from '@/lib/data';
import { getTravelMode, disconnectTravelMode } from '@/services/travel-mode-service';
import { useAuth } from './auth-provider';
import { signOutUser } from '@/services/auth-service';

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isTravelMode, setIsTravelMode] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, loading } = useAuth();
  
  useEffect(() => {
    const travelModeState = getTravelMode();
    setIsTravelMode(travelModeState.isActive);

    const handleTravelModeChange = () => {
      const updatedState = getTravelMode();
      setIsTravelMode(updatedState.isActive);
    };
    
    window.addEventListener('travelModeChanged', handleTravelModeChange);

    return () => {
      window.removeEventListener('travelModeChanged', handleTravelModeChange);
    };
  }, []);

  const getPageTitle = () => {
    if (pathname.startsWith('/login') || pathname.startsWith('/signup')) return '';
    if (pathname === '/') return 'Dashboard';
    const name = pathname.split('/').pop() || '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const handleTravelModeChange = (checked: boolean) => {
    if (checked) {
      setIsDialogOpen(true);
    } else {
      disconnectTravelMode();
    }
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const handleLogout = async () => {
    await signOutUser();
    router.push('/login');
  }
  
  const pageTitle = getPageTitle();
  if (!pageTitle) return null;

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      <SidebarTrigger className="sm:hidden" />
      <h1 className="text-lg font-semibold md:text-xl">{pageTitle}</h1>
      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch 
            id="travel-mode" 
            checked={isTravelMode} 
            onCheckedChange={handleTravelModeChange}
          />
          <Label htmlFor="travel-mode" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            <span className="hidden sm:inline">Travel Mode</span>
          </Label>
        </div>
        {!loading && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || ''} />
                  <AvatarFallback>{getInitials(user.displayName || user.email || 'U')}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <TravelModeDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />
    </header>
  );
}
