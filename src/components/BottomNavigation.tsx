import React from 'react';
import { TabType } from '../types';
import { Home, Calendar, Activity, Menu } from 'lucide-react';

interface BottomNavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingCheckIn?: boolean;
  remainingTasksCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
  pendingCheckIn = true,
  remainingTasksCount = 0,
}) => {
  const navItems = [
    {
      id: 'home' as TabType,
      label: 'Home',
      icon: Home,
      badge: remainingTasksCount > 0 ? remainingTasksCount : undefined,
    },
    {
      id: 'plan' as TabType,
      label: 'Plan',
      icon: Calendar,
    },
    {
      id: 'checkin' as TabType,
      label: 'Check-in',
      icon: Activity,
      dot: pendingCheckIn,
    },
    {
      id: 'more' as TabType,
      label: 'More',
      icon: Menu,
    },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      className="sticky bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-3 py-1.5 transition-all"
      aria-label="Main Navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 items-center justify-between gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? 'text-teal-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {/* Active Indicator Background Pill */}
              <div
                className={`relative px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'}`} />

                {/* Badge for remaining tasks */}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-teal-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {item.badge}
                  </span>
                )}

                {/* Pulsing dot indicator for pending check-in */}
                {item.dot && (
                  <span className="absolute top-0 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white ring-1 ring-amber-400/40 animate-pulse" />
                )}
              </div>

              <span className="text-[11px] mt-0.5 tracking-tight whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
