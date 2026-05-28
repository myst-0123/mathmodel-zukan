import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Mobile topbar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-gray-900 border-b border-gray-700 flex items-center px-4 z-20 md:hidden">
        <button
          onClick={() => setNavOpen(v => !v)}
          className="text-gray-300 hover:text-white p-1"
          aria-label="メニュー"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="ml-3 text-sm font-bold text-white">数理モデル図鑑</span>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <Sidebar open={navOpen} />

      <main className="flex-1 overflow-y-auto pt-12 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
