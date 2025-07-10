import { Link, useLocation } from 'wouter';
import { Home, Folder, History, Settings } from 'lucide-react';

export function BottomNavigation() {
  const [location] = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/files', icon: Folder, label: 'My Files' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-surface dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center py-2 px-3 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                <Icon className="text-lg" size={20} />
                <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
