import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, FileText, Download, Printer, User, CarFront,
  Fuel, Sparkles, Gauge, CreditCard, CheckCircle2, Camera, Check, FileCheck,
  Loader2, AlertTriangle, ArrowRight, Calendar, X as XIcon, ShieldAlert
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './ContractDetail.css';
import DamageMap from '../components/DamageMap';
import type { DamagePoint } from '../components/DamageMap';

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [tab, setTab] = useState<'details' | 'checkin' | 'checkout' | 'damages'>('details');
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const [returnData, setReturnData] = useState({
    km_in: 0,
    fuel_level_in: 'full',
    actual_return_date: new Date().toISOString().split('T')[0],
    actual_return_time: '20:00',
    notes: ''
  });

  const [checkoutData, setCheckoutData] = useState({
    time_out: '08:00',
    km_out: 0,
    fuel_level_out: 'full',
    cleanliness_out: 'clean',
    notes: ''
  });
  const [damagesOut, setDamagesOut] = useState<DamagePoint[]>([]);
  const [damagesIn, setDamagesIn] = useState<DamagePoint[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetchContractDetails();
  }, [id]);

  const fetchContractDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients (*),
          vehicles (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setContract(data);
      if (data.damages_out) setDamagesOut(data.damages_out);
      if (data.damages_in) setDamagesIn(data.damages_in);
      // Pre-fill return/checkout data
      setReturnData(prev => ({ 
        ...prev, 
        km_in: data.vehicles?.current_km || data.km_out || 0,
        fuel_level_in: data.fuel_level_out || 'full',
        actual_return_time: data.time_in || '20:00'
      }));
      setCheckoutData({
        time_out: data.time_out || '08:00',
        km_out: data.vehicles?.current_km || 0,
        fuel_level_out: 'full',
        cleanliness_out: 'clean',
        notes: data.notes || ''
      });
    } catch (err) {
      console.error('Error fetching contract details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnContract = async () => {
    if (!contract) return;
    setLoadingAction(true);
    try {
      // 1. Update Contract
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          km_in: returnData.km_in,
          fuel_level_in: returnData.fuel_level_in,
          actual_return_date: returnData.actual_return_date,
          actual_return_time: returnData.actual_return_time,
          notes: returnData.notes,
          damages_in: damagesIn,
          status: 'completed'
        })
        .eq('id', id);

      if (contractError) {
        // Fallback in case actual_return_time column is missing in DB
        if (contractError.code === 'PGRST204' || contractError.message.includes('column')) {
           await supabase.from('contracts').update({
             km_in: returnData.km_in,
             fuel_level_in: returnData.fuel_level_in,
             actual_return_date: returnData.actual_return_date,
             notes: returnData.notes + ` | Heure de retour: ${returnData.actual_return_time}`,
             status: 'completed'
           }).eq('id', id);
        } else {
           throw contractError;
        }
      }

      // 2. Update Vehicle
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({
          status: 'available',
          current_km: returnData.km_in
        })
        .eq('id', contract.vehicle_id);

      if (vehicleError) throw vehicleError;

      setShowReturnModal(false);
      fetchContractDetails();
    } catch (err) {
      console.error('Error closing contract:', err);
      alert('Error closing contract. Check console.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCheckoutContract = async () => {
    if (!contract) return;
    setLoadingAction(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          ...checkoutData,
          damages_out: damagesOut,
          status: 'active'
        })
        .eq('id', id);

      if (error) throw error;
      
      // Optional: update vehicle KM if it changed
      await supabase.from('vehicles').update({ current_km: checkoutData.km_out }).eq('id', contract.vehicle_id);

      setShowCheckoutModal(false);
      fetchContractDetails();
    } catch (err: any) {
      console.error('Error during checkout:', err);
      alert(isAr ? 'حدث خطأ. هل قمت بتحديث قاعدة البيانات؟' : 'Erreur. Avez-vous ajouté la colonne time_out dans Supabase? ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelContract = async () => {
    if (!contract) return;
    setLoadingAction(true);
    try {
      // 1. Update Contract
      const { error: contractError } = await supabase
        .from('contracts')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (contractError) throw contractError;

      // 2. Update Vehicle to available
      await supabase.from('vehicles').update({ status: 'available' }).eq('id', contract.vehicle_id);

      // 3. Remove associated transactions to exclude from Dashboard/Finance
      await supabase.from('transactions').delete().eq('contract_id', id);

      setShowCancelModal(false);
      fetchContractDetails();
    } catch (err) {
      console.error('Error cancelling contract:', err);
      alert('Error cancelling contract');
    } finally {
      setLoadingAction(false);
    }
  };

  const statusLabel: Record<string, string> = {
    pending: isAr ? 'معلق' : 'En attente',
    active: isAr ? 'نشط' : 'Actif',
    completed: isAr ? 'مكتمل' : 'Terminé',
    overdue: isAr ? 'متأخر' : 'En retard',
    cancelled: isAr ? 'ملغى' : 'Annulé',
  };
  
  const statusBadge: Record<string, string> = {
    pending: 'badge-warning', active: 'badge-primary', completed: 'badge-success', overdue: 'badge-error', cancelled: 'badge-secondary',
  };

  const fuelOptions = [
    { value: 'empty', label: isAr ? 'فارغ' : 'Vide' },
    { value: '1/4', label: '1/4' },
    { value: '1/2', label: '1/2' },
    { value: '3/4', label: '3/4' },
    { value: 'full', label: isAr ? 'ممتلئ' : 'Plein' },
  ];

  const cleanOptions = [
    { value: 'clean', label: isAr ? 'نظيف' : 'Propre' },
    { value: 'acceptable', label: isAr ? 'مقبول' : 'Acceptable' },
    { value: 'dirty', label: isAr ? 'متسخ' : 'Sale' },
  ];

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-primary" size={64} /></div>;
  if (!contract) return <div className="p-12 text-center text-error">Contract not found</div>;

  const c = contract;

  return (
    <>
      <div className="contract-detail-page animate-fade-in">
      <div className="detail-top-bar">
        <button className="btn btn-ghost" onClick={() => navigate('/contracts')}>
          <ArrowLeft size={18} /> {isAr ? 'العودة للعقود' : 'Retour aux Contrats'}
        </button>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={() => navigate(`/contracts/${id}/print`)}>
            <Printer size={16} /> {isAr ? 'طباعة' : 'Imprimer'}
          </button>
          <button className="btn btn-primary" onClick={() => navigate(`/contracts/${id}/print?action=download`)}>
            <Download size={16} /> PDF
          </button>
          
          {/* Cancel Button - Only for active/pending and not finished */}
          {(() => {
            const isPast = new Date(c.end_date) < new Date(new Date().setHours(0,0,0,0));
            const canCancel = (c.status === 'pending' || c.status === 'active') && !isPast;
            if (!canCancel) return null;
            
            return (
              <button 
                className="btn bg-error/10 text-error hover:bg-error hover:text-white border border-error/20" 
                onClick={() => setShowCancelModal(true)}
                disabled={loadingAction}
              >
                {loadingAction ? <Loader2 className="animate-spin" size={16} /> : <XIcon size={16} />}
                {isAr ? 'إلغاء العقد' : 'Anuler le Contrat'}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Contract Header */}
      <div className="contract-hero card">
        <div className="contract-hero-left">
          <div className="hero-icon-wrap">
            <FileText size={24} />
          </div>
          <div className="hero-titles">
            <div className="flex items-center gap-3">
              <h1 className="m-0 text-2xl" style={{ fontWeight: 800 }}>{c.contract_number}</h1>
              <span className={`badge ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span>
            </div>
            <p className="text-secondary m-0 mt-1 flex items-center gap-2">
              <Calendar size={14} />
              {c.start_date} <ArrowRight size={14} /> {c.end_date} 
              <span className="text-sm opacity-70">({c.total_days} {isAr ? 'أيام' : 'jours'})</span>
            </p>
          </div>
        </div>
        <div className="contract-hero-right">
          <div className="total-display">
             <span className="total-amount text-gold">{(c.total_ttc || 0).toLocaleString()} <small>MAD</small></span>
             <span className="total-label">{isAr ? 'المجموع شامل الضريبة' : 'Total TTC'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar mt-6">
        <button className={`tab ${tab === 'details' ? 'tab-active' : ''}`} onClick={() => setTab('details')}>
          <FileText size={16} /> {isAr ? 'تفاصيل العقد' : 'Détails du Contrat'}
        </button>
        <button className={`tab ${tab === 'checkout' ? 'tab-active' : ''}`} onClick={() => setTab('checkout')}>
          <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} /> {isAr ? 'خروج (Check-out)' : 'Départ (Check-out)'}
        </button>
        <button className={`tab ${tab === 'checkin' ? 'tab-active' : ''}`} onClick={() => setTab('checkin')}>
          <ArrowLeft size={16} /> {isAr ? 'إرجاع (Check-in)' : 'Retour (Check-in)'}
        </button>
        <button className={`tab ${tab === 'damages' ? 'tab-active' : ''}`} onClick={() => setTab('damages')}>
          <ShieldAlert size={16} /> {isAr ? 'حالة السيارة' : 'État du véhicule'}
        </button>
      </div>

      {/* Details Tab */}
      {tab === 'details' && (
        <div className="contract-details-grid">
          {/* Client Info */}
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2"><User size={18} /> {isAr ? 'العميل' : 'Client'}</h3>
            <div className="info-rows" onClick={() => navigate(`/crm/${c.client_id}`)} style={{ cursor: 'pointer' }}>
              <div className="info-row">
                <span className="info-label">{isAr ? 'الاسم' : 'Nom'}</span>
                <span className="info-value font-medium text-primary">
                  {isAr ? (c.clients?.full_name_ar || c.clients?.full_name) : c.clients?.full_name}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">CIN</span>
                <span className="info-value" style={{ fontFamily: 'monospace' }}>{c.clients?.cin}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{isAr ? 'الهاتف' : 'Téléphone'}</span>
                <span className="info-value">{c.clients?.phone}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2"><CarFront size={18} /> {isAr ? 'السيارة' : 'Véhicule'}</h3>
            <div className="info-rows" onClick={() => navigate(`/fleet/${c.vehicle_id}`)} style={{ cursor: 'pointer' }}>
              <div className="info-row">
                <span className="info-label">{isAr ? 'السيارة' : 'Véhicule'}</span>
                <span className="info-value font-medium text-primary">{c.vehicles?.brand} {c.vehicles?.model}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{isAr ? 'اللوحة' : 'Matricule'}</span>
                <span className="info-value" style={{ fontFamily: 'monospace' }}>{c.vehicles?.plate}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{isAr ? 'السعر/يوم' : 'Tarif/Jour'}</span>
                <span className="info-value font-medium">{c.daily_rate} MAD</span>
              </div>
            </div>
          </div>

          {/* Rental Info */}
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2"><Calendar size={18} /> {isAr ? 'تفاصيل الإيجار' : 'Détails de Location'}</h3>
            <div className="info-rows">
              <div className="info-row">
                <span className="info-label">{isAr ? 'تاريخ الاستلام' : 'Date de Départ'}</span>
                <span className="info-value font-medium">{c.start_date}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{isAr ? 'تاريخ الإرجاع' : 'Date de Retour'}</span>
                <span className="info-value font-medium">{c.end_date}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{isAr ? 'المدة' : 'Durée'}</span>
                <span className="info-value">{c.total_days} {isAr ? 'أيام' : 'jours'}</span>
              </div>
              {c.second_driver_name && (
                <>
                  <div className="info-row" style={{ marginTop: '1rem', borderTop: '1px dashed var(--border)', paddingTop: '1rem' }}>
                    <span className="info-label">{isAr ? 'السائق الثاني' : '2ème Conducteur'}</span>
                    <span className="info-value font-medium text-primary">{c.second_driver_name}</span>
                  </div>
                  {c.second_driver_license && (
                    <div className="info-row">
                      <span className="info-label">{isAr ? 'رخصة السياقة' : 'Permis'}</span>
                      <span className="info-value font-mono">{c.second_driver_license}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card financial-summary">
            <h3 className="mb-4 flex items-center gap-2"><CreditCard size={18} /> {isAr ? 'الملخص المالي' : 'Résumé Financier'}</h3>
            <div className="info-rows">
              <div className="info-row">
                <span className="info-label">{isAr ? 'المجموع الفرعي' : 'Sous-Total'}</span>
                <span className="info-value">{(c.subtotal || 0).toLocaleString()} MAD</span>
              </div>
              {c.discount_amount > 0 && (
                <div className="info-row">
                  <span className="info-label">{isAr ? 'الخصم' : 'Remise'}</span>
                  <span className="info-value text-success">-{(c.discount_amount || 0).toLocaleString()} MAD</span>
                </div>
              )}
              <div className="info-row total-row">
                <span className="info-label font-bold">{isAr ? 'المجموع' : 'Total TTC'}</span>
                <span className="info-value font-bold text-primary" style={{ fontSize: '1.2rem' }}>{(c.total_ttc || 0).toLocaleString()} MAD</span>
              </div>
              <div className="info-row">
                <span className="info-label">{isAr ? 'الضمان' : 'Caution'}</span>
                <span className="info-value">
                  {(c.deposit_amount || 0).toLocaleString()} MAD
                  <span className={`badge ${c.deposit_returned ? 'badge-success' : 'badge-warning'}`} style={{ marginInlineStart: '8px' }}>
                    {c.deposit_returned ? (isAr ? 'مُرجعة' : 'Rendue') : (isAr ? 'محتفظ بها' : 'Retenue')}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-out (Depart) Tab */}
      {tab === 'checkout' && (
        <div className="card checkin-card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="m-0">{isAr ? 'حالة السيارة عند الخروج' : 'État du véhicule au départ (Check-out)'}</h3>
            {c.km_out == null && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowCheckoutModal(true)}>
                <FileCheck size={16} /> {isAr ? 'تسجيل الخروج' : 'Enregistrer le départ'}
              </button>
            )}
          </div>

          {c.km_out == null ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <CarFront size={48} className="text-secondary opacity-30" />
              <p className="text-center text-secondary">{isAr ? 'لم يتم تسجيل بيانات الخروج بعد.' : 'Les données de départ n\'ont pas encore été enregistrées.'}</p>
              <button className="btn btn-primary" onClick={() => setShowCheckoutModal(true)}>
                 {isAr ? 'تسجيل بيانات الخروج الآن' : 'Saisir les données de départ'}
              </button>
            </div>
          ) : (
            <>
              <div className="checkin-grid">
                <div className="checkin-item">
                  <label className="input-label flex items-center gap-2"><Calendar size={16} /> {isAr ? 'وقت الخروج' : 'Heure de départ'}</label>
                  <div className="font-bold p-2 bg-surface border rounded-lg text-center">
                     {c.time_out || '—'}
                  </div>
                </div>
                <div className="checkin-item">
                  <label className="input-label flex items-center gap-2"><Fuel size={16} /> {isAr ? 'مستوى الوقود' : 'Carburant'}</label>
                  <div className="fuel-gauge">
                    {fuelOptions.map(f => (
                      <button key={f.value} className={`fuel-btn ${c.fuel_level_out === f.value ? 'fuel-btn-active' : ''}`} disabled>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="checkin-item">
                  <label className="input-label flex items-center gap-2"><Gauge size={16} /> {isAr ? 'الكيلومترات' : 'Kilométrage'}</label>
                  <input className="input-field" value={(c.km_out || 0).toLocaleString()} disabled />
                </div>
                <div className="checkin-item">
                  <label className="input-label flex items-center gap-2"><Sparkles size={16} /> {isAr ? 'النظافة' : 'Propreté'}</label>
                  <div className="fuel-gauge">
                    {cleanOptions.map(cl => (
                      <button key={cl.value} className={`fuel-btn ${c.cleanliness_out === cl.value ? 'fuel-btn-active' : ''}`} disabled>
                        {cl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="checkin-status mt-4">
                <CheckCircle2 size={18} className="text-success" />
                <span className="text-success font-medium">{isAr ? 'تم تسجيل الخروج' : 'Départ enregistré'}</span>
              </div>

              <div className="mt-8">
                <h4 className="mb-4 text-secondary flex items-center gap-2"><ShieldAlert size={16} /> {isAr ? 'خريطة الأضرار عند الخروج' : 'Carte des dommages au départ'}</h4>
                <DamageMap damages={damagesOut} readOnly isAr={isAr} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Check-in (Return) Tab */}
      {tab === 'checkin' && (
        <div className="card checkin-card">
          <h3 className="mb-6">{isAr ? 'حالة السيارة عند الإرجاع (Check-in)' : 'État du véhicule au retour (Check-in)'}</h3>
          {!c.actual_return_date ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertTriangle size={48} className="text-warning" />
              <p className="text-center text-secondary">{isAr ? 'السيارة لم تعد بعد. قم بتنفيذ إجراء الإرجاع لإكمال العقد.' : 'Véhicule non encore retourné. Effectuez le retour pour clore le contrat.'}</p>
              <button className="btn btn-primary" onClick={() => setShowReturnModal(true)}>
                 <CheckCircle2 size={18} /> {isAr ? 'تسجيل الإرجاع الآن' : 'Enregistrer le retour'}
              </button>
            </div>
          ) : (
            <>
              <div className="checkin-grid">
                <div className="checkin-item">
                  <label className="input-label flex items-center gap-2"><Calendar size={16} /> {isAr ? 'تاريخ العودة' : 'Date et Heure Retour'}</label>
                  <div className="font-bold p-2 bg-surface border rounded-lg text-center">
                    {c.actual_return_date} à {c.actual_return_time || c.time_in || '20:00'}
                  </div>
                </div>
                <div className="checkin-item">
                  <label className="input-label flex items-center gap-2"><Fuel size={16} /> {isAr ? 'الوقود عند الإرجاع' : 'Carburant au retour'}</label>
                  <div className="fuel-gauge">
                    {fuelOptions.map(f => (
                      <button key={f.value} className={`fuel-btn ${c.fuel_level_in === f.value ? 'fuel-btn-active' : ''}`} disabled>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="checkin-item">
                  <label className="input-label flex items-center gap-2"><Gauge size={16} /> {isAr ? 'الكيلومترات' : 'Kilométrage'}</label>
                  <input className="input-field" value={(c.km_in || 0).toLocaleString()} disabled />
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="mb-4 text-secondary text-center">{isAr ? 'عند الخروج' : 'Au Départ'}</h4>
                  <div className="p-4 border rounded-xl bg-surface-2 opacity-60">
                    <DamageMap damages={damagesOut} readOnly isAr={isAr} />
                  </div>
                </div>
                <div>
                  <h4 className="mb-4 text-error text-center font-bold">{isAr ? 'عند الإرجاع' : 'Au Retour'}</h4>
                  <div className="p-4 border border-error/20 rounded-xl bg-error/5">
                    <DamageMap damages={damagesIn} readOnly isAr={isAr} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Damages Tab */}
      {tab === 'damages' && (
        <div className="animate-fade-in">
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="m-0">{isAr ? 'حالة السيارة في هذا العقد' : 'État du véhicule pour ce contrat'}</h3>
                <p className="text-secondary text-sm mt-1">
                  {isAr ? 'مقارنة بين حالة التسليم وحالة الإرجاع' : 'Comparaison entre l\'état au départ et au retour'}
                </p>
              </div>
            </div>
            
            <DamageMap 
              damages={contract.status === 'returned' ? damagesIn : damagesOut} 
              previousDamages={contract.status === 'returned' ? damagesOut : (contract.vehicles?.damages || [])}
              readOnly={true}
              isAr={isAr}
            />
          </div>

          {(damagesOut.length > 0 || damagesIn.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {/* Departure Damages */}
              <div className="card">
                <h4 className="mb-4 text-primary">{isAr ? 'أضرار عند التسليم' : 'Dommages au départ'}</h4>
                {damagesOut.length === 0 ? (
                  <p className="text-secondary text-sm italic">{isAr ? 'لا توجد أضرار' : 'Aucun dommage au départ'}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {damagesOut.map(d => (
                      <div key={d.id} className="flex gap-3 items-center p-2 rounded-lg bg-surface-2 border border-border">
                        {d.photo ? (
                          <button 
                            className="btn btn-ghost btn-sm p-2 bg-surface-3 hover:bg-surface-4 rounded-lg flex items-center justify-center text-primary"
                            onClick={() => setSelectedPhoto(d.photo || null)}
                          >
                            <Camera size={18} />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-300">
                            <Camera size={16} />
                          </div>
                        )}
                        <div>
                          <div className="flex gap-2">
                            <span className="badge badge-warning text-[10px]">{d.type}</span>
                            <span className="text-[10px] uppercase font-bold text-secondary">{d.view}</span>
                          </div>
                          <p className="text-xs m-0 italic">"{d.note || '...'}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Return Damages */}
              <div className="card">
                <h4 className="mb-4 text-success">{isAr ? 'أضرار عند العودة' : 'Dommages au retour'}</h4>
                {damagesIn.length === 0 ? (
                  <p className="text-secondary text-sm italic">{isAr ? 'لا توجد أضرار' : 'Aucun dommage au retour'}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {damagesIn.map(d => (
                      <div key={d.id} className="flex gap-3 items-center p-2 rounded-lg bg-surface-2 border border-border">
                        {d.photo ? (
                          <button 
                            className="btn btn-ghost btn-sm p-2 bg-surface-3 hover:bg-surface-4 rounded-lg flex items-center justify-center text-primary"
                            onClick={() => setSelectedPhoto(d.photo || null)}
                          >
                            <Camera size={18} />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-300">
                            <Camera size={16} />
                          </div>
                        )}
                        <div>
                          <div className="flex gap-2">
                            <span className="badge badge-error text-[10px]">{d.type}</span>
                            <span className="text-[10px] uppercase font-bold text-secondary">{d.view}</span>
                          </div>
                          <p className="text-xs m-0 italic">"{d.note || '...'}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </div> {/* End of contract-detail-page */}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="modal-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
               <h3 className="m-0">{isAr ? 'تسجيل إرجاع السيارة' : 'Enregistrer le retour'}</h3>
               <button className="btn btn-ghost" onClick={() => setShowReturnModal(false)}><XIcon size={20} /></button>
            </div>
            
            <div className="modal-body scrollable-y" style={{ maxHeight: '70vh', paddingRight: '0.5rem' }}>
              <div className="card bg-surface-2 mb-6 border-dashed">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-secondary">{isAr ? 'كيلومترات الخروج:' : 'KM Départ:'}</span>
                    <span className="font-bold">{c?.km_out} km</span>
                 </div>
                 <div className="flex justify-between items-center text-sm mt-2">
                    <span className="text-secondary">{isAr ? 'الوقود عند الخروج:' : 'Carburant Départ:'}</span>
                    <span className="badge badge-secondary">{c?.fuel_level_out}</span>
                 </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="input-group">
                  <label className="input-label flex items-center gap-2"><Gauge size={14} /> {isAr ? 'الكيلومترات عند العودة' : 'Kilométrage Retour'}</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={returnData.km_in} 
                    onChange={e => setReturnData({...returnData, km_in: parseInt(e.target.value)})} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label flex items-center gap-2"><Calendar size={14} /> {isAr ? 'تاريخ الإرجاع' : 'Date de Retour'}</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={returnData.actual_return_date} 
                    onChange={e => setReturnData({...returnData, actual_return_date: e.target.value})} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label flex items-center gap-2"><Calendar size={14} /> {isAr ? 'وقت الإرجاع' : 'Heure de Retour'}</label>
                  <input 
                    type="time" 
                    className="input-field" 
                    value={returnData.actual_return_time} 
                    onChange={e => setReturnData({...returnData, actual_return_time: e.target.value})} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label flex items-center gap-2"><Fuel size={14} /> {isAr ? 'مستوى الوقود' : 'Niveau de Carburant'}</label>
                  <div className="fuel-gauge">
                    {fuelOptions.map(f => (
                      <button 
                        key={f.value} 
                        className={`fuel-btn ${returnData.fuel_level_in === f.value ? 'fuel-btn-active' : ''}`}
                        onClick={() => setReturnData({...returnData, fuel_level_in: f.value})}
                      >
                          {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">{isAr ? 'خريطة الأضرار (حدد الأضرار الجديدة)' : 'Carte des dommages (Marquez les nouveaux dégâts)'}</label>
                  <DamageMap 
                    damages={damagesIn} 
                    previousDamages={damagesOut}
                    onChange={setDamagesIn} 
                    isAr={isAr} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{isAr ? 'ملاحظات إضافية' : 'Notes / Dommages'}</label>
                  <textarea 
                    className="input-field" 
                    rows={3} 
                    value={returnData.notes}
                    onChange={e => setReturnData({...returnData, notes: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowReturnModal(false)}>{isAr ? 'إلغاء' : 'Annuler'}</button>
              <button className="btn btn-primary" onClick={handleReturnContract} disabled={loadingAction}>
                {loadingAction ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                {isAr ? 'تأكيد الإرجاع' : 'Confirmer le Retour'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="modal-overlay" onClick={() => setShowCheckoutModal(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
               <h3 className="m-0">{isAr ? 'تسجيل خروج السيارة' : 'Enregistrer le départ'}</h3>
               <button className="btn btn-ghost" onClick={() => setShowCheckoutModal(false)}><XIcon size={20} /></button>
            </div>

            <div className="modal-body scrollable-y" style={{ maxHeight: '70vh', paddingRight: '0.5rem' }}>
              <div className="flex flex-col gap-5">
                <div className="input-group">
                  <label className="input-label flex items-center gap-2"><Calendar size={14} /> {isAr ? 'وقت الخروج' : 'Heure de Départ'}</label>
                  <input 
                    type="time" 
                    className="input-field" 
                    value={checkoutData.time_out} 
                    onChange={e => setCheckoutData({...checkoutData, time_out: e.target.value})} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label flex items-center gap-2"><Gauge size={14} /> {isAr ? 'الكيلومترات عند الخروج' : 'Kilométrage Départ'}</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={checkoutData.km_out} 
                    onChange={e => setCheckoutData({...checkoutData, km_out: parseInt(e.target.value)})} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label flex items-center gap-2"><Fuel size={14} /> {isAr ? 'مستوى الوقود' : 'Niveau de Carburant'}</label>
                  <div className="fuel-gauge">
                    {fuelOptions.map(f => (
                      <button 
                        key={f.value} 
                        className={`fuel-btn ${checkoutData.fuel_level_out === f.value ? 'fuel-btn-active' : ''}`}
                        onClick={() => setCheckoutData({...checkoutData, fuel_level_out: f.value})}
                      >
                          {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label flex items-center gap-2"><Sparkles size={14} /> {isAr ? 'النظافة' : 'Propreté'}</label>
                  <div className="fuel-gauge">
                    {cleanOptions.map(cl => (
                      <button 
                        key={cl.value} 
                        className={`fuel-btn ${checkoutData.cleanliness_out === cl.value ? 'fuel-btn-active' : ''}`}
                        onClick={() => setCheckoutData({...checkoutData, cleanliness_out: cl.value})}
                      >
                          {cl.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <h3 className="mb-4">{isAr ? 'حالة السيارة (عند التسليم)' : 'État du véhicule (au départ)'}</h3>
                  <DamageMap 
                    damages={damagesOut} 
                    previousDamages={contract.vehicles?.damages || []}
                    isAr={isAr} 
                    onChange={setDamagesOut} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{isAr ? 'ملاحظات إضافية' : 'Notes / Dommages'}</label>
                  <textarea 
                    className="input-field" 
                    rows={3} 
                    value={checkoutData.notes}
                    onChange={e => setCheckoutData({...checkoutData, notes: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCheckoutModal(false)}>{isAr ? 'إلغاء' : 'Annuler'}</button>
              <button className="btn btn-primary" onClick={handleCheckoutContract} disabled={loadingAction}>
                {loadingAction ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                {isAr ? 'تأكيد الخروج' : 'Confirmer le Départ'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Checkout Modal ... existing code ... */}
      
      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content animate-scale-in" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-2">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="m-0 text-xl font-bold">{isAr ? 'تأكيد الإلغاء' : 'Confirmer l\'annulation'}</h3>
                <p className="text-secondary mt-2">
                  {isAr 
                    ? 'هل أنت متأكد من إلغاء هذا العقد؟ سيتم تحرير السيارة وحذف المعاملات المالية المرتبطة.' 
                    : 'Êtes-vous sûr de vouloir annuler ce contrat ? La voiture será libérée y las transacciones financieras eliminadas.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button className="btn btn-outline flex-1" onClick={() => setShowCancelModal(false)}>
                {isAr ? 'تراجع' : 'Retour'}
              </button>
              <button 
                className="btn bg-error text-white flex-1 shadow-lg shadow-error/20" 
                onClick={handleCancelContract}
                disabled={loadingAction}
              >
                {loadingAction ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                {isAr ? 'تأكيد الإلغاء' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

    {/* Photo Zoom Overlay */}
    {selectedPhoto && (
      <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
        <button className="absolute top-6 right-6 text-white hover:text-gold transition-colors">
          <XIcon size={32} />
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

export default ContractDetail;
