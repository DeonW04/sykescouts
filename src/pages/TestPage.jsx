import React from 'react';

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-10 bg-white rounded-2xl shadow-md max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-3">🧪 Test Page</h1>
        <p className="text-gray-500 text-base">
          This is a hidden test page. It is accessible at <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-purple-600">/testpage</code> but does not appear anywhere in the app navigation.
        </p>
        <div className="mt-6 text-xs text-gray-400">sykescouts — dev only</div>
      </div>
    </div>
  );
}
