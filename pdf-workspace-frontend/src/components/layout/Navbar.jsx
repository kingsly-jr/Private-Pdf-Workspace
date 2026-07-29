import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import KeyboardShortcutsModal from '../common/KeyboardShortcutsModal';
import { Search, HelpCircle, Info, MessageSquare } from 'lucide-react';

export default function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if ((e.key === '?' || e.key === '/') && !isInputActive) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavScroll = (sectionId) => {
    if (location.pathname === '/' || location.pathname === '/tools') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/?scroll=${sectionId}`);
    }
  };

  return (
    <>
      <header className="border-b border-slate-800/80 px-6 py-4 glass-panel sticky top-0 z-40 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-amber-200 flex items-center justify-center font-bold text-slate-950 shadow-glow group-hover:scale-105 transition-transform">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-cream-100 via-brand-200 to-brand-400 bg-clip-text text-transparent">
              Roriri Workspace
            </span>
            <span className="text-[10px] text-brand-300/80 font-medium uppercase tracking-widest -mt-1">
              Private PDF Suite
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center space-x-2 text-xs text-brand-200 hover:text-white bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl transition-all hover:border-brand-400/40"
            title="Search tools (Ctrl+K or ?)"
          >
            <Search className="w-3.5 h-3.5 text-brand-300" />
            <span className="hidden md:inline">Quick Search...</span>
            <kbd className="hidden lg:inline text-[9px] bg-slate-800/80 border border-slate-700 text-brand-300 px-1.5 py-0.5 rounded font-mono">
              Ctrl K
            </kbd>
          </button>

          <button
            onClick={() => handleNavScroll('about')}
            className="hidden sm:flex items-center space-x-1 text-xs text-brand-200 hover:text-white px-2.5 py-2 rounded-xl transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            <span>About</span>
          </button>

          <button
            onClick={() => handleNavScroll('faq')}
            className="hidden sm:flex items-center space-x-1 text-xs text-brand-200 hover:text-white px-2.5 py-2 rounded-xl transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ</span>
          </button>

          <button
            onClick={() => handleNavScroll('feedback')}
            className="hidden sm:flex items-center space-x-1 text-xs text-brand-200 hover:text-white px-2.5 py-2 rounded-xl transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Feedback</span>
          </button>
        </div>
      </header>

      <KeyboardShortcutsModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
