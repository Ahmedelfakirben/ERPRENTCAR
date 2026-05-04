import React, { useRef } from 'react';
import './DamageMap.css';

import topViewImg from '../assets/car-renders/side_right.png';
import sideViewImg from '../assets/car-renders/side.png';
import frontViewImg from '../assets/car-renders/front.png';
import backViewImg from '../assets/car-renders/back.png';

export interface DamagePoint {
  id: string;
  x: number;
  y: number;
  type: 'scratch' | 'dent' | 'broken';
  view: string;
  note?: string;
  photo?: string; // base64 or URL
  status?: 'active' | 'repaired';
}

interface DamageMapProps {
  damages: DamagePoint[];
  previousDamages?: DamagePoint[];
  onChange?: (damages: DamagePoint[]) => void;
  readOnly?: boolean;
  isAr?: boolean;
}

const DamageMap: React.FC<DamageMapProps> = ({
  damages,
  previousDamages = [],
  onChange,
  readOnly = false,
  isAr = false
}) => {
  const [activeView, setActiveView] = React.useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = React.useState<{ x: number; y: number; view: string } | null>(null);
  const [damageForm, setDamageForm] = React.useState<{ type: 'scratch' | 'dent' | 'broken'; note: string; photo: string }>({
    type: 'scratch', note: '', photo: ''
  });
  const [selectedDamage, setSelectedDamage] = React.useState<DamagePoint | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = React.useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleClickOnZoom = (view: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPoint({ x, y, view });
    setDamageForm({ type: 'scratch', note: '', photo: '' });
  };

  const handleConfirmDamage = () => {
    if (!pendingPoint || !onChange) return;
    const newDamage: DamagePoint = {
      id: Math.random().toString(36).substr(2, 9),
      x: pendingPoint.x,
      y: pendingPoint.y,
      type: damageForm.type,
      view: pendingPoint.view,
      note: damageForm.note,
      photo: damageForm.photo,
      status: 'active'
    };
    onChange([...damages, newDamage]);
    setPendingPoint(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDamageForm(f => ({ ...f, photo: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeDamage = (id: string) => {
    if (readOnly || !onChange) return;
    onChange(damages.filter(d => d.id !== id));
  };

  const renderMarkers = (view: string, list: DamagePoint[], isPrevious = false) => {
    return list
      .filter(d => d.view === view && d.status !== 'repaired')
      .map(d => (
        <div
          key={d.id}
          className={`damage-dot ${isPrevious ? 'dot-previous' : ''}`}
          style={{ left: `${d.x}%`, top: `${d.y}%` }}
          onClick={(e) => {
            e.stopPropagation();
            if (isPrevious) {
              setSelectedDamage(d);
            } else {
              setSelectedDamage(d);
            }
          }}
          title={d.note || (isPrevious ? (isAr ? 'ضرر سابق' : 'Dégât existant') : '')}
        >
          <div className="dot-core" />
          {!isPrevious && <div className="dot-ripple" />}
        </div>
      ));
  };

  const typeLabels = {
    scratch: isAr ? 'خدش' : 'Rayure',
    dent: isAr ? 'دنت' : 'Bosse',
    broken: isAr ? 'كسر' : 'Cassé',
  };

  return (
    <div className="damage-map-3d">
      <div className="damage-grid-2x2">
        <div className="view-container" onClick={() => setActiveView('side')}>
          <div className="image-wrapper">
            <img src={sideViewImg} alt="Side Left" className="car-render" />
            {renderMarkers('side', previousDamages, true)}
            {renderMarkers('side', damages)}
          </div>
        </div>
        <div className="view-container" onClick={() => setActiveView('top')}>
          <div className="image-wrapper">
            <img src={topViewImg} alt="Side Right" className="car-render" />
            {renderMarkers('top', previousDamages, true)}
            {renderMarkers('top', damages)}
          </div>
        </div>
        <div className="view-container" onClick={() => setActiveView('front')}>
          <div className="image-wrapper">
            <img src={frontViewImg} alt="Front" className="car-render" />
            {renderMarkers('front', previousDamages, true)}
            {renderMarkers('front', damages)}
          </div>
        </div>
        <div className="view-container" onClick={() => setActiveView('back')}>
          <div className="image-wrapper">
            <img src={backViewImg} alt="Back" className="car-render" />
            {renderMarkers('back', previousDamages, true)}
            {renderMarkers('back', damages)}
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="damage-tip">
          <div className="tip-icon" />
          {isAr ? 'انقر على السيارة لتكبير الصورة وإضافة الأضرار' : 'Cliquez sur une vue pour l\'agrandir et ajouter des dommages'}
        </div>
      )}

      {/* Zoom Modal */}
      {activeView && (
        <div className="damage-zoom-overlay" onClick={() => { setActiveView(null); setPendingPoint(null); }}>
          <div className="zoom-modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="zoom-header">
              <span className="zoom-title">
                {activeView === 'side' && (isAr ? 'الجانب الأيسر' : 'Profil Gauche')}
                {activeView === 'top' && (isAr ? 'الجانب الأيمن' : 'Profil Droit')}
                {activeView === 'front' && (isAr ? 'الأمام' : 'Vue Avant')}
                {activeView === 'back' && (isAr ? 'الخلف' : 'Vue Arrière')}
              </span>
              <button className="zoom-close" onClick={() => { setActiveView(null); setPendingPoint(null); }}>×</button>
            </div>

            <div className="zoom-image-container" onClick={(e) => !pendingPoint && handleClickOnZoom(activeView, e)}>
              <img
                src={
                  activeView === 'side' ? sideViewImg :
                  activeView === 'top' ? topViewImg :
                  activeView === 'front' ? frontViewImg :
                  backViewImg
                }
                alt="Zoomed Car"
                className="zoomed-car"
              />
              {renderMarkers(activeView, previousDamages, true)}
              {renderMarkers(activeView, damages)}
              {/* Pending point preview */}
              {pendingPoint && pendingPoint.view === activeView && (
                <div className="damage-dot dot-pending" style={{ left: `${pendingPoint.x}%`, top: `${pendingPoint.y}%` }}>
                  <div className="dot-core" style={{ background: '#f59e0b' }} />
                  <div className="dot-ripple" style={{ borderColor: '#f59e0b' }} />
                </div>
              )}
            </div>

            {/* Damage Form (shown when a point is pending) */}
            {pendingPoint && (
              <div className="damage-form-panel" onClick={e => e.stopPropagation()}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700 }}>
                  {isAr ? 'تفاصيل الضرر' : 'Détails du dommage'}
                </h4>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {(['scratch', 'dent', 'broken'] as const).map(t => (
                    <button
                      key={t}
                      className={`btn btn-sm ${damageForm.type === t ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1, fontSize: '0.8rem' }}
                      onClick={() => setDamageForm(f => ({ ...f, type: t }))}
                    >
                      {typeLabels[t]}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder={isAr ? 'ملاحظة (اختياري)...' : 'Note (optionnel)...'}
                  value={damageForm.note}
                  onChange={e => setDamageForm(f => ({ ...f, note: e.target.value }))}
                  style={{ fontSize: '0.875rem', marginBottom: 12, resize: 'none' }}
                />
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, fontSize: '0.8rem' }}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    📷 {isAr ? 'إضافة صورة' : 'Ajouter photo'}
                  </button>
                  {damageForm.photo && (
                    <img src={damageForm.photo} alt="preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '2px solid var(--gold)' }} />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setPendingPoint(null)}>
                    {isAr ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleConfirmDamage}>
                    {isAr ? 'تأكيد' : 'Confirmer'}
                  </button>
                </div>
              </div>
            )}

            {!readOnly && !pendingPoint && (
              <div className="zoom-tip">
                {isAr ? 'انقر في أي مكان لتسجيل ضرر جديد' : 'Cliquez n\'importe où pour enregistrer un dommage'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Damage Detail Popup */}
      {selectedDamage && (
        <div className="damage-zoom-overlay" onClick={() => setSelectedDamage(null)}>
          <div className="zoom-modal-content animate-scale-in" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="zoom-header">
              <span className="zoom-title">{isAr ? 'تفاصيل الضرر' : 'Détail du dommage'}</span>
              <button className="zoom-close" onClick={() => setSelectedDamage(null)}>×</button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-warning">{typeLabels[selectedDamage.type]}</span>
                <span className="badge" style={{ background: 'var(--surface-2)' }}>
                  {selectedDamage.view === 'side' ? (isAr ? 'يسار' : 'Gauche') :
                   selectedDamage.view === 'top' ? (isAr ? 'يمين' : 'Droit') :
                   selectedDamage.view === 'front' ? (isAr ? 'أمام' : 'Avant') : (isAr ? 'خلف' : 'Arrière')}
                </span>
              </div>
              {selectedDamage.note && <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '0.9rem' }}>{selectedDamage.note}</p>}
              {selectedDamage.photo && (
                <img 
                  src={selectedDamage.photo} 
                  alt="damage" 
                  className="cursor-zoom-in hover:opacity-90 transition-opacity"
                  style={{ width: 120, height: 120, borderRadius: 12, objectFit: 'cover', background: '#000', margin: '0 auto' }} 
                  onClick={() => setZoomedPhoto(selectedDamage.photo || null)}
                />
              )}
              {!readOnly && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {selectedDamage.status !== 'repaired' && (
                    <button 
                      className="btn btn-success btn-sm" 
                      style={{ flex: 1 }}
                      onClick={() => {
                        const newDamages = damages.map(dm => dm.id === selectedDamage.id ? { ...dm, status: 'repaired' as const } : dm);
                        onChange && onChange(newDamages);
                        setSelectedDamage(null);
                      }}
                    >
                      {isAr ? 'تم الإصلاح' : 'Marquer como reparado'}
                    </button>
                  )}
                  <button className="btn btn-outline text-error btn-sm" style={{ flex: 1 }} onClick={() => { removeDamage(selectedDamage.id); setSelectedDamage(null); }}>
                    {isAr ? 'حذف' : 'Supprimer'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full screen zoom for DamageMap photos */}
      {zoomedPhoto && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.9)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' 
          }}
          onClick={() => setZoomedPhoto(null)}
        >
          <img src={zoomedPhoto} alt="Zoom" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }} />
          <button style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'white', fontSize: 32, cursor: 'pointer' }}>×</button>
        </div>
      )}
    </div>
  );
};

export default DamageMap;
