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
        .eq('id', id).single();
      if (error) throw error;
      setContract(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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

  const nDays = c.start_date && c.end_date
    ? Math.max(1, Math.ceil((new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) / 86400000))
    : 0;
  const priceDay = nDays > 0 && c.total_ttc ? (c.total_ttc / nDays).toFixed(0) : '';

  // Field helper
  const F = ({ fr, ar, val }: { fr: string; ar?: string; val?: any }) => (
    <div className="f">
      <div className="f-lbl">{fr}{ar && <span className="ar">{ar}</span>}</div>
      <span className="f-val">{val ?? ''}</span>
    </div>
  );

  return (
    <div>
      {/* Controls (screen only) */}
      <div className="no-print" style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13 }}>
          <ArrowLeft size={15} /> Retour
        </button>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          <Printer size={15} /> Imprimer (2 pages)
        </button>
      </div>

      {/* ══════════════════════════════════════
          PAGE 1 – FORMULAIRE DU CONTRAT
          ══════════════════════════════════════ */}
      <div className="talon-page">

        {/* Header row 1: Address + Logo */}
        <div className="p1-header">
          <div className="p1-header-left">
            <div>📍 5 RUE 14 AV MED BENNOUNA QUARTIER BOUJARRAH TETOUAN</div>
            <div>📞 0660 292 821 / 0531 333 293 / 0618 399 606 – ICE: 003912377000082</div>
          </div>
          <img src="/logo_2s1m.png" alt="2S1M RENT CAR" className="p1-logo"
            onError={e => { const t = e.target as HTMLImageElement; t.style.display = 'none'; }} />
        </div>

        {/* Header row 2: Title LEFT + Legal text RIGHT */}
        <div className="p1-header2">
          <div className="p1-title">
            <div className="p1-title-ar">عقد كراء السيارات</div>
            <div className="p1-title-fr">CONTRAT DE LOCATION</div>
          </div>
          <div className="p1-legal">
            <div className="p1-legal-ar">
              المكتري للسيارة يتعهد بالإعادة بعد انتهاء مدة العقد. الشركة 2S1M RENT CAR غير مسؤولة عن أي حادث بعد انتهاء مدة الإضافية وإن لم يتم الإعادة فالمكتري يتابع قضائيا 24 ساعة بعد انتهاء مدة العقد.
            </div>
            <div className="p1-legal-fr">
              Le locataire s'expose à des poursuites judiciaires 24 heures après la date convenue au départ si le véhicule n'est toujours pas retourné, et cela sont due de 2S1M RENT CAR et été informé d'un prolongation de location et reçu la somme supplémentaire du point en cas de fortuite le locataire est responsable de tout dégâts d'après la deuxième signature. Le véhicule ne doit être conduit que par le locataire.
            </div>
          </div>
        </div>

        {/* Vehicle info table */}
        <table className="vehicle-row">
          <tbody>
            <tr>
              {/* Left: Vehicle fields */}
              <td style={{ width: '34%' }}>
                {[
                  { fr: 'N° Immatriculation', ar: 'رقم التسجيل', val: v?.plate },
                  { fr: 'Marque', ar: 'نوع', val: `${v?.brand || ''} ${v?.model || ''}` },
                  { fr: 'Lieu de livraison', ar: 'مكان التسليم', val: c.pickup_location || 'Tétouan' },
                  { fr: 'Lieu de reprise', ar: 'مكان الاسترجاع', val: c.return_location || 'Tétouan' },
                ].map(r => (
                  <div className="frow" key={r.fr}>
                    <div className="frow-lbl">{r.fr} <span className="ar">{r.ar}</span></div>
                    <span className="frow-val">{r.val}</span>
                  </div>
                ))}
              </td>

              {/* Middle: IMAH grid */}
              <td style={{ width: '22%', padding: 0 }}>
                <table className="imah">
                  <thead>
                    <tr>{['I','M','A','H'].map(l => <th key={l}>{l}</th>)}</tr>
                  </thead>
                  <tbody>
                    <tr>{[0,1,2,3].map(i => <td key={i}></td>)}</tr>
                    <tr>{[0,1,2,3].map(i => <td key={i}></td>)}</tr>
                    <tr>{[0,1,2,3].map(i => <td key={i}></td>)}</tr>
                    <tr>{[0,1,2,3].map(i => <td key={i}></td>)}</tr>
                  </tbody>
                </table>
              </td>

              {/* Right: Dates */}
              <td style={{ width: '44%', padding: 0 }}>
                <table className="date-tbl">
                  <tbody>
                    {[
                      { fr: 'Départ', ar: 'الإنطلاق', val: `${c.start_date || ''} ${c.time_out || ''}` },
                      { fr: 'Retour Prévu', ar: 'الرجوع المتوقع', val: `${c.end_date || ''} ${c.time_in || ''}` },
                      { fr: 'Retour Définitif', ar: 'الرجوع النهائي', val: c.actual_return_date || '' },
                      { fr: 'Durée', ar: 'المدة', val: nDays > 0 ? `${nDays} jour(s)` : '' },
                    ].map(r => (
                      <tr key={r.fr}>
                        <td><span className="date-fr">{r.fr}</span><span className="date-ar">{r.ar}</span></td>
                        <td className="date-val">{r.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Body: Client + Pricing */}
        <div className="body-2col">

          {/* CLIENT */}
          <div className="col-client">
            <div className="sec-hdr">
              <span className="fr">Locataire</span>
              <span className="ar">المكتري</span>
            </div>
            <F fr="Nom et Prénom" ar="الإسم العائلي والشخصي" val={cl?.full_name} />
            <F fr="Adresse au Maroc" ar="العنوان بالمغرب" val={cl?.address} />
            <F fr="Date de Naissance" ar="تاريخ الإزدياد" val={cl?.birth_date} />
            <F fr="Permis de Conduire N°" ar="رخصة السياقة" val={cl?.driver_license} />
            <F fr="Délivré le" ar="صادرة في" val={cl?.license_delivery_date} />
            <F fr="Expire le" ar="ينتهي في" val={cl?.license_expiry_date} />
            <F fr="C.I.N ou Passeport N°" ar="رقم البطاقة الوطنية أو جواز السفر" val={cl?.cin || cl?.passport} />
            <F fr="Adresse à l'étranger" ar="العنوان بالخارج" val={cl?.foreign_address} />
            <F fr="Tél/" val={cl?.phone} />

            <div className="sub-bar">
              <span>السائق الثاني</span>
              <span>2<sup>ème</sup> Conducteur</span>
            </div>
            <F fr="Nom et Prénom" ar="الإسم العائلي والشخصي" val={c.second_driver_name} />
            <F fr="Adresse au Maroc" ar="العنوان بالمغرب" val={c.second_driver_address} />
            <F fr="Permis de Conduire N°" ar="رخصة السياقة" val={c.second_driver_license} />
            <F fr="C.I.N N°" val={c.second_driver_cin} />

            {/* Fuel */}
            <div className="fuel-strip">
              <div>
                <div className="fuel-lbl">Tau de Carburant<span className="ar">نسبة البنزين</span></div>
              </div>
              <img src="/fuel_gauge.jpeg" alt="Carburant" className="fuel-img"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="fuel-val">{c.fuel_level_out || '1/2'}</span>
            </div>
          </div>

          {/* PRICING */}
          <div className="col-price">
            <table className="price-tbl">
              <thead>
                <tr>
                  <th className="lbl"></th>
                  <th>العدد<br/>Q</th>
                  <th>الثمن<br/>Prix</th>
                  <th>Prix Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="lbl">ثمن الكراء في اليوم<span className="ar">Heures</span></td>
                  <td></td><td></td>
                  <td style={{textAlign:'right'}}>.........DH</td>
                </tr>
                <tr>
                  <td className="lbl">الأيام<span className="ar">Jours</span></td>
                  <td style={{fontWeight:'bold'}}>{nDays || ''}</td>
                  <td style={{fontWeight:'bold'}}>{priceDay ? `${priceDay} DH` : ''}</td>
                  <td style={{textAlign:'right', fontWeight:'bold'}}>{c.total_ttc ? `${c.total_ttc} DH` : '.........DH'}</td>
                </tr>
                <tr>
                  <td className="lbl">الأسابيع<span className="ar">Semaines</span></td>
                  <td></td><td></td>
                  <td style={{textAlign:'right'}}>.........DH</td>
                </tr>
                <tr>
                  <td className="lbl">الشهور<span className="ar">Mois</span></td>
                  <td></td><td></td>
                  <td style={{textAlign:'right'}}>.........DH</td>
                </tr>
                <tr>
                  <td className="lbl">مع التأمين<span className="ar">avec Assurance</span></td>
                  <td></td><td></td>
                  <td style={{textAlign:'right'}}>.........DH</td>
                </tr>
                <tr className="row-tot">
                  <td className="lbl" colSpan={3} style={{textAlign:'right'}}>المجموع<br/>Total</td>
                  <td style={{textAlign:'right'}}>{c.total_ttc ? `${c.total_ttc} DH` : '.........DH'}</td>
                </tr>
                <tr className="row-sup">
                  <td className="lbl" colSpan={3} style={{textAlign:'right'}}>زيادة Suplément</td>
                  <td style={{textAlign:'right'}}>.........DH</td>
                </tr>
                <tr className="row-grand">
                  <td className="lbl" colSpan={3} style={{textAlign:'right'}}>Total Général<br/><span style={{fontSize:'5.5pt'}}>(au Retour)</span></td>
                  <td style={{textAlign:'right'}}>.........DH</td>
                </tr>
              </tbody>
            </table>

            <div className="pay-block">
              <div style={{display:'flex', alignItems:'center', gap:'2mm', marginBottom:'0.8mm'}}>
                <span style={{fontWeight:'bold', fontSize:'7pt'}}>Paiement:</span>
                <div className="pay-row">
                  <div className="chk">{c.payment_method === 'cash' ? '✓' : ''}</div>
                  <span className="espece">Espèce</span>
                </div>
              </div>
              <div className="pay-row">
                <div style={{width:'14mm'}}></div>
                <div className="chk">{c.payment_method === 'cheque' ? '✓' : ''}</div>
                <span>Chèque</span>
              </div>
            </div>
          </div>
        </div>

        {/* Damage section */}
        <div className="dmg-row">
          {/* DEPART */}
          <div className="dmg-col">
            <div className="dep-hdr">← DEPART</div>
            <div style={{fontSize:'6pt', marginBottom:'0.5mm'}}><strong>Véhicule en état parfait</strong><br/><span style={{color:'#888'}}>(Rayer la mention inutile)</span></div>
            <div className="oui-non"><div className="sq"></div>OUI <div className="sq"></div>NON</div>
            <div style={{fontSize:'5.5pt', marginBottom:'0.5mm'}}>Positionner les numéros à l'endroit précis du <u>dommage</u>, sur la matrice à gauche</div>
            <div className="car-wrap">
              <img src="/car_damage_map.png" alt="Car" className="car-img"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="nums-col">
                {[1,2,3,4,5].map(n => <span key={n}><div className="nsq">{n}</div><div className="nline"/></span>)}
              </div>
            </div>
            <div className="cmt-hdr">Commentaires:</div>
            {[1,2,3].map(n => <div key={n} className="cmt-line"/>)}
          </div>

          {/* CENTER */}
          <div className="dmg-mid">
            <div className="dmg-center-title">Dommages identifiés<br/>et acceptés</div>
            {['Erafflure','Bosse','Manque'].map(d => (
              <div className="dmg-item" key={d}><div className="sq"></div><span>{d}</span></div>
            ))}
            <table className="dmg-grid">
              <thead><tr><th>Nombre</th><th>Paraphe Client</th></tr></thead>
              <tbody>{[1,2,3,4].map(n => <tr key={n}><td></td><td></td></tr>)}</tbody>
            </table>
          </div>

          {/* RETOUR */}
          <div className="dmg-col">
            <div className="dep-hdr">RETOUR →</div>
            <div style={{fontSize:'6pt', marginBottom:'0.5mm'}}><strong>Véhicule en état parfait</strong><br/><span style={{color:'#888'}}>(Rayer la mention inutile)</span></div>
            <div className="oui-non"><div className="sq"></div>OUI <div className="sq"></div>NON</div>
            <div style={{fontSize:'5.5pt', marginBottom:'0.5mm'}}>Positionner les numéros à l'endroit précis du <u>dommage</u>, sur la matrice à gauche</div>
            <div className="car-wrap">
              <img src="/car_damage_map.png" alt="Car" className="car-img"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="nums-col">
                {[1,2,3,4,5].map(n => <span key={n}><div className="nsq">{n}</div><div className="nline"/></span>)}
              </div>
            </div>
            <div className="cmt-hdr">Commentaires:</div>
            {[1,2,3].map(n => <div key={n} className="cmt-line"/>)}
          </div>
        </div>

        {/* Signatures */}
        <div className="sig-row">
          <div className="sig-box">Signature Client</div>
          <div className="sig-box">VISA<br/>2S1M RENT CAR</div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          PAGE 2 – CONDITIONS GÉNÉRALES
          ══════════════════════════════════════ */}
      <div className="page2">
        <div className="p2-header">
          <img src="/logo_2s1m.png" alt="2S1M" className="p2-logo"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="p2-title">CONDITIONS GÉNÉRALES<br/>DE LOCATION</div>
        </div>

        <div className="p2-intro">
          Le présent contrat a été établi et prend date comme indiqué au verso. Il engage <strong>2S1M RENT CAR</strong> qui sera appelée le loueur et la personne Société ou Compagnie par qui/laquelle ce contrat, qui sera dénommée «le locataire».
        </div>

        <div className="p2-cols">
          {/* Left column: Art. 1–5 */}
          <div className="p2-col">
            <div className="art">
              <span className="art-title">Art. 1 - UTILISATION DE LA VOITURE :</span>
              <div className="art-body">Le locataire s'engage à ne pas laisser conduire la voiture par d'autres personnes que lui même ou celles agréées par le loueur et dont il se porte garant, et à réutiliser le véhicule que pour ses besoins personnels. Il est interdit de participer a toute compétition, quelle qu'elle soit, et d'utiliser le véhicule des fins illicites ou des transports de marchandises. Le locataire s'engage à ne pas solliciter orientement des documents douaniers. Il est interdit au locataire de surcharger le vehicule loue en transportant un nombre de passagers superieur a celui porte sur le contrat, sous peine d'être déchu de l'Assurance.</div>
            </div>
            <div className="art">
              <span className="art-title">Art. 2 - ETAT DE LA VOITURE :</span>
              <div className="art-body">La voiture est livrée en parfait état de marche et de propreté. Les compteurs et leurs prises sont plombés, et les plombs ne pourront être enlevés ou violes sous peine de devoir payer la location sur la base de 500 kilomètres par jour. La voiture sera rendue dans le même état de propreté, a défaut le locataire devra acquitter le montant de ces nettoyages et remises en état les 5 pneus sont en bon état sans coupures, l'usure et normale. En cas de détérioration de l'un d'eux pour une cause autre que l'usure normale. Le locataire s'engage a le remplacer immédiatement par un pneu neuf de mèmes dimensions ou d'en payer le montant.</div>
            </div>
            <div className="art">
              <span className="art-title">Art. 3 - ESSENCE ET HUILE :</span>
              <div className="art-body">L'essence est à la charge du client. Le locataire doit vérifier en permanence les niveaux d'huile et vérifier les niveaux de la boîte de vitesse et du pont arrière tous les 1.000 kilomètres. Il justifiera de ces travaux par des factures correspondants (qui lui seront remboursées) sous peine à payer une indemnité pour usure anormale.</div>
            </div>
            <div className="art">
              <span className="art-title">Art. 4 - ENTRETIEN ET REPARATION :</span>
              <div className="art-body">L'usure mécanique normale est a la charge du loueur. Toutes les réparations provenant, soit d'une usure anormale, soit d'une négligence de la part du locataire ou d'une cause accidentelle, seront à sa charge et exécutées par nos soins. Dans le cas ou le véhicule serait immobilisé en dehors de la région, les réparations qu'elles soient dues à l'usure normale ou a une cause accidentelle, ne seront exécutées qu'après accord télégraphique du loueur ou par l'Agent régional de la marque du véhicule. Elles devront faire l'objet d'une facture acquittée et très détaillée. Les pièces défectueuses remplacées devront être présentées avec la facture acquittée. En aucun cas et en aucune circonstance, le locataire ne pourra réclamer des dommages et intérêts. La responsabilité du loueur ne pourra jamais être invoquée, même en cas d'accidents de personnes ou de choses ayant pu résulter de vices ou de défauts de construction ou de réparations antérieures.</div>
            </div>
            <div className="art">
              <span className="art-title">Art. 5 - ASSURANCE :</span>
              <div className="art-body">Le locataire est garanti pour les risques suivants: En cas d'accidents fortuit ou fautif le locataire est entièrement responsable des dommages véhicule en conséquence il est tenu de nous régler le montant total des réparations. Le locataire est le seul conducteur du véhicule et s'engage a ne pas céder a autrui a mains d'une stipulation sur le présent contrat. Les frais de rapatriement et d'immobilisation reste toujours à la charge du locataire, quelle que soit la formule d'assurance contractée. Enfin, il n'y a pas Assurance pour tout conducteur non muni d'un permis en état de validité ou d'un permis datant de moins de lan. Le loueur décline toute responsabilité pour les accidents aux tiers ou dégâts à la voiture que le locataire pourrait causer pendant la période de location si le locataire a délibérément fourni au loueur des informations fausses concernant son identité, son adresse ou la validité de son permis de conduire.</div>
            </div>
          </div>

          {/* Right column: Art. 6–10 + signature */}
          <div className="p2-col">
            <div className="art">
              <span className="art-title">Art. 6 - LOCATION, CAUTION, PROLONGATION :</span>
              <div className="art-body">Les prix de la location, ainsi que de la caution, sont payables d'avances. La caution ne pourra servir, en aucun cas au loueur, faire parvenir le montant de la location en cours, sous peine a une prolongation de location. Afin d'évitent toutes contestation et picut le cas ou le locataire voudrai conserver la voiture pour un temps supérieur a celui indique sur le contrat, il devra après avoir obtenu l'accord de s'exposer à des poursuites pour détournement de voiture ou abus de confiance. La journée de location compte de 0 heures à 24 heures et toute journée commencée est due en entier.</div>
            </div>
            <div className="art">
              <span className="art-title">Art. 7 - RAPATRIEMENT DE LA VOITURE :</span>
              <div className="art-body">Le locataire s'interdit formellement d'abandonner le véhicule. En cas d'impossibilité matérielle, celle-ci sera rapatriée aux frais et par les soins du locataire, la location restant due jusqu'au retour du véhicule.</div>
            </div>
            <div className="art">
              <span className="art-title">Art. 8 - PAPIERS DE LA VOITURE :</span>
              <div className="art-body">Le locataire remettra dès la fins de la location et a la rentrée de la voiture, la carte grise et tous les papiers nécessaires à sa circulation, faute de quoi, ces pièces étant indispensables a de nouvelles locations, la location continuera à être facturée aux prix initial jusqu'à leur remise à la Société. En cas de perte de ces papiers le locataire devra acquitter le montant des frais de duplicata, ainsi que de l'immobilisation.</div>
            </div>
            <div className="art">
              <span className="art-title">Art. 9 - RESPONSABILITE :</span>
              <div className="art-body">Le locataire demeure seul responsable des amendes, contraventions et procès-verbaux établis contre lui.</div>
            </div>
            <div className="art">
              <span className="art-title">Art. 10 - COMPETENCE :</span>
              <div className="art-body">De convention expresse et en cas de contestation quelconque, le Tribunal de Tanger sera seul compétent, les frais de timbres et d'enregistrement restant à la charge du locataire.</div>
            </div>

            {/* Signature box */}
            <div className="p2-sig-block">
              <div className="p2-sig-lbl">Signature du client</div>
              <div className="p2-sig-text">
                Je reconnais avoir pris connaissance des présentes conditions générales (recto et verso) que je m'engage à respecter.
              </div>
              <div className="p2-sig-area"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractPrint;
