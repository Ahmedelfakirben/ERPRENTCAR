import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowRight, User, CarFront, Calendar,
  CreditCard, FileCheck, Check, Search, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './ContractCreate.css';

const ContractCreate = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');

  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Lists from DB
  const [clients, setClients] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [activeContracts, setActiveContracts] = useState<any[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);

  // Step 1: Client
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  // Step 2: Dates & Details
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeOut, setTimeOut] = useState('10:00');
  const [timeIn, setTimeIn] = useState('20:00');
  const [deposit, setDeposit] = useState(2000);
  const [discount, setDiscount] = useState(0);
  const [contractLang, setContractLang] = useState<'fr' | 'ar'>('fr');
  
  // Autre conducteur
  const [secondDriverName, setSecondDriverName] = useState('');
  const [secondDriverBirth, setSecondDriverBirth] = useState('');
  const [secondDriverAddress, setSecondDriverAddress] = useState('');
  const [secondDriverLicense, setSecondDriverLicense] = useState('');
  const [secondDriverLicenseDate, setSecondDriverLicenseDate] = useState('');

  // Step 3: Vehicle
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const filtered = vehicles.filter(v => {
        const hasOverlap = activeContracts.some(c => {
          if (c.vehicle_id !== v.id) return false;
          const cStart = new Date(c.start_date);
          const cEnd = new Date(c.end_date);
          // Overlap condition
          return cStart <= end && cEnd >= start;
        });
        return !hasOverlap;
      });
      setAvailableVehicles(filtered);
      // If selected vehicle is no longer available, deselect it
      if (selectedVehicle && !filtered.find(v => v.id === selectedVehicle)) {
        setSelectedVehicle(null);
      }
    } else {
      setAvailableVehicles([]);
    }
  }, [startDate, endDate, vehicles, activeContracts]);

  const fetchInitialData = async () => {
    setDataLoading(true);
    try {
      const { data: cData } = await supabase.from('clients').select('id, full_name, full_name_ar, cin, phone');
      // Fetch all vehicles that are not blocked
      const { data: vData } = await supabase.from('vehicles').select('*').neq('status', 'blocked');
      // Fetch active/pending contracts for overlap checking
      const { data: contractData } = await supabase.from('contracts').select('vehicle_id, start_date, end_date').in('status', ['active', 'pending']);
      
      setClients(cData || []);
      setVehicles(vData || []);
      setActiveContracts(contractData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const calcDays = () => {
    if (!startDate || !endDate) return 0;
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const days = calcDays();
  const vehicle = vehicles.find(v => v.id === selectedVehicle);
  const subtotal = vehicle ? vehicle.daily_rate * days : 0;
  // NO TVA for contracts per user request
  const tvaAmount = 0; 
  const totalTtc = subtotal - discount;

  const handleCreateContract = async () => {
    setLoading(true);
    try {
      let contractNum = '';
      try {
        const { data: rpcNum, error: rpcError } = await supabase.rpc('generate_contract_number');
        if (!rpcError && rpcNum) contractNum = rpcNum;
        else throw new Error('RPC failed');
      } catch (e) {
        contractNum = `CT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      }
      
      const { data, error } = await supabase.from('contracts').insert([{
        contract_number: contractNum,
        client_id: selectedClient,
        vehicle_id: selectedVehicle,
        start_date: startDate,
        end_date: endDate,
        time_out: timeOut,
        time_in: timeIn,
        second_driver_name: secondDriverName,
        second_driver_birth: secondDriverBirth,
        second_driver_address: secondDriverAddress,
        second_driver_license: secondDriverLicense,
        second_driver_license_date: secondDriverLicenseDate,
        daily_rate: vehicle?.daily_rate,
        total_days: days,
        subtotal: subtotal,
        discount_amount: discount,
        tva_amount: tvaAmount,
        total_ttc: totalTtc,
        deposit_amount: deposit,
        contract_language: contractLang,
        status: 'active'
      }]).select().single();

      if (error) {
        // If column does not exist, ignore the custom fields and try basic insert
        console.error("Insert error (maybe missing columns?):", error);
        if (error.code === 'PGRST204' || error.message.includes('column')) {
            const { data: fallbackData, error: fallbackError } = await supabase.from('contracts').insert([{
                contract_number: contractNum,
                client_id: selectedClient,
                vehicle_id: selectedVehicle,
                start_date: startDate,
                end_date: endDate,
                daily_rate: vehicle?.daily_rate,
                total_days: days,
                subtotal: subtotal,
                discount_amount: discount,
                tva_amount: tvaAmount,
                total_ttc: totalTtc,
                deposit_amount: deposit,
                contract_language: contractLang,
                status: 'active',
                notes: `Heure: ${timeOut} -> ${timeIn} | 2nd Driver: ${secondDriverName} (${secondDriverBirth}) - ${secondDriverAddress} | Permis: ${secondDriverLicense} (${secondDriverLicenseDate})`
            }]).select().single();
            if (fallbackError) throw fallbackError;
            return finishCreation(fallbackData.id, contractNum);
        }
        throw error;
      }

      finishCreation(data.id, contractNum);
    } catch (err) {
      console.error('Error creating contract:', err);
      alert('Error creating contract. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const finishCreation = async (contractId: string, contractNum: string) => {
      await supabase.from('transactions').insert([{
        transaction_type: 'income',
        category: 'contract',
        description: `Location ${vehicle?.brand} ${vehicle?.model} - CT: ${contractNum}`,
        amount: totalTtc,
        tva_amount: 0,
        contract_id: contractId,
        vehicle_id: selectedVehicle,
        client_id: selectedClient,
        payment_method: 'cash',
        transaction_date: new Date().toISOString().split('T')[0]
      }]);

      // Only mark vehicle as rented if start_date is TODAY
      const today = new Date().toISOString().split('T')[0];
      if (startDate <= today) {
        await supabase.from('vehicles').update({ status: 'rented' }).eq('id', selectedVehicle);
      }
      
      navigate(`/contracts/${contractId}`);
  };

  const client = clients.find(c => c.id === selectedClient);

  const canNext = () => {
    if (step === 1) return !!selectedClient;
    if (step === 2) return !!startDate && !!endDate && days > 0;
    if (step === 3) return !!selectedVehicle;
    return true;
  };

  const stepsLabels = [
    { icon: User, label: isAr ? 'العميل' : 'Client', labelLong: isAr ? 'اختيار العميل' : 'Sélectionner le client' },
    { icon: Calendar, label: isAr ? 'التواريخ' : 'Dates', labelLong: isAr ? 'التواريخ والتفاصيل' : 'Dates & Détails' },
    { icon: CarFront, label: isAr ? 'السيارة' : 'Véhicule', labelLong: isAr ? 'اختيار السيارة المتاحة' : 'Choisir un véhicule disponible' },
    { icon: FileCheck, label: isAr ? 'مراجعة' : 'Résumé', labelLong: isAr ? 'مراجعة وتأكيد' : 'Réviser & Confirmer' },
  ];

  const filteredClients = clients.filter(c => {
    const name = isAr ? c.full_name_ar : c.full_name;
    return (name?.toLowerCase() || '').includes(clientSearch.toLowerCase()) || (c.cin?.toLowerCase() || '').includes(clientSearch.toLowerCase());
  });

  return (
    <div className="contract-create-page animate-fade-in pb-10">
      <div className="detail-top-bar">
        <button className="btn btn-ghost" onClick={() => navigate('/contracts')}>
          <ArrowLeft size={18} /> {isAr ? 'العودة' : 'Retour'}
        </button>
        <h2 style={{ margin: 0 }}>{isAr ? 'عقد جديد' : 'Nouveau Contrat'}</h2>
        <div style={{ width: 100 }} />
      </div>

      {/* Stepper */}
      <div className="wizard-stepper">
        {stepsLabels.map((s, i) => (
          <div
            key={i}
            className={`wizard-step ${step > i + 1 ? 'step-done' : ''} ${step === i + 1 ? 'step-active' : ''}`}
          >
            <div className="step-circle">
              {step > i + 1 ? <Check size={16} /> : <s.icon size={16} />}
            </div>
            <span className="step-label">{s.label}</span>
            {i < stepsLabels.length - 1 && <div className="step-connector" />}
          </div>
        ))}
      </div>

      <h3 className="wizard-step-title">{stepsLabels[step - 1].labelLong}</h3>

      {/* Step 1: Select Client */}
      {step === 1 && (
        <div className="wizard-content">
          <div className="search-wrap mb-4" style={{ maxWidth: 400 }}>
            <Search size={18} className="search-icon" />
            <input
              className="input-field search-input"
              placeholder={isAr ? 'بحث بالاسم أو CIN...' : 'Rechercher par nom ou CIN...'}
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
            />
          </div>
          <div className="select-grid">
            {dataLoading ? (
              <div className="p-12"><Loader2 className="animate-spin text-primary" /></div>
            ) : filteredClients.map(c => (
              <div
                key={c.id}
                className={`select-card card ${selectedClient === c.id ? 'select-card-active' : ''}`}
                onClick={() => setSelectedClient(c.id)}
                style={{ padding: '1.25rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.25rem' }}
              >
                <div className="select-card-avatar">{(isAr ? (c.full_name_ar || c.full_name) : c.full_name).charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="m-0 font-bold text-lg" style={{ color: 'var(--text-1)' }}>
                    {isAr ? (c.full_name_ar || c.full_name) : c.full_name}
                  </h4>
                  <p className="text-sm text-secondary m-0 mt-1">CIN: {c.cin}</p>
                  <p className="text-sm text-secondary m-0">{c.phone}</p>
                </div>
                {selectedClient === c.id && (
                  <div className="select-check" style={{ position: 'static', flexShrink: 0 }}><Check size={16} /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Dates & Details */}
      {step === 2 && (
        <div className="wizard-content">
          <div className="card p-8" style={{ maxWidth: 850 }}>
            
            <h4 className="mb-6 font-bold border-b pb-3 text-lg text-primary">Période de Location</h4>
            <div className="form-grid mb-10" style={{ gap: '1.5rem' }}>
              <div className="input-group">
                <label className="input-label">Date de Début</label>
                <input className="input-field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Heure de Début</label>
                <input className="input-field" type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Date de Fin</label>
                <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Heure de Fin</label>
                <input className="input-field" type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} />
              </div>
            </div>

            <h4 className="mb-6 font-bold border-b pb-3 text-lg text-primary">Informations Financières</h4>
            <div className="form-grid mb-10" style={{ gap: '1.5rem' }}>
              <div className="input-group">
                <label className="input-label">Caution (MAD)</label>
                <input className="input-field" type="number" value={deposit} onChange={e => setDeposit(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Langue du Contrat</label>
                <select className="input-field" value={contractLang} onChange={e => setContractLang(e.target.value as 'fr' | 'ar')}>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
            </div>

            <h4 className="mb-6 font-bold border-b pb-3 text-lg text-primary">Autre Conducteur (Optionnel)</h4>
            <div className="form-grid" style={{ gap: '1.5rem' }}>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Nom et Prénom</label>
                <input className="input-field" placeholder="Ex: Ahmed Yassin" value={secondDriverName} onChange={e => setSecondDriverName(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Date de Naissance</label>
                <input className="input-field" type="date" value={secondDriverBirth} onChange={e => setSecondDriverBirth(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Adresse</label>
                <input className="input-field" placeholder="Ex: Hay Al Matar, Tanger" value={secondDriverAddress} onChange={e => setSecondDriverAddress(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">N° Permis de Conduire</label>
                <input className="input-field" placeholder="Ex: 123456/78" value={secondDriverLicense} onChange={e => setSecondDriverLicense(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Date de Délivrance (Permis)</label>
                <input className="input-field" type="date" value={secondDriverLicenseDate} onChange={e => setSecondDriverLicenseDate(e.target.value)} />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Step 3: Select Vehicle */}
      {step === 3 && (
        <div className="wizard-content">
          {availableVehicles.length === 0 ? (
            <div className="card p-8 text-center text-secondary">
              <CarFront size={48} className="mx-auto mb-4 opacity-50" />
              <h3>Aucun véhicule disponible</h3>
              <p>Il n'y a pas de véhicules disponibles pour la période du {startDate} au {endDate}.</p>
            </div>
          ) : (
            <div className="select-grid">
              {availableVehicles.map(v => (
                <div
                  key={v.id}
                  className={`select-card card ${selectedVehicle === v.id ? 'select-card-active' : ''}`}
                  onClick={() => setSelectedVehicle(v.id)}
                >
                  <img 
                    src={v.image_url || 'https://via.placeholder.com/300x160?text=No+Photo'} 
                    alt={v.brand} 
                    className="select-card-image" 
                  />
                  <div className="select-card-info">
                    <h4 className="font-bold">{v.brand} {v.model}</h4>
                    <p className="text-sm text-secondary" style={{ fontFamily: 'monospace' }}>{v.plate}</p>
                    <p className="text-sm text-secondary">{v.fuel}</p>
                    <p className="text-primary font-bold mt-2" style={{ fontSize: '1.1rem' }}>{v.daily_rate} MAD/{isAr ? 'يوم' : 'jour'}</p>
                  </div>
                  {selectedVehicle === v.id && (
                    <div className="select-check"><Check size={16} /></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="wizard-content" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="review-grid" style={{ gap: '2rem', maxWidth: 900, width: '100%' }}>
            <div className="card review-section" style={{ padding: '2rem' }}>
              <h4 className="flex items-center gap-3 mb-6 font-bold text-lg"><User size={20} className="text-primary" /> {isAr ? 'العميل' : 'Client'}</h4>
              <div className="info-rows" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'الاسم' : 'Nom'}</span>
                  <span className="info-value font-medium">{client ? (isAr ? (client.full_name_ar || client.full_name) : client.full_name) : '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">CIN</span>
                  <span className="info-value">{client?.cin || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'الهاتف' : 'Téléphone'}</span>
                  <span className="info-value">{client?.phone || '—'}</span>
                </div>
              </div>
            </div>
            
            <div className="card review-section" style={{ padding: '2rem' }}>
              <h4 className="flex items-center gap-3 mb-6 font-bold text-lg"><CarFront size={20} className="text-primary" /> {isAr ? 'السيارة' : 'Véhicule'}</h4>
              <div className="flex gap-6 items-start">
                {vehicle?.image_url && (
                  <img src={vehicle.image_url} alt={vehicle.brand} style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                )}
                <div className="info-rows" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  <div className="info-row">
                    <span className="info-label">{isAr ? 'السيارة' : 'Véhicule'}</span>
                    <span className="info-value font-medium">{vehicle ? `${vehicle.brand} ${vehicle.model}` : '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">{isAr ? 'اللوحة' : 'Matricule'}</span>
                    <span className="info-value" style={{ fontFamily: 'monospace' }}>{vehicle?.plate || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">{isAr ? 'السعر/يوم' : 'Tarif/Jour'}</span>
                    <span className="info-value">{vehicle?.daily_rate || 0} MAD</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card review-section review-financial" style={{ padding: '2.5rem', marginTop: '1rem' }}>
              <h4 className="flex items-center gap-3 mb-8 font-bold text-xl"><CreditCard size={22} className="text-primary" /> {isAr ? 'الملخص المالي' : 'Résumé Financier'}</h4>
              <div className="info-rows" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'الفترة' : 'Période'}</span>
                  <span className="info-value font-medium">{startDate} ({timeOut}) → {endDate} ({timeIn})</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'أيام' : 'Jours'}</span>
                  <span className="info-value font-medium">{days}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'المجموع الفرعي' : 'Sous-total'}</span>
                  <span className="info-value font-medium">{subtotal.toLocaleString()} MAD</span>
                </div>
                <div className="info-row" style={{ alignItems: 'center' }}>
                  <span className="info-label font-semibold" style={{ color: 'var(--gold)' }}>{isAr ? 'تطبيق الخصم (MAD)' : 'Appliquer Remise (MAD)'}</span>
                  <input 
                    className="input-field" 
                    type="number" 
                    style={{ width: '120px', padding: '4px 8px', textAlign: 'right' }}
                    value={discount} 
                    onChange={e => setDiscount(Number(e.target.value))} 
                  />
                </div>

                <div className="info-row total-row mt-2 pt-4 border-t">
                  <span className="info-label font-bold text-lg">{isAr ? 'المجموع النهائي' : 'Total Net à Payer'}</span>
                  <span className="info-value font-bold text-primary" style={{ fontSize: '1.5rem' }}>{totalTtc.toLocaleString()} MAD</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{isAr ? 'الضمان' : 'Caution'}</span>
                  <span className="info-value">{deposit.toLocaleString()} MAD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="wizard-nav mt-8">
        <button
          className="btn btn-outline"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
        >
          <ArrowLeft size={16} /> {isAr ? 'السابق' : 'Précédent'}
        </button>
        {step < totalSteps ? (
          <button
            className="btn btn-primary"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
          >
            {isAr ? 'التالي' : 'Suivant'} <ArrowRight size={16} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleCreateContract} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <FileCheck size={16} />} 
            {isAr ? 'إنشاء العقد' : 'Créer le Contrat'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ContractCreate;
