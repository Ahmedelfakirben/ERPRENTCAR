import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './ContractPrint.css';

const ContractPrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const location = useLocation();
  const printTriggered = useRef(false);

  useEffect(() => { fetchContract(); }, [id]);

  const fetchContract = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, clients (*), vehicles (*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      setContract(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract && location.search.includes('action=download') && !printTriggered.current) {
      printTriggered.current = true;
      setTimeout(() => window.print(), 600);
    }
  }, [contract, location]);

  if (loading) return <div className="p-24 text-center"><Loader2 className="animate-spin inline-block" /></div>;
  if (!contract) return <div className="p-24 text-center">Contrat introuvable</div>;

  const c = contract;
  const v = contract.vehicles;
  const cl = contract.clients;

  const Field = ({ label, arLabel, value }: { label: string; arLabel?: string; value?: string | number }) => (
    <div className="field-group">
      <label>{label} {arLabel && <span className="ar-lbl">{arLabel}</span>}</label>
      <span className="field-line">{value || ''}</span>
    </div>
  );

  const nDays = c.start_date && c.end_date
    ? Math.max(1, Math.ceil((new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) / 86400000))
    : 0;
  const pricePerDay = nDays > 0 && c.total_ttc ? (c.total_ttc / nDays).toFixed(2) : '';

  return (
    <div>
      {/* Screen controls */}
      <div className="no-print" style={{ display: 'flex', gap: 8, padding: 12, background: '#f5f5f5' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: 'white' }}>
          <ArrowLeft size={16} /> Retour
        </button>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          <Printer size={16} /> Imprimer
        </button>
      </div>

      <div className="talon-page">

        {/* ── HEADER ── */}
        <div className="talon-header">
          <div className="talon-header-left">
            <div><span className="pin-icon">📍</span> 5 RUE 14 AV MED BENNOUNA QUARTIER BOUJARRAH TETOUAN</div>
            <div>📞 0660 292 821 / 0531 333 293 / 0618 399 606  –  ICE: 003912377000082</div>
          </div>
          <div className="talon-header-right">
            <img src="/logo.svg" alt="2S1M RENT CAR" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div style={{ fontWeight: 'bold', fontSize: '11pt', letterSpacing: 1 }}>2<span style={{ fontSize: '14pt' }}>S</span>1<span style={{ fontSize: '14pt' }}>M</span></div>
            <div style={{ fontSize: '7pt', letterSpacing: 3 }}>RENT CAR</div>
          </div>
        </div>

        {/* Legal text */}
        <div className="talon-legal-text">
          <div className="talon-legal-ar" style={{ direction: 'rtl' }}>
            المكتري يتعهد بإعادة السيارة بعد انتهاء مدة العقد. الشركة 2S1M RENT CAR غير مسؤولة عن أي حادث بعد انتهاء مدة الإضافية.
          </div>
          <div className="talon-legal-fr" style={{ fontSize: '5.5pt' }}>
            Le locataire s'expose à des poursuites judiciaires 24 heures après la date convenue au départ si le véhicule n'est toujours pas retourné. Le locataire est responsable de tout dégâts d'après la deuxième signature. Le véhicule ne doit être conduit que par le locataire.
          </div>
        </div>

        {/* Title */}
        <div className="talon-title">
          <div className="talon-title-ar">عقد كراء السيارات</div>
          <div className="talon-title-fr">CONTRAT DE LOCATION</div>
        </div>

        {/* ── VEHICLE INFO TABLE ── */}
        <table className="t-full vehicle-section" style={{ marginBottom: '2mm' }}>
          <tbody>
            <tr>
              {/* Vehicle fields */}
              <td style={{ width: '35%', verticalAlign: 'top', padding: '1mm 2mm' }}>
                <div className="field-group">
                  <label>N° Immatriculation <span className="ar-lbl">رقم التسجيل</span></label>
                  <span className="field-line">{v?.plate}</span>
                </div>
                <div className="field-group">
                  <label>Marque <span className="ar-lbl">نوع</span></label>
                  <span className="field-line">{v?.brand} {v?.model}</span>
                </div>
                <div className="field-group">
                  <label>Lieu de livraison <span className="ar-lbl">مكان التسليم</span></label>
                  <span className="field-line">{c.pickup_location || 'Tétouan'}</span>
                </div>
                <div className="field-group">
                  <label>Lieu de reprise <span className="ar-lbl">مكان الاسترجاع</span></label>
                  <span className="field-line">{c.return_location || 'Tétouan'}</span>
                </div>
              </td>

              {/* IMAH Grid */}
              <td style={{ width: '25%', padding: 0, verticalAlign: 'top' }}>
                <div className="imah-grid">
                  <div className="imah-header">
                    {['I', 'M', 'A', 'H'].map(l => <span key={l}>{l}</span>)}
                  </div>
                  <div className="imah-body">
                    {['I', 'M', 'A', 'H'].map(l => <div key={l} className="imah-col" />)}
                  </div>
                </div>
              </td>

              {/* Dates */}
              <td style={{ width: '40%', padding: '1mm 2mm', verticalAlign: 'top' }}>
                <div className="dates-section">
                  {[
                    { fr: 'Départ', ar: 'الإنطلاق', val: `${c.start_date || ''} ${c.time_out || ''}` },
                    { fr: 'Retour Prévu', ar: 'الرجوع المتوقع', val: `${c.end_date || ''} ${c.time_in || ''}` },
                    { fr: 'Retour Définitif', ar: 'الرجوع النهائي', val: c.actual_return_date || '' },
                    { fr: 'Durée', ar: 'المدة', val: nDays > 0 ? `${nDays} jour(s)` : '' },
                  ].map(row => (
                    <div className="date-row" key={row.fr}>
                      <div>
                        <span className="date-label">{row.fr}</span>
                        <span className="date-ar"> {row.ar}</span>
                      </div>
                      <span className="date-value">{row.val}</span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── BODY: CLIENT + PRICING ── */}
        <div className="body-section">

          {/* LEFT: Client */}
          <div className="col-client">
            <div className="section-header">
              <span className="fr-title">Locataire</span>
              <span className="ar-title">المكتري</span>
            </div>

            <Field label="Nom et Prénom" arLabel="الإسم العائلي والشخصي" value={cl?.full_name} />
            <Field label="Adresse au Maroc" arLabel="العنوان بالمغرب" value={cl?.address} />
            <Field label="Date de Naissance" arLabel="تاريخ الإزدياد" value={cl?.birth_date} />
            <Field label="Permis de Conduire N°" arLabel="رخصة السياقة" value={cl?.driver_license} />
            <Field label="Délivré le" arLabel="صادرة في" value={cl?.license_delivery_date} />
            <Field label="C.I.N ou Passeport N°" arLabel="رقم البطاقة الوطنية أو جواز السفر" value={cl?.cin || cl?.passport} />
            <Field label="Adresse à l'étranger" arLabel="العنوان بالخارج" value={cl?.foreign_address} />
            <Field label="Tél/" value={cl?.phone} />

            {/* 2ème Conducteur */}
            <div className="sub-header">
              <span>السائق الثاني</span>
              <span>2<sup>ème</sup> Conducteur</span>
            </div>
            <Field label="Nom et Prénom" arLabel="الإسم العائلي والشخصي" value={c.second_driver_name} />
            <Field label="Adresse au Maroc" arLabel="العنوان بالمغرب" value={c.second_driver_address} />
            <Field label="Permis de Conduire N°" arLabel="رخصة السياقة" value={c.second_driver_license} />
            <Field label="C.I.N N°" value={c.second_driver_cin} />

            {/* Fuel Gauge */}
            <div className="fuel-section">
              <div>
                <div className="fuel-label">Tau de Carburant</div>
                <div className="fuel-label ar">نسبة البنزين</div>
              </div>
              <img src="/fuel_gauge.jpeg" alt="Carburant" className="fuel-img"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div style={{ fontSize: '8pt', fontWeight: 'bold' }}>
                {c.fuel_level_out || '1/2'}
              </div>
            </div>
          </div>

          {/* RIGHT: Pricing */}
          <div className="col-pricing">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th className="row-label"></th>
                  <th>العدد<br/>Q</th>
                  <th>الثمن<br/>Prix</th>
                  <th>Prix Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="row-label">ثمن الكراء في اليوم<br/><span style={{fontSize:'6pt'}}>Heures</span></td>
                  <td></td>
                  <td></td>
                  <td style={{textAlign:'right'}}>...................DH</td>
                </tr>
                <tr>
                  <td className="row-label">الأيام<br/><span style={{fontSize:'6pt'}}>Jours</span></td>
                  <td style={{fontWeight:'bold'}}>{nDays || ''}</td>
                  <td style={{fontWeight:'bold'}}>{pricePerDay}</td>
                  <td style={{textAlign:'right', fontWeight:'bold'}}>{c.total_ttc ? `${c.total_ttc} DH` : '...................DH'}</td>
                </tr>
                <tr>
                  <td className="row-label">الأسابيع<br/><span style={{fontSize:'6pt'}}>Semaines</span></td>
                  <td></td>
                  <td></td>
                  <td style={{textAlign:'right'}}>...................DH</td>
                </tr>
                <tr>
                  <td className="row-label">الشهور<br/><span style={{fontSize:'6pt'}}>Mois</span></td>
                  <td></td>
                  <td></td>
                  <td style={{textAlign:'right'}}>...................DH</td>
                </tr>
                <tr>
                  <td className="row-label">مع التأمين<br/><span style={{fontSize:'6pt'}}>avec Assurance</span></td>
                  <td></td>
                  <td></td>
                  <td style={{textAlign:'right'}}>...................DH</td>
                </tr>
                <tr className="total-row">
                  <td colSpan={3} style={{textAlign:'right', fontWeight:'bold'}}>المجموع<br/>Total</td>
                  <td style={{textAlign:'right', fontWeight:'bold'}}>{c.total_ttc ? `${c.total_ttc} DH` : '...................DH'}</td>
                </tr>
                <tr className="supplement-row">
                  <td colSpan={3} style={{textAlign:'right', color:'#c00'}}>زيادة<br/>Suplément</td>
                  <td style={{textAlign:'right', color:'#c00'}}>...................DH</td>
                </tr>
                <tr className="grand-total-row">
                  <td colSpan={3} style={{textAlign:'right', fontWeight:'bold'}}>Total Général<br/><span style={{fontSize:'6pt'}}>(au Retour)</span></td>
                  <td style={{textAlign:'right', fontWeight:'bold'}}>...................DH</td>
                </tr>
              </tbody>
            </table>

            {/* Payment */}
            <div className="payment-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '3mm', marginBottom: '1mm' }}>
                <span className="payment-label">Paiement:</span>
                <div className="payment-row" style={{ flex: 1 }}>
                  <div className="checkbox-sq">{c.payment_method === 'cash' ? '✓' : ''}</div>
                  <span style={{ color: '#c00', fontWeight: 'bold', fontStyle: 'italic' }}>Espèce</span>
                </div>
              </div>
              <div className="payment-row">
                <div style={{ width: '20mm' }}></div>
                <div className="checkbox-sq">{c.payment_method === 'cheque' ? '✓' : ''}</div>
                <span>Chèque</span>
              </div>

              <div style={{ marginTop: '2mm', borderTop: '0.5pt solid #000', paddingTop: '1mm' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>ضمانة<br/>Caution:</div>
                <div style={{ borderBottom: '0.5pt solid #000', minHeight: '8mm' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── DAMAGE SECTION ── */}
        <div className="damage-section">

          {/* DEPART */}
          <div className="damage-col">
            <div className="dep-ret-header">
              <span className="dep-arrow">←</span>
              <span>DEPART</span>
            </div>
            <div style={{ fontSize: '6.5pt', marginBottom: '1mm' }}>
              <strong>Véhicule en état parfait</strong><br/>
              <span style={{ color: '#999' }}>(Rayer la mention inutile)</span>
            </div>
            <div className="oui-non">
              <div className="oui-non-sq"></div><span>OUI</span>
              <div className="oui-non-sq"></div><span>NON</span>
            </div>
            <div style={{ fontSize: '6.5pt', marginBottom: '1mm' }}>
              Positionner les numéros à l'endroit précis du <u>dommage</u>, sur la matrice à gauche
            </div>
            <div className="car-diagram">
              <img src="/car_damage_map.png" alt="Car" className="car-img"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="car-numbers">
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n}><div className="num-box">{n}</div><div style={{ borderBottom: '0.3pt solid #aaa', width: '20mm' }} /></span>
                ))}
              </div>
            </div>
            <div className="commentaires" style={{ fontSize: '6.5pt', marginTop: '1mm' }}>
              <strong>Commentaires:</strong>
              {[1, 2, 3].map(n => <div key={n} className="comment-line" />)}
            </div>
          </div>

          {/* CENTER: Dommages */}
          <div className="damage-col-center">
            <div style={{ fontWeight: 'bold', fontSize: '7pt', textAlign: 'center', borderBottom: '0.5pt solid #000', paddingBottom: '1mm', marginBottom: '2mm' }}>
              Dommages identifiés<br/>et acceptés
            </div>
            <div className="damage-types">
              {['Erafflure', 'Bosse', 'Manque'].map(d => (
                <div className="damage-type-item" key={d}>
                  <div className="damage-check"></div>
                  <span>{d}</span>
                </div>
              ))}
            </div>
            <table className="damage-grid">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Paraphe Client</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map(n => (
                  <tr key={n}>
                    <td style={{ height: '5mm' }}></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* RETOUR */}
          <div className="damage-col">
            <div className="dep-ret-header">
              <span>RETOUR</span>
              <span className="dep-arrow">→</span>
            </div>
            <div style={{ fontSize: '6.5pt', marginBottom: '1mm' }}>
              <strong>Véhicule en état parfait</strong><br/>
              <span style={{ color: '#999' }}>(Rayer la mention inutile)</span>
            </div>
            <div className="oui-non">
              <div className="oui-non-sq"></div><span>OUI</span>
              <div className="oui-non-sq"></div><span>NON</span>
            </div>
            <div style={{ fontSize: '6.5pt', marginBottom: '1mm' }}>
              Positionner les numéros à l'endroit précis du <u>dommage</u>, sur la matrice à gauche
            </div>
            <div className="car-diagram">
              <img src="/car_damage_map.png" alt="Car" className="car-img"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="car-numbers">
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n}><div className="num-box">{n}</div><div style={{ borderBottom: '0.3pt solid #aaa', width: '20mm' }} /></span>
                ))}
              </div>
            </div>
            <div className="commentaires" style={{ fontSize: '6.5pt', marginTop: '1mm' }}>
              <strong>Commentaires:</strong>
              {[1, 2, 3].map(n => <div key={n} className="comment-line" />)}
            </div>
          </div>
        </div>

        {/* ── SIGNATURES ── */}
        <div className="sig-row">
          <div className="sig-box">Signature Client</div>
          <div className="sig-box">VISA<br/>2S1M RENT CAR</div>
        </div>

      </div>
    </div>
  );
};

export default ContractPrint;
