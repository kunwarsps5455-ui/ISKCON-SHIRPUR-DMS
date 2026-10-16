import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, HeartHandshake, Baby, Cake, Settings, FileText, UserPlus, LogOut } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Donors', href: '/donors', icon: Users, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Donations', href: '/donations', icon: HeartHandshake, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Family Members', href: '/family', icon: Baby, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Birthdays', href: '/birthdays', icon: Cake, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Reports', href: '/reports', icon: FileText, roles: ['ADMIN', 'CHECKER'] },
    { name: 'Users', href: '/users', icon: UserPlus, roles: ['ADMIN'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  return (
    <div className="min-h-screen flex bg-cream font-sans text-temple-900">
      {/* Sidebar */}
      <div className="w-64 bg-temple-900 text-white flex flex-col shadow-xl z-10 hidden md:flex">
        <div className="p-6 border-b border-temple-800 flex flex-col items-center">
          <div className="w-16 h-16 bg-saffron-500 rounded-full flex items-center justify-center mb-3">
            <span className="text-2xl font-bold text-white">ISK</span>
          </div>
          <h2 className="text-xl font-bold text-saffron-400 text-center">ISKCON Shirpur</h2>
          <p className="text-xs text-temple-300 mt-1 uppercase tracking-wider">DMS</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            if (!item.roles.includes(user?.role || '')) return null;
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-saffron-600 text-white font-medium shadow-md shadow-saffron-900/20'
                    : 'text-temple-100 hover:bg-temple-800'
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-temple-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-temple-800">
          <div className="flex items-center justify-between mb-4 px-2">
            <div>
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-temple-300">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]">
        <header className="bg-white border-b border-gray-200 shadow-sm h-16 flex items-center px-6 justify-between lg:hidden">
          <h1 className="font-bold text-temple-900">ISKCON Shirpur DMS</h1>
          {/* Mobile menu button would go here */}
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
