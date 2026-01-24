import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Users, Calendar, Award, Tent, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function ParentNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Users, label: 'My Child', page: 'MyChild', color: 'bg-blue-500' },
    { icon: Calendar, label: 'Programme', page: 'ParentProgramme', color: 'bg-green-500' },
    { icon: Tent, label: 'Events', page: 'ParentEvents', color: 'bg-purple-500' },
    { icon: Award, label: 'Badges', page: 'ParentBadges', color: 'bg-yellow-500' },
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="hidden sm:block w-px h-6 bg-gray-200" />
            <Link to={createPageUrl('ParentDashboard')}>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                Portal
              </Button>
            </Link>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item, index) => {
              const isActive = currentPage === item.page;
              
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
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
                </motion.div>
              );
            })}
          </nav>
        </div>
      </div>
    </motion.div>
  );
}