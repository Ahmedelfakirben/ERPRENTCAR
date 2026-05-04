import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CarFront, Plus, Search, 
  Fuel, Gauge, Calendar, Eye, X, ChevronDown, Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageUpload from '../components/common/ImageUpload';
import './Fleet.css';
import PageLoader from '../components/layout/PageLoader';



const Fleet = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);

  // Form state for new vehicle
  const [formData, setFormData] = useState({
    plate: '', brand: '', model: '', year: 2024, fuel: 'Diesel', transmission: 'Manuelle', daily_rate: 350, image_url: ''
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!formData.plate || !formData.brand || !formData.model) {
      alert(isAr ? 'يرجى ملء جميع الحقول المطلوبة' : 'Veuillez remplir tous los champs obligatoires');
      return;
    }

    try {
      const { error } = await supabase
        .from('vehicles')
        .insert([{
          ...formData,
          status: 'available',
          current_km: 0
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      setFormData({
        plate: '', brand: '', model: '', year: 2024, fuel: 'Diesel', transmission: 'Manuelle', daily_rate: 350, image_url: ''
      });
      fetchVehicles();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      alert('Error: ' + (err as any).message);
    }
  };

  const handleUpdateStatus = async (vehicleId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', vehicleId);
      if (error) throw error;
      setOpenStatusId(null);
      fetchVehicles();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const statusLabels: Record<string, Record<string, string>> = {
    fr: { available: 'Disponible', rented: 'Loué', maintenance: 'Atelier', blocked: 'Bloqué', all: 'Tous' },
    ar: { available: 'متاح', rented: 'مؤجر', maintenance: 'ورشة', blocked: 'محظور', all: 'الكل' },
  };
  const lang = isAr ? 'ar' : 'fr';

  const statusBadge: Record<string, string> = {
    available: 'badge-success',
    rented: 'badge-primary',
    maintenance: 'badge-warning',
    blocked: 'badge-error',
  };

  const filtered = vehicles.filter((v: any) => {
    const matchSearch = `${v.brand} ${v.model} ${v.plate}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
    <div className="fleet-page">
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}

        {/* ---- Filter Bar ---- */}
        <div className="fleet-filter-bar">
          <div className="search-field">
            <Search size={16} />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالماركة أو اللوحة...' : 'Rechercher par marque ou plaque...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-divider" />
          <div className="filter-pills">
            {(['all', 'available', 'rented', 'maintenance', 'blocked'] as const).map(s => (
              <button
                key={s}
                className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {statusLabels[lang][s]}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle Grid */}
        {loading ? (
          <div className="flex justify-center p-12">
            <PageLoader />
          </div>
        ) : (
          <div className="vehicle-grid">
            {filtered.map((v: any) => (
              <div className="vehicle-card card" key={v.id} onClick={() => navigate(`/fleet/${v.id}`)}>
                <div className="vehicle-card-top">
                  {v.image_url ? (
                    <img src={v.image_url} alt={v.brand} className="vehicle-card-img" />
                  ) : (
                    <span className="vehicle-emoji">{v.brand === 'Dacia' ? '🚗' : '🚙'}</span>
                  )}
                  <span className={`badge ${statusBadge[v.status]}`}>{statusLabels[lang][v.status]}</span>
                </div>
                <h3 className="vehicle-name">{v.brand} {v.model}</h3>
                <p className="vehicle-plate">{v.plate}</p>
                <div className="vehicle-specs">
                  <span><Calendar size={14} /> {v.year}</span>
                  <span><Fuel size={14} /> {v.fuel}</span>
                  <span><Gauge size={14} /> {(v.current_km || 0).toLocaleString()} km</span>
                </div>
                
                {/* Status Quick Selector */}
                <div className="mt-4 pt-3 border-t border-dashed border-border flex items-center justify-between">
                  <div className="relative">
                    <button 
                      className={`badge ${statusBadge[v.status]} flex items-center gap-1.5 py-1 px-3 cursor-pointer hover:brightness-105 transition-all`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenStatusId(openStatusId === v.id ? null : v.id);
                      }}
                    >
                      <span>{statusLabels[lang][v.status]}</span>
                      <ChevronDown size={12} strokeWidth={3} />
                    </button>

                    {openStatusId === v.id && (
                      <div 
                        className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-lg shadow-xl border border-border overflow-hidden z-[100] animate-scale-in"
                        onClick={e => e.stopPropagation()}
                      >
                        {(['available', 'maintenance', 'blocked'] as const).map(s => (
                          <button
                            key={s}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${v.status === s ? 'text-primary' : 'text-secondary'}`}
                            onClick={() => handleUpdateStatus(v.id, s)}
                          >
                            <span>{statusLabels[lang][s]}</span>
                            {v.status === s && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/fleet/${v.id}`); }}>
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="card text-center p-8">
            <CarFront size={48} className="text-secondary" style={{ margin: '0 auto var(--spacing-4)' }} />
            <p className="text-secondary">{isAr ? 'لا توجد سيارات مطابقة' : 'Aucun vehículo trouvé'}</p>
          </div>
        )}

        </div>
      </div>

      <div className="page-actions">
        <button className="btn btn-primary shadow-lg px-12 py-3 text-lg" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> {isAr ? 'إضافة سيارة' : 'Ajouter un véhicule'}
        </button>
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="kpi-gold p-2 rounded-md">
                   <CarFront size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="m-0 text-xl">{t('fleet.add_vehicle')}</h2>
                  <p className="text-xs text-secondary">{isAr ? 'إضافة سيارة جديدة إلى الأسطول' : 'Ajouter un nouveau véhicule à votre flotte'}</p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body mt-6">
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">{isAr ? 'اللوحة' : 'Matricule'}</label>
                  <input 
                    className="input-field" 
                    placeholder="12345-A-1" 
                    value={formData.plate}
                    onChange={e => setFormData({...formData, plate: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{isAr ? 'العلامة' : 'Marque'}</label>
                  <input 
                    className="input-field" 
                    placeholder="Dacia" 
                    value={formData.brand}
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{isAr ? 'الموديل' : 'Modèle'}</label>
                  <input 
                    className="input-field" 
                    placeholder="Duster" 
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{isAr ? 'السنة' : 'Année'}</label>
                  <input 
                    className="input-field" 
                    type="number" 
                    placeholder="2024" 
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{isAr ? 'الوقود' : 'Carburant'}</label>
                  <select 
                    className="input-field"
                    value={formData.fuel}
                    onChange={e => setFormData({...formData, fuel: e.target.value})}
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Essence">Essence</option>
                    <option value="Hybride">Hybride</option>
                    <option value="Electrique">{isAr ? 'كهربائي' : 'Électrique'}</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{isAr ? 'ناقل الحركة' : 'Transmission'}</label>
                  <select 
                    className="input-field"
                    value={formData.transmission}
                    onChange={e => setFormData({...formData, transmission: e.target.value})}
                  >
                    <option value="Manuelle">{isAr ? 'يدوي' : 'Manuelle'}</option>
                    <option value="Automatique">{isAr ? 'أوتوماتيكي' : 'Automatique'}</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{isAr ? 'السعر/يوم' : 'Tarif/Jour'} (MAD)</label>
                  <input 
                    className="input-field" 
                    type="number" 
                    placeholder="350" 
                    value={formData.daily_rate}
                    onChange={e => setFormData({...formData, daily_rate: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <ImageUpload 
                    bucket="vehicles" 
                    label={isAr ? 'صورة السيارة' : 'Photo du véhicule'} 
                    onUploadComplete={(url) => setFormData({...formData, image_url: url})}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                {isAr ? 'إلغاء' : 'Annuler'}
              </button>
              <button className="btn btn-primary px-8" onClick={handleAddVehicle}>
                {isAr ? 'حفظ' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Fleet;
