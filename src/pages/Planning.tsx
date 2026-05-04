import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Loader2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Contracts.css';

const monthNames: Record<string, string[]> = {
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
};

const dayNames: Record<string, string[]> = {
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  ar: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
};

const Planning = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const lang = isAr ? 'ar' : 'fr';
  
  const [contracts, setContracts] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View States
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractsRes, vehiclesRes] = await Promise.all([
        supabase
          .from('contracts')
          .select('*, clients (full_name, full_name_ar), vehicles (brand, model, plate)')
          .in('status', ['active', 'pending', 'cancelled']),
        supabase
          .from('vehicles')
          .select('*')
          .order('brand')
      ]);

      if (contractsRes.error) throw contractsRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;

      setContracts(contractsRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Date Helpers
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getRange = (date: Date, mode: string) => {
    if (mode === 'month') {
      return { 
        start: new Date(date.getFullYear(), date.getMonth(), 1), 
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0) 
      };
    } else if (mode === 'week') {
      const start = getStartOfWeek(date);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    } else {
      return {
        start: new Date(date.getFullYear(), 0, 1),
        end: new Date(date.getFullYear(), 11, 31)
      };
    }
  };

  const range = getRange(currentDate, viewMode);
  
  // Columns Calculation
  const getColumns = () => {
    if (viewMode === 'year') {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(range.start.getFullYear(), i, 1);
        return { label: monthNames[lang][i].substring(0, 3), date: d, isMonth: true };
      });
    }
    const totalDays = Math.round((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(range.start);
      d.setDate(range.start.getDate() + i);
      return { label: d.getDate().toString(), date: d, isMonth: false };
    });
  };

  const columns = getColumns();
  const totalSlots = columns.length;

  const handlePrev = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === 'month') nextDate.setMonth(currentDate.getMonth() - 1);
    else if (viewMode === 'week') nextDate.setDate(currentDate.getDate() - 7);
    else nextDate.setFullYear(currentDate.getFullYear() - 1);
    setCurrentDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === 'month') nextDate.setMonth(currentDate.getMonth() + 1);
    else if (viewMode === 'week') nextDate.setDate(currentDate.getDate() + 7);
    else nextDate.setFullYear(currentDate.getFullYear() + 1);
    setCurrentDate(nextDate);
  };



  const formatDateLabel = () => {
    if (viewMode === 'year') return currentDate.getFullYear().toString();
    if (viewMode === 'month') return `${monthNames[lang][currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    const start = range.start.getDate();
    const end = range.end.getDate();
    const startMonth = monthNames[lang][range.start.getMonth()].substring(0, 3);
    const endMonth = monthNames[lang][range.end.getMonth()].substring(0, 3);
    return `${start} ${startMonth} - ${end} ${endMonth} ${range.end.getFullYear()}`;
  };

  // Bar Position Logic
  const getBarStyles = (startDate: string, endDate: string) => {
    const contractStart = new Date(startDate);
    const contractEnd = new Date(endDate);
    
    if (contractEnd < range.start || contractStart > range.end) return null;

    const viewStart = contractStart < range.start ? range.start : contractStart;
    const viewEnd = contractEnd > range.end ? range.end : contractEnd;

    let left = 0;
    let width = 0;

    if (viewMode === 'year') {
      // Calculate fraction of the year
      const startMonth = viewStart.getMonth();
      const startDay = viewStart.getDate();
      const daysInStartMonth = new Date(viewStart.getFullYear(), startMonth + 1, 0).getDate();
      
      const endMonth = viewEnd.getMonth();
      const endDay = viewEnd.getDate();
      const daysInEndMonth = new Date(viewEnd.getFullYear(), endMonth + 1, 0).getDate();

      const startPos = startMonth + (startDay - 1) / daysInStartMonth;
      const endPos = endMonth + (endDay) / daysInEndMonth;

      left = (startPos / 12) * 100;
      width = ((endPos - startPos) / 12) * 100;
    } else {
      const diffStart = Math.floor((viewStart.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
      const diffDays = Math.round((viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      left = (diffStart / totalSlots) * 100;
      width = (diffDays / totalSlots) * 100;
    }

    return { 
      left: `${left}%`, 
      width: `${width}%`,
      opacity: (contractStart < range.start || contractEnd > range.end) ? 0.85 : 1,
      borderRadius: (contractStart < range.start ? '0 6px 6px 0' : (contractEnd > range.end ? '6px 0 0 6px' : '6px'))
    };
  };

  return (
    <div className="contracts-page animate-fade-in">
      <div className="card gantt-card">
        <div className="gantt-header-bar flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="tab-bar no-print">
              <button className={`tab ${viewMode === 'week' ? 'tab-active' : ''}`} onClick={() => setViewMode('week')}>
                {isAr ? 'أسبوعي' : 'Semaine'}
              </button>
              <button className={`tab ${viewMode === 'month' ? 'tab-active' : ''}`} onClick={() => setViewMode('month')}>
                {isAr ? 'شهري' : 'Mois'}
              </button>
              <button className={`tab ${viewMode === 'year' ? 'tab-active' : ''}`} onClick={() => setViewMode('year')}>
                {isAr ? 'سنوي' : 'Année'}
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <h3 className="month-label" style={{ minWidth: viewMode === 'week' ? '180px' : '140px' }}>{formatDateLabel()}</h3>
              <div className="flex gap-1 no-print">
                <button className="btn btn-ghost btn-sm" onClick={handlePrev}><ChevronLeft size={18} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date())} title={isAr ? 'اليوم' : "Aujourd'hui"}><Clock size={16} /></button>
                <button className="btn btn-ghost btn-sm" onClick={handleNext}><ChevronRight size={18} /></button>
              </div>
            </div>
          </div>
          
          <div className="gantt-legend no-print">
            <div className="legend-item"><span className="dot dot-active"></span> {isAr ? 'نشط' : 'Actif'}</div>
            <div className="legend-item"><span className="dot dot-pending"></span> {isAr ? 'معلق' : 'En attente'}</div>
            <div className="legend-item"><span className="dot" style={{ background: 'var(--warning)' }}></span> {isAr ? 'ورشة' : 'Atelier'}</div>
            <div className="legend-item"><span className="dot" style={{ background: 'var(--error)' }}></span> {isAr ? 'محظور' : 'Bloqué'}</div>
            <div className="legend-item"><span className="dot" style={{ background: '#64748b' }}></span> {isAr ? 'ملغى' : 'Annulé'}</div>
          </div>
        </div>
        
        <div className="gantt-wrapper">
          <div className="gantt-table" style={{ minWidth: viewMode === 'week' ? '800px' : (viewMode === 'year' ? '1000px' : '1200px') }}>
            {/* Header row */}
            <div className="gantt-row gantt-row-header">
              <div className="gantt-label-cell" style={{ height: 'auto' }}>{isAr ? 'الأسطول' : 'Flotte'}</div>
              <div className="gantt-timeline">
                {columns.map((col, idx) => {
                  const isToday = !col.isMonth && col.date.toDateString() === new Date().toDateString();
                  const isCurrentMonth = col.isMonth && col.date.getMonth() === new Date().getMonth() && col.date.getFullYear() === new Date().getFullYear();
                  return (
                    <div className={`gantt-day-header ${(isToday || isCurrentMonth) ? 'bg-gold-light' : ''}`} key={idx}>
                      <div className="flex flex-col items-center">
                        {!col.isMonth && <span className="text-[9px] opacity-60 uppercase">{dayNames[lang][col.date.getDay()]}</span>}
                        <span className="day-num" style={{ color: (isToday || isCurrentMonth) ? 'var(--gold)' : 'inherit' }}>{col.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Vehicle rows */}
            {loading ? (
              <div className="p-12 text-center"><Loader2 className="animate-spin text-primary inline-block" /></div>
            ) : vehicles.map(v => {
              const vehicleContracts = contracts.filter(c => c.vehicle_id === v.id);

              return (
                <div className="gantt-row" key={v.id}>
                  <div className="gantt-label-cell">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm truncate" style={{ maxWidth: '100px' }}>{v.brand} {v.model}</span>
                      {v.status !== 'available' && v.status !== 'rented' && (
                        <div 
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-extrabold uppercase tracking-tighter ${
                            v.status === 'maintenance' 
                              ? 'bg-warning/10 text-warning border-warning/20' 
                              : 'bg-error/10 text-error border-error/20'
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${v.status === 'maintenance' ? 'bg-warning' : 'bg-error'}`} />
                          {v.status === 'maintenance' ? (isAr ? 'ورشة' : 'Atelier') : (isAr ? 'محظور' : 'Bloqué')}
                        </div>
                      )}
                    </div>
                    <span className="text-secondary font-mono" style={{ fontSize: '9px' }}>{v.plate}</span>
                  </div>
                  <div className="gantt-timeline">
                    {columns.map((_, idx) => <div className="gantt-day-grid" key={idx}></div>)}
                    
                    {vehicleContracts.map(c => {
                      const styles = getBarStyles(c.start_date, c.end_date);
                      if (!styles) return null;
                      const clientName = isAr ? (c.clients?.full_name_ar || c.clients?.full_name) : c.clients?.full_name;

                      return (
                        <div
                          key={c.id}
                          className={`gantt-bar-floating ${c.status}`}
                          style={styles}
                          onClick={() => navigate(`/contracts/${c.id}`)}
                          title={`${clientName}\n${c.start_date} → ${c.end_date}`}
                        >
                          <span className="gantt-bar-label">{clientName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Planning;
