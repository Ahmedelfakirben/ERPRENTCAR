import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Download, TrendingUp, TrendingDown, Wallet,
  CreditCard, Banknote, ArrowRightLeft, Receipt, Loader2, X, Search, ChevronLeft, ChevronRight, ArrowUpDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Finance.css';
import { useNavigate } from 'react-router-dom';
import PageLoader from '../components/layout/PageLoader';

const Finance = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [tab, setTab] = useState<'contracts' | 'invoices' | 'expenses' | 'cash'>('contracts');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real data from Supabase
  const [transactions, setTransactions] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  
  const [kpiMonth, setKpiMonth] = useState('');
  const [caisseStart, setCaisseStart] = useState('');
  const [caisseEnd, setCaisseEnd] = useState('');

  // Per-tab filter states
  const PAGE_SIZE = 20;
  const [cSearch, setCSearch] = useState(''); const [cDateS, setCDateS] = useState(''); const [cDateE, setCDateE] = useState(''); const [cSort, setCSort] = useState({key:'',dir:''}); const [cPage, setCPage] = useState(1);
  const [iSearch, setISearch] = useState(''); const [iDateS, setIDateS] = useState(''); const [iDateE, setIDateE] = useState(''); const [iSort, setISort] = useState({key:'',dir:''}); const [iPage, setIPage] = useState(1);
  const [eSearch, setESearch] = useState(''); const [eDateS, setEDateS] = useState(''); const [eDateE, setEDateE] = useState(''); const [eSort, setESort] = useState({key:'',dir:''}); const [ePage, setEPage] = useState(1);
  const [caSearch, setCaSearch] = useState(''); const [caPage, setCaPage] = useState(1);

  // Form state for new expense
  const [expenseForm, setExpenseForm] = useState({ category: 'Réparations', amount: '', description: '', vehicle_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Transactions (income + expenses)
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

      // Recent contracts
      const { data: cData, error: cError } = await supabase
        .from('contracts')
        .select('*, clients(full_name, full_name_ar)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (cError) throw cError;
      setContracts(cData || []);

      // Invoices
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select('*, clients(full_name, full_name_ar), contracts(contract_number)')
        .order('created_at', { ascending: false });
      if (invError) throw invError;
      setInvoices(invData || []);

      // Vehicles for expenses
      const { data: vData } = await supabase.from('vehicles').select('id, plate, brand, model');
      setVehicles(vData || []);
    } catch (err) {
      console.error('Finance fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    const amountNum = parseFloat(expenseForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
       alert(isAr ? 'يرجى إدخال مبلغ صحيح' : 'Veuillez entrer un montant valide');
       return;
    }

    try {
      const payload: any = {
        transaction_type: 'expense',
        description: expenseForm.description || expenseForm.category,
        amount: amountNum,
        category: expenseForm.category,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash'
      };
      if (expenseForm.vehicle_id) payload.vehicle_id = expenseForm.vehicle_id;

      const { error } = await supabase.from('transactions').insert([payload]);
      if (error) throw error;
      setShowAddExpense(false);
      setExpenseForm({ category: 'Réparations', amount: '', description: '', vehicle_id: '' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(isAr ? 'حدث خطأ أثناء الحفظ' : 'Erreur lors de l\'enregistrement: ' + err.message);
    }
  };

  const handleGenerateInvoice = async (contract: any) => {
    try {
      const { data: invCount } = await supabase.from('invoices').select('id', { count: 'exact' });
      const nextNum = (invCount?.length || 0) + 1;
      const invoiceNumber = `FAC-${new Date().getFullYear()}-${nextNum.toString().padStart(3, '0')}`;

      // Per user request: contract total becomes HT
      const amount_ht = contract.total_ttc || 0;
      const tva_rate = 20;
      const tva_amount = amount_ht * (tva_rate / 100);
      const amount_ttc = amount_ht + tva_amount;

      const { error } = await supabase.from('invoices').insert([{
        invoice_number: invoiceNumber,
        contract_id: contract.id,
        client_id: contract.client_id,
        amount_ht,
        tva_rate,
        tva_amount,
        amount_ttc,
        status: 'paid',
        issued_at: new Date().toISOString().split('T')[0]
      }]);
      
      if (error) throw error;
      alert(isAr ? 'تم إنشاء الفاتورة بنجاح' : 'Facture générée avec succès !');
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(isAr ? 'حدث خطأ أثناء إنشاء الفاتورة' : 'Erreur lors de la génération de la facture: ' + err.message);
    }
  };

  const expenseTransactions = transactions.filter((t: any) => t.transaction_type === 'expense');

  // KPI Calculations
  const filteredKpiTxs = kpiMonth 
    ? transactions.filter(t => t.transaction_date && t.transaction_date.startsWith(kpiMonth))
    : transactions;
  
  const kpiRevenue = filteredKpiTxs.filter((t: any) => t.transaction_type === 'income').reduce((a: number, t: any) => a + (t.amount || 0), 0);
  const kpiExpenses = filteredKpiTxs.filter((t: any) => t.transaction_type === 'expense').reduce((a: number, t: any) => a + (t.amount || 0), 0);
  const kpiNet = kpiRevenue - kpiExpenses;

  // Caisse Filters
  const filteredCaisseTxs = transactions.filter(t => {
    if (caisseStart && t.transaction_date < caisseStart) return false;
    if (caisseEnd && t.transaction_date > caisseEnd) return false;
    return true;
  });

  const statusLabel: Record<string, string> = {
    active:    isAr ? 'نشط'    : 'En cours',
    completed: isAr ? 'مدفوع'  : 'Payé',
    pending:   isAr ? 'معلق'   : 'En attente',
    paid:      isAr ? 'مدفوع'  : 'Payée',
  };
  const statusBadge: Record<string, string> = {
    active: 'badge-primary', completed: 'badge-success', pending: 'badge-warning', paid: 'badge-success'
  };

  // Helper: sort array by key
  const applySort = (arr: any[], sort: {key:string,dir:string}) => {
    if (!sort.key || !sort.dir) return arr;
    return [...arr].sort((a, b) => {
      const va = a[sort.key] ?? ''; const vb = b[sort.key] ?? '';
      return sort.dir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
  };
  const mkSort = (cur: {key:string,dir:string}, key: string, set: (s:{key:string,dir:string})=>void, resetPage: ()=>void) => {
    let dir = 'asc';
    if (cur.key === key && cur.dir === 'asc') dir = 'desc';
    if (cur.key === key && cur.dir === 'desc') { set({key:'',dir:''}); resetPage(); return; }
    set({key, dir}); resetPage();
  };
  const paginate = (arr: any[], page: number) => arr.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = (arr: any[]) => Math.max(1, Math.ceil(arr.length / PAGE_SIZE));

  // Contracts tab filtered
  const filteredC = applySort(contracts.filter(c => {
    if (cDateS && c.start_date < cDateS) return false;
    if (cDateE && c.start_date > cDateE) return false;
    if (cSearch) {
      const t = cSearch.toLowerCase();
      const cn = (c.clients?.full_name||'').toLowerCase();
      const num = (c.contract_number||'').toLowerCase();
      if (!cn.includes(t) && !num.includes(t)) return false;
    }
    return true;
  }), cSort);

  // Invoices tab filtered
  const filteredI = applySort(invoices.filter(inv => {
    if (iDateS && (inv.created_at||'').slice(0,10) < iDateS) return false;
    if (iDateE && (inv.created_at||'').slice(0,10) > iDateE) return false;
    if (iSearch) {
      const t = iSearch.toLowerCase();
      const cn = (inv.clients?.full_name||'').toLowerCase();
      const num = (inv.invoice_number||'').toLowerCase();
      if (!cn.includes(t) && !num.includes(t)) return false;
    }
    return true;
  }), iSort);

  // Expenses tab filtered
  const filteredE = applySort(expenseTransactions.filter(tx => {
    if (eDateS && tx.transaction_date < eDateS) return false;
    if (eDateE && tx.transaction_date > eDateE) return false;
    if (eSearch) {
      const t = eSearch.toLowerCase();
      const desc = (tx.description||tx.reference||'').toLowerCase();
      const meth = (tx.payment_method||'').toLowerCase();
      if (!desc.includes(t) && !meth.includes(t)) return false;
    }
    return true;
  }), eSort);

  // Caisse filtered
  const filteredCa = filteredCaisseTxs.filter(tx => {
    if (!caSearch) return true;
    const t = caSearch.toLowerCase();
    return (tx.description||tx.reference||'').toLowerCase().includes(t) || (tx.payment_method||'').toLowerCase().includes(t);
  });

  return (
    <>
    <div className="finance-page">
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* KPI Summary */}
      <div className="flex justify-between items-center mb-1">
         <h3 className="m-0 text-lg font-bold text-secondary">{isAr ? 'نظرة عامة' : 'Aperçu Global'}</h3>
         <input 
           type="month" 
           className="input-field" 
           value={kpiMonth} 
           onChange={e => setKpiMonth(e.target.value)} 
           style={{ width: 'auto', padding: '0.4rem 0.8rem' }} 
         />
      </div>
      <div className="finance-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-emerald"><TrendingUp size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">{isAr ? 'الدخل' : 'Revenus'}</span>
            <span className="kpi-value">{kpiRevenue.toLocaleString()} <small>MAD</small></span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-red"><TrendingDown size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">{isAr ? 'المصاريف' : 'Dépenses'}</span>
            <span className="kpi-value">{kpiExpenses.toLocaleString()} <small>MAD</small></span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-indigo"><Wallet size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">{isAr ? 'صافي الربح' : 'Bénéfice Net'}</span>
            <span className="kpi-value">{kpiNet.toLocaleString()} <small>MAD</small></span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab ${tab === 'contracts' ? 'tab-active' : ''}`} onClick={() => setTab('contracts')}>
          {isAr ? 'العقود' : 'Contrats'}
        </button>
        <button className={`tab ${tab === 'invoices' ? 'tab-active' : ''}`} onClick={() => setTab('invoices')}>
          {isAr ? 'الفواتير' : 'Factures'}
        </button>
        <button className={`tab ${tab === 'expenses' ? 'tab-active' : ''}`} onClick={() => setTab('expenses')}>
          {isAr ? 'المصاريف' : 'Dépenses'}
        </button>
        <button className={`tab ${tab === 'cash' ? 'tab-active' : ''}`} onClick={() => setTab('cash')}>
          {isAr ? 'الصندوق' : 'Caisse'}
        </button>
      </div>

      {/* Tab Content — Contracts */}
      {tab === 'contracts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card flex items-center gap-4 flex-wrap" style={{ padding: '1rem 1.5rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input className="input-field" style={{ paddingLeft: '2.4rem' }} placeholder={isAr ? 'بحث...' : 'Rechercher...'} value={cSearch} onChange={e => { setCSearch(e.target.value); setCPage(1); }} />
            </div>
            <input type="date" className="input-field" style={{ width: 'auto' }} value={cDateS} onChange={e => { setCDateS(e.target.value); setCPage(1); }} />
            <input type="date" className="input-field" style={{ width: 'auto' }} value={cDateE} onChange={e => { setCDateE(e.target.value); setCPage(1); }} />
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                {filteredC.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-secondary">{isAr?'لا توجد نتائج':'Aucun résultat'}</td></tr>}
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
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input className="input-field" style={{ paddingLeft: '2.4rem' }} placeholder={isAr ? 'بحث...' : 'Rechercher...'} value={iSearch} onChange={e => { setISearch(e.target.value); setIPage(1); }} />
            </div>
            <input type="date" className="input-field" style={{ width: 'auto' }} value={iDateS} onChange={e => { setIDateS(e.target.value); setIPage(1); }} />
            <input type="date" className="input-field" style={{ width: 'auto' }} value={iDateE} onChange={e => { setIDateE(e.target.value); setIPage(1); }} />
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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

      {tab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card flex items-center gap-4 flex-wrap" style={{ padding: '1rem 1.5rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input className="input-field" style={{ paddingLeft: '2.4rem' }} placeholder={isAr ? 'بحث...' : 'Rechercher...'} value={eSearch} onChange={e => { setESearch(e.target.value); setEPage(1); }} />
            </div>
            <input type="date" className="input-field" style={{ width: 'auto' }} value={eDateS} onChange={e => { setEDateS(e.target.value); setEPage(1); }} />
            <input type="date" className="input-field" style={{ width: 'auto' }} value={eDateE} onChange={e => { setEDateE(e.target.value); setEPage(1); }} />
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
            {totalPages(filteredE) > 1 && (
              <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm text-secondary">{filteredE.length} résultats — Page {ePage}/{totalPages(filteredE)}</span>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-sm" disabled={ePage===1} onClick={() => setEPage(p=>p-1)}><ChevronLeft size={15}/></button>
                  <button className="btn btn-ghost btn-sm" disabled={ePage===totalPages(filteredE)} onClick={() => setEPage(p=>p+1)}><ChevronRight size={15}/></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
            {totalPages(filteredCa) > 1 && (
              <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm text-secondary">{filteredCa.length} résultats — Page {caPage}/{totalPages(filteredCa)}</span>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-sm" disabled={caPage===1} onClick={() => setCaPage(p=>p-1)}><ChevronLeft size={15}/></button>
                  <button className="btn btn-ghost btn-sm" disabled={caPage===totalPages(filteredCa)} onClick={() => setCaPage(p=>p+1)}><ChevronRight size={15}/></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      <div className="page-actions">
        <button className="btn btn-outline px-8" onClick={() => setShowAddExpense(true)}>
          <Plus size={18} /> {isAr ? 'مصاريف' : 'Dépense'}
        </button>
      </div>
    </div>

    {showAddExpense && (
      <div className="modal-overlay" onClick={() => setShowAddExpense(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="m-0">{isAr ? 'إضافة مصاريف' : 'Nouvelle Dépense'}</h3>
            <button className="btn btn-ghost" onClick={() => setShowAddExpense(false)}><X size={20} /></button>
          </div>
            <div className="form-grid">
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
  </>
);
};

export default Finance;
