import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, Car, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const monthNames: Record<string, string[]> = {
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
};

const dayNamesShort: Record<string, string[]> = {
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  ar: ['أحد', 'إثن', 'ثلث', 'أرب', 'خمس', 'جمع', 'سبت']
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; label_fr: string; label_ar: string }> = {
  active:    { bg: 'rgba(16,185,129,0.85)',  border: '#059669', text: '#fff', label_fr: 'Actif',     label_ar: 'نشط' },
  pending:   { bg: 'rgba(245,158,11,0.85)',  border: '#B45309', text: '#fff', label_fr: 'En attente',label_ar: 'معلق' },
  completed: { bg: 'rgba(99,102,241,0.80)',  border: '#4F46E5', text: '#fff', label_fr: 'Terminé',   label_ar: 'منتهي' },
  cancelled: { bg: 'rgba(100,116,139,0.75)', border: '#475569', text: '#fff', label_fr: 'Annulé',    label_ar: 'ملغى' },
};

const Planning = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const lang = isAr ? 'ar' : 'fr';

  const [contracts, setContracts] = useState<any[]>([]);
  const [vehicles, setVehicles]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [viewMode, setViewMode]   = useState<'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tooltip, setTooltip]     = useState<{ visible: boolean; x: number; y: number; contract: any } | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, vRes] = await Promise.all([
        supabase.from('contracts')
          .select('*, clients(full_name, full_name_ar), vehicles(brand, model, plate)')
          .in('status', ['active', 'pending', 'completed', 'cancelled']),
        supabase.from('vehicles').select('*').order('brand')
      ]);
      if (cRes.error) throw cRes.error;
      if (vRes.error) throw vRes.error;
      setContracts(cRes.data || []);
      setVehicles(vRes.data || []);
    } catch (err) {
      console.error('Planning fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Range helpers ──
  const getMonthRange = (d: Date) => ({
    start: new Date(d.getFullYear(), d.getMonth(), 1),
    end:   new Date(d.getFullYear(), d.getMonth() + 1, 0),
  });

  const getWeekRange = (d: Date) => {
    const s = new Date(d);
    const day = s.getDay();
    s.setDate(s.getDate() - (day === 0 ? 6 : day - 1));
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return { start: s, end: e };
  };

  const range = viewMode === 'week' ? getWeekRange(currentDate) : getMonthRange(currentDate);

  const columns = (() => {
    const days: Date[] = [];
    const cur = new Date(range.start);
    while (cur <= range.end) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  })();

  const totalDays = columns.length;

  const nav = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const headerLabel = () => {
    if (viewMode === 'month') return `${monthNames[lang][currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    const s = range.start, e = range.end;
    return `${s.getDate()} ${monthNames[lang][s.getMonth()].slice(0,3)} – ${e.getDate()} ${monthNames[lang][e.getMonth()].slice(0,3)} ${e.getFullYear()}`;
  };

  // ── Bar position ──
  const getBar = (startStr: string, endStr: string) => {
    const cs = new Date(startStr), ce = new Date(endStr);
    if (ce < range.start || cs > range.end) return null;
    const vs = cs < range.start ? range.start : cs;
    const ve = ce > range.end   ? range.end   : ce;
    const diffLeft = Math.round((vs.getTime() - range.start.getTime()) / 86400000);
    const diffW    = Math.round((ve.getTime() - vs.getTime()) / 86400000) + 1;
    return {
      left: `${(diffLeft / totalDays) * 100}%`,
      width: `${Math.max(diffW / totalDays * 100, 100 / totalDays)}%`,
      clipped: cs < range.start || ce > range.end,
      borderRadius: cs < range.start ? '0 6px 6px 0' : ce > range.end ? '6px 0 0 6px' : '6px',
    };
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  // ── Stats ──
  const activeCount = contracts.filter(c => c.status === 'active').length;
  const pendingCount = contracts.filter(c => c.status === 'pending').length;
  const availableVehicles = vehicles.filter(v => v.status === 'available').length;

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: 0 }}>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        {[
          { label_fr: 'Contrats actifs', label_ar: 'عقود نشطة', value: activeCount, color: 'var(--success)', icon: '📋' },
          { label_fr: 'En attente',      label_ar: 'في الانتظار', value: pendingCount, color: 'var(--warning)', icon: '⏳' },
          { label_fr: 'Véhicules libres',label_ar: 'مركبات حرة', value: availableVehicles, color: 'var(--info)', icon: '🚗' },
          { label_fr: 'Total flotte',    label_ar: 'إجمالي الأسطول', value: vehicles.length, color: 'var(--gold)', icon: '🏁' },
        ].map((kpi, i) => (
          <div key={i} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{kpi.icon}</span>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600, marginTop: 2 }}>{isAr ? kpi.label_ar : kpi.label_fr}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Gantt Card ── */}
      <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* View mode */}
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              {(['week','month'] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  style={{
                    padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                    background: viewMode === m ? 'var(--gold-gradient)' : 'transparent',
                    color: viewMode === m ? '#1A1200' : 'var(--text-2)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {m === 'week' ? (isAr ? 'أسبوع' : 'Semaine') : (isAr ? 'شهر' : 'Mois')}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <button onClick={() => nav(-1)} className="btn btn-ghost btn-sm"><ChevronLeft size={18} /></button>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: '160px', textAlign: 'center' }}>{headerLabel()}</span>
            <button onClick={() => nav(1)}  className="btn btn-ghost btn-sm"><ChevronRight size={18} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="btn btn-outline btn-sm" style={{ gap: '4px' }}>
              <CalendarDays size={14} /> {isAr ? 'اليوم' : "Auj."}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {Object.entries(STATUS_COLORS).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-2)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: v.bg, display: 'inline-block', border: `1px solid ${v.border}` }} />
                  {isAr ? v.label_ar : v.label_fr}
                </div>
              ))}
            </div>
            <button onClick={fetchData} className="btn btn-ghost btn-sm"><RefreshCw size={15} /></button>
          </div>
        </div>

        {/* Gantt Grid */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ color: 'var(--gold)' }} size={36} /></div>
          ) : (
            <div style={{ minWidth: viewMode === 'week' ? '700px' : '1000px' }}>

              {/* Day header */}
              <div style={{ display: 'flex', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10, borderBottom: '2px solid var(--border)' }}>
                {/* vehicle label column */}
                <div style={{ width: 160, minWidth: 160, flexShrink: 0, padding: '0.6rem 1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderRight: '1px solid var(--border)' }}>
                  <Car size={14} style={{ display: 'inline', marginRight: 4 }} />{isAr ? 'الأسطول' : 'Flotte'}
                </div>
                {/* day columns */}
                <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                  {columns.map((d, i) => {
                    const isToday = d.getTime() === today.getTime();
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={i} style={{
                        flex: 1, textAlign: 'center', padding: '0.4rem 0',
                        fontSize: viewMode === 'month' ? '0.7rem' : '0.78rem',
                        fontWeight: isToday ? 800 : 600,
                        color: isToday ? 'var(--gold)' : isWeekend ? 'var(--text-3)' : 'var(--text-2)',
                        background: isToday ? 'rgba(255,107,0,0.07)' : isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent',
                        borderRight: '1px solid var(--border)',
                        position: 'relative',
                        minWidth: viewMode === 'month' ? '30px' : '80px',
                      }}>
                        {viewMode !== 'month' && <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{dayNamesShort[lang][d.getDay()]}</div>}
                        <div>{d.getDate()}</div>
                        {isToday && <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)' }} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vehicle rows */}
              {vehicles.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>{isAr ? 'لا توجد مركبات' : 'Aucun véhicule'}</div>
              ) : vehicles.map(v => {
                const vContracts = contracts.filter(c => c.vehicle_id === v.id);
                const isAvail = v.status === 'available';
                const isMaint = v.status === 'maintenance';

                return (
                  <div key={v.id} style={{ display: 'flex', borderBottom: '1px solid var(--border)', minHeight: '54px' }}
                    onMouseLeave={() => setTooltip(null)}>

                    {/* Label */}
                    <div style={{
                      width: 160, minWidth: 160, flexShrink: 0, padding: '0.6rem 1rem',
                      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
                      background: isMaint ? 'rgba(245,158,11,0.05)' : 'transparent',
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v.brand} {v.model}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'var(--text-3)' }}>{v.plate}</span>
                        {isMaint && <span style={{ fontSize: '0.6rem', background: 'rgba(245,158,11,0.15)', color: '#B45309', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>🔧</span>}
                        {v.status === 'blocked' && <span style={{ fontSize: '0.6rem', background: 'rgba(239,68,68,0.15)', color: '#B91C1C', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>🚫</span>}
                        {isAvail && vContracts.filter(c=>c.status==='active').length===0 && <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.12)', color: '#047857', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>✓</span>}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                      {/* Weekend shading + today line */}
                      {columns.map((d, i) => {
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isToday2 = d.getTime() === today.getTime();
                        return (
                          <div key={i} style={{
                            flex: 1, borderRight: '1px solid var(--border)',
                            background: isToday2 ? 'rgba(255,107,0,0.06)' : isWeekend ? 'rgba(0,0,0,0.025)' : 'transparent',
                            minWidth: viewMode === 'month' ? '30px' : '80px',
                          }} />
                        );
                      })}

                      {/* Maintenance / Blocked full-range bar */}
                      {(v.status === 'maintenance' || v.status === 'blocked') && (() => {
                        const isMaint2 = v.status === 'maintenance';
                        return (
                          <div style={{
                            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                            height: 28, left: 0, right: 0,
                            background: isMaint2
                              ? 'repeating-linear-gradient(45deg, rgba(245,158,11,0.18), rgba(245,158,11,0.18) 8px, rgba(245,158,11,0.07) 8px, rgba(245,158,11,0.07) 16px)'
                              : 'repeating-linear-gradient(45deg, rgba(239,68,68,0.18), rgba(239,68,68,0.18) 8px, rgba(239,68,68,0.07) 8px, rgba(239,68,68,0.07) 16px)',
                            border: `1px dashed ${isMaint2 ? 'rgba(245,158,11,0.5)' : 'rgba(239,68,68,0.5)'}`,
                            borderRadius: 6,
                            zIndex: 1,
                            display: 'flex', alignItems: 'center', paddingLeft: 10,
                            gap: 6,
                            pointerEvents: 'none',
                          }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isMaint2 ? '#B45309' : '#B91C1C' }}>
                              {isMaint2 ? (isAr ? '🔧 في الورشة' : '🔧 En maintenance') : (isAr ? '🚫 محظور' : '🚫 Bloqué')}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Contract bars */}
                      {vContracts.map(c => {
                        const bar = getBar(c.start_date, c.end_date);
                        if (!bar) return null;
                        const sc = STATUS_COLORS[c.status] || STATUS_COLORS.cancelled;
                        const clientName = isAr ? (c.clients?.full_name_ar || c.clients?.full_name) : c.clients?.full_name;
                        return (
                          <div key={c.id}
                            onClick={() => navigate(`/contracts/${c.id}`)}
                            onMouseEnter={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, contract: c })}
                            onMouseMove={(e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                            style={{
                              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                              height: 28, left: bar.left, width: bar.width,
                              background: sc.bg, border: `1px solid ${sc.border}`,
                              borderRadius: bar.borderRadius,
                              cursor: 'pointer', zIndex: 2,
                              display: 'flex', alignItems: 'center', paddingLeft: 8,
                              overflow: 'hidden', transition: 'filter 0.15s, transform 0.15s',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            }}
                            className="gantt-bar-hover"
                          >
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: sc.text, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {clientName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip?.visible && tooltip.contract && (() => {
        const c = tooltip.contract;
        const sc = STATUS_COLORS[c.status] || STATUS_COLORS.cancelled;
        const clientName = isAr ? (c.clients?.full_name_ar || c.clients?.full_name) : c.clients?.full_name;
        return (
          <div style={{
            position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10,
            background: 'var(--surface)', border: `2px solid ${sc.border}`,
            borderRadius: 10, padding: '0.75rem 1rem', zIndex: 99999,
            boxShadow: 'var(--shadow-lg)', pointerEvents: 'none', minWidth: 200,
          }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 4 }}>{clientName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span>🚗 {c.vehicles?.brand} {c.vehicles?.model} — {c.vehicles?.plate}</span>
              <span>📅 {c.start_date} → {c.end_date}</span>
              <span style={{ color: sc.border, fontWeight: 700 }}>● {isAr ? sc.label_ar : sc.label_fr}</span>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default Planning;
