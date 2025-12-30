import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', page: 'Home' },
    { name: 'About Us', page: 'About' },
    { name: 'Our Sections', page: 'Sections' },
    { name: 'Parents', page: 'Parents' },
    { name: 'Gallery', page: 'Gallery' },
    { name: 'Contact', page: 'Contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#7413dc] rounded-full flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-8 h-8 text-white fill-current">
                  <path d="M50 10 L60 40 L90 40 L65 60 L75 90 L50 70 L25 90 L35 60 L10 40 L40 40 Z" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold text-[#7413dc]">Scouts</span>
                <span className="block text-xs text-gray-500">Your Scout Group</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.page}
                  to={createPageUrl(link.page)}
                  className={`text-sm font-medium transition-colors hover:text-[#7413dc] ${
                    currentPageName === link.page ? 'text-[#7413dc]' : 'text-gray-700'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Link to={createPageUrl('JoinUs')}>
                <Button variant="outline" className="border-[#7413dc] text-[#7413dc] hover:bg-[#7413dc] hover:text-white">
                  Join Scouts
                </Button>
              </Link>
              <Link to={createPageUrl('Volunteer')}>
                <Button className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
                  Volunteer
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 py-4">
            <nav className="flex flex-col px-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.page}
                  to={createPageUrl(link.page)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 text-base font-medium ${
                    currentPageName === link.page ? 'text-[#7413dc]' : 'text-gray-700'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                <Link to={createPageUrl('JoinUs')} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-[#7413dc] text-[#7413dc]">
                    Join Scouts
                  </Button>
                </Link>
                <Link to={createPageUrl('Volunteer')} onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
                    Volunteer
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#7413dc] rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-6 h-6 text-white fill-current">
                    <path d="M50 10 L60 40 L90 40 L65 60 L75 90 L50 70 L25 90 L35 60 L10 40 L40 40 Z" />
                  </svg>
                </div>
                <span className="text-lg font-bold">Your Scout Group</span>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                We help young people gain skills for life through adventure, outdoor activities, and community involvement.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to={createPageUrl('About')} className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to={createPageUrl('Sections')} className="hover:text-white transition-colors">Our Sections</Link></li>
                <li><Link to={createPageUrl('Parents')} className="hover:text-white transition-colors">Parent Info</Link></li>
                <li><Link to={createPageUrl('JoinUs')} className="hover:text-white transition-colors">Join Scouts</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4">Get in Touch</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to={createPageUrl('Volunteer')} className="hover:text-white transition-colors">Volunteer With Us</Link></li>
                <li><Link to={createPageUrl('Contact')} className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Your Scout Group. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Part of The Scout Association, registered charity number 306101 (England and Wales)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}