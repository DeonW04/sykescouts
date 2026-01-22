import React from 'react';
import { MessageSquare } from 'lucide-react';
import LeaderNav from '../components/leader/LeaderNav';

export default function Communications() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Communications</h1>
              <p className="mt-1 text-white/80">Send messages and stay connected</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-gray-600">We're working on a new communications feature to help you stay connected with parents and leaders. Check back soon!</p>
        </div>
      </div>
    </div>
  );
}