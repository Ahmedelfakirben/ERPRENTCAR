import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, CarFront, FileText, Users, DollarSign, Flag, Settings as SettingsIcon, Bell, LogOut, Menu, X, CalendarDays, ChevronUp } from 'lucide-react';
import Logo201M from './Logo201M';
import { supabase } from '../../lib/supabase';
import { fetchAppNotifications } from '../../lib/notifications';
import type { AppNotification } from '../../lib/notifications';
import PageTransition from './PageTransition';
import './Layout.css';

const Layout = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  useEffect(() => {
    // Apply saved theme on mount
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    loadNotifications();
    const interval = setInterval(loadNotifications, 300000); // Refresca cada 5 min
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await fetchAppNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };



  return (
    <div className={`app-container ${isMobileMenuOpen ? 'mobile-menu-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Top Bar */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <Logo201M size="sm" />
          <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Overlay only for expanded mobile menu */}
      {isMobileMenuOpen && !isCollapsed && (
        <div className="mobile-overlay" onClick={() => { setIsMobileMenuOpen(false); setIsCollapsed(true); }} />
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'show' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div 
          className="sidebar-header" 
          style={{ justifyContent: 'center', padding: isCollapsed ? '1.5rem 0.5rem' : '2.25rem 1.5rem', cursor: 'pointer' }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isAr ? (isCollapsed ? 'توسيع القائمة' : 'تصغير القائمة') : (isCollapsed ? 'Agrandir le menu' : 'Réduire le menu')}
        >
          <Logo201M size={isCollapsed ? 'xs' : 'md'} variant="default" className="sidebar-logo-anim" />
          
          <button className="mobile-close-btn" onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(false); }} style={{ position: 'absolute', right: '1rem' }}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {/* Group 1: Main */}
          <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <div className="sidebar-icon"><LayoutDashboard size={20} /></div>
            <span>{t('sidebar.dashboard')}</span>
          </NavLink>

          <div className="sidebar-separator" />

          {/* Group 2: Fleet & Contracts */}
          <NavLink to="/fleet" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <div className="sidebar-icon"><CarFront size={20} /></div>
            <span>{t('sidebar.fleet')}</span>
          </NavLink>
          <NavLink to="/planning" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <div className="sidebar-icon"><CalendarDays size={20} /></div>
            <span>{isAr ? 'التخطيط' : 'Planning'}</span>
          </NavLink>
          <NavLink to="/contracts" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <div className="sidebar-icon"><FileText size={20} /></div>
            <span>{t('sidebar.contracts')}</span>
          </NavLink>

          <div className="sidebar-separator" />

          {/* Group 3: Business */}
          <NavLink to="/crm" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <div className="sidebar-icon"><Users size={20} /></div>
            <span>{t('sidebar.crm')}</span>
          </NavLink>
          <NavLink to="/finance" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <div className="sidebar-icon"><DollarSign size={20} /></div>
            <span>{t('sidebar.finance')}</span>
          </NavLink>
          <NavLink to="/morocco" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <div className="sidebar-icon"><Flag size={20} /></div>
            <span>{t('sidebar.morocco')}</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Notifications integrated in footer */}
          <div className="notification-wrapper" style={{ width: '100%' }}>
             <NavLink 
               to="/alerts" 
               onClick={() => setIsMobileMenuOpen(false)} 
               className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
               style={{ 
                 margin: 0, 
                 padding: '0.65rem 0.875rem', 
                 borderRadius: 'var(--r-md)',
                 background: 'rgba(255,255,255,0.03)',
                 border: '1px solid rgba(255,255,255,0.05)',
                 justifyContent: 'space-between'
               }}
             >
                <div className="flex items-center gap-3">
                  <Bell size={18} />
                  <span style={{ fontSize: '0.875rem' }}>{isAr ? 'التنبيهات' : 'Notifications'}</span>
                </div>
                {notifications.length > 0 && (
                  <span style={{ 
                    background: 'var(--gold)', 
                    color: '#000', 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    padding: '2px 6px', 
                    borderRadius: '10px',
                    minWidth: '18px',
                    textAlign: 'center'
                  }}>
                    {notifications.length}
                  </span>
                )}
             </NavLink>
          </div>

          {/* Single user button with dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '0.75rem',
                borderRadius: 'var(--r-md)',
                background: showUserMenu ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showUserMenu ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
              }}
            >
              <div className="user-avatar"><span>AD</span></div>
              <div className="user-info" style={{ flex: 1 }}>
                <span className="user-name">Admin</span>
                <span className="user-role">VIP Access</span>
              </div>
              <ChevronUp size={16} style={{ color: 'var(--sidebar-text)', transform: showUserMenu ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease', flexShrink: 0 }} />
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: isCollapsed ? (isAr ? 'auto' : '0') : '0',
                right: isCollapsed ? (isAr ? '0' : 'auto') : '0',
                width: isCollapsed ? '180px' : '100%',
                minWidth: isCollapsed ? '180px' : '0',
                background: '#1C2535',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--r-lg)',
                overflow: 'hidden',
                boxShadow: '0 -8px 30px rgba(0,0,0,0.4)',
                animation: 'scaleIn 0.18s ease',
                zIndex: 1100,
              }}>
                <NavLink
                  to="/settings"
                  onClick={() => { setIsMobileMenuOpen(false); setShowUserMenu(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', color: 'var(--sidebar-text)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, transition: 'background 0.15s', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <SettingsIcon size={16} color="var(--gold)" />
                  <span>{t('sidebar.settings')}</span>
                </NavLink>
                <button
                  onClick={() => { setShowUserMenu(false); handleLogout(); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', color: 'var(--error)', background: 'transparent', border: 'none', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <LogOut size={16} />
                  <span>{isAr ? 'تسجيل الخروج' : 'Déconnexion'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="main-content" style={{ position: 'relative' }}>
        <PageTransition />
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
