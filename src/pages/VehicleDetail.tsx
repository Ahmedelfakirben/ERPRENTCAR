import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, CarFront, Fuel, Gauge, Calendar, Settings2,
  Wrench, FileText, Camera, Edit, Trash2, Plus, Upload,
  CheckCircle2, AlertTriangle, Clock, Shield, Loader2, TrendingUp, X, Save, ShieldAlert, Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageUpload from '../components/common/ImageUpload';
import DamageMap from '../components/DamageMap';
import PageLoader from '../components/layout/PageLoader';
import './VehicleDetail.css';

const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [tab, setTab] = useState<'info' | 'maintenance' | 'documents' | 'photos' | 'history' | 'expenses' | 'financing' | 'damages'>('info');
  const [loading, setLoading] = useState(true);

  // Data states
  const [vehicle, setVehicle] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [tempPhotos, setTempPhotos] = useState<string[]>([]);
  const [savingPhotos, setSavingPhotos] = useState(false);

  // Modals
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [maintData, setMaintData] = useState({ maintenance_type: 'oil_change', description: '', cost: 0, km_at_service: 0, next_due_km: 0 });
  const [docData, setDocData] = useState({ doc_type: 'carte_grise', doc_number: '', issue_date: '', expiry_date: '' });
  const [editData, setEditData] = useState<any>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchAllData();
  }, [id]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Vehicle Info
      const { data: vData } = await supabase.from('vehicles').select('*').eq('id', id).single();
      setVehicle(vData);
      setEditData(vData);
      setTempPhotos(vData?.photos || []);
      setMaintData(prev => ({ ...prev, km_at_service: vData?.current_km || 0 }));

      // 2. Documents
      const { data: dData } = await supabase.from('vehicle_documents').select('*').eq('vehicle_id', id);
      setDocuments(dData || []);

      // 3. Maintenance
      const { data: mData } = await supabase.from('maintenance').select('*').eq('vehicle_id', id).order('performed_at', { ascending: false });
      setMaintenance(mData || []);

      // 4. History (Contracts)
      const { data: hData } = await supabase.from('contracts').select('*, clients(full_name, full_name_ar)').eq('vehicle_id', id).order('start_date', { ascending: false });
      setHistory(hData || []);

      // 5. Fines (Module Maroc)
      const { count: fCount } = await supabase.from('fines').select('*', { count: 'exact', head: true }).eq('vehicle_id', id);
      setVehicle((prev: any) => ({ ...prev, finesCount: fCount || 0 }));

      // 6. Expenses (Transactions linked to vehicle)
      const { data: exData } = await supabase.from('transactions').select('*').eq('vehicle_id', id).eq('transaction_type', 'expense').order('transaction_date', { ascending: false });
      setExpenses(exData || []);

    } catch (err) {
      console.error('Error fetching vehicle details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaintenance = async () => {
    try {
      const performedAt = new Date().toISOString().split('T')[0];
      const payload = { ...maintData, vehicle_id: id, performed_at: performedAt };

      // 1. Insert into maintenance table
      const { error: maintError } = await supabase.from('maintenance').insert([payload]);
      if (maintError) throw maintError;

      // 2. Update vehicle KM and next maintenance alert
      await supabase.from('vehicles').update({ 
        current_km: maintData.km_at_service,
        next_maintenance_km: maintData.next_due_km > 0 ? maintData.next_due_km : null
      }).eq('id', id);

      // 3. Insert into transactions table as an expense
      await supabase.from('transactions').insert([{
        transaction_type: 'expense',
        category: 'Maintenance',
        description: `Entretien (${maintData.maintenance_type}): ${maintData.description}`,
        amount: maintData.cost,
        transaction_date: performedAt,
        vehicle_id: id,
        status: 'completed'
      }]);

      setShowAddMaintenance(false);
      fetchAllData();
    } catch (err) {
      console.error('Error adding maintenance:', err);
      alert('Error saving maintenance. Please check console.');
    }
  };

  const handleAddDocument = async () => {
    try {
      const { error } = await supabase.from('vehicle_documents').insert([{ ...docData, vehicle_id: id }]);
      if (error) throw error;
      setShowAddDocument(false);
      fetchAllData();
    } catch (err) { alert('Error adding document'); }
  };
  const handleUpdatePhotos = (newUrl: string, index: number) => {
    const updatedPhotos = [...tempPhotos];
    // Ensure the array is large enough
    while (updatedPhotos.length <= index) {
      updatedPhotos.push('');
    }
    updatedPhotos[index] = newUrl;
    setTempPhotos(updatedPhotos);
  };

  const handleSavePhotos = async () => {
    try {
      setSavingPhotos(true);
      const { error } = await supabase
        .from('vehicles')
        .update({ photos: tempPhotos })
        .eq('id', id);

      if (error) throw error;
      setVehicle({ ...vehicle, photos: tempPhotos });
      alert(isAr ? 'تم حفظ الصور بنجاح' : 'Photos enregistrées avec succès');
    } catch (err) {
      console.error('Error saving photos:', err);
      alert(isAr ? 'خطأ في حفظ الصور' : 'Erreur lors de l\'enregistrement des photos');
    } finally {
      setSavingPhotos(false);
    }
  };


  const handleUpdateVehicle = async () => {
    try {
      setLoading(true);
      // Clean data for update (remove non-db fields if any)
      const { finesCount, ...updatePayload } = editData;

      const { error } = await supabase.from('vehicles').update(updatePayload).eq('id', id);
      if (error) throw error;

      setShowEditModal(false);
      fetchAllData();
    } catch (err) {
      console.error('Error updating vehicle:', err);
      alert('Error updating vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLoanToExpenses = async () => {
    if (!vehicle.loan_start_date || !vehicle.loan_monthly_payment || !vehicle.loan_duration) {
      alert(isAr ? 'يرجى إكمال بيانات القرض أولاً' : 'Veuillez compléter les données du crédit primero');
      return;
    }

    try {
      setLoading(true);
      const start = new Date(vehicle.loan_start_date);
      const now = new Date();
      const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const monthsToSync = Math.min(Math.max(0, diffMonths + 1), vehicle.loan_duration);

      // 1. Get existing loan transactions to avoid duplicates
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('vehicle_id', id)
        .eq('category', 'Crédit');

      const existingDates = new Set(existingTx?.map(t => t.transaction_date.substring(0, 7))); // YYYY-MM

      const newTransactions = [];
      for (let i = 0; i < monthsToSync; i++) {
        const date = new Date(start);
        date.setMonth(date.getMonth() + i);
        const dateStr = date.toISOString().split('T')[0];
        const monthYear = dateStr.substring(0, 7);

        if (!existingDates.has(monthYear)) {
          newTransactions.push({
            vehicle_id: id,
            transaction_type: 'expense',
            category: 'Crédit',
            description: `${isAr ? 'دفعة قرض السيارة' : 'Mensualité Crédit Véhicule'} - ${date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
            amount: vehicle.loan_monthly_payment,
            transaction_date: dateStr,
            payment_method: 'transfer'
          });
        }
      }

      if (newTransactions.length > 0) {
        const { error } = await supabase.from('transactions').insert(newTransactions);
        if (error) throw error;
        alert(isAr ? `تمت مزامنة ${newTransactions.length} دفعات` : `${newTransactions.length} mensualités synchronisées`);
      } else {
        alert(isAr ? 'كل الدفعات مزامنة بالفعل' : 'Toutes les mensualités sont déjà synchronisées');
      }

      fetchAllData();
    } catch (err) {
      console.error(err);
      alert('Error syncing loan expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async () => {
    const confirmMsg = isAr
      ? 'هل أنت متأكد من حذف هذه السيارة؟ لا يمكن التراجع عن هذا الإجراء.'
      : 'Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible.';

    if (window.confirm(confirmMsg)) {
      try {
        setLoading(true);
        const { error } = await supabase.from('vehicles').delete().eq('id', id);
        if (error) throw error;
        navigate('/fleet');
      } catch (err) {
        console.error(err);
        alert('Error deleting vehicle');
      } finally {
        setLoading(false);
      }
    }
  };

  const statusLabels: Record<string, Record<string, string>> = {
    fr: { available: 'Disponible', rented: 'Loué', maintenance: 'Atelier', blocked: 'Bloqué' },
    ar: { available: 'متاح', rented: 'مؤجر', maintenance: 'ورشة', blocked: 'محظور' },
  };
  const statusBadge: Record<string, string> = { available: 'badge-success', rented: 'badge-primary', maintenance: 'badge-warning', blocked: 'badge-error' };

  const docTypeLabels: Record<string, Record<string, string>> = {
    fr: { carte_grise: 'Carte Grise', assurance: 'Assurance', visite_technique: 'Visite Technique' },
    ar: { carte_grise: 'البطاقة الرمادية', assurance: 'التأمين', visite_technique: 'الفحص التقني' },
  };

  const maintenanceLabels: Record<string, Record<string, string>> = {
    fr: { oil_change: 'Vidange', tires: 'Pneus', brakes: 'Freins', general: 'Révision', other: 'Autre' },
    ar: { oil_change: 'تغيير الزيت', tires: 'الإطارات', brakes: 'الفرامل', general: 'مراجعة', other: 'أخرى' },
  };

  if (loading) return <PageLoader />;
  if (!vehicle) return <div className="p-12 text-center text-error">Vehicle not found</div>;

  const v = vehicle;
  const lang = isAr ? 'ar' : 'fr';

  return (
    <>
      <div className="vehicle-detail-page animate-fade-in">
        <div className="vehicle-detail-header-group">
          {/* Back Button + Header */}
          <div className="detail-top-bar">
            <button className="btn btn-ghost" onClick={() => navigate('/fleet')}>
              <ArrowLeft size={18} /> {isAr ? 'العودة للأسطول' : 'Retour à la Flotte'}
            </button>
            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={() => setShowEditModal(true)}><Edit size={16} /> {isAr ? 'تعديل' : 'Modifier'}</button>
              <button className="btn btn-outline text-error" onClick={handleDeleteVehicle}><Trash2 size={16} /> {isAr ? 'حذف' : 'Supprimer'}</button>
            </div>
          </div>

          {/* Hero Card */}
          <div className="vehicle-hero card">
            {/* Photo panel */}
            <div className="vehicle-hero-image-wrap">
              {v.image_url ? (
                <img src={v.image_url} alt={v.brand} className="hero-img" />
              ) : (
                <div className="hero-emoji-placeholder">
                  <span>{v.brand === 'Dacia' ? '🚗' : '🚙'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {isAr ? 'لا توجد صورة' : 'Aucune photo'}
                  </span>
                </div>
              )}
              {/* Upload overlay — only visible on hover */}
              <div className="hero-upload-overlay">
                <Camera size={28} />
                <span>{isAr ? 'تغيير الصورة' : 'Changer la photo'}</span>
                <ImageUpload
                  bucket="vehicles"
                  onUploadComplete={async (url) => {
                    const { error } = await supabase.from('vehicles').update({ image_url: url }).eq('id', id);
                    if (!error) setVehicle({ ...vehicle, image_url: url });
                  }}
                />
              </div>
            </div>

            {/* Info section */}
            <div className="vehicle-hero-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 className="m-0" style={{ fontWeight: 800, fontSize: '1.75rem' }}>{v.brand} {v.model}</h1>
                <span className={`badge ${statusBadge[v.status]}`}>{statusLabels[lang][v.status]}</span>
              </div>
              <p className="vehicle-hero-plate m-0 mt-1">{v.plate}</p>
            </div>

            {/* Stats bar */}
            <div className="vehicle-hero-stats">
              <div className="hero-stat"><Calendar size={15} /><span>{v.year}</span></div>
              <div className="hero-stat"><Fuel size={15} /><span>{v.fuel}</span></div>
              <div className="hero-stat"><Gauge size={15} /><span>{(v.current_km || 0).toLocaleString()} km</span></div>
              <div className="hero-stat"><Settings2 size={15} /><span>{v.transmission}</span></div>
              
              {v.next_maintenance_km && (
                <div className={`hero-stat ${v.current_km >= v.next_maintenance_km ? 'text-error animate-pulse font-bold' : (v.next_maintenance_km - v.current_km < 1000 ? 'text-warning font-bold' : 'text-success')}`}>
                  <Wrench size={15} />
                  <span>
                    {v.current_km >= v.next_maintenance_km 
                      ? (isAr ? 'صيانة فورية!' : 'Entretien Urgent!') 
                      : (isAr ? `صيانة بعد ${v.next_maintenance_km - v.current_km} كم` : `Entretien dans ${v.next_maintenance_km - v.current_km} km`)}
                  </span>
                </div>
              )}

              <div className="hero-stat hero-rate">
                <span className="text-primary font-bold" style={{ fontSize: '1rem' }}>{v.daily_rate} MAD</span>
                <small>/{isAr ? 'يوم' : 'jour'}</small>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tab-bar">
            <button className={`tab ${tab === 'info' ? 'tab-active' : ''}`} onClick={() => setTab('info')}>
              <CarFront size={16} /> {isAr ? 'معلومات' : 'Infos'}
            </button>
            <button className={`tab ${tab === 'maintenance' ? 'tab-active' : ''}`} onClick={() => setTab('maintenance')}>
              <Wrench size={16} /> {isAr ? 'الصيانة' : 'Maintenance'}
            </button>
            <button className={`tab ${tab === 'documents' ? 'tab-active' : ''}`} onClick={() => setTab('documents')}>
              <FileText size={16} /> {isAr ? 'الوثائق' : 'Documents'}
            </button>
            <button className={`tab ${tab === 'photos' ? 'tab-active' : ''}`} onClick={() => setTab('photos')}>
              <Camera size={16} /> {isAr ? 'صور الأضرار' : 'Photos'}
            </button>
            <button className={`tab ${tab === 'history' ? 'tab-active' : ''}`} onClick={() => setTab('history')}>
              <Clock size={16} /> {isAr ? 'تاريخ الإيجارات' : 'Historique'}
            </button>
            <button className={`tab ${tab === 'expenses' ? 'tab-active' : ''}`} onClick={() => setTab('expenses')}>
              <TrendingUp size={16} /> {isAr ? 'المصاريف' : 'Dépenses'}
            </button>
            <button className={`tab ${tab === 'financing' ? 'tab-active' : ''}`} onClick={() => setTab('financing')}>
              <FileText size={16} /> {isAr ? 'التمويل' : 'Financement'}
            </button>
            <button className={`tab ${tab === 'damages' ? 'tab-active' : ''}`} onClick={() => setTab('damages')}>
              <ShieldAlert size={16} /> {isAr ? 'حالة السيارة' : 'État du vehículo'}
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="vehicle-detail-content-area">

        {/* Tab: Info */}
        {tab === 'info' && (
          <div className="info-grid">
            <div className="card">
              <h3 className="mb-4">{isAr ? 'التفاصيل التقنية' : 'Détails Techniques'}</h3>
              <div className="info-rows">
                <div className="info-row">
                  <span className="info-label">{isAr ? 'اللوحة' : 'Matricule'}</span>
                  <span className="info-value font-medium" style={{ fontFamily: 'monospace' }}>{v.plate}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'العلامة' : 'Marque'}</span>
                  <span className="info-value">{v.brand}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'الموديل' : 'Modèle'}</span>
                  <span className="info-value">{v.model}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'السنة' : 'Année'}</span>
                  <span className="info-value">{v.year}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'الوقود' : 'Carburant'}</span>
                  <span className="info-value">{v.fuel}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'اللون' : 'Couleur'}</span>
                  <span className="info-value">{v.color}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'المقاعد' : 'Places'}</span>
                  <span className="info-value">{v.seats}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'ناقل الحركة' : 'Transmission'}</span>
                  <span className="info-value">{v.transmission}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'الكيلومترات' : 'Kilométrage'}</span>
                  <span className="info-value font-semibold">{(v.current_km || 0).toLocaleString()} km</span>
                </div>
              </div>
            </div>
            <div className="card">
              <h3 className="mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-gold" />
                {isAr ? 'ملخص سريع' : 'Résumé Rapide'}
              </h3>
              <div className="quick-stats">
                <div className="quick-stat">
                  <div className="stat-icon-circle blue">
                    <Calendar size={18} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{history.filter(h => new Date(h.start_date).getMonth() === new Date().getMonth()).length}</span>
                    <span className="stat-name">{isAr ? 'إيجارات هذا الشهر' : 'Locations ce mois'}</span>
                  </div>
                </div>
                <div className="quick-stat">
                  <div className="stat-icon-circle green">
                    <TrendingUp size={18} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">
                      {history
                        .filter(h => new Date(h.start_date).getMonth() === new Date().getMonth())
                        .reduce((sum, h) => sum + (h.total_ttc || 0), 0)
                        .toLocaleString()}
                    </span>
                    <span className="stat-name">{isAr ? 'دخل هذا الشهر (MAD)' : 'Revenus ce mois (MAD)'}</span>
                  </div>
                </div>
                <div className="quick-stat">
                  <div className="stat-icon-circle orange">
                    <Wrench size={18} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">
                      {maintenance.reduce((sum, m) => sum + (m.cost || 0), 0).toLocaleString()}
                    </span>
                    <span className="stat-name">{isAr ? 'إجمالي الصيانة (MAD)' : 'Total Maintenance (MAD)'}</span>
                  </div>
                </div>
                <div className="quick-stat">
                  <div className="stat-icon-circle orange">
                    <TrendingUp size={18} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">
                      {expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}
                    </span>
                    <span className="stat-name">{isAr ? 'إجمالي المصاريف (MAD)' : 'Total Dépenses (MAD)'}</span>
                  </div>
                </div>
                <div className="quick-stat">
                  <div className="stat-icon-circle red">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{v.finesCount || 0}</span>
                    <span className="stat-name">{isAr ? 'مخالفات' : 'Amendes'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Maintenance */}
        {tab === 'maintenance' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3>{isAr ? 'سجل الصيانة' : 'Historique de Maintenance'}</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddMaintenance(true)}><Plus size={16} /> {isAr ? 'إضافة' : 'Ajouter'}</button>
            </div>
            <div className="card" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{isAr ? 'النوع' : 'Type'}</th>
                      <th>{isAr ? 'الوصف' : 'Description'}</th>
                      <th>{isAr ? 'التكلفة' : 'Coût'}</th>
                      <th>{isAr ? 'كم عند الخدمة' : 'KM'}</th>
                      <th>{isAr ? 'التاريخ' : 'Date'}</th>
                      <th>{isAr ? 'كم القادمة' : 'Prochain KM'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenance.map(m => (
                      <tr key={m.id}>
                        <td><span className="badge badge-warning">{maintenanceLabels[lang][m.maintenance_type]}</span></td>
                        <td>{m.description}</td>
                        <td className="font-semibold">{(m.cost || 0).toLocaleString()} MAD</td>
                        <td className="text-secondary">{(m.km_at_service || 0).toLocaleString()}</td>
                        <td className="text-secondary">{m.performed_at}</td>
                        <td className="font-medium">{(m.next_due_km || 0).toLocaleString()} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Documents */}
        {tab === 'documents' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3>{isAr ? 'وثائق السيارة' : 'Documents du Véhicule'}</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddDocument(true)}><Upload size={16} /> {isAr ? 'رفع وثيقة' : 'Téléverser'}</button>
            </div>
            <div className="docs-grid">
              {documents.map(doc => {
                const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                return (
                  <div className={`card doc-card ${isExpired ? 'doc-expiring' : ''}`} key={doc.id}>
                    <div className="doc-card-icon">
                      {doc.doc_type === 'carte_grise' ? <FileText size={24} /> :
                        doc.doc_type === 'assurance' ? <Shield size={24} /> :
                          <CheckCircle2 size={24} />}
                    </div>
                    <h4>{docTypeLabels[lang][doc.doc_type]}</h4>
                    <p className="text-sm text-secondary">{doc.doc_number}</p>
                    <div className="doc-dates">
                      <span className="text-sm">{isAr ? 'إصدار' : 'Émis'}: {doc.issue_date}</span>
                      <span className="text-sm">{isAr ? 'انتهاء' : 'Expire'}: {doc.expiry_date || '—'}</span>
                    </div>
                    {isExpired && (
                      <div className="doc-alert">
                        <AlertTriangle size={14} /> {isAr ? 'منتهي!' : 'Expiré !'}
                      </div>
                    )}
                    {!isExpired && (
                      <div className="doc-valid">
                        <CheckCircle2 size={14} /> {isAr ? 'صالح' : 'Valide'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Photos */}
        {tab === 'photos' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="m-0">{isAr ? 'كتالوج صور السيارة' : 'Catalogue Photos Véhicule'}</h3>
                <p className="text-secondary text-sm">{isAr ? 'صور الحالة العامة والأضرار' : 'Gestion des photos d\'état et dommages'}</p>
              </div>
              <button 
                className={`btn btn-primary ${savingPhotos ? 'loading' : ''}`} 
                onClick={handleSavePhotos}
                disabled={savingPhotos}
              >
                {savingPhotos ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isAr ? 'حفظ التغييرات' : 'Enregistrer les modifications'}
              </button>
            </div>
            <div className="photos-grid">
              {['Avant – Gauche', 'Avant – Droit', 'Arrière – Gauche', 'Arrière – Droit', 'Intérieur Avant', 'Intérieur Arrière'].map((label, i) => (
                <div className="card" key={i} style={{ padding: 'var(--spacing-4)' }}>
                  <ImageUpload
                    bucket="vehicles"
                    label={isAr ? `الزاوية ${i + 1}` : label}
                    currentImage={tempPhotos[i]}
                    onUploadComplete={(url) => handleUpdatePhotos(url, i)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Rental History */}
        {tab === 'history' && (
          <div>
            <h3 className="mb-4">{isAr ? 'تاريخ الإيجارات' : 'Historique des Locations'}</h3>
            <div className="card" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{isAr ? 'العقد' : 'Contrat'}</th>
                      <th>{isAr ? 'العميل' : 'Client'}</th>
                      <th>{isAr ? 'البداية' : 'Début'}</th>
                      <th>{isAr ? 'النهاية' : 'Fin'}</th>
                      <th>{isAr ? 'المجموع' : 'Total'}</th>
                      <th>{isAr ? 'الحالة' : 'Statut'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(r => (
                      <tr key={r.id} className="cursor-pointer" onClick={() => navigate(`/contracts/${r.id}`)}>
                        <td className="font-medium text-primary">{r.contract_number}</td>
                        <td>{isAr ? (r.clients?.full_name_ar || r.clients?.full_name) : r.clients?.full_name}</td>
                        <td className="text-secondary">{r.start_date}</td>
                        <td className="text-secondary">{r.end_date}</td>
                        <td className="font-semibold">{r.total_ttc.toLocaleString()} MAD</td>
                        <td>
                          <span className={`badge ${r.status === 'active' ? 'badge-primary' : 'badge-success'}`}>
                            {r.status === 'active' ? (isAr ? 'نشط' : 'Activo') : (isAr ? 'مكتمل' : 'Terminado')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Expenses */}
        {tab === 'expenses' && (
          <div className="spacious-tab-content">
            <h3 className="mb-4">{isAr ? 'سجل المصاريف' : 'Registre des Dépenses'}</h3>
            <div className="card" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{isAr ? 'التاريخ' : 'Date'}</th>
                      <th>{isAr ? 'الفئة' : 'Catégorie'}</th>
                      <th>{isAr ? 'الوصف' : 'Description'}</th>
                      <th>{isAr ? 'المبلغ' : 'Montant'}</th>
                      <th>{isAr ? 'طريقة الدفع' : 'Méthode'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 && <tr><td colSpan={5} className="text-center p-8 text-secondary">{isAr ? 'لا توجد مصاريف مسجلة' : 'Aucune dépense enregistrée'}</td></tr>}
                    {expenses.map(ex => (
                      <tr key={ex.id}>
                        <td className="text-secondary">{ex.transaction_date}</td>
                        <td><span className="badge badge-warning">{ex.category}</span></td>
                        <td>{ex.description}</td>
                        <td className="font-semibold text-error">-{ex.amount.toLocaleString()} MAD</td>
                        <td className="text-secondary">{ex.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Financing */}
        {tab === 'financing' && (
          <div className="animate-fade-in spacious-tab-content">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card">
                <h3 className="mb-4">{isAr ? 'إعدادات القرض' : 'Configuration du Crédit'}</h3>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="input-group">
                    <label className="input-label">{isAr ? 'تاريخ بداية القرض' : 'Date début du crédit'}</label>
                    <input
                      className="input-field"
                      type="date"
                      value={vehicle.loan_start_date || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        const { error } = await supabase.from('vehicles').update({ loan_start_date: val }).eq('id', id);
                        if (!error) setVehicle({ ...vehicle, loan_start_date: val });
                      }}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">{isAr ? 'مدة القرض (بالأشهر)' : 'Durée (mois)'}</label>
                    <input
                      className="input-field"
                      type="number"
                      value={vehicle.loan_duration || ''}
                      onChange={async (e) => {
                        const val = parseInt(e.target.value) || 0;
                        const { error } = await supabase.from('vehicles').update({ loan_duration: val }).eq('id', id);
                        if (!error) setVehicle({ ...vehicle, loan_duration: val });
                      }}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">{isAr ? 'القسط الشهري (MAD)' : 'Mensualité (MAD)'}</label>
                    <input
                      className="input-field"
                      type="number"
                      value={vehicle.loan_monthly_payment || ''}
                      onChange={async (e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const { error } = await supabase.from('vehicles').update({ loan_monthly_payment: val }).eq('id', id);
                        if (!error) setVehicle({ ...vehicle, loan_monthly_payment: val });
                      }}
                    />
                  </div>
                </div>
                <button className="btn btn-primary w-full mt-6" onClick={handleSyncLoanToExpenses}>
                  <Save size={18} /> {isAr ? 'حفظ ومزامنة المصاريف' : 'Enregistrer et Synchroniser les dépenses'}
                </button>
              </div>

              <div className="card md:col-span-2">
                <h3 className="mb-4">{isAr ? 'ملخص التمويل' : 'Résumé Financier'}</h3>
                <div className="quick-stats">
                  <div className="quick-stat">
                    <div className="stat-icon-circle blue">
                      <TrendingUp size={18} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">
                        {((vehicle.loan_duration || 0) * (vehicle.loan_monthly_payment || 0)).toLocaleString()} MAD
                      </span>
                      <span className="stat-name">{isAr ? 'إجمالي القرض' : 'Total Crédit'}</span>
                    </div>
                  </div>
                  <div className="quick-stat">
                    <div className="stat-icon-circle green">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">
                        {(() => {
                          if (!vehicle.loan_start_date || !vehicle.loan_duration) return 0;
                          const start = new Date(vehicle.loan_start_date);
                          const now = new Date();
                          const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
                          const paidMonths = Math.min(Math.max(0, diffMonths), vehicle.loan_duration);
                          return (paidMonths * (vehicle.loan_monthly_payment || 0)).toLocaleString();
                        })()} MAD
                      </span>
                      <span className="stat-name">{isAr ? 'المبلغ المدفوع' : 'Montant Payé'}</span>
                    </div>
                  </div>
                  <div className="quick-stat">
                    <div className="stat-icon-circle orange">
                      <Clock size={18} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">
                        {(() => {
                          if (!vehicle.loan_start_date || !vehicle.loan_duration) return 0;
                          const start = new Date(vehicle.loan_start_date);
                          const now = new Date();
                          const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
                          const paidMonths = Math.min(Math.max(0, diffMonths), vehicle.loan_duration);
                          const remainingMonths = vehicle.loan_duration - paidMonths;
                          return (remainingMonths * (vehicle.loan_monthly_payment || 0)).toLocaleString();
                        })()} MAD
                      </span>
                      <span className="stat-name">{isAr ? 'المتبقي' : 'Restant'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{isAr ? 'رقم الدفعة' : 'N° Échéance'}</th>
                      <th>{isAr ? 'التاريخ' : 'Date'}</th>
                      <th>{isAr ? 'المبلغ' : 'Montant'}</th>
                      <th>{isAr ? 'الحالة' : 'Statut'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!vehicle.loan_start_date || !vehicle.loan_duration) && (
                      <tr>
                        <td colSpan={4} className="text-center p-12 text-secondary">
                          {isAr ? 'يرجى إكمال الإعدادات أعلاه لعرض الجدول' : 'Veuillez configurer les paramètres du crédit pour voir le tableau'}
                        </td>
                      </tr>
                    )}
                    {vehicle.loan_start_date && vehicle.loan_duration && Array.from({ length: vehicle.loan_duration }).map((_, i) => {
                      const dueDate = new Date(vehicle.loan_start_date);
                      dueDate.setMonth(dueDate.getMonth() + i);
                      const isPaid = dueDate < new Date();
                      return (
                        <tr key={i}>
                          <td className="font-medium">{i + 1}</td>
                          <td className="text-secondary">{dueDate.toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR', { month: 'long', year: 'numeric' })}</td>
                          <td className="font-semibold">{(vehicle.loan_monthly_payment || 0).toLocaleString()} MAD</td>
                          <td>
                            <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'}`}>
                              {isPaid ? (isAr ? 'مدفوع' : 'Payé') : (isAr ? 'قادم' : 'À venir')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Damages */}
        {tab === 'damages' && (
          <div className="animate-fade-in spacious-tab-content">
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="m-0">{isAr ? 'خريطة الأضرار الحالية' : 'Carte des dommages actuels'}</h3>
                  <p className="text-secondary text-sm mt-1">
                    {isAr ? 'هذه الأضرار تظهر تلقائياً عند تسليم السيارة' : 'Ces dommages apparaissent automatiquement lors de la livraison du véhicule'}
                  </p>
                </div>
                <div className="badge badge-error">
                  {vehicle.damages?.length || 0} {isAr ? 'أضرار مسجلة' : 'Dommages enregistrés'}
                </div>
              </div>

              <DamageMap
                damages={vehicle.damages || []}
                isAr={isAr}
                onChange={async (newDamages) => {
                  const { error } = await supabase.from('vehicles').update({ damages: newDamages }).eq('id', id);
                  if (!error) setVehicle({ ...vehicle, damages: newDamages });
                }}
              />

              {/* List of damage details */}
              {(vehicle.damages || []).length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(vehicle.damages || []).sort((a: any) => (a.status === 'repaired' ? 1 : -1)).map((d: any) => (
                    <div
                      key={d.id}
                      className="card p-3 flex gap-4 items-start relative overflow-hidden"
                      style={{
                        background: d.status === 'repaired' ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-2)',
                        border: d.status === 'repaired' ? '1px solid #10b981' : '1px solid var(--border)',
                        opacity: d.status === 'repaired' ? 0.8 : 1
                      }}
                    >
                      {d.status === 'repaired' && (
                        <div className="absolute top-2 right-2 text-success">
                          <CheckCircle2 size={16} />
                        </div>
                      )}

                      <div className="flex flex-col shrink-0">
                        {d.photo ? (
                          <div 
                            className="w-16 h-16 rounded-xl border border-border shadow-sm cursor-pointer overflow-hidden relative group"
                            onClick={() => setSelectedPhoto(d.photo)}
                          >
                            <img src={d.photo} alt="Damage" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera size={18} className="text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-surface-3 flex items-center justify-center text-secondary border border-dashed border-border">
                            <Camera size={20} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`badge ${d.status === 'repaired' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                            {d.type === 'scratch' ? (isAr ? 'خدش' : 'Rayure') :
                              d.type === 'dent' ? (isAr ? 'دنت' : 'Bosse') : (isAr ? 'كسر' : 'Cassé')}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-secondary tracking-wider">
                            {d.view === 'side' ? (isAr ? 'يسار' : 'Gauche') :
                              d.view === 'top' ? (isAr ? 'يمين' : 'Droit') :
                                d.view === 'front' ? (isAr ? 'أمام' : 'Avant') : (isAr ? 'خلف' : 'Arrière')}
                          </span>
                        </div>

                        <p className={`text-sm mb-3 line-clamp-2 italic ${d.status === 'repaired' ? 'line-through text-secondary' : ''}`}>
                          "{d.note || (isAr ? 'لا توجد ملاحظات' : 'Aucune note')}"
                        </p>

                        {d.status !== 'repaired' && (
                          <button
                            className="btn btn-ghost btn-sm text-success p-0 h-auto flex items-center gap-1 hover:bg-transparent"
                            style={{ fontSize: '0.75rem' }}
                            onClick={async () => {
                              const newDamages = vehicle.damages.map((dm: any) => dm.id === d.id ? { ...dm, status: 'repaired' } : dm);
                              const { error } = await supabase.from('vehicles').update({ damages: newDamages }).eq('id', id);
                              if (!error) setVehicle({ ...vehicle, damages: newDamages });
                            }}
                          >
                            <Check size={14} /> {isAr ? 'إصلاح' : 'Marquer reparado'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Modal: Add Maintenance */}
    {showAddMaintenance && (
      <div className="modal-overlay" onClick={() => setShowAddMaintenance(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h2 className="mb-6">{isAr ? 'إضافة سجل صيانة' : 'Nouvelle Maintenance'}</h2>
          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">{isAr ? 'النوع' : 'Type'}</label>
              <select
                className="input-field"
                value={maintData.maintenance_type}
                onChange={e => setMaintData({ ...maintData, maintenance_type: e.target.value })}
              >
                <option value="oil_change">{isAr ? 'تغيير الزيت' : 'Vidange'}</option>
                <option value="tires">{isAr ? 'الإطارات' : 'Pneus'}</option>
                <option value="brakes">{isAr ? 'الفرامل' : 'Freins'}</option>
                <option value="general">{isAr ? 'مراجعة عامة' : 'Révision générale'}</option>
                <option value="other">{isAr ? 'أخرى' : 'Autre'}</option>
              </select>
            </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'التاريخ' : 'Date'}</label>
                <input className="input-field" type="date" value={new Date().toISOString().split('T')[0]} readOnly />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'الكيلومترات الحالية' : 'KM Actuel'}</label>
                <input
                  className="input-field"
                  type="number"
                  value={maintData.km_at_service}
                  onChange={e => setMaintData({ ...maintData, km_at_service: parseInt(e.target.value) })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'التكلفة (MAD)' : 'Coût (MAD)'}</label>
                <input
                  className="input-field"
                  type="number"
                  value={maintData.cost}
                  onChange={e => setMaintData({ ...maintData, cost: parseFloat(e.target.value) })}
                />
              </div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">{isAr ? 'الوصف' : 'Description'}</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={maintData.description}
                  onChange={e => setMaintData({ ...maintData, description: e.target.value })}
                ></textarea>
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'KM القادمة' : 'Prochain KM'}</label>
                <input
                  className="input-field"
                  type="number"
                  value={maintData.next_due_km}
                  onChange={e => setMaintData({ ...maintData, next_due_km: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowAddMaintenance(false)}>{isAr ? 'إلغاء' : 'Annuler'}</button>
              <button className="btn btn-primary" onClick={handleAddMaintenance}>{isAr ? 'حفظ' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Document */}
      {showAddDocument && (
        <div className="modal-overlay" onClick={() => setShowAddDocument(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="mb-6">{isAr ? 'إضافة وثيقة' : 'Nouveau Document'}</h2>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">{isAr ? 'النوع' : 'Type'}</label>
                <select
                  className="input-field"
                  value={docData.doc_type}
                  onChange={e => setDocData({ ...docData, doc_type: e.target.value })}
                >
                  <option value="carte_grise">{isAr ? 'البطاقة الرمادية' : 'Carte Grise'}</option>
                  <option value="assurance">{isAr ? 'التأمين' : 'Assurance'}</option>
                  <option value="visite_technique">{isAr ? 'الفحص التقني' : 'Visite Technique'}</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'رقم الوثيقة' : 'Numéro'}</label>
                <input
                  className="input-field"
                  value={docData.doc_number}
                  onChange={e => setDocData({ ...docData, doc_number: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'تاريخ الإصدار' : 'Date Émission'}</label>
                <input
                  className="input-field"
                  type="date"
                  value={docData.issue_date}
                  onChange={e => setDocData({ ...docData, issue_date: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'تاريخ الانتهاء' : 'Date Expiration'}</label>
                <input
                  className="input-field"
                  type="date"
                  value={docData.expiry_date}
                  onChange={e => setDocData({ ...docData, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowAddDocument(false)}>{isAr ? 'إلغاء' : 'Annuler'}</button>
              <button className="btn btn-primary" onClick={handleAddDocument}>{isAr ? 'حفظ' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Vehicle */}
      {showEditModal && editData && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="m-0">{isAr ? 'تعديل معلومات السيارة' : 'Modifier le Véhicule'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            <div className="form-grid mt-4">
              <div className="input-group">
                <label className="input-label">{isAr ? 'العلامة' : 'Marque'}</label>
                <input className="input-field" value={editData.brand} onChange={e => setEditData({ ...editData, brand: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'الموديل' : 'Modèle'}</label>
                <input className="input-field" value={editData.model} onChange={e => setEditData({ ...editData, model: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'اللوحة' : 'Matricule'}</label>
                <input className="input-field font-mono" value={editData.plate} onChange={e => setEditData({ ...editData, plate: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'السنة' : 'Année'}</label>
                <input className="input-field" type="number" value={editData.year || ''} onChange={e => setEditData({ ...editData, year: e.target.value ? parseInt(e.target.value) : 0 })} />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'الوقود' : 'Carburant'}</label>
                <select className="input-field" value={editData.fuel} onChange={e => setEditData({ ...editData, fuel: e.target.value })}>
                  <option value="Diesel">Diesel</option>
                  <option value="Essence">Essence</option>
                  <option value="Hybride">Hybride</option>
                  <option value="Electrique">Electrique</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'ناقل الحركة' : 'Transmission'}</label>
                <select className="input-field" value={editData.transmission} onChange={e => setEditData({ ...editData, transmission: e.target.value })}>
                  <option value="Manuelle">{isAr ? 'يدوي' : 'Manuelle'}</option>
                  <option value="Automatique">{isAr ? 'أوتوماتيكي' : 'Automatique'}</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'الثمن اليومي (MAD)' : 'Tarif Journalier (MAD)'}</label>
                <input className="input-field" type="number" value={editData.daily_rate || ''} onChange={e => setEditData({ ...editData, daily_rate: e.target.value ? parseFloat(e.target.value) : 0 })} />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'الكيلومترات' : 'Kilométrage'}</label>
                <input className="input-field" type="number" value={editData.current_km || ''} onChange={e => setEditData({ ...editData, current_km: e.target.value ? parseInt(e.target.value) : 0 })} />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'الحالة' : 'Statut'}</label>
                <select className="input-field" value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })}>
                  <option value="available">{isAr ? 'متاح' : 'Disponible'}</option>
                  <option value="rented">{isAr ? 'مؤجر' : 'Loué'}</option>
                  <option value="maintenance">{isAr ? 'ورشة' : 'Atelier'}</option>
                  <option value="blocked">{isAr ? 'محظور' : 'Bloqué'}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-8 justify-end">
              <button className="btn btn-outline" onClick={() => setShowEditModal(false)}>{isAr ? 'إلغاء' : 'Annuler'}</button>
              <button className="btn btn-primary px-10" onClick={handleUpdateVehicle}>
                 <Save size={18} /> {isAr ? 'حفظ' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Zoom Overlay */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-gold transition-colors">
            <X size={32} />
          </button>
          <img
            src={selectedPhoto}
            alt="Enlarged"
            className="max-w-full max-h-full rounded-xl shadow-2xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default VehicleDetail;
