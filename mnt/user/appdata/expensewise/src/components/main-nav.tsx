
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  Users,
  Settings,
  LineChart,
  PiggyBank,
  LayoutGrid,
  CalendarDays,
} from 'lucide-react';

export function MainNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  
  const menuItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
    { href: '/categories', label: 'Categories', icon: LayoutGrid },
    { href: '/reports', label: 'Reports', icon: LineChart },
    { href: '/debts', label: 'Debts', icon: Users },
    { href: '/wallets', label: 'Wallets', icon: Wallet },
    { href: '/events', label: 'Events', icon: CalendarDays },
  ];
  
  const handleLinkClick = () => {
    setOpenMobile(false);
  };
  
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <PiggyBank className="size-8 text-primary" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              ExpenseWise
            </h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href} onClick={handleLinkClick}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              tooltip="Settings"
            >
              <Link href="/settings" onClick={handleLinkClick}>
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
