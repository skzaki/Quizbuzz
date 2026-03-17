import {
  BarChart3,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
  Trophy,
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuth } from "../../../contexts/AuthContext"
import { cn } from "../../../lib/utils"

const navItems = [
  {
    section: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
      { label: "Contests", icon: Trophy, to: "/admin/contests", badge: null },
      { label: "Questions", icon: HelpCircle, to: "/admin/questions", badge: null },
      { label: "Payments", icon: CreditCard, to: "/admin/payments" },
      { label: "Analytics", icon: BarChart3, to: "/admin/analytics", live: true },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Settings", icon: Settings, to: "/admin/settings" },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD"

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-[210px] bg-[#0f172a]",
          "transform transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 h-[52px] px-4 border-b border-white/[0.07] shrink-0">
          <div className="w-[26px] h-[26px] bg-indigo-500 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
            Q
          </div>
          <span className="text-sm font-semibold text-slate-100">QuizBuzz</span>
          <span className="text-[9px] font-semibold bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded">
            ADMIN
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {navItems.map((group) => (
            <div key={group.section} className="mb-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 py-1.5">
                {group.section}
              </p>
              {group.items.map((item) => {
                const isActive =
                  item.to === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(item.to)

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-[7px] rounded-lg",
                      "text-[13px] font-medium mb-0.5 transition-all duration-150",
                      isActive
                        ? "bg-indigo-500/15 text-indigo-300"
                        : "text-slate-500 hover:bg-white/[0.06] hover:text-slate-300"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-[14px] h-[14px] shrink-0",
                        isActive ? "opacity-100" : "opacity-70"
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.live && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    )}
                  </NavLink>
                )
              })}

              {group.section === "Main" && (
                <div className="h-px bg-white/[0.07] my-2 mx-2" />
              )}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-2 border-t border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-[7px] rounded-lg">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-slate-100 truncate">
                {user?.name || "Admin"}
              </p>
              <p className="text-[11px] text-slate-500">Super Admin</p>
            </div>
            <button
              onClick={logout}
              className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
