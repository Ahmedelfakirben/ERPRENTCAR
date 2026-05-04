import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, CheckCircle2, ArrowRight, ShieldAlert, RefreshCw } from 'lucide-react';
import PageLoader from '../components/layout/PageLoader';
import { fetchAppNotifications, type AppNotification } from '../lib/notifications';

const severityConfig: Record<string, { color: string; bg: string; border: string; icon: any; label: string; labelAr: string }> = {
  error:   { color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.5)',   icon: ShieldAlert,    label: 'URGENT',  labelAr: 'عاجل' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.5)',  icon: AlertTriangle,  label: 'ATTENTION', labelAr: 'تنبيه' },
  info:    { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.4)',  icon: Clock,          label: 'INFO',    labelAr: 'معلومة' },
};

const Alerts = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchAppNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    error:   notifications.filter(n => n.severity === 'error').length,
    warning: notifications.filter(n => n.severity === 'warning').length,
    info:    notifications.filter(n => n.severity === 'info').length,
  };

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.severity === filter);

  return (
    <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
         className="animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={22} color="var(--gold)" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>
                {isAr ? 'مركز التنبيهات' : "Centre d'Alertes"}
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-2)', marginTop: 2 }}>
                {isAr ? `${notifications.length} تنبيه نشط` : `${notifications.length} alerte${notifications.length !== 1 ? 's' : ''} active${notifications.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>
        <button className="btn btn-outline" onClick={loadNotifications} style={{ gap: '0.5rem' }}>
          <RefreshCw size={15} /> {isAr ? 'تحديث' : 'Actualiser'}
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {(['error', 'warning', 'info'] as const).map(sev => {
          const cfg = severityConfig[sev];
          const Icon = cfg.icon;
          const isActive = filter === sev;
          return (
            <button
              key={sev}
              onClick={() => setFilter(isActive ? 'all' : sev)}
              style={{
                background: isActive ? cfg.bg : 'var(--surface)',
                border: `1px solid ${isActive ? cfg.border : 'var(--border)'}`,
                borderRadius: 14,
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                boxShadow: isActive ? `0 4px 20px ${cfg.color}22` : 'var(--shadow-sm)',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={cfg.color} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: cfg.color, lineHeight: 1 }}>{counts[sev]}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                  {isAr ? cfg.labelAr : cfg.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <PageLoader />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={40} color="var(--success)" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
              {isAr ? 'لا توجد تنبيهات' : 'Aucune alerte'}
            </h3>
            <p style={{ color: 'var(--text-2)', maxWidth: 360, margin: 0, lineHeight: 1.6 }}>
              {isAr ? 'لا توجد عقود متأخرة أو وثائق منتهية الصلاحية.' : "Tout est en ordre. Aucun contrat en retard ou document expiré."}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((n, idx) => {
              const sev = (n.severity in severityConfig) ? n.severity : 'info';
              const cfg = severityConfig[sev];
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => navigate(n.link)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '1.25rem 1.5rem',
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    borderLeft: `4px solid ${cfg.color}`,
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    flexWrap: 'wrap',
                    animation: `fadeInUp 0.4s ${idx * 0.05}s both`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = cfg.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{isAr ? n.title_ar : n.title}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', padding: '2px 8px', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, textTransform: 'uppercase' }}>
                          {isAr ? cfg.labelAr : cfg.label}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                        {isAr ? n.description_ar : n.description}
                      </p>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600, marginTop: 6, display: 'block', fontFamily: 'monospace' }}>
                        {n.date}
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" style={{ flexShrink: 0, borderColor: cfg.border, color: cfg.color }}>
                    {isAr ? 'عرض' : 'Voir'} <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
