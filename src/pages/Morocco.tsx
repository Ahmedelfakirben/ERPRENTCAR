import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, AlertTriangle, Search, Printer, Loader2, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Morocco.css';

const Morocco = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [tab, setTab] = useState<'police' | 'fines'>('police');
  const [fineSearch, setFineSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingFines, setLoadingFines] = useState(true);
  const [policeRecords, setPoliceRecords] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [showAddFine, setShowAddFine] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form for new fine
  const [newFine, setNewFine] = useState({ 
    vehicle_id: '', 
    client_id: '',
    contract_id: '', 
    fine_date: new Date().toISOString().split('T')[0], 
    fine_type: 'speed', 
    amount: '', 
    reference: '' 
  });
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);



  const fineStatusLabel: Record<string, string> = {
    pending: isAr ? 'معلقة' : 'En attente',
    charged: isAr ? 'محمّلة للعميل' : 'Facturée au client',
    paid: isAr ? 'مدفوعة' : 'Payée',
  };
  const fineStatusBadge: Record<string, string> = {
    pending: 'badge-warning', charged: 'badge-primary', paid: 'badge-success',
  };

  useEffect(() => {
    fetchFines();
    fetchVehicles();
    fetchClients();
  }, []);

  useEffect(() => {
    fetchPoliceRecords();
  }, [startDate, endDate]);

  const fetchVehicles = async () => {
    const { data } = await supabase.from('vehicles').select('id, brand, model, plate');
    setVehicles(data || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, full_name, full_name_ar, cin');
    setClients(data || []);
  };

  const fetchFines = async () => {
    setLoadingFines(true);
    try {
      const { data } = await supabase
        .from('fines')
        .select('*, vehicles(plate), clients(full_name, full_name_ar), contracts(contract_number)')
        .order('fine_date', { ascending: false });
      setFines(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFines(false);
    }
  };

  const fetchPoliceRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('contracts')
        .select('*, clients(*), vehicles(*)')
        .in('status', ['active', 'completed'])
        .order('start_date', { ascending: false });

      if (startDate) query = query.gte('start_date', startDate);
      if (endDate) query = query.lte('start_date', endDate);
      if (!startDate && !endDate) query = query.limit(50);

      const { data } = await query;
      setPoliceRecords(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFine = async () => {
    try {
      const { error } = await supabase.from('fines').insert([{
        ...newFine,
        client_id: newFine.client_id || null,
        contract_id: newFine.contract_id || null,
        amount: parseFloat(newFine.amount),
        status: 'pending'
      }]);
      if (error) throw error;
      setShowAddFine(false);
      fetchFines();
    } catch (err) {
      console.error(err);
      alert('Error adding fine');
    }
  };

  return (
    <>
      <div className="morocco-page">
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>

        <div className="tab-bar">
          <button className={`tab ${tab === 'police' ? 'tab-active' : ''}`} onClick={() => setTab('police')}>
            <FileText size={16} /> {isAr ? 'التقرير اليومي' : 'Rapport Journalier'}
          </button>
          <button className={`tab ${tab === 'fines' ? 'tab-active' : ''}`} onClick={() => setTab('fines')}>
            <AlertTriangle size={16} /> {isAr ? 'المخالفات' : 'Amendes'}
          </button>
        </div>

        {tab === 'police' && (
          <div className="animate-fade-in mt-10">
            <div className="card p-0 overflow-hidden shadow-sm">
                <div className="police-sheet-header p-8 border-bottom bg-surface-2 flex justify-between items-center flex-wrap gap-6">
                  <div className="flex items-center gap-3">
                    <FileText size={24} className="text-gold" />
                    <h3 className="m-0 font-extrabold text-xl">{isAr ? 'تقرير يومي' : 'Rapport Journalier'}</h3>
                  </div>
                  
                  <div className="flex items-center gap-0 flex-wrap no-print card-glass" style={{ padding: '2px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', flex: '0 1 auto' }}>
                    <div className="flex items-center gap-2 px-3 py-1 border-r border-border" style={{ minWidth: '140px' }}>
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">{isAr ? 'من:' : 'Du:'}</span>
                      <input type="date" className="input-field border-none bg-transparent p-0" style={{ boxShadow: 'none', minHeight: 'auto', fontSize: '0.8rem', width: '100px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1" style={{ minWidth: '140px' }}>
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">{isAr ? 'إلى:' : 'Au:'}</span>
                      <input type="date" className="input-field border-none bg-transparent p-0" style={{ boxShadow: 'none', minHeight: 'auto', fontSize: '0.8rem', width: '100px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    {(startDate || endDate) && (
                      <button className="btn btn-ghost btn-sm text-error ml-2" onClick={() => { setStartDate(''); setEndDate(''); }}>
                         <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-4 table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{isAr ? 'العميل' : 'Client'}</th>
                        <th>CIN</th>
                        <th>{isAr ? 'الجنسية' : 'Nationalité'}</th>
                        <th>{isAr ? 'السيارة' : 'Véhicule'}</th>
                        <th>{isAr ? 'اللوحة' : 'Matricule'}</th>
                        <th>{isAr ? 'الدخول' : 'Entrée'}</th>
                        <th>{isAr ? 'الخروج' : 'Sortie'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                          <Loader2 className="animate-spin" style={{ display: 'inline-block', color: 'var(--gold)' }} />
                        </td></tr>
                      )}
                      {!loading && policeRecords.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                          {isAr ? 'لا توجد سجلات' : 'Aucun enregistrement'}
                        </td></tr>
                      )}
                      {policeRecords.map((r: any, i: number) => (
                        <tr key={r.id}>
                          <td>{i + 1}</td>
                          <td className="font-bold">{isAr ? (r.clients?.full_name_ar || r.clients?.full_name) : r.clients?.full_name}</td>
                          <td className="font-mono text-xs">{r.clients?.cin || '—'}</td>
                          <td className="text-secondary">{r.clients?.nationality || 'Marocaine'}</td>
                          <td>{r.vehicles?.brand} {r.vehicles?.model}</td>
                          <td className="font-mono text-xs font-semibold">{r.vehicles?.plate || '—'}</td>
                          <td className="text-secondary text-xs">{r.start_date}</td>
                          <td className="text-secondary text-xs">{r.end_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
        )}

        {tab === 'fines' && (
          <div className="animate-fade-in mt-10">
              <div className="card p-0 shadow-sm">
                <div className="p-8 border-bottom bg-surface-2 flex justify-between items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="icon-badge bg-gold-light text-gold"><AlertTriangle size={24} /></div>
                    <h3 className="m-0 font-extrabold text-xl">{isAr ? 'قائمة المخالفات المستلمة' : 'Liste des Amendes Reçues'}</h3>
                  </div>
                  <div className="flex gap-4">
                    <div className="search-group">
                      <Search className="search-icon" size={18} />
                      <input 
                        className="input-field" 
                        placeholder={isAr ? 'بحث باللوحة...' : 'Rechercher par matricule...'} 
                        value={fineSearch}
                        onChange={(e) => setFineSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-4 table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{isAr ? 'التاريخ' : 'Date'}</th>
                        <th>{isAr ? 'اللوحة' : 'Matricule'}</th>
                        <th>{isAr ? 'النوع' : 'Type'}</th>
                        <th>{isAr ? 'المبلغ' : 'Montant'}</th>
                        <th>{isAr ? 'العميل' : 'Client'}</th>
                        <th>{isAr ? 'الحالة' : 'Statut'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingFines && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                          <Loader2 className="animate-spin" style={{ display: 'inline-block', color: 'var(--gold)' }} />
                        </td></tr>
                      )}
                      {!loadingFines && fines.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
                          {isAr ? 'لا توجد مخالفات مسجلة' : 'Aucune amende enregistrée'}
                        </td></tr>
                      ) : fines.filter(f => (f.vehicles?.plate || '').toLowerCase().includes(fineSearch.toLowerCase())).map(f => (
                        <tr key={f.id}>
                          <td className="text-secondary text-xs">{f.fine_date}</td>
                          <td className="font-bold text-sm tracking-tighter" style={{ fontFamily: 'monospace' }}>{f.vehicles?.plate}</td>
                          <td>
                            <span className="text-xs uppercase font-bold tracking-widest text-secondary">{f.fine_type}</span>
                          </td>
                          <td className="font-bold text-error">{f.amount} MAD</td>
                          <td className="font-semibold">{isAr ? (f.clients?.full_name_ar || f.clients?.full_name) : f.clients?.full_name}</td>
                          <td><span className={`badge ${fineStatusBadge[f.status]}`}>{fineStatusLabel[f.status]}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        )}


        </div>

        {/* Floating Actions moved outside animation context */}
        {tab === 'police' && (
          <div className="page-actions no-print">
            <button className="btn btn-primary py-3 px-12 shadow-lg text-lg" onClick={() => window.print()}>
              <Printer size={18} /> {isAr ? 'طباعة / تصدير PDF' : 'Imprimer / Exporter PDF'}
            </button>
          </div>
        )}
        {tab === 'fines' && (
          <div className="page-actions">
            <button className="btn btn-primary px-12 py-3 shadow-lg text-lg" onClick={() => setShowAddFine(true)}>
               <Plus size={18} /> {isAr ? 'إضافة مخالفة جديدة' : 'Ajouter una Nueva Amende'}
            </button>
          </div>
        )}
      </div>

      {/* Add Fine Modal */}
      {showAddFine && (
        <div className="modal-overlay" onClick={() => setShowAddFine(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
               <h3 className="m-0">{isAr ? 'مخالفة سير جديدة' : 'Nouvelle Amende'}</h3>
               <button className="btn btn-ghost" onClick={() => setShowAddFine(false)}><X size={20} /></button>
            </div>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">{isAr ? 'العميل (اختياري)' : 'Client (Optionnel)'}</label>
                <select className="input-field" value={newFine.client_id} onChange={e => setNewFine({...newFine, client_id: e.target.value})}>
                  <option value="">{isAr ? 'بدون عميل...' : 'Aucun / Inconnu'}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{isAr && c.full_name_ar ? c.full_name_ar : c.full_name} ({c.cin})</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'السيارة' : 'Véhicule'}</label>
                <select className="input-field" value={newFine.vehicle_id} onChange={e => setNewFine({...newFine, vehicle_id: e.target.value})}>
                  <option value="">{isAr ? 'اختر السيارة...' : 'Choisir...'}</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'تاريخ المخالفة' : 'Date'}</label>
                <input type="date" className="input-field" value={newFine.fine_date} onChange={e => setNewFine({...newFine, fine_date: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'النوع' : 'Type'}</label>
                <select className="input-field" value={newFine.fine_type} onChange={e => setNewFine({...newFine, fine_type: e.target.value})}>
                  <option value="speed">{isAr ? 'سرعة' : 'Vitesse'}</option>
                  <option value="parking">{isAr ? 'وقوف' : 'Stationnement'}</option>
                  <option value="red_light">{isAr ? 'إشارة' : 'Feu rouge'}</option>
                  <option value="other">{isAr ? 'أخرى' : 'Autre'}</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'المبلغ' : 'Montant'} (MAD)</label>
                <input type="number" className="input-field" value={newFine.amount} onChange={e => setNewFine({...newFine, amount: e.target.value})} />
              </div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">{isAr ? 'رقم المخالفة / المرجع' : 'Référence'}</label>
                <input className="input-field" value={newFine.reference} onChange={e => setNewFine({...newFine, reference: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowAddFine(false)}>{isAr ? 'إلغاء' : 'Annuler'}</button>
              <button className="btn btn-primary" onClick={handleAddFine}>{isAr ? 'حفظ المخالفة' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Morocco;
