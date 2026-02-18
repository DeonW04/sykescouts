import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Users, Calendar, Award, Mail, Settings, ArrowLeft, Image, ShieldAlert, ChevronDown, UserCheck, CalendarDays, Lightbulb, Package, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';

export default function LeaderNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  const navItems = [
    { 
      icon: Users, 
      label: 'Members', 
      color: 'bg-blue-500',
      dropdown: [
        { label: 'Member Details', page: 'LeaderMembers', icon: Users },
        { label: 'Attendance', page: 'LeaderAttendance', icon: UserCheck },
        { label: 'Parent Portal', page: 'ParentPortal', icon: Users }
      ]
    },
    { 
      icon: Calendar, 
      label: 'Programme', 
      color: 'bg-purple-500',
      dropdown: [
          { label: 'Weekly Meetings', page: 'LeaderProgramme', icon: Calendar },
          { label: 'Events', page: 'LeaderEvents', icon: CalendarDays },
          { label: 'Ideas Board', page: 'IdeasBoard', icon: Lightbulb }
        ]
    },
    { icon: ShieldAlert, label: 'Risk', page: 'RiskAssessments', color: 'bg-orange-500' },
    { 
      icon: Award, 
      label: 'Badges', 
      color: 'bg-green-500',
      dropdown: [
        { label: 'Badge Tracking', page: 'LeaderBadges', icon: Award },
        { label: 'Due Badges', page: 'AwardBadges', icon: TrendingUp },
        { label: 'Badge Stock', page: 'BadgeStockManagement', icon: Package },
        ...(isAdmin ? [{ label: 'Manage Badges', page: 'ManageBadges', icon: Settings, separator: true }] : []),
      ]
    },
    { icon: Mail, label: 'Communications', page: 'Communications', color: 'bg-teal-500' },
    { icon: Image, label: 'Gallery', page: 'LeaderGallery', color: 'bg-pink-500' },
  ];

  const currentPage = location.pathname.split('/').pop();
  
  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white border-b border-gray-200 shadow-sm sticky top-20 z-40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:h-16 py-3 md:py-0 gap-3 md:gap-0">
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div className="w-px h-6 bg-gray-200" />
            <Link to={createPageUrl('LeaderDashboard')}>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                Portal
              </Button>
            </Link>
          </div>

          <nav className="flex items-center justify-center gap-2 md:gap-1">
            {navItems.map((item, index) => {
              const isActive = item.dropdown 
                ? item.dropdown.some(sub => currentPage === sub.page)
                : currentPage === item.page;
              
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {item.dropdown ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`flex items-center justify-center px-3 py-2 rounded-lg transition-all ${
                            isActive
                              ? `${item.color} text-white shadow-md scale-105`
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <item.icon className="w-5 h-5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline sm:ml-2 text-sm font-medium">{item.label}</span>
                          <ChevronDown className="hidden sm:inline w-3 h-3 ml-1" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        {item.dropdown.map((subItem) => (
                          <React.Fragment key={subItem.page}>
                            {subItem.separator && <DropdownMenuSeparator />}
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl(subItem.page)} className="flex items-center gap-2 cursor-pointer">
                                <subItem.icon className="w-4 h-4" />
                                {subItem.label}
                              </Link>
                            </DropdownMenuItem>
                          </React.Fragment>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Link to={createPageUrl(item.page)}>
                      <button
                        className={`flex items-center justify-center px-3 py-2 rounded-lg transition-all ${
                          isActive
                            ? `${item.color} text-white shadow-md scale-105`
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <item.icon className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline sm:ml-2 text-sm font-medium">{item.label}</span>
                      </button>
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </nav>
          
          <Link to={createPageUrl('LeaderDashboard')} className="w-full md:hidden">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 border-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Leader Portal
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}