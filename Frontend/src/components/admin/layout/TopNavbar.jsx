import { Bell, Menu, Moon, Sun } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useTheme } from "../../../contexts/ThemeContext"

const breadcrumbMap = {
  "/admin": "Dashboard",
  "/admin/contests": "Contests",
  "/admin/contests/create": "Create Contest",
  "/admin/questions": "Question Bank",
  "/admin/payments": "Payments",
  "/admin/analytics": "Analytics",
  "/admin/settings": "Settings",
}

function getBreadcrumb(pathname) {
  if (breadcrumbMap[pathname]) return breadcrumbMap[pathname]
  if (pathname.includes("/admin/contests/") && pathname.includes("/edit")) return "Edit Contest"
  if (pathname.includes("/admin/contests/")) return "Contest Detail"
  return "Admin"
}

export default function TopNavbar({ onMenuClick }) {
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const current = getBreadcrumb(location.pathname)

  return (
    <div className="h-[52px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-white/[0.07] flex items-center px-5 gap-3 shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12.5px]">
        <span className="text-slate-400 dark:text-slate-500">Admin</span>
        <span className="text-slate-300 dark:text-slate-600 text-[10px]">›</span>
        <span className="text-slate-800 dark:text-slate-100 font-medium">{current}</span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">

        {/* Theme toggle — properly animated pill switch */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {/* Pill track */}
          <div className={`relative w-[34px] h-[18px] rounded-full transition-colors duration-300 ${isDark ? "bg-indigo-500" : "bg-slate-300"}`}>
            {/* Knob */}
            <div
              className={`absolute top-[3px] w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                isDark ? "translate-x-[17px] left-[2px]" : "left-[2px] translate-x-0"
              }`}
            />
          </div>
          {/* Icon + label */}
          {isDark ? (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-[12px] font-medium text-slate-400 dark:text-slate-300">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[12px] font-medium text-slate-500">Light</span>
            </>
          )}
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-lg border border-slate-200 dark:border-white/[0.07] flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-slate-800" />
        </button>

        {/* Avatar */}
        <div className="w-[30px] h-[30px] rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold cursor-pointer">
          AD
        </div>
      </div>
    </div>
  )
}
