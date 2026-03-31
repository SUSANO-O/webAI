'use client';

import Link from 'next/link';
import { CircleUser, LayoutGrid, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppIcon from '@/components/app-icon';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 px-4 md:px-6 header-gradient shadow-lg border-b border-white/20">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link
          href="/app"
          className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
          <AppIcon />
          <span className="font-headline font-bold text-xl text-white drop-shadow">Website AI</span>
        </Link>
        <Link
          href="/app"
          className="text-white/90 font-medium transition-colors hover:text-white"
        >
          Dashboard
        </Link>
        {user && (
          <Link
            href="/app/admin"
            className="text-white/70 font-medium transition-colors hover:text-white"
          >
            Mis Templates
          </Link>
        )}
      </nav>
      <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full bg-white/20 hover:bg-white/30 border border-white/30 text-white">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild className="bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold">
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
