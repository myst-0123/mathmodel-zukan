import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { categories } from '../../data/modelRegistry';

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

function buildOpenState(pathname: string): Record<string, boolean> {
  return categories.reduce<Record<string, boolean>>((acc, cat) => {
    acc[cat.id] = cat.models.some((m) => m.path === pathname);
    return acc;
  }, {});
}

export default function Sidebar() {
  const location = useLocation();

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => buildOpenState(location.pathname)
  );

  useEffect(() => {
    setOpenCategories((prev) => {
      const next = { ...prev };
      categories.forEach((cat) => {
        if (cat.models.some((m) => m.path === location.pathname)) {
          next[cat.id] = true;
        }
      });
      return next;
    });
  }, [location.pathname]);

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-700">
        <NavLink to="/" className="block">
          <h1 className="text-base font-bold leading-tight text-white">数理モデル図鑑</h1>
          <p className="text-xs text-gray-400 mt-0.5">Mathematical Models</p>
        </NavLink>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white hover:bg-gray-800 rounded-md mx-2 transition-colors"
                style={{ width: 'calc(100% - 16px)' }}
              >
                <span>{cat.name}</span>
                <ChevronIcon open={!!openCategories[cat.id]} />
              </button>

              {openCategories[cat.id] && (
                <ul className="mt-1 mb-1">
                  {cat.models.map((model) => (
                    <li key={model.id}>
                      <NavLink
                        to={model.path}
                        className={({ isActive }) =>
                          `block pl-8 pr-4 py-1.5 text-sm rounded-md mx-2 transition-colors ${
                            isActive
                              ? 'bg-indigo-600 text-white font-medium'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`
                        }
                      >
                        {model.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
        Interactive Math Models
      </div>
    </aside>
  );
}
