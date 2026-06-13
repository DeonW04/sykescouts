import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Home, User, Calendar, Tent, Award, ChevronDown, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const navItems = [
  { label: 'Dashboard', page: 'ParentDashboard', icon: Home },
  { label: 'My Child', page: 'MyChild', icon: User },
  { label: 'Programme', page: 'ParentProgramme', icon: Calendar },
  { label: 'Events & Camps', page: 'ParentEvents', icon: Tent },
  { label: 'Badges', page: 'ParentBadges', icon: Award },
];

export default function ParentNav() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Brand */}
          <Link to={createPageUrl('ParentDashboard')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#7413dc] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-5 h-5 fill-white">
                <path d="M50 10 L60 40 L90 40 L65 60 L75 90 L50 70 L25 90 L35 60 L10 40 L40 40 Z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 hidden sm:block text-sm">Parent Portal</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const url = createPageUrl(item.page);
              const isActive = location.pathname === url || location.pathname.startsWith(url + '/');
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#7413dc] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all">
                  <div className="w-7 h-7 bg-[#7413dc] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {(user.full_name || user.email || 'P').charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {user.full_name || user.email}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 text-xs text-gray-500 font-medium">Signed in as</div>
                <div className="px-3 pb-2 text-sm font-medium text-gray-900 truncate">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}