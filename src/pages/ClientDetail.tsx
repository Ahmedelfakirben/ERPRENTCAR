import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, User, Phone, Mail, CreditCard,
  FileText, History, Edit, Shield,
  CalendarDays, CarFront, Loader2, X, Check, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageUpload from '../components/common/ImageUpload';
import './ClientDetail.css';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [tab, setTab] = useState<'overview' | 'history' | 'documents'>('overview');
  const [client, setClient] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [showEdit, setShowEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: '', last_name: '', phone: '', email: '', cin: '', 
    passport: '', driver_license: '', license_delivery_date: '', 
    birth_date: '', birth_place: '', nationality: 'Marocaine', address: '',
    foreign_address: '',
    license_expiry_date: ''
  });

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const [clientRes, historyRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('contracts')
          .select('*, vehicles(brand, model, plate)')
          .eq('client_id', id)
          .order('start_date', { ascending: false })
      ]);

      if (clientRes.error) throw clientRes.error;
      setClient(clientRes.data);
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error('Error fetching client details:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (client) {
      // Split full_name safely if first_name/last_name fields are undefined/empty:
      const nameParts = (client.full_name || '').trim().split(/\s+/);
      const firstName = client.first_name || nameParts[0] || '';
      const lastName = client.last_name || nameParts.slice(1).join(' ') || '';

      setEditFormData({
        first_name: firstName,
        last_name: lastName,
        phone: client.phone || '',
        email: client.email || '',
        cin: client.cin || '',
        passport: client.passport || '',
        driver_license: client.driver_license || '',
        license_delivery_date: client.license_delivery_date || '',
        birth_date: client.birth_date || '',
        birth_place: client.birth_place || '',
        nationality: client.nationality || 'Marocaine',
        address: client.address || '',
        foreign_address: client.foreign_address || '',
        license_expiry_date: client.license_expiry_date || ''
      });
      setShowEdit(true);
    }
  };

  const handleUpdateClient = async () => {
    try {
      const payload = {
        ...editFormData,
        full_name: `${editFormData.first_name} ${editFormData.last_name}`.trim(),
        birth_date: editFormData.birth_date || null,
        license_delivery_date: editFormData.license_delivery_date || null,
        license_expiry_date: editFormData.license_expiry_date || null
      };

      const { error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      setShowEdit(false);
      fetchClientData(); // Refresh data
    } catch (err) {
      console.error('Error updating client:', err);
      alert('Erreur lors de la modification');
    }
  };

  const handleDeleteClient = async () => {
    const msg = isAr 
      ? 'هل أنت متأكد أنك تريد حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.' 
      : 'Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.';
    if (!window.confirm(msg)) return;

    setLoading(true);
    try {
      // 1. Get all contracts for this client
      const { data: contracts } = await supabase.from('contracts').select('id, vehicle_id, status').eq('client_id', id);
      const contractIds = contracts?.map(c => c.id) || [];
      
      // Free vehicles if active
      const activeContracts = contracts?.filter(c => c.status === 'active' || c.status === 'pending') || [];
      for (const ac of activeContracts) {
         await supabase.from('vehicles').update({ status: 'available' }).eq('id', ac.vehicle_id);
      }
      
      if (contractIds.length > 0) {
        await Promise.all([
          supabase.from('transactions').delete().in('contract_id', contractIds),
          supabase.from('incidents').delete().in('contract_id', contractIds),
          supabase.from('contracts').delete().in('id', contractIds)
        ]);
      }
      
      // 2. Delete invoices (they might be linked to client directly)
      await supabase.from('invoices').delete().eq('client_id', id);

      // 3. Delete the client
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      
      navigate('/crm');
    } catch (err: any) {
      console.error('Error deleting client:', err);
      alert(isAr ? 'خطأ في حذف العميل: ' + err.message : 'Erreur lors de la suppression: ' + err.message);
      setLoading(false);
    }
  };

  const handleUpdateDocument = async (url: string, field: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ [field]: url })
        .eq('id', id);

      if (error) throw error;
      setClient({ ...client, [field]: url });
    } catch (err) {
      console.error('Error updating document image:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-12 text-center card m-8">
         <h2 className="text-secondary">{isAr ? 'العميل غير موجود' : 'Client non trouvé'}</h2>
         <button className="btn btn-primary mt-4" onClick={() => navigate('/crm')}>
           {isAr ? 'العودة للقائمة' : 'Retour à la liste'}
         </button>
      </div>
    );
  }

  const c = client;
  const calculatedRentals = history.length;
  const calculatedSpent = history.reduce((sum, contract) => sum + (contract.total_ttc || 0), 0);

  return (
    <>
      <div className="client-detail-page animate-fade-in">
        <div className="detail-top-bar">
          <button className="btn btn-ghost" onClick={() => navigate('/crm')}>
            <ArrowLeft size={18} /> {isAr ? 'العودة للعملاء' : 'Retour aux Clients'}
          </button>
          <div className="flex gap-2">
            <button className="btn btn-outline text-error border-error/50 hover:bg-error/10 hover:border-error" onClick={handleDeleteClient}>
              <Trash2 size={16} /> {isAr ? 'حذف' : 'Supprimer'}
            </button>
            <button className="btn btn-outline" onClick={openEditModal}><Edit size={16} /> {isAr ? 'تعديل' : 'Modifier'}</button>
          </div>
        </div>

        {/* Client Hero */}
        <div className="client-hero card">
          <div className="client-hero-left">
            <div className="client-hero-avatar">
              {(isAr ? (c.full_name_ar || c.full_name) : c.full_name).charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1>{isAr ? (c.full_name_ar || c.full_name) : c.full_name}</h1>
              </div>
              <p className="text-secondary">{isAr ? `عميل منذ ${new Date(c.created_at).toLocaleDateString()}` : `Client depuis le ${new Date(c.created_at).toLocaleDateString()}`}</p>
            </div>
          </div>
          <div className="client-hero-stats">
            <div className="client-stat">
              <span className="client-stat-number">{calculatedRentals}</span>
              <span className="client-stat-label">{isAr ? 'إيجار' : 'Locations'}</span>
            </div>
            <div className="client-stat">
              <span className="client-stat-number text-success">{(calculatedSpent / 1000).toFixed(1)}k</span>
              <span className="client-stat-label">MAD</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <button className={`tab ${tab === 'overview' ? 'tab-active' : ''}`} onClick={() => setTab('overview')}>
            <User size={16} /> {isAr ? 'نظرة عامة' : 'Aperçu'}
          </button>
          <button className={`tab ${tab === 'history' ? 'tab-active' : ''}`} onClick={() => setTab('history')}>
            <History size={16} /> {isAr ? 'تاريخ الإيجارات' : 'Historique'}
          </button>
          <button className={`tab ${tab === 'documents' ? 'tab-active' : ''}`} onClick={() => setTab('documents')}>
            <FileText size={16} /> {isAr ? 'الوثائق' : 'Documents'}
          </button>
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="client-overview-grid">
            <div className="card">
              <h3 className="mb-4">{isAr ? 'المعلومات الشخصية' : 'Informations Personnelles'}</h3>
              <div className="info-rows">
                <div className="info-row">
                  <span className="info-label flex items-center gap-2"><User size={14} /> {isAr ? 'الإسم' : 'Prénom'}</span>
                  <span className="info-value font-medium text-primary">{c.first_name || (c.full_name?.split(' ')[0])}</span>
                </div>
                <div className="info-row">
                  <span className="info-label flex items-center gap-2"><User size={14} className="opacity-0" /> {isAr ? 'النسب' : 'Nom'}</span>
                  <span className="info-value font-medium">{c.last_name || (c.full_name?.substring(c.full_name?.indexOf(' ') + 1))}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'تاريخ الازدياد' : 'Date de Naissance'}</span>
                  <span className="info-value">{c.birth_date || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'مكان الازدياد' : 'Lieu de Naissance'}</span>
                  <span className="info-value">{c.birth_place || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'الجنسية' : 'Nationalité'}</span>
                  <span className="info-value">{c.nationality}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'العنوان بالمغرب' : 'Adresse au Maroc'}</span>
                  <span className="info-value">{c.address || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'العنوان بالخارج' : "Adresse à l'étranger"}</span>
                  <span className="info-value">{c.foreign_address || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'رقم جواز السفر' : 'Passeport N°'}</span>
                  <span className="info-value font-mono">{c.passport || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label flex items-center gap-2"><CreditCard size={14} /> C.I.N N°</span>
                  <span className="info-value font-mono font-bold">{c.cin}</span>
                </div>
                <div className="info-row">
                  <span className="info-label flex items-center gap-2"><Phone size={14} /> {isAr ? 'الهاتف' : 'Tél'}</span>
                  <span className="info-value">{c.phone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label flex items-center gap-2"><Shield size={14} /> {isAr ? 'رخصة السياقة' : 'Permis N°'}</span>
                  <span className="info-value font-mono">{c.driver_license}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'تاريخ الإصدار' : 'Délivré le'}</span>
                  <span className="info-value">{c.license_delivery_date || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'تاريخ الانتهاء' : 'Expire le'}</span>
                  <span className="info-value font-bold text-error">{c.license_expiry_date || '—'}</span>
                </div>
              </div>
            </div>

            <div className="card">
              {/* Recent Activity Summary */}
              <div>
                <h3 className="mb-4">{isAr ? 'آخر نشاط' : 'Dernière Activité'}</h3>
                <div className="recent-items">
                  {history.length > 0 ? (
                    <>
                      <div className="recent-item">
                        <CalendarDays size={14} className="text-primary" />
                        <span className="text-sm">{isAr ? 'آخر إيجار' : 'Dernière location'}: {history[0].start_date}</span>
                      </div>
                      <div className="recent-item">
                        <CarFront size={14} className="text-secondary" />
                        <span className="text-sm">{isAr ? 'آخر سيارة' : 'Dernier véhicule'}: {history[0].vehicles?.brand} {history[0].vehicles?.model}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-secondary italic">{isAr ? 'لا يوجد نشاط مسجل' : 'Aucune activité enregistrée'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isAr ? 'العقد' : 'Contrat'}</th>
                  <th>{isAr ? 'السيارة' : 'Véhicule'}</th>
                  <th>{isAr ? 'اللوحة' : 'Matricule'}</th>
                  <th>{isAr ? 'البداية' : 'Début'}</th>
                  <th>{isAr ? 'النهاية' : 'Fin'}</th>
                  <th>{isAr ? 'المجموع' : 'Total'}</th>
                  <th>{isAr ? 'الحالة' : 'Statut'}</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? history.map(r => (
                  <tr key={r.id} className="cursor-pointer" onClick={() => navigate(`/contracts/${r.id}`)}>
                    <td className="font-medium text-primary">{r.contract_number}</td>
                    <td>{r.vehicles?.brand} {r.vehicles?.model}</td>
                    <td style={{ fontFamily: 'monospace' }} className="text-secondary">{r.vehicles?.plate}</td>
                    <td className="text-secondary">{r.start_date}</td>
                    <td className="text-secondary">{r.end_date}</td>
                    <td className="font-semibold">{(r.total_ttc || 0).toLocaleString()} MAD</td>
                    <td>
                      <span className={`badge ${r.status === 'active' ? 'badge-primary' : r.status === 'completed' ? 'badge-success' : 'badge-secondary'}`}>
                        {r.status === 'active' ? (isAr ? 'نشط' : 'Actif') : r.status === 'completed' ? (isAr ? 'مكتمل' : 'Terminé') : r.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="text-center p-8 text-secondary italic">{isAr ? 'لا يوجد تاريخ تأجير' : 'Aucun historique de location'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Documents */}
        {tab === 'documents' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* CIN */}
            <div className="card" style={{ padding: 'var(--spacing-6)' }}>
              <h3 className="mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-primary" />
                {isAr ? 'بطاقة الهوية (CIN)' : 'Carte d\'Identité Nationale (CIN)'}
                <span className="font-mono text-primary ml-auto">{c.cin || '—'}</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* CIN Front */}
                <div>
                  <p className="text-xs text-secondary mb-2 font-semibold uppercase">Recto (Front)</p>
                  {c.cin_front ? (
                    <a href={c.cin_front} target="_blank" rel="noopener noreferrer">
                      <img src={c.cin_front} alt="CIN Front" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover', aspectRatio: '3/2', cursor: 'zoom-in' }} />
                    </a>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: '8px', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: '12px', gap: '8px' }}>
                      <CreditCard size={24} style={{ opacity: 0.3 }} />
                      {isAr ? 'لم يتم التحميل' : 'Non chargé'}
                    </div>
                  )}
                  <div className="mt-2">
                    <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => handleUpdateDocument(url, 'cin_front')} />
                  </div>
                </div>
                {/* CIN Back */}
                <div>
                  <p className="text-xs text-secondary mb-2 font-semibold uppercase">Verso (Back)</p>
                  {c.cin_back ? (
                    <a href={c.cin_back} target="_blank" rel="noopener noreferrer">
                      <img src={c.cin_back} alt="CIN Back" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover', aspectRatio: '3/2', cursor: 'zoom-in' }} />
                    </a>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: '8px', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: '12px', gap: '8px' }}>
                      <CreditCard size={24} style={{ opacity: 0.3 }} />
                      {isAr ? 'لم يتم التحميل' : 'Non chargé'}
                    </div>
                  )}
                  <div className="mt-2">
                    <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => handleUpdateDocument(url, 'cin_back')} />
                  </div>
                </div>
              </div>
            </div>

            {/* Permis de Conduire */}
            <div className="card" style={{ padding: 'var(--spacing-6)' }}>
              <h3 className="mb-4 flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                {isAr ? 'رخصة السياقة' : 'Permis de Conduire'}
                <span className="font-mono text-primary ml-auto">{c.driver_license || '—'}</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* License Front */}
                <div>
                  <p className="text-xs text-secondary mb-2 font-semibold uppercase">Recto (Front)</p>
                  {c.license_front ? (
                    <a href={c.license_front} target="_blank" rel="noopener noreferrer">
                      <img src={c.license_front} alt="License Front" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover', aspectRatio: '3/2', cursor: 'zoom-in' }} />
                    </a>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: '8px', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: '12px', gap: '8px' }}>
                      <Shield size={24} style={{ opacity: 0.3 }} />
                      {isAr ? 'لم يتم التحميل' : 'Non chargé'}
                    </div>
                  )}
                  <div className="mt-2">
                    <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => handleUpdateDocument(url, 'license_front')} />
                  </div>
                </div>
                {/* License Back */}
                <div>
                  <p className="text-xs text-secondary mb-2 font-semibold uppercase">Verso (Back)</p>
                  {c.license_back ? (
                    <a href={c.license_back} target="_blank" rel="noopener noreferrer">
                      <img src={c.license_back} alt="License Back" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover', aspectRatio: '3/2', cursor: 'zoom-in' }} />
                    </a>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: '8px', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: '12px', gap: '8px' }}>
                      <Shield size={24} style={{ opacity: 0.3 }} />
                      {isAr ? 'لم يتم التحميل' : 'Non chargé'}
                    </div>
                  )}
                  <div className="mt-2">
                    <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => handleUpdateDocument(url, 'license_back')} />
                  </div>
                </div>
              </div>
            </div>

            {/* Passeport */}
            <div className="card" style={{ padding: 'var(--spacing-6)' }}>
              <h3 className="mb-4 flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                {isAr ? 'جواز السفر' : 'Passeport'}
                <span className="font-mono text-primary ml-auto">{c.passport || '—'}</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Passport Front */}
                <div>
                  <p className="text-xs text-secondary mb-2 font-semibold uppercase">Recto (Front)</p>
                  {c.passport_front ? (
                    <a href={c.passport_front} target="_blank" rel="noopener noreferrer">
                      <img src={c.passport_front} alt="Passport Front" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover', aspectRatio: '3/2', cursor: 'zoom-in' }} />
                    </a>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: '8px', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: '12px', gap: '8px' }}>
                      <FileText size={24} style={{ opacity: 0.3 }} />
                      {isAr ? 'لم يتم التحميل' : 'Non chargé'}
                    </div>
                  )}
                  <div className="mt-2">
                    <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => handleUpdateDocument(url, 'passport_front')} />
                  </div>
                </div>
                {/* Passport Back */}
                <div>
                  <p className="text-xs text-secondary mb-2 font-semibold uppercase">Verso (Back)</p>
                  {c.passport_back ? (
                    <a href={c.passport_back} target="_blank" rel="noopener noreferrer">
                      <img src={c.passport_back} alt="Passport Back" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover', aspectRatio: '3/2', cursor: 'zoom-in' }} />
                    </a>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: '8px', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: '12px', gap: '8px' }}>
                      <FileText size={24} style={{ opacity: 0.3 }} />
                      {isAr ? 'لم يتم التحميل' : 'Non chargé'}
                    </div>
                  )}
                  <div className="mt-2">
                    <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => handleUpdateDocument(url, 'passport_back')} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Edit Client Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="kpi-gold p-2 rounded-md">
                   <User size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="m-0 text-xl">{isAr ? 'تعديل العميل' : 'Modifier le Client'}</h2>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="form-grid mt-6">
              <div className="input-group">
                <label className="input-label">
                  <User size={14} className="inline mr-1" /> {isAr ? 'الإسم' : 'Prénom'}
                </label>
                <input 
                  className="input-field" 
                  value={editFormData.first_name}
                  onChange={e => setEditFormData({...editFormData, first_name: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                   {isAr ? 'النسب' : 'Nom'}
                </label>
                <input 
                  className="input-field" 
                  value={editFormData.last_name}
                  onChange={e => setEditFormData({...editFormData, last_name: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  <Phone size={14} className="inline mr-1" /> {isAr ? 'الهاتف' : 'Téléphone'}
                </label>
                <input 
                  className="input-field" 
                  value={editFormData.phone}
                  onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  <Mail size={14} className="inline mr-1" /> {isAr ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <input 
                  className="input-field" 
                  type="email" 
                  value={editFormData.email}
                  onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  <CreditCard size={14} className="inline mr-1" /> C.I.N
                </label>
                <input 
                  className="input-field" 
                  value={editFormData.cin}
                  onChange={e => setEditFormData({...editFormData, cin: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  {isAr ? 'رقم جواز السفر' : 'Passeport N°'}
                </label>
                <input 
                  className="input-field" 
                  value={editFormData.passport}
                  onChange={e => setEditFormData({...editFormData, passport: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  <Shield size={14} className="inline mr-1" /> {isAr ? 'رقم رخصة القيادة' : 'Permis N°'}
                </label>
                <input 
                  className="input-field" 
                  value={editFormData.driver_license}
                  onChange={e => setEditFormData({...editFormData, driver_license: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  {isAr ? 'تاريخ الإصدار' : 'Délivré le'}
                </label>
                <input 
                  type="date"
                  className="input-field" 
                  value={editFormData.license_delivery_date}
                  onChange={e => setEditFormData({...editFormData, license_delivery_date: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  {isAr ? 'تاريخ الانتهاء' : 'Expire le'}
                </label>
                <input 
                  type="date"
                  className="input-field" 
                  value={editFormData.license_expiry_date}
                  onChange={e => setEditFormData({...editFormData, license_expiry_date: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  {isAr ? 'تاريخ الازدياد' : 'Date de Naissance'}
                </label>
                <input 
                  type="date"
                  className="input-field" 
                  value={editFormData.birth_date}
                  onChange={e => setEditFormData({...editFormData, birth_date: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  {isAr ? 'مكان الازدياد' : 'Lieu de Naissance'}
                </label>
                <input 
                  className="input-field" 
                  value={editFormData.birth_place}
                  onChange={e => setEditFormData({...editFormData, birth_place: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  {isAr ? 'العنوان بالمغرب' : 'Adresse au Maroc'}
                </label>
                <input 
                  className="input-field" 
                  value={editFormData.address}
                  onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  {isAr ? 'العنوان بالخارج' : "Adresse à l'étranger"}
                </label>
                <input 
                  className="input-field" 
                  value={editFormData.foreign_address}
                  onChange={e => setEditFormData({...editFormData, foreign_address: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowEdit(false)}>
                {isAr ? 'إلغاء' : 'Annuler'}
              </button>
              <button className="btn btn-primary shadow-lg" onClick={handleUpdateClient}>
                <Check size={18} /> {isAr ? 'حفظ التغييرات' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientDetail;
