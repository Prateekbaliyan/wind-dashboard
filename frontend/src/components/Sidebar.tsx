import { 
  BarChart2, 
  LineChart, 
  Layers, 
  History, 
  Table, 
  Activity 
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSelectSection: (section: string) => void;
  isDemo: boolean;
  dataSource: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isDemo,
  dataSource
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview & KPIs', icon: BarChart2 },
    { id: 'chart', label: 'Generation Chart', icon: LineChart },
    { id: 'accuracy', label: 'Accuracy Analysis', icon: Layers },
    { id: 'history', label: 'Publication History', icon: History },
    { id: 'data', label: 'Interval Data Table', icon: Table },
  ];

  const handleNavClick = (id: string) => {
    onSelectSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none z-30">
      
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center text-white">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-tight">
              UK Energy Analytics
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Wind Procurement Desk
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        <div className="px-2.5 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition text-left ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Connection & Meta Information */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-[11px] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Status:</span>
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <span className={`w-2 h-2 rounded-full ${isDemo ? 'bg-amber-500' : 'bg-emerald-600'}`} />
            {isDemo ? 'Demo Mode' : 'Connected'}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 text-slate-500">
          <span>Source:</span>
          <span className="font-mono text-[10px] text-slate-700 truncate" title={dataSource}>
            {dataSource}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-500">
          <span>Delivery:</span>
          <span className="text-slate-700 font-medium">Jan 2026</span>
        </div>

        <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Version 1.0.0</span>
          <span className="text-slate-500">Production</span>
        </div>
      </div>

    </aside>
  );
};
