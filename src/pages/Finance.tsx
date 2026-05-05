import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, ArrowUpDown, Download, Receipt, Plus, X, 
  Loader2, Banknote, CreditCard, ArrowRightLeft, ChevronLeft, ChevronRight,
  CalendarDays
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import PageLoader from '../components/layout/PageLoader';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

const Finance = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'fr';

  const [tab, setTab] = useState<'contracts' | 'invoices' | 'expenses' | 'cash'>('contracts');
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Search/Filters
  const [cSearch, setCSearch] = useState('');
  const [cDateS, setCDateS] = useState('');
  const [cDateE, setCDateE] = useState('');
  const [cSort, setCSort] = useState({ key: 'start_date', dir: 'desc' });
  const [cPage, setCPage] = useState(1);

  const [iSearch, setISearch] = useState('');
  const [iDateS, setIDateS] = useState('');
  const [iDateE, setIDateE] = useState('');
  const [iSort, setISort] = useState({ key: 'invoice_number', dir: 'desc' });
  const [iPage, setIPage] = useState(1);

  const [eSearch, setESearch] = useState('');
  const [eDateS, setEDateS] = useState('');
  const [eDateE, setEDateE] = useState('');
  const [eSort, setESort] = useState({ key: 'transaction_date', dir: 'desc' });
  const [ePage, setEPage] = useState(1);

  const [caSearch, setCaSearch] = useState('');
  const [caPage, setCaPage] = useState(1);
  const [caisseStart, setCaisseStart] = useState('');
  const [caisseEnd, setCaisseEnd] = useState('');

  // Add Expense Modal
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: '', category: 'Autre', description: '', vehicle_id: '', payment_method: 'cash'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, iRes, tRes, vRes] = await Promise.all([
        supabase.from('contracts').select('*, clients(full_name, full_name_ar)').order('start_date', { ascending: false }),
        supabase.from('invoices').select('*, clients(full_name, full_name_ar), contracts(contract_number)'),
        supabase.from('transactions').select('*').order('transaction_date', { ascending: false }),
        supabase.from('vehicles').select('id, brand, model, plate')
      ]);

      setContracts(cRes.data || []);
      setInvoices(iRes.data || []);
      setTransactions(tRes.data || []);
      setVehicles(vRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.amount) return;
    try {
      const { error } = await supabase.from('transactions').insert([{
        amount: parseFloat(expenseForm.amount),
        transaction_type: 'expense',
        category: expenseForm.category,
        description: expenseForm.description,
        vehicle_id: expenseForm.vehicle_id || null,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: expenseForm.payment_method
      }]);

      if (error) throw error;
      setShowAddExpense(false);
      setExpenseForm({ amount: '', category: 'Autre', description: '', vehicle_id: '', payment_method: 'cash' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert(isAr ? 'حدث خطأ' : 'Erreur');
    }
  };

  const handleGenerateInvoice = async (contract: any) => {
    try {
      const invNum = `INV-${Date.now().toString().slice(-6)}`;
      const amount_ht = (contract.total_ttc || 0) / 1.2;
      const tva = (contract.total_ttc || 0) - amount_ht;

      const { error } = await supabase.from('invoices').insert([{
        contract_id: contract.id,
        client_id: contract.client_id,
        invoice_number: invNum,
        amount_ht,
        tva_amount: tva,
        amount_ttc: contract.total_ttc,
        status: 'paid'
      }]);

      if (error) throw error;
      fetchData();
      alert(isAr ? 'تم إنشاء الفاتورة بنجاح' : 'Facture générée avec succès');
    } catch (err: any) {
      console.error(err);
      alert(isAr ? 'حدث خطأ أثناء إنشاء الفاتورة' : 'Erreur lors de la generación de la facture: ' + err.message);
    }
  };

  const statusLabel: Record<string, string> = {
    active:    isAr ? 'نشط'    : 'En cours',
    completed: isAr ? 'مدفوع'  : 'Payé',
    pending:   isAr ? 'معلق'   : 'En attente',
    paid:      isAr ? 'مدفوع'  : 'Payée',
  };
  const statusBadge: Record<string, string> = {
    active: 'badge-primary', completed: 'badge-success', pending: 'badge-warning', paid: 'badge-success'
  };

  const applySort = (arr: any[], sort: {key:string,dir:string}) => {
    if (!sort.key || !sort.dir) return arr;
    return [...arr].sort((a, b) => {
      const va = a[sort.key] ?? ''; const vb = b[sort.key] ?? '';
      return sort.dir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
  };

  const mkSort = (current: any, key: string, setter: any, resetPage: any) => {
    const dir = current.key === key && current.dir === 'asc' ? 'desc' : 'asc';
    setter({ key, dir });
    resetPage();
  };

  const paginate = (arr: any[], page: number) => {
    const start = (page - 1) * 10;
    return arr.slice(start, start + 10);
  };

  const totalPages = (arr: any[]) => Math.ceil(arr.length / 10);

  // Filter Logic
  const filteredC = applySort(contracts.filter(c => {
    const searchMatch = c.contract_number?.toLowerCase().includes(cSearch.toLowerCase()) || 
                      (c.clients?.full_name||'').toLowerCase().includes(cSearch.toLowerCase()) ||
                      (c.clients?.full_name_ar||'').includes(cSearch);
    if (cSearch && !searchMatch) return false;
    if (cDateS && c.start_date < cDateS) return false;
    if (cDateE && c.start_date > cDateE) return false;
    return true;
  }), cSort);

  const filteredI = applySort(invoices.filter(i => {
    const sMatch = i.invoice_number?.toLowerCase().includes(iSearch.toLowerCase()) || 
                   (i.clients?.full_name||'').toLowerCase().includes(iSearch.toLowerCase());
    if (iSearch && !sMatch) return false;
    if (iDateS && i.created_at < iDateS) return false;
    if (iDateE && i.created_at > iDateE) return false;
    return true;
  }), iSort);

  const filteredE = applySort(transactions.filter(t => {
    if (t.transaction_type !== 'expense') return false;
    const sMatch = (t.description||'').toLowerCase().includes(eSearch.toLowerCase()) || 
                   (t.category||'').toLowerCase().includes(eSearch.toLowerCase());
    if (eSearch && !sMatch) return false;
    if (eDateS && t.transaction_date < eDateS) return false;
    if (eDateE && t.transaction_date > eDateE) return false;
    return true;
  }), eSort);

  const filteredCa = transactions.filter(t => {
    const sMatch = (t.description||'').toLowerCase().includes(caSearch.toLowerCase()) || 
                   (t.reference||'').toLowerCase().includes(caSearch.toLowerCase());
    if (caSearch && !sMatch) return false;
    if (caisseStart && t.transaction_date < caisseStart) return false;
    if (caisseEnd && t.transaction_date > caisseEnd) return false;
    return true;
  });

  return (
    <div className="finance-page animate-fade-in">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="m-0">{isAr ? 'المالية' : 'Finance'}</h1>
          <p className="text-secondary m-0">{isAr ? 'تتبع المداخيل، المصاريف والفواتير' : 'Suivi des revenus, dépenses et factures'}</p>
        </div>
      </div>

      <div className="tab-bar mb-6">
        <button className={`tab ${tab === 'contracts' ? 'tab-active' : ''}`} onClick={() => setTab('contracts')}>Contrats</button>
        <button className={`tab ${tab === 'invoices' ? 'tab-active' : ''}`} onClick={() => setTab('invoices')}>Factures</button>
        <button className={`tab ${tab === 'expenses' ? 'tab-active' : ''}`} onClick={() => setTab('expenses')}>Dépenses</button>
        <button className={`tab ${tab === 'cash' ? 'tab-active' : ''}`} onClick={() => setTab('cash')}>Caisse</button>
      </div>

      {/* Tab Content — Contracts */}
      {tab === 'contracts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card flex items-center gap-4 flex-wrap" style={{ padding: '1rem 1.5rem' }}>
            <div style={{ position: 'relative', flex: '1 1 300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input className="input-field" style={{ paddingLeft: '2.4rem' }} placeholder={isAr ? 'بحث...' : 'Rechercher...'} value={cSearch} onChange={e => { setCSearch(e.target.value); setCPage(1); }} />
            </div>
            <div className="flex items-center gap-0 flex-wrap card-glass" style={{ padding: '2px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', flex: '1 1 300px', maxWidth: 'fit-content' }}>
              <div className="flex items-center gap-2 px-3 py-1 border-r border-border" style={{ minWidth: '140px' }}>
                <CalendarDays size={14} className="text-gold" />
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">{isAr ? 'من:' : 'De:'}</span>
                <input type="date" className="input-field border-none bg-transparent p-0" style={{ boxShadow: 'none', minHeight: 'auto', fontSize: '0.8rem' }} value={cDateS} onChange={e => { setCDateS(e.target.value); setCPage(1); }} />
              </div>
              <div className="flex items-center gap-2 px-3 py-1" style={{ minWidth: '140px' }}>
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">{isAr ? 'إلى:' : 'À:'}</span>
                <input type="date" className="input-field border-none bg-transparent p-0" style={{ boxShadow: 'none', minHeight: 'auto', fontSize: '0.8rem' }} value={cDateE} onChange={e => { setCDateE(e.target.value); setCPage(1); }} />
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-responsive">
              {loading ? <PageLoader /> : (
              <table className="data-table">
                <thead><tr>
                  <th className="cursor-pointer" onClick={() => mkSort(cSort,'contract_number',setCSort,()=>setCPage(1))}><div className="flex items-center gap-1">{isAr?'رقم العقد':'N° Contrat'} <ArrowUpDown size={13} className="opacity-40"/></div></th>
                  <th className="cursor-pointer" onClick={() => mkSort(cSort,'start_date',setCSort,()=>setCPage(1))}><div className="flex items-center gap-1">{isAr?'التاريخ':'Date'} <ArrowUpDown size={13} className="opacity-40"/></div></th>
                  <th>{isAr?'العميل':'Client'}</th>
                  <th className="cursor-pointer" onClick={() => mkSort(cSort,'total_ttc',setCSort,()=>setCPage(1))}><div className="flex items-center gap-1">Total <ArrowUpDown size={13} className="opacity-40"/></div></th>
                  <th>{isAr?'الحالة':'Statut'}</th>
                  <th>Actions</th>
                </tr></thead>
                <tbody>
                  {filteredC.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-secondary">{isAr?'لا توجد نتائج':'Aucun resultado'}</td></tr>}
                  {paginate(filteredC, cPage).map((c: any) => {
                    const hasInvoice = invoices.some(i => i.contract_id === c.id);
                    const clientName = isAr ? (c.clients?.full_name_ar || c.clients?.full_name) : c.clients?.full_name;
                    return (
                      <tr key={c.id} style={{ cursor: 'pointer' }}>
                        <td className="font-medium" style={{ color: 'var(--gold)' }} onClick={() => navigate(`/contracts/${c.id}`)}>{c.contract_number}</td>
                        <td className="text-secondary" onClick={() => navigate(`/contracts/${c.id}`)}>{c.start_date}</td>
                        <td onClick={() => navigate(`/contracts/${c.id}`)}>{clientName}</td>
                        <td className="font-semibold" onClick={() => navigate(`/contracts/${c.id}`)}>{(c.total_ttc||0).toLocaleString()} MAD</td>
                        <td onClick={() => navigate(`/contracts/${c.id}`)}><span className={`badge ${statusBadge[c.status]||'badge-secondary'}`}>{statusLabel[c.status]||c.status}</span></td>
                        <td><div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/contracts/${c.id}/print`)}><Download size={16}/></button>
                          {!hasInvoice && <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); handleGenerateInvoice(c); }}><Receipt size={14}/> Facturer</button>}
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
            {totalPages(filteredC) > 1 && (
              <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm text-secondary">{filteredC.length} résultats — Page {cPage}/{totalPages(filteredC)}</span>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-sm" disabled={cPage===1} onClick={() => setCPage(p=>p-1)}><ChevronLeft size={15}/></button>
                  <button className="btn btn-ghost btn-sm" disabled={cPage===totalPages(filteredC)} onClick={() => setCPage(p=>p+1)}><ChevronRight size={15}/></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content — Invoices */}
      {tab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card flex items-center gap-4 flex-wrap" style={{ padding: '1rem 1.5rem' }}>
            <div style={{ position: 'relative', flex: '1 1 300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input className="input-field" style={{ paddingLeft: '2.4rem' }} placeholder={isAr ? 'بحث...' : 'Rechercher...'} value={iSearch} onChange={e => { setISearch(e.target.value); setIPage(1); }} />
            </div>
            <div className="flex items-center gap-0 flex-wrap card-glass" style={{ padding: '2px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', flex: '1 1 300px', maxWidth: 'fit-content' }}>
              <div className="flex items-center gap-2 px-3 py-1 border-r border-border" style={{ minWidth: '140px' }}>
                <CalendarDays size={14} className="text-gold" />
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">{isAr ? 'من:' : 'De:'}</span>
                <input type="date" className="input-field border-none bg-transparent p-0" style={{ boxShadow: 'none', minHeight: 'auto', fontSize: '0.8rem' }} value={iDateS} onChange={e => { setIDateS(e.target.value); setIPage(1); }} />
              </div>
              <div className="flex items-center gap-2 px-3 py-1" style={{ minWidth: '140px' }}>
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">{isAr ? 'إلى:' : 'À:'}</span>
                <input type="date" className="input-field border-none bg-transparent p-0" style={{ boxShadow: 'none', minHeight: 'auto', fontSize: '0.8rem' }} value={iDateE} onChange={e => { setIDateE(e.target.value); setIPage(1); }} />
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-responsive">
              {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin text-primary" style={{ display: 'inline-block' }} /></div> : (
              <table className="data-table">
                <thead><tr>
                  <th className="cursor-pointer" onClick={() => mkSort(iSort,'invoice_number',setISort,()=>setIPage(1))}><div className="flex items-center gap-1">N° Facture <ArrowUpDown size={13} className="opacity-40"/></div></th>
                  <th>{isAr?'العميل':'Client'}</th>
                  <th>N° Contrat</th>
                  <th className="cursor-pointer" onClick={() => mkSort(iSort,'amount_ht',setISort,()=>setIPage(1))}><div className="flex items-center gap-1">HT <ArrowUpDown size={13} className="opacity-40"/></div></th>
                  <th>TVA (20%)</th>
                  <th className="cursor-pointer" onClick={() => mkSort(iSort,'amount_ttc',setISort,()=>setIPage(1))}><div className="flex items-center gap-1">TTC <ArrowUpDown size={13} className="opacity-40"/></div></th>
                  <th>Actions</th>
                </tr></thead>
                <tbody>
                  {filteredI.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-secondary">{isAr?'لا توجد نتائج':'Aucun résultat'}</td></tr>}
                  {paginate(filteredI, iPage).map((inv: any) => {
                    const clientName = isAr ? (inv.clients?.full_name_ar || inv.clients?.full_name) : inv.clients?.full_name;
                    return (
                      <tr key={inv.id}>
                        <td className="font-medium" style={{ color: 'var(--info)' }}>{inv.invoice_number}</td>
                        <td>{clientName}</td>
                        <td className="text-secondary">{inv.contracts?.contract_number || '—'}</td>
                        <td>{(inv.amount_ht||0).toLocaleString()} MAD</td>
                        <td style={{ color: 'var(--warning)' }}>{(inv.tva_amount||0).toLocaleString()} MAD</td>
                        <td className="font-bold">{(inv.amount_ttc||0).toLocaleString()} MAD</td>
                        <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/invoices/${inv.id}/print`)}><Download size={16}/></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
            {totalPages(filteredI) > 1 && (
              <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm text-secondary">{filteredI.length} résultats — Page {iPage}/{totalPages(filteredI)}</span>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-sm" disabled={iPage===1} onClick={() => setIPage(p=>p-1)}><ChevronLeft size={15}/></button>
                  <button className="btn btn-ghost btn-sm" disabled={iPage===totalPages(filteredI)} onClick={() => setIPage(p=>p+1)}><ChevronRight size={15}/></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content — Expenses */}
      {tab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card flex items-center gap-4 flex-wrap" style={{ padding: '1rem 1.5rem' }}>
            <div style={{ position: 'relative', flex: '1 1 300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input className="input-field" style={{ paddingLeft: '2.4rem' }} placeholder={isAr ? 'بحث...' : 'Rechercher...'} value={eSearch} onChange={e => { setESearch(e.target.value); setEPage(1); }} />
            </div>
            <div className="flex items-center gap-0 flex-wrap card-glass" style={{ padding: '2px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', flex: '1 1 300px', maxWidth: 'fit-content' }}>
              <div className="flex items-center gap-2 px-3 py-1 border-r border-border" style={{ minWidth: '140px' }}>
                <CalendarDays size={14} className="text-gold" />
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">{isAr ? 'من:' : 'De:'}</span>
                <input type="date" className="input-field border-none bg-transparent p-0" style={{ boxShadow: 'none', minHeight: 'auto', fontSize: '0.8rem' }} value={eDateS} onChange={e => { setEDateS(e.target.value); setEPage(1); }} />
              </div>
              <div className="flex items-center gap-2 px-3 py-1" style={{ minWidth: '140px' }}>
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">{isAr ? 'إلى:' : 'À:'}</span>
                <input type="date" className="input-field border-none bg-transparent p-0" style={{ boxShadow: 'none', minHeight: 'auto', fontSize: '0.8rem' }} value={eDateE} onChange={e => { setEDateE(e.target.value); setEPage(1); }} />
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-responsive">
              {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin text-primary" style={{ display: 'inline-block' }} /></div> : (
              <table className="data-table">
                <thead><tr>
                  <th className="cursor-pointer" onClick={() => mkSort(eSort,'description',setESort,()=>setEPage(1))}><div className="flex items-center gap-1">{isAr?'الوصف':'Description'} <ArrowUpDown size={13} className="opacity-40"/></div></th>
                  <th className="cursor-pointer" onClick={() => mkSort(eSort,'amount',setESort,()=>setEPage(1))}><div className="flex items-center gap-1">{isAr?'المبلغ':'Montant'} <ArrowUpDown size={13} className="opacity-40"/></div></th>
                  <th>{isAr?'طريقة الدفع':'Méthode'}</th>
                  <th className="cursor-pointer" onClick={() => mkSort(eSort,'transaction_date',setESort,()=>setEPage(1))}><div className="flex items-center gap-1">{isAr?'التاريخ':'Date'} <ArrowUpDown size={13} className="opacity-40"/></div></th>
                </tr></thead>
                <tbody>
                  {filteredE.length === 0 && <tr><td colSpan={4} className="text-center p-8 text-secondary">{isAr?'لا توجد نتائج':'Aucun résultat'}</td></tr>}
                  {paginate(filteredE, ePage).map((t: any) => (
                    <tr key={t.id}>
                      <td>{t.description || t.reference}</td>
                      <td className="font-semibold" style={{ color: 'var(--error)' }}>-{(t.amount||0).toLocaleString()} MAD</td>
                      <td>{t.payment_method || '—'}</td>
                      <td className="text-secondary">{t.transaction_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
            {totalPages(filteredE) > 1 && (
              <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm text-secondary">{filteredE.length} resultados — Page {ePage}/{totalPages(filteredE)}</span>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-sm" disabled={ePage===1} onClick={() => setEPage(p=>p-1)}><ChevronLeft size={15}/></button>
                  <button className="btn btn-ghost btn-sm" disabled={ePage===totalPages(filteredE)} onClick={() => setEPage(p=>p+1)}><ChevronRight size={15}/></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content — Cash/Caisse */}
      {tab === 'cash' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card flex items-center gap-4 flex-wrap" style={{ padding: '1rem 1.5rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input className="input-field" style={{ paddingLeft: '2.4rem' }} placeholder={isAr ? 'بحث...' : 'Rechercher...'} value={caSearch} onChange={e => { setCaSearch(e.target.value); setCaPage(1); }} />
            </div>
            <input type="date" className="input-field" style={{ width: 'auto' }} value={caisseStart} onChange={e => setCaisseStart(e.target.value)} />
            <input type="date" className="input-field" style={{ width: 'auto' }} value={caisseEnd} onChange={e => setCaisseEnd(e.target.value)} />
            {(caisseStart || caisseEnd) && <button className="btn btn-ghost btn-sm text-error" onClick={() => { setCaisseStart(''); setCaisseEnd(''); }}><X size={14}/> Effacer</button>}
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-responsive">
              {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin text-primary" style={{ display: 'inline-block' }} /></div> : (
              <table className="data-table">
                <thead><tr>
                  <th>{isAr?'الوصف':'Description'}</th>
                  <th>{isAr?'المبلغ':'Montant'}</th>
                  <th>{isAr?'طريقة الدفع':'Méthode'}</th>
                  <th>{isAr?'التاريخ':'Date'}</th>
                </tr></thead>
                <tbody>
                  {filteredCa.length === 0 && <tr><td colSpan={4} className="text-center p-8 text-secondary">{isAr?'لا توجد حركات':'Aucune transaction'}</td></tr>}
                  {paginate(filteredCa, caPage).map((t: any) => (
                    <tr key={t.id}>
                      <td>{t.description || t.reference || '—'}</td>
                      <td className="font-semibold" style={{ color: t.transaction_type === 'income' ? 'var(--success)' : 'var(--error)' }}>
                        {t.transaction_type === 'income' ? '+' : '-'}{(t.amount||0).toLocaleString()} MAD
                      </td>
                      <td><span className="flex items-center gap-2">
                        {t.payment_method === 'cash' ? <Banknote size={14}/> : t.payment_method === 'card' ? <CreditCard size={14}/> : <ArrowRightLeft size={14}/>}
                        {t.payment_method || '—'}
                      </span></td>
                      <td className="text-secondary">{t.transaction_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
            {totalPages(filteredCa) > 1 && (
              <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm text-secondary">{filteredCa.length} resultados — Page {caPage}/{totalPages(filteredCa)}</span>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-sm" disabled={caPage===1} onClick={() => setCaPage(p=>p-1)}><ChevronLeft size={15}/></button>
                  <button className="btn btn-ghost btn-sm" disabled={caPage===totalPages(filteredCa)} onClick={() => setCaPage(p=>p+1)}><ChevronRight size={15}/></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="page-actions mt-6">
        <button className="btn btn-outline px-8" onClick={() => setShowAddExpense(true)}>
          <Plus size={18} /> {isAr ? 'مصاريف' : 'Dépense'}
        </button>
      </div>

      {showAddExpense && (
        <div className="modal-overlay" onClick={() => setShowAddExpense(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="m-0">{isAr ? 'إضافة مصاريف' : 'Nouvelle Dépense'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowAddExpense(false)}><X size={20} /></button>
            </div>
            <div className="form-grid mt-4">
              <div className="input-group">
                <label className="input-label">{isAr ? 'الفئة' : 'Catégorie'}</label>
                <select className="input-field" value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                  <option value="Carburant">{isAr ? 'وقود' : 'Carburant (Gasolina)'}</option>
                  <option value="Réparations">{isAr ? 'إصلاحات' : 'Réparations'}</option>
                  <option value="Salaires">{isAr ? 'رواتب' : 'Salaires'}</option>
                  <option value="Loyer">{isAr ? 'كراء' : 'Loyer'}</option>
                  <option value="Amendes">{isAr ? 'مخالفات' : 'Amendes'}</option>
                  <option value="Autre">{isAr ? 'أخرى' : 'Autre'}</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'المبلغ' : 'Montant'} (MAD)</label>
                <input className="input-field" type="number" value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
              </div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">{isAr ? 'السيارة (اختياري)' : 'Véhicule (Optionnel)'}</label>
                <select className="input-field" value={expenseForm.vehicle_id}
                  onChange={e => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}>
                  <option value="">-- {isAr ? 'بدون سيارة' : 'Aucun véhicule'} --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">{isAr ? 'الوصف' : 'Description'}</label>
                <input className="input-field" value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowAddExpense(false)}>{isAr ? 'إلغاء' : 'Annuler'}</button>
              <button className="btn btn-primary" onClick={handleAddExpense}>{isAr ? 'حفظ' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
