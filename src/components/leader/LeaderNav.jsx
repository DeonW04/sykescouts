import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Users, Calendar, Award, Mail, Settings, ArrowLeft, Image, ShieldAlert, ChevronDown, UserCheck, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function LeaderNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { 
      icon: Users, 
      label: 'Members', 
      color: 'bg-blue-500',
      dropdown: [
        { label: 'Member Details', page: 'LeaderMembers', icon: Users },
        { label: 'Attendance', page: 'LeaderAttendance', icon: UserCheck }
      ]
    },
    { 
      icon: Calendar, 
      label: 'Programme', 
      color: 'bg-purple-500',
      dropdown: [
        { label: 'Weekly Meetings', page: 'LeaderProgramme', icon: Calendar },
        { label: 'Events', page: 'LeaderEvents', icon: CalendarDays }
      ]
    },
    { icon: ShieldAlert, label: 'Risk', page: 'RiskAssessments', color: 'bg-orange-500' },
    { icon: Award, label: 'Badges', page: 'LeaderBadges', color: 'bg-green-500' },
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
        <div className="flex items-center justify-between h-16">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <nav className="flex items-center gap-1">
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
                          className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 py-2 rounded-lg transition-all ${
                            isActive
                              ? `${item.color} text-white shadow-md scale-105`
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        {item.dropdown.map((subItem) => (
                          <DropdownMenuItem key={subItem.page} asChild>
                            <Link to={createPageUrl(subItem.page)} className="flex items-center gap-2 cursor-pointer">
                              <subItem.icon className="w-4 h-4" />
                              {subItem.label}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Link to={createPageUrl(item.page)}>
                      <button
                        className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 py-2 rounded-lg transition-all ${
                          isActive
                            ? `${item.color} text-white shadow-md scale-105`
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                      </button>
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </nav>
        </div>
      </div>
    </motion.div>
  );
}