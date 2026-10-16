import { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import IskconLogo from './IskconLogo';
import {
  LayoutDashboard,
  Users,
  HeartHandshake,
  Baby,
  Settings,
  FileText,
  UserPlus,
  LogOut,
  CalendarCheck,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CHECKER'] },
    { name: 'CRM & Follow-ups', href: '/crm', icon: CalendarCheck, roles: ['ADMIN', 'CHECKER'], highlight: true },
    { name: 'Donors', href: '/donors', icon: Users, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Donations', href: '/donations', icon: HeartHandshake, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Family Members', href: '/family', icon: Baby, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Birthdays & Festivals', href: '/birthdays', icon: Sparkles, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Reports', href: '/reports', icon: FileText, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Users', href: '/users', icon: UserPlus, roles: ['ADMIN'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const renderNavLinks = () => (
    <div className="space-y-1.5">
      {navigation.map((item) => {
        if (!item.roles.includes(user?.role || '')) return null;
        const isActive = location.pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
              isActive
                ? 'saffron-gradient text-white shadow-md shadow-orange-950/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <item.icon className={`mr-3 h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            <span className="flex-1">{item.name}</span>
            {item.highlight && !isActive && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CRM
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen flex font-sans text-slate-900 bg-transparent">
      {/* Desktop Sidebar */}
      <div className="w-64 bg-slate-950 text-white flex flex-col shadow-2xl z-30 hidden md:flex relative overflow-hidden border-r border-slate-800/80">
        {/* Subtle background sacred glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10 flex flex-col items-center relative z-10">
          <div className="w-16 h-16 saffron-gradient rounded-2xl overflow-hidden flex items-center justify-center p-2 mb-2.5 shadow-lg shadow-orange-500/25 border border-amber-300/30">
            <IskconLogo className="w-full h-full drop-shadow" variant="white" />
          </div>
          <h2 className="text-base font-extrabold text-white tracking-wide font-heading text-center">
            ISKCON Shirpur
          </h2>
          <p className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase mt-0.5 flex items-center gap-1">
            <Sparkles size={10} />
            DMS & Devotee CRM
          </p>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-4 overflow-y-auto relative z-10">
          {renderNavLinks()}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/60 relative z-10">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <p className="text-xs font-bold text-white truncate max-w-[130px]">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <p className="text-[10px] text-slate-400 font-medium">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 bg-slate-950 text-white flex flex-col p-6 z-10 border-r border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-sm text-amber-400">ISKCON Shirpur</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1">{renderNavLinks()}</nav>
            <button
              onClick={logout}
              className="flex items-center w-full mt-4 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-xl"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-transparent relative z-10">
        {/* Mobile Header Bar */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 h-16 flex items-center px-6 justify-between md:hidden relative z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 saffron-gradient rounded-lg overflow-hidden flex items-center justify-center p-1 text-white">
              <IskconLogo className="w-full h-full" variant="white" />
            </div>
            <h1 className="font-bold text-sm text-slate-900 font-heading">ISKCON Shirpur</h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
          >
            <Menu size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
