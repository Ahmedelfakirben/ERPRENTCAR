import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo201M from '../components/layout/Logo201M';
import './ContractPrint.css'; // Reusing the same CSS for classic print

const InvoicePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (*),
          contracts (
            start_date,
            end_date,
            total_days,
            vehicles (
              brand,
              model,
              plate
            )
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setInvoice(data);
    } catch (err) {
      console.error('Error fetching invoice for print:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="p-24 text-center"><Loader2 className="animate-spin inline-block" /></div>;
  if (!invoice) return <div className="p-24 text-center text-error">Facture introuvable</div>;

  const inv = invoice;
  const cl = invoice.clients;
  const c = invoice.contracts;
  const v = c?.vehicles;

  return (
    <div className="contract-print-page">
      <div className="print-controls no-print">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> {isAr ? 'العودة' : 'Retour'}
        </button>
        <button className="btn btn-outline" onClick={handlePrint}>
          <Printer size={16} /> {isAr ? 'طباعة' : 'Imprimer'}
        </button>
      </div>

      <div className="print-sheet classic-format">
        <div className="classic-header-with-logo" style={{ position: 'relative', display: 'flex', justifyContent: 'center', minHeight: '180px' }}>
          <div className="header-logo text-center" style={{ position: 'absolute', left: 0, top: 0 }}>
            <Logo201M size="lg" variant="print" />
          </div>
          
          <div className="header-text" style={{ textAlign: 'center', paddingTop: '10px' }}>
            <div className="phones" style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '8px' }}>
              06 07 51 94 79 / 06 63 29 93 83
            </div>
            <div className="title-section">
              <h1 style={{ fontSize: '24pt', fontWeight: 'bold', textDecoration: 'underline' }}>FACTURE</h1>
              <div style={{ fontSize: '14pt', marginTop: '10px' }}>N° {inv.invoice_number}</div>
            </div>
          </div>

          <div className="header-date" style={{ position: 'absolute', right: 0, top: '10px', textAlign: 'right' }}>
            <div style={{ fontSize: '11pt' }}>Tétouan, le:</div>
            <div className="val-inline" style={{ marginTop: '5px', fontWeight: 'bold' }}>{inv.issued_at || inv.created_at?.split('T')[0]}</div>
          </div>
        </div>

        <div style={{ marginTop: '40px', marginBottom: '40px', padding: '20px', border: '1px solid #000' }}>
          <h3 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '10px' }}>CLIENT</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
             <div><strong>Nom / Raison Sociale :</strong> {cl?.full_name}</div>
             <div><strong>Téléphone :</strong> {cl?.phone || '—'}</div>
             <div><strong>CIN / ICE :</strong> {cl?.cin || '—'}</div>
             <div><strong>Adresse :</strong> {cl?.address || '—'}</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>Désignation</th>
              <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>Période</th>
              <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>Jours</th>
              <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>Montant HT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '10px' }}>
                Location de véhicule: {v ? `${v.brand} ${v.model}` : 'Véhicule'} <br/>
                <small>Immatriculation: {v?.plate || '—'}</small>
              </td>
              <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
                {c?.start_date} au {c?.end_date}
              </td>
              <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
                {c?.total_days || '—'}
              </td>
              <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>
                {(inv.amount_ht || 0).toLocaleString()} MAD
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
          <table style={{ width: '300px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Total HT</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>{(inv.amount_ht || 0).toLocaleString()} MAD</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>TVA ({inv.tva_rate}%)</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>{(inv.tva_amount || 0).toLocaleString()} MAD</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '12px 8px', fontWeight: 'bold', fontSize: '14pt', backgroundColor: '#f0f0f0' }}>Total TTC</td>
                <td style={{ border: '1px solid #000', padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14pt', backgroundColor: '#f0f0f0' }}>{(inv.amount_ttc || 0).toLocaleString()} MAD</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '60px', textAlign: 'center' }}>
          <p>Arrêté la présente facture à la somme de : <strong>{(inv.amount_ttc || 0).toLocaleString()} Dirhams</strong>.</p>
        </div>

        <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Cachet et Signature</div>
        </div>

      </div>
    </div>
  );
};

export default InvoicePrint;
