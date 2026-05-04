import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo201M from '../components/layout/Logo201M';
import './ContractPrint.css';

const ContractPrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const location = useLocation();
  const printTriggered = useRef(false);

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
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
    } catch (err) {
      console.error('Error fetching contract for print:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract && location.search.includes('action=download') && !printTriggered.current) {
      printTriggered.current = true;
      setTimeout(() => {
        window.print();
      }, 600);
    }
  }, [contract, location]);

  const handlePrint = () => window.print();

  if (loading) return <div className="p-24 text-center"><Loader2 className="animate-spin inline-block" /></div>;
  if (!contract) return <div className="p-24 text-center text-error">Contract not found</div>;

  const c = contract;
  const v = contract.vehicles;
  const cl = contract.clients;

  return (
    <div className="contract-print-page">
      {/* Screen-only controls */}
      <div className="print-controls no-print">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> {isAr ? 'العودة' : 'Retour'}
        </button>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={handlePrint}>
            <Printer size={16} /> {isAr ? 'طباعة' : 'Imprimer'}
          </button>
        </div>
      </div>

      {/* Printable Content - EXACT DOCX FORMAT */}
      <div className="print-sheet classic-format">
        
        {/* Header */}
        <div className="classic-header-with-logo" style={{ position: 'relative', display: 'flex', justifyContent: 'center', minHeight: '180px' }}>
          
          {/* Absolute Left: Logo & Contract Number */}
          <div className="header-logo text-center" style={{ position: 'absolute', left: 0, top: 0 }}>
            <Logo201M size="lg" variant="print" />
            <div className="contract-num-under-logo font-bold text-lg" style={{ marginTop: '5px' }}>
              N° {c.contract_number}
            </div>
          </div>
          
          {/* Centered: Phones & Title */}
          <div className="header-text" style={{ textAlign: 'center', paddingTop: '10px' }}>
            <div className="phones" style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '8px' }}>
              06 07 51 94 79 / 06 63 29 93 83
            </div>
            <div className="title-section">
              <h1 style={{ fontSize: '18pt', fontWeight: 'bold', textDecoration: 'underline' }}>CONTRAT DE LOCATION</h1>
            </div>
          </div>

          {/* Absolute Right: Date & Location */}
          <div className="header-date" style={{ position: 'absolute', right: 0, top: '10px', textAlign: 'right' }}>
            <div style={{ fontSize: '11pt' }}>Tétouan, le:</div>
            <div className="val-inline" style={{ marginTop: '5px', fontWeight: 'bold' }}>{c.created_at?.split('T')[0]}</div>
          </div>
        </div>

        {/* 2 Columns: CONDUCTEUR & VEHICULE */}
        <div className="classic-grid">
          
          {/* CONDUCTEUR COLUMN */}
          <div className="classic-box col-conducteur">
            <div className="box-title">CONDUCTEUR / السائق الأول</div>
            <div className="box-content">
              <div className="data-row"><span className="label">PRENOM / الإسم:</span> <span className="value">{cl?.full_name?.split(' ')[0]}</span></div>
              <div className="data-row"><span className="label">NOM / النسب:</span> <span className="value">{cl?.full_name?.split(' ')[1] || ''}</span></div>
              <div className="data-row"><span className="label">DATE DE NAISSANCE / تاريخ الازدياد:</span> <span className="value">{cl?.birth_date || ''}</span></div>
              <div className="data-row"><span className="label">LIEU DE NAISSANCE / مكان الازدياد:</span> <span className="value">{cl?.birth_place || ''}</span></div>
              <div className="data-row"><span className="label">NATIONALITE / الجنسية:</span> <span className="value">{cl?.nationality || 'Marocaine'}</span></div>
              <div className="data-row"><span className="label">ADRESSE / العنوان:</span> <span className="value">{cl?.address || ''}</span></div>
              <div className="data-row"><span className="label">PASSPORT N° / رقم جواز السفر:</span> <span className="value">{cl?.passport || ''}</span></div>
              <div className="data-row"><span className="label">C.I.N N° / ر.ب.و:</span> <span className="value">{cl?.cin}</span></div>
              <div className="data-row"><span className="label">TÉL / الهاتف:</span> <span className="value">{cl?.phone}</span></div>
              <div className="data-row"><span className="label">PERMIS N° / رخصة السياقة:</span> <span className="value">{cl?.driver_license}</span></div>
              <div className="data-row"><span className="label">DÉLIVRÉ LE / تاريخ الإصدار:</span> <span className="value">{cl?.license_delivery_date || ''}</span></div>
              <div className="data-row"><span className="label">EXPIRE LE / تاريخ الانتهاء:</span> <span className="value" style={{ color: 'red' }}>{cl?.license_expiry_date || ''}</span></div>
            </div>
          </div>

          {/* VEHICULE COLUMN */}
          <div className="classic-box col-vehicule">
            <div className="box-title">VEHICULE / السيارة</div>
            <div className="box-content">
              <div className="data-row"><span className="label">MARQUE / العلامة:</span> <span className="value">{v?.brand} {v?.model}</span></div>
              <div className="data-row"><span className="label">IMMATRICULATION / الترقيم:</span> <span className="value">{v?.plate}</span></div>
              <div className="data-row"><span className="label">DATE DE DEPART / تاريخ المغادرة:</span> <span className="value">{c.start_date}</span></div>
              <div className="data-row"><span className="label">HEURE / الساعة:</span> <span className="value">{c.time_out || '10:00'}</span></div>
              <div className="data-row"><span className="label">DATE DE RETOUR / تاريخ الرجوع:</span> <span className="value">{c.status === 'completed' ? (c.actual_return_date || c.end_date) : c.end_date}</span></div>
              <div className="data-row"><span className="label">HEURE / الساعة:</span> <span className="value">{c.status === 'completed' ? (c.actual_return_time || c.time_in || '20:00') : (c.time_in || '20:00')}</span></div>
              <div className="data-row"><span className="label">DATE DE LOCATION / تاريخ الكراء:</span> <span className="value">{c.start_date}</span></div>
              <div className="data-row"><span className="label">KMS DEPART / عداد الانطلاق:</span> <span className="value">{v?.current_km}</span></div>
              <div className="data-row"><span className="label">KMS RETOUR / عداد الوصول:</span> <span className="value">{c.km_in || ''}</span></div>
              <div className="data-row"><span className="label">CARBURANT / الوقود:</span> <span className="value">{v?.fuel}</span></div>
              <div className="data-row"><span className="label">PROLONGATION / التمديد:</span> <span className="value"></span></div>
            </div>
          </div>
        </div>

        {/* AUTRE CONDUCTEUR */}
        <div className="classic-box mt-10">
           <div className="box-title">AUTRE CONDUCTEUR / السائق الثاني</div>
           <div className="box-content horizontal-layout">
              <div className="data-row"><span className="label">PRENOM ET NOM / الإسم والنسب:</span> <span className="value">{c.second_driver_name || ''}</span></div>
              <div className="data-row"><span className="label">DATE DE NAISSANCE / ADRESSE / تاريخ الازدياد والعنوان:</span> <span className="value">{c.second_driver_birth || ''} {c.second_driver_address ? `- ${c.second_driver_address}` : ''}</span></div>
              <div className="data-row"><span className="label">PERMIS N° / DÉLIVRÉ LE / رخصة السياقة وتاريخ الإصدار:</span> <span className="value">{c.second_driver_license || ''} {c.second_driver_license_date ? `- ${c.second_driver_license_date}` : ''}</span></div>
           </div>
        </div>

        {/* ÉTAT DU VÉHICULE */}
        <div className="classic-box mt-10">
           <div className="box-title">ÉTAT DU VÉHICULE / حالة السيارة</div>
           <div className="box-content etat-grid">
              <div className="etat-col croquis-section">
                 <div className="croquis-title">Etat général du véhicule lors de la prise en charge / الحالة العامة للسيارة</div>
                 <div className="croquis-container">
                    <div className="croquis-av">AV.</div>
                    <div className="croquis-avant">AVANT</div>
                    
                    <div className="croquis-car-svg">
                       <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
                          {/* Car Body */}
                          <path d="M 30,25 C 10,25 10,40 10,50 C 10,60 10,75 30,75 L 160,75 C 180,75 190,65 190,50 C 190,35 180,25 160,25 Z" fill="none" stroke="black" strokeWidth="2"/>
                          {/* Wheels */}
                          <rect x="35" y="20" width="25" height="5" fill="none" stroke="black" strokeWidth="1.5"/>
                          <rect x="35" y="75" width="25" height="5" fill="none" stroke="black" strokeWidth="1.5"/>
                          <rect x="135" y="20" width="25" height="5" fill="none" stroke="black" strokeWidth="1.5"/>
                          <rect x="135" y="75" width="25" height="5" fill="none" stroke="black" strokeWidth="1.5"/>
                          {/* Windows/Roof */}
                          <path d="M 60,30 L 130,30 C 140,30 145,35 145,50 C 145,65 140,70 130,70 L 60,70 C 45,70 40,65 40,50 C 40,35 45,30 60,30 Z" fill="none" stroke="black" strokeWidth="1.5"/>
                          {/* Details */}
                          <line x1="45" y1="33" x2="45" y2="67" stroke="black" strokeWidth="1"/>
                          <line x1="135" y1="33" x2="135" y2="67" stroke="black" strokeWidth="1"/>
                          <line x1="100" y1="30" x2="100" y2="70" stroke="black" strokeWidth="1"/>
                          <path d="M 12,40 C 12,40 15,45 15,50 C 15,55 12,60 12,60" fill="none" stroke="black" strokeWidth="1"/>
                       </svg>
                    </div>

                    <div className="croquis-arriere">ARIERE</div>
                    <div className="croquis-poste">
                       <div className="poste-title">Poste Auto</div>
                       <div className="poste-box">NON</div>
                       <div className="poste-box">OUI</div>
                    </div>
                 </div>
              </div>
              <div className="etat-col pl-4">
                 <div className="data-row font-bold mb-2">NIVEAU CARBURANT / مستوى الوقود:</div>
                 <div className="fuel-gauge-modern">
                    <div className={`fuel-segment ${c.fuel_level_out === 'empty' ? 'active' : ''}`}><span>E</span></div>
                    <div className={`fuel-segment ${c.fuel_level_out === '1/4' ? 'active' : ''}`}><span>1/4</span></div>
                    <div className={`fuel-segment ${c.fuel_level_out === '1/2' ? 'active' : ''}`}><span>1/2</span></div>
                    <div className={`fuel-segment ${c.fuel_level_out === '3/4' ? 'active' : ''}`}><span>3/4</span></div>
                    <div className={`fuel-segment ${c.fuel_level_out === 'full' ? 'active' : ''}`}><span>F</span></div>
                 </div>
                 
                 <div className="tools-grid-modern mt-6">
                    <div className="tool-item">
                       <span className="label">ROUE DE SECOURS / عجلة احتياطية</span>
                       <div className="fancy-checkbox">{c.check_out_spare_tire ? '✓' : ''}</div>
                    </div>
                    <div className="tool-item">
                       <span className="label">CLEF DE ROUE / مفتاح العجلات</span>
                       <div className="fancy-checkbox">{c.check_out_wheel_wrench ? '✓' : ''}</div>
                    </div>
                    <div className="tool-item">
                       <span className="label">CRIC / رافعة</span>
                       <div className="fancy-checkbox">{c.check_out_jack ? '✓' : ''}</div>
                    </div>
                    <div className="tool-item">
                       <span className="label">TRIANGLE / مثلث العطب</span>
                       <div className="fancy-checkbox">{c.check_out_triangle ? '✓' : ''}</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* DISCLAIMER */}
        <div className="classic-disclaimer mt-10">
           <p>LE CLIENT EST SEUL RESPONSABLE DES DELITS, CONTRAVENTIONS ET INFRACTIONS AU CODE DE LA ROUTE COMMISES PENDANT LA DURÉE DE LA LOCATION.</p>
           <p style={{ marginTop: '4px' }}>يتحمل الزبون وحده المسؤولية عن الجرائم والمخالفات وانتهاكات قانون السير المرتكبة خلال فترة الكراء.</p>
           <p style={{ marginTop: '6px', fontStyle: 'italic', fontSize: '0.9em' }}>CE CONTRAT DOIT ÊTRE PRÉSENTÉ EN CAS DE CONTRÔLE DE LA POLICE / يجب تقديم هذا العقد في حالة مراقبة الشرطة</p>
        </div>

        {/* FINANCIALS & SIGNATURE */}
        <div className="classic-footer-grid mt-10">
           <div className="financials">
              <div className="data-row"><span className="label">AVANCE / التسبيق:</span> <span className="value">{c.total_ttc?.toLocaleString()} MAD</span></div>
              <div className="data-row"><span className="label">RESTE A PAYER / الباقي:</span> <span className="value">0.00 MAD</span></div>
           </div>
           <div className="signatures">
              <div className="sig-title">Signature Client / توقيع الزبون</div>
           </div>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="classic-bottom-footer mt-20">
           <p>Adress : RUE 14 AV MIHAMED BENNOU A CARIER BIUJARAH TETOUAN.</p>
           <p>IF: / TP: / RC:</p>
        </div>

      </div>
    </div>
  );
};

export default ContractPrint;
