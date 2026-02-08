// SidebarNav.tsx - Sidebar navigation for Eclipse V2 (Story 1.4)
// Implements FR65 (4 nav items), NFR2 (<100ms feedback), NFR27 (keyboard accessible)

import { useEffect } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@application/stores'
import { PAGES, type Page } from '@domain/types'

type Language = 'fr' | 'en'

export type PageId = Page

interface NavItem {
  id: PageId
  labelKey: string
  icon: LucideIcon
  activeColor: string
}

// Build navItems from domain PAGES - filter out hidden pages
const navItems: NavItem[] = (Object.keys(PAGES) as Page[])
  .filter((pageId) => !PAGES[pageId].hidden)
  .map((pageId) => {
    const pageData = PAGES[pageId]
    const IconComponent = LucideIcons[pageData.icon as keyof typeof LucideIcons] as LucideIcon

    return {
      id: pageId,
      labelKey: pageData.labelKey,
      icon: IconComponent,
      activeColor: pageData.activeColor,
    }
  })

interface SidebarNavProps {
  currentPage: PageId
  onPageChange: (page: PageId) => void
}

export function SidebarNav({ currentPage, onPageChange }: SidebarNavProps) {
  const { t, i18n } = useTranslation()
  const setLanguage = useSettingsStore((state) => state.setLanguage)

  const currentLang = (i18n.language?.startsWith('fr') ? 'fr' : 'en') as Language

  // Sync tray language on mount (Story 10.5)
  useEffect(() => {
    window.electronAPI.tray.setLanguage(currentLang)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLanguageChange = (lang: Language) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('eclipse-language', lang)
    setLanguage(lang)
    // Sync tray menu language (Story 10.5)
    window.electronAPI.tray.setLanguage(lang)
  }

  const handleKeyDown = (e: React.KeyboardEvent, pageId: PageId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPageChange(pageId)
    }
  }

  const handleVersionClick = () => {
    onPageChange('credits')
  }

  const handleVersionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPageChange('credits')
    }
  }

  const isCreditsActive = currentPage === 'credits'

  return (
    <nav
      role="navigation"
      aria-label={t('nav.ariaLabel', 'Main navigation')}
      className="sidebar-nav w-[180px] min-w-[180px] h-full flex flex-col bg-[#050505]/60 border-r border-white/5"
    >


      {/* Navigation items */}
      <div className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id
          const Icon = item.icon

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onPageChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              className={`
                sidebar-item flex items-center gap-3 rounded-[10px] cursor-pointer
                text-[13px] transition-all duration-75
                ${isActive
                  ? 'sidebar-item-active bg-gradient-to-r from-[rgba(251,191,36,0.15)] to-transparent text-text-primary border-l-[3px] border-[#fbbf24] py-3 pr-[14px] pl-[11px]'
                  : 'text-text-secondary hover:bg-white/5 hover:text-text-primary py-3 px-[14px]'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={18}
                style={{ color: isActive ? item.activeColor : undefined }}
                className={!isActive ? 'text-text-secondary' : ''}
              />
              <span>{t(item.labelKey)}</span>
            </div>
          )
        })}
      </div>

      {/* Footer with Credits & Communauté button */}
      <div className="px-2 pb-3 border-t border-white/5 pt-2">
        <div
          role="button"
          tabIndex={0}
          onClick={handleVersionClick}
          onKeyDown={handleVersionKeyDown}
          className={`
            sidebar-item flex items-center gap-3 rounded-[10px] cursor-pointer
            text-[13px] transition-all duration-75
            ${isCreditsActive
              ? 'sidebar-item-active bg-gradient-to-r from-[rgba(251,191,36,0.15)] to-transparent text-text-primary border-l-[3px] border-[#fbbf24] py-3 pr-[14px] pl-[11px]'
              : 'text-text-secondary hover:bg-white/5 hover:text-text-primary py-3 px-[14px]'
            }
          `}
          aria-current={isCreditsActive ? 'page' : undefined}
        >
          <LucideIcons.Heart
            size={18}
            style={{ color: isCreditsActive ? '#ec4899' : undefined }}
            className={!isCreditsActive ? 'text-text-secondary' : ''}
          />
          <span>{t('nav.credits')}</span>
        </div>

        {/* Language toggle */}
        <div className="flex items-center justify-center gap-1 mt-2 text-[11px]">
          <button
            onClick={() => handleLanguageChange('fr')}
            className={`px-2 py-1 rounded transition-all ${
              currentLang === 'fr'
                ? 'text-corona font-medium'
                : 'text-text-secondary/50 hover:text-text-secondary'
            }`}
          >
            FR
          </button>
          <span className="text-text-secondary/30">|</span>
          <button
            onClick={() => handleLanguageChange('en')}
            className={`px-2 py-1 rounded transition-all ${
              currentLang === 'en'
                ? 'text-corona font-medium'
                : 'text-text-secondary/50 hover:text-text-secondary'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </nav>
  )
}

export default SidebarNav
