export const PAGES = {
  dashboard: {
    labelKey: "nav.dashboard",
    icon: "LayoutDashboard",
    activeColor: "#f97316",
    hidden: false
  },
  settings: {
    labelKey: "nav.settings",
    icon: "Settings",
    activeColor: "#8b5cf6",
    hidden: false
  },
  applications: {
    labelKey: "nav.applications",
    icon: "AppWindow",
    activeColor: "#22c55e",
    hidden: false
  },
  help: {
    labelKey: "nav.help",
    icon: "HelpCircle",
    activeColor: "#3b82f6",
    hidden: false
  },
  credits: {
    labelKey: "nav.credits",
    icon: "Heart",
    activeColor: "#ec4899",
    hidden: true  // Not shown in main sidebar nav
  },
} as const;

export type Page = keyof typeof PAGES;
export type PageMetadata = typeof PAGES[Page];
