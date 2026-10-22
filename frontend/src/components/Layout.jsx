import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/invoices", label: "Invoices" },
  { to: "/payments", label: "Payments" },
  { to: "/exceptions", label: "Exception Queue" },
  { to: "/settings", label: "Settings" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/login");
  }

  const desktopLinkClass = ({ isActive }) =>
    `text-sm whitespace-nowrap ${
      isActive ? "text-white font-medium" : "text-gray-300 hover:text-white"
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `block px-4 py-3 text-sm rounded ${
      isActive
        ? "bg-slate-800 text-white font-medium"
        : "text-gray-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <nav className="bg-slate-900 text-white">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <span className="font-bold text-lg">Remitpulse</span>
            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={desktopLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-sm min-w-0">
            <span className="text-gray-300 truncate max-w-[200px]">{user?.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="bg-slate-700 px-3 py-1 rounded hover:bg-slate-600"
            >
              Logout
            </button>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded hover:bg-slate-800"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 px-2 py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2 border-t border-slate-800 px-4 pt-3 pb-2">
              <p className="text-xs text-gray-400 truncate mb-3">{user?.email}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-slate-700 px-3 py-2 rounded text-sm hover:bg-slate-600"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}