import React, { useState, useEffect } from 'react';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';

const Sidebar = ({ items = [], activeId, onSelect, onLogout, initiallyOpen = true, title }) => {
  const [open, setOpen] = useState(initiallyOpen);

  useEffect(() => {
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('sidebar:toggle', { detail: { open: next } }));
    if (typeof onToggle === 'function') onToggle(next);
  };

  return (
    <aside className={`fixed h-screen bg-white shadow-xl border-r border-gray-200 flex flex-col transition-all duration-200 ${open ? 'w-64' : 'w-16'}`}>
      <div className="flex items-center justify-between p-3 border-b border-gray-100 h-20">
        <div className={`flex items-center gap-3 ${open ? '' : 'justify-center w-full'}`}>
          <div className="p-2 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Menu size={18} />
          </div>
          {open && (
            <div className="flex flex-col">
              <div className="text-sm font-bold text-gray-800">{title || 'Centro Innovug'}</div>
              <div className="text-xs text-gray-500">Panel</div>
            </div>
          )}
        </div>

        <button onClick={handleToggle} className="text-gray-500 hover:text-gray-700 rounded-full p-2">
          {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onSelect && onSelect(it.id)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition text-sm ${activeId === it.id ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <div className="flex items-center justify-center w-6 h-6">{it.icon}</div>
            {open && <span className="font-semibold">{it.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t">
        {open ? (
          <button
            onClick={onLogout}
            className="w-full bg-red-500 text-white py-2 rounded-xl font-semibold hover:bg-red-600"
          >
            Cerrar Sesión
          </button>
        ) : (
          <button onClick={onLogout} className="w-full bg-red-500 text-white py-2 rounded-xl font-semibold hover:bg-red-600">
            <span className="sr-only">Cerrar Sesión</span>
            {/* pequeño punto visible cuando está colapsado */}
            <div className="w-3 h-3 rounded-full bg-white mx-auto"></div>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
