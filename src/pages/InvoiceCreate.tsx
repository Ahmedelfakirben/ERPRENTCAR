import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText, Download, Printer, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './InvoiceCreate.css';

interface InvoiceLine {
  id: number;
  description: string;
  qty: number;
  unitPrice: number;
}

const InvoiceCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');

  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedClient, setSelectedClient] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  const [tvaRate, setTvaRate] = useState(20);
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: 1, description: i18n.language.startsWith('ar') ? 'إيجار سيارة' : 'Location de véhicule', qty: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    fetchData();
    
    // Pre-fill if state is passed from Finance.tsx
    if (location.state) {
      const { client_id, contract_id, amount_ht, contract_number } = location.state;
      if (client_id) setSelectedClient(client_id);
      if (contract_id) setSelectedContract(contract_id);
      if (amount_ht) {
        setLines([{
          id: 1,
          description: isAr 
            ? `إيجار سيارة - عقد رقم ${contract_number || ''}` 
            : `Location de véhicule - Contrat ${contract_number || ''}`,
          qty: 1,
          unitPrice: amount_ht
        }]);
      }
    }
  }, [location.state]);

  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const { data: cData } = await supabase.from('clients').select('id, full_name, full_name_ar');
      const { data: ctData } = await supabase.from('contracts').select('id, contract_number');
      setClients(cData || []);
      setContracts(ctData || []);
    } catch (err) {
      console.error('Error fetching data for invoice:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (!selectedClient) return alert('Veuillez sélectionner un client');
    setIsSaving(true);
    try {
      // 1. Generate Invoice Number
      let invNum = '';
      try {
        const { data: rpcNum, error: rpcErr } = await supabase.rpc('generate_invoice_number');
        if (!rpcErr && rpcNum) invNum = rpcNum;
        else throw new Error('RPC Failed');
      } catch (e) {
        invNum = `FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      }

      // 2. Save to DB
      const { error } = await supabase.from('invoices').insert([{
        invoice_number: invNum,
        client_id: selectedClient,
        contract_id: selectedContract || null,
        amount_ht: subtotal,
        tva_amount: tvaAmount,
        amount_ttc: total,
        status: 'pending',
        issued_at: new Date().toISOString().split('T')[0]
      }]);

      if (error) throw error;
      alert(isAr ? 'تم حفظ الفاتورة بنجاح' : 'Facture enregistrée avec succès');
      navigate('/finance');
    } catch (err) {
      console.error(err);
      alert('Error saving invoice');
    } finally {
      setIsSaving(false);
    }
  };


  const addLine = () => {
    setLines([...lines, { id: Date.now(), description: '', qty: 1, unitPrice: 0 }]);
  };

  const removeLine = (id: number) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: number, field: keyof InvoiceLine, value: string | number) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const tvaAmount = subtotal * (tvaRate / 100);
  const total = subtotal + tvaAmount;

  if (loadingData) return <div className="p-24 text-center"><Loader2 className="animate-spin inline-block" /> Loading...</div>;

  return (
    <div className="invoice-create-page animate-fade-in">
      <div className="detail-top-bar">
        <button className="btn btn-ghost" onClick={() => navigate('/finance')}>
          <ArrowLeft size={18} /> {isAr ? 'العودة للمالية' : 'Retour aux Finances'}
        </button>
        <div className="flex gap-2">
          <button className="btn btn-outline" disabled={isSaving}><Printer size={16} /> {isAr ? 'معاينة' : 'Aperçu'}</button>
          <button className="btn btn-primary" onClick={handleSaveInvoice} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {isAr ? 'حفظ الفاتورة' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="invoice-form-grid">
        {/* Left: Invoice Form */}
        <div className="card invoice-form">
          <h2 className="mb-6 flex items-center gap-2">
            <FileText size={24} className="text-primary" />
            {isAr ? 'فاتورة جديدة' : 'Nouvelle Facture'}
          </h2>

          {/* Header Info */}
          <div className="form-grid mb-6">
            <div className="input-group">
              <label className="input-label">{isAr ? 'رقم الفاتورة' : 'N° Facture'}</label>
              <input className="input-field" value="FAC-2026-043" disabled />
            </div>
            <div className="input-group">
              <label className="input-label">{isAr ? 'التاريخ' : 'Date'}</label>
              <input className="input-field" type="date" defaultValue="2026-04-23" />
            </div>
            <div className="input-group">
              <label className="input-label">{isAr ? 'العميل' : 'Client'}</label>
              <select className="input-field" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                <option value="">{isAr ? 'اختر عميل...' : 'Sélectionner un client...'}</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{isAr ? (c.full_name_ar || c.full_name) : c.full_name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">{isAr ? 'العقد المرتبط' : 'Contrat lié'}</label>
              <select className="input-field" value={selectedContract} onChange={e => setSelectedContract(e.target.value)}>
                <option value="">{isAr ? 'اختياري...' : 'Optionnel...'}</option>
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>{c.contract_number}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Lines */}
          <h3 className="mb-4">{isAr ? 'بنود الفاتورة' : 'Lignes de la Facture'}</h3>
          <div className="invoice-lines">
            <div className="invoice-line-header">
              <span>{isAr ? 'الوصف' : 'Description'}</span>
              <span>{isAr ? 'الكمية' : 'Qté'}</span>
              <span>{isAr ? 'السعر الوحدوي' : 'Prix Unit.'}</span>
              <span>{isAr ? 'المجموع' : 'Total'}</span>
              <span></span>
            </div>
            {lines.map(line => (
              <div className="invoice-line-row" key={line.id}>
                <input
                  className="input-field"
                  value={line.description}
                  onChange={e => updateLine(line.id, 'description', e.target.value)}
                  placeholder={isAr ? 'وصف...' : 'Description...'}
                />
                <input
                  className="input-field"
                  type="number"
                  value={line.qty}
                  onChange={e => updateLine(line.id, 'qty', Number(e.target.value))}
                  min={1}
                />
                <input
                  className="input-field"
                  type="number"
                  value={line.unitPrice}
                  onChange={e => updateLine(line.id, 'unitPrice', Number(e.target.value))}
                />
                <span className="line-total font-semibold">{(line.qty * line.unitPrice).toLocaleString()} MAD</span>
                <button className="btn btn-ghost btn-sm" onClick={() => removeLine(line.id)}>
                  <Trash2 size={16} className="text-error" />
                </button>
              </div>
            ))}
            <button className="btn btn-outline btn-sm mt-2" onClick={addLine}>
              <Plus size={16} /> {isAr ? 'إضافة سطر' : 'Ajouter une ligne'}
            </button>
          </div>

          <div className="flex gap-6 mt-6">
            <div className="input-group">
              <label className="input-label">{isAr ? 'نسبة الضريبة (TVA %)' : 'Taux TVA (%)'}</label>
              <input 
                className="input-field" 
                type="number" 
                value={tvaRate} 
                onChange={e => setTvaRate(Number(e.target.value))}
                style={{ maxWidth: 100 }}
              />
            </div>
            <div className="input-group">
              <label className="input-label">{isAr ? 'طريقة الدفع' : 'Méthode de Paiement'}</label>
              <select className="input-field" style={{ maxWidth: 200 }}>
                <option>{isAr ? 'نقداً' : 'Espèces'}</option>
                <option>{isAr ? 'بطاقة' : 'Carte Bancaire'}</option>
                <option>{isAr ? 'تحويل بنكي' : 'Virement Bancaire'}</option>
                <option>{isAr ? 'شيك' : 'Chèque'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="invoice-preview card">
          <div className="preview-header">
            <div>
              <h3 className="text-primary">RentaCar Maroc</h3>
              <p className="text-sm text-secondary">Rue Mohammed V, Tétouan</p>
              <p className="text-sm text-secondary">ICE: 001234567000012</p>
            </div>
            <div className="text-end">
              <h4>{isAr ? 'فاتورة' : 'FACTURE'}</h4>
              <p className="text-sm text-secondary">FAC-2026-043</p>
              <p className="text-sm text-secondary">23/04/2026</p>
            </div>
          </div>

          <div className="preview-client mt-4">
            <p className="text-sm text-secondary">{isAr ? 'فاتورة لـ' : 'Facturé à'}:</p>
            <p className="font-medium">
              {(() => {
                const c = clients.find(cl => cl.id === selectedClient);
                return c ? (isAr ? (c.full_name_ar || c.full_name) : c.full_name) : '—';
              })()}
            </p>
          </div>

          <table className="data-table mt-4">
            <thead>
              <tr>
                <th>{isAr ? 'الوصف' : 'Description'}</th>
                <th>{isAr ? 'الكمية' : 'Qté'}</th>
                <th>{isAr ? 'السعر' : 'P.U.'}</th>
                <th>{isAr ? 'المجموع' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id}>
                  <td>{l.description || '—'}</td>
                  <td>{l.qty}</td>
                  <td>{l.unitPrice.toLocaleString()} MAD</td>
                  <td className="font-medium">{(l.qty * l.unitPrice).toLocaleString()} MAD</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="preview-totals mt-4">
            <div className="preview-total-row">
              <span>{isAr ? 'المجموع HT' : 'Total HT'}</span>
              <span>{subtotal.toLocaleString()} MAD</span>
            </div>
            <div className="preview-total-row text-warning">
              <span>TVA ({tvaRate}%)</span>
              <span>{tvaAmount.toLocaleString()} MAD</span>
            </div>
            <div className="preview-total-row total-final">
              <span>{isAr ? 'المجموع TTC' : 'Total TTC'}</span>
              <span>{total.toLocaleString()} MAD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreate;
