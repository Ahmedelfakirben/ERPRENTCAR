import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Car, 
  Printer, FileText, ChevronRight,
  Activity, ArrowLeft
} from 'lucide-react';
import './Reports.css';
import PageLoader from '../components/layout/PageLoader';
import Logo201M from '../components/layout/Logo201M';

const Reports = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'global' | 'vehicles'>('global');
  
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  
  const [isPrinting, setIsPrinting] = useState(false);

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, cRes, tRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('contracts').select('id, vehicle_id, start_date, total_ttc, contract_number'),
        supabase.from('transactions').select('*')
      ]);
      setVehicles(vRes.data || []);
      setContracts(cRes.data || []);
      setTransactions(tRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthsPassed = (start: string) => {
    if (!start) return 0;
    const sDate = new Date(start);
    const eDate = new Date();
    const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  };

  const getFilteredData = (data: any[], preferredField: string) => {
    return data.filter(item => {
      const val = item[preferredField] || item.transaction_date || item.start_date || item.created_at;
      if (!val) return false;
      
      const itemDate = new Date(val);
      const itemYear = itemDate.getFullYear().toString();
      const itemMonth = (itemDate.getMonth() + 1).toString();

      const yearMatch = selectedYear === 'all' || itemYear === selectedYear;
      const monthMatch = selectedMonth === 'all' || itemMonth === selectedMonth;

      return yearMatch && monthMatch;
    });
  };

  const getVehicleStats = (vId: string) => {
    const v = vehicles.find(v => v.id === vId);
    if (!v) return null;

    // Filtramos los contratos por fecha de ENTREGA (Check-in / Start Date)
    const vContracts = getFilteredData(contracts.filter(c => c.vehicle_id === vId), 'start_date');
    const vTransactions = getFilteredData(transactions.filter(t => t.vehicle_id === vId && t.transaction_type === 'expense'), 'transaction_date');

    const revenue = vContracts.reduce((sum, c) => sum + (Number(c.total_ttc) || 0), 0);
    const operationalExpenses = vTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Cálculo de gastos de financiación (préstamo)
    let financingExpenses = 0;
    if (selectedMonth === 'all') {
      const months = selectedYear === 'all' ? calculateMonthsPassed(v.loan_start_date) : 12;
      financingExpenses = months * (Number(v.monthly_payment_amount) || 0);
    } else {
      financingExpenses = Number(v.monthly_payment_amount) || 0;
    }

    const totalExpenses = operationalExpenses + financingExpenses;
    const realProfit = revenue - totalExpenses;

    return {
      revenue,
      operationalExpenses,
      financingExpenses,
      totalExpenses,
      realProfit,
      vContracts,
      vTransactions
    };
  };

  const globalStats = () => {
    let totalRev = 0;
    let totalOpExp = 0;
    let totalFinExp = 0;

    vehicles.forEach(v => {
      const stats = getVehicleStats(v.id);
      if (stats) {
        totalRev += stats.revenue;
        totalOpExp += stats.operationalExpenses;
        totalFinExp += stats.financingExpenses;
      }
    });

    const generalTransactions = getFilteredData(transactions.filter(t => !t.vehicle_id && t.transaction_type === 'expense'), 'transaction_date');
    const generalExpenses = generalTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const globalExpenses = totalOpExp + totalFinExp + generalExpenses;
    const globalProfit = totalRev - globalExpenses;

    return { totalRev, totalOpExp, totalFinExp, generalExpenses, globalExpenses, globalProfit };
  };

  const stats = globalStats();

  const chartData = vehicles.map(v => {
    const s = getVehicleStats(v.id);
    return {
      name: `${v.brand} ${v.plate}`,
      Revenus: s?.revenue || 0,
      Dépenses: s?.totalExpenses || 0,
      Profit: s?.realProfit || 0
    };
  }).sort((a, b) => b.Profit - a.Profit).slice(0, 10);

  const handlePrint = () => {
    setIsPrinting(true);
    // Esperamos a que React renderice el modo impresión
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  if (loading) return <PageLoader />;

  // MODO REPORTE (IMPRESIÓN)
  if (isPrinting) {
    return (
      <div className="professional-report-mode animate-fade-in">
        <div className="report-container-v3">
          <header className="report-header-v2">
            <Logo201M size="lg" variant="default" />
            <div className="report-title">
              <h1>{isAr ? 'تقرير الحالة المالية' : 'BILAN FINANCIER'}</h1>
              <div className="report-meta">
                <p>{isAr ? 'تاريخ الاستخراج:' : 'Généré le:'} {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                <p className="font-bold uppercase" style={{ color: '#FF6B00' }}>
                  {selectedVehicle ? `VÉHICULE: ${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plate})` : 'SITUATION GLOBALE DE LA FLOTTE'}
                </p>
              </div>
            </div>
          </header>

          <section className="report-grid-v2">
            <div className="report-stat-v2">
              <span>{isAr ? 'إجمالي الإيرادات' : 'REVENUS TOTAUX'}</span>
              <h4 style={{ color: '#10B981' }}>{selectedVehicle ? getVehicleStats(selectedVehicle.id)?.revenue.toLocaleString() : stats.totalRev.toLocaleString()} MAD</h4>
            </div>
            <div className="report-stat-v2">
              <span>{isAr ? 'إجمالي المصاريف' : 'DÉPENSES TOTALES'}</span>
              <h4 style={{ color: '#EF4444' }}>{selectedVehicle ? getVehicleStats(selectedVehicle.id)?.totalExpenses.toLocaleString() : stats.globalExpenses.toLocaleString()} MAD</h4>
            </div>
            <div className="report-stat-v2 profit">
              <span>{isAr ? 'صافي الربح' : 'BÉNÉFICE NET'}</span>
              <h4>{selectedVehicle ? getVehicleStats(selectedVehicle.id)?.realProfit.toLocaleString() : stats.globalProfit.toLocaleString()} MAD</h4>
            </div>
          </section>

          {!selectedVehicle ? (
            <section className="report-tables">
              <h3 className="font-bold text-xl mb-6 uppercase border-b-2 pb-2">Top Performance de la Flotte</h3>
              <table className="report-table-v2">
                <thead>
                  <tr>
                    <th>VÉHICULE</th>
                    <th style={{ textAlign: 'right' }}>REVENUS</th>
                    <th style={{ textAlign: 'right' }}>DÉPENSES</th>
                    <th style={{ textAlign: 'right' }}>PROFIT NET</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((d, i) => (
                    <tr key={i}>
                      <td className="font-bold">{d.name}</td>
                      <td style={{ textAlign: 'right' }}>{d.Revenus.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>{d.Dépenses.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: '900' }}>{d.Profit.toLocaleString()} MAD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : (
            <section className="report-tables">
              {(() => {
                const s = getVehicleStats(selectedVehicle.id);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2cm' }}>
                    <div>
                      <h3 className="font-bold mb-4 uppercase border-b pb-2 text-success">Détails des Revenus</h3>
                      <table className="report-table-v2">
                        <thead>
                          <tr>
                            <th>DATE</th>
                            <th style={{ textAlign: 'right' }}>MONTANT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s?.vContracts.map((c: any, i: number) => (
                            <tr key={i}>
                              <td>{c.start_date}</td>
                              <td style={{ textAlign: 'right' }}>{c.total_ttc.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h3 className="font-bold mb-4 uppercase border-b pb-2 text-error">Détails des Dépenses</h3>
                      <table className="report-table-v2">
                        <thead>
                          <tr>
                            <th>CATÉGORIE / DESC.</th>
                            <th style={{ textAlign: 'right' }}>MONTANT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s?.vTransactions.map((t: any, i: number) => (
                            <tr key={i}>
                              <td>{t.category} - {t.description}</td>
                              <td style={{ textAlign: 'right' }}>{t.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                          {s && s.financingExpenses > 0 && (
                            <tr style={{ background: '#fcf8e3' }}>
                              <td>Frais de Financement (Crédit)</td>
                              <td style={{ textAlign: 'right' }}>{s.financingExpenses.toLocaleString()}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </section>
          )}

          <footer className="report-footer-v2">
            <div className="sig-box">
              <p>DIRECTION GÉNÉRALE</p>
              <div className="sig-line">Signature & Cachet</div>
            </div>
            <div className="sig-box">
              <p>DÉPARTEMENT COMPTABILITÉ</p>
              <div className="sig-line">Signature</div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // MODO PANTALLA (DASHBOARD)
  return (
    <div className="reports-page animate-fade-in">
      <header className="reports-header">
        <div>
          <h1 className="text-3xl font-black">{isAr ? 'التقارير' : 'Rapports Financiers'}</h1>
          <p className="text-secondary">{isAr ? 'تحليل الربحية والأداء' : 'Analyse de rentabilité et performance'}</p>
        </div>
        <div className="flex items-center gap-4 no-print">
          {/* Nuevo Selector de Año y Mes */}
          <div className="flex items-center gap-2 bg-surface-2 p-2 rounded-2xl border">
            <select 
              className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">{isAr ? 'كل السنوات' : 'Toutes les années'}</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
            <div className="w-px h-4 bg-border"></div>
            <select 
              className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">{isAr ? 'كل الشهور' : 'Tous les mois'}</option>
              <option value="1">{isAr ? 'يناير' : 'Janvier'}</option>
              <option value="2">{isAr ? 'فبراير' : 'Février'}</option>
              <option value="3">{isAr ? 'مارس' : 'Mars'}</option>
              <option value="4">{isAr ? 'أبريل' : 'Avril'}</option>
              <option value="5">{isAr ? 'مايو' : 'Mai'}</option>
              <option value="6">{isAr ? 'يونيو' : 'Juin'}</option>
              <option value="7">{isAr ? 'يوليو' : 'Juillet'}</option>
              <option value="8">{isAr ? 'أغسطس' : 'Août'}</option>
              <option value="9">{isAr ? 'سبتمبر' : 'Septembre'}</option>
              <option value="10">{isAr ? 'أكتوبر' : 'Octobre'}</option>
              <option value="11">{isAr ? 'نوفمبر' : 'Novembre'}</option>
              <option value="12">{isAr ? 'ديسمبر' : 'Décembre'}</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} /> {isAr ? 'طباعة PDF' : 'Imprimer PDF'}
          </button>
        </div>
      </header>

      <nav className="reports-nav">
        <button className={`nav-btn ${tab === 'global' ? 'active' : ''}`} onClick={() => { setTab('global'); setSelectedVehicle(null); }}>
          <Activity size={18} /> {isAr ? 'الوضع العام' : 'Situation Globale'}
        </button>
        <button className={`nav-btn ${tab === 'vehicles' ? 'active' : ''}`} onClick={() => setTab('vehicles')}>
          <Car size={18} /> {isAr ? 'السيارات' : 'Analyse par Véhicule'}
        </button>
      </nav>

      {tab === 'global' ? (
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card-v2 success">
              <p>{isAr ? 'إجمالي الإيرادات' : 'Revenus Totaux'}</p>
              <h2>{stats.totalRev.toLocaleString()} MAD</h2>
            </div>
            <div className="stat-card-v2 error">
              <p>{isAr ? 'إجمالي المصاريف' : 'Dépenses Totales'}</p>
              <h2>{stats.globalExpenses.toLocaleString()} MAD</h2>
            </div>
            <div className="stat-card-v2 gold">
              <p>{isAr ? 'صافي الربح' : 'Bénéfice Net'}</p>
              <h2>{stats.globalProfit.toLocaleString()} MAD</h2>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-container-v2 card">
              <h3 className="flex items-center gap-2"><TrendingUp className="text-success" /> {isAr ? 'أفضل السيارات ربحاً' : 'Top Véhicules Rentables'}</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="Profit" fill="#FF6B00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="chart-container-v2 card">
              <h3 className="flex items-center gap-2"><Activity className="text-primary" /> {isAr ? 'الإيرادات مقابل المصاريف' : 'Revenus vs Dépenses'}</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="Revenus" stroke="#10B981" fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="Dépenses" stroke="#EF4444" fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="vehicles-content">
          {!selectedVehicle ? (
            <div className="vehicle-grid-v2">
              {vehicles.map(v => {
                const s = getVehicleStats(v.id);
                return (
                  <div key={v.id} className="vehicle-card-v2" onClick={() => setSelectedVehicle(v)}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-4 items-center">
                        <div className="v-thumb bg-surface-2 rounded-xl overflow-hidden border w-20 h-20 flex-shrink-0">
                          {v.image_url ? (
                            <img src={v.image_url} alt={v.brand} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gold opacity-50"><Car size={24} /></div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{v.brand} {v.model}</h4>
                          <span className="badge badge-outline mt-1">{v.plate}</span>
                        </div>
                      </div>
                      <ChevronRight className="text-secondary" />
                    </div>
                    <div className="mt-6 flex justify-between items-end">
                      <div>
                        <p className="text-xs text-secondary mb-1">{isAr ? 'صافي الربح' : 'Profit Net'}</p>
                        <span className={`text-xl font-black ${s && s.realProfit >= 0 ? 'text-success' : 'text-error'}`}>
                          {s?.realProfit.toLocaleString()} MAD
                        </span>
                      </div>
                      <div className="v-mini-chart bg-surface-2 p-2 rounded-lg">
                        <TrendingUp size={16} className={s && s.realProfit >= 0 ? 'text-success' : 'text-error'} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="vehicle-detail-view animate-fade-in">
              <header className="detail-header no-print">
                <button className="btn btn-ghost flex items-center gap-2" onClick={() => setSelectedVehicle(null)}>
                  <ArrowLeft size={18} /> {isAr ? 'العودة للقائمة' : 'Retour à la liste'}
                </button>
              </header>

              {(() => {
                const s = getVehicleStats(selectedVehicle.id);
                return (
                  <div className="report-main-grid mt-6">
                    {/* COLUMNA IZQUIERDA: Info y KPIs */}
                    <aside className="report-sidebar">
                      <div className="card p-8 sticky-top">
                        <div className="v-hero-info mb-8">
                          <div className="v-avatar-xl bg-surface-2 overflow-hidden border">
                            {selectedVehicle.image_url ? (
                              <img 
                                src={selectedVehicle.image_url} 
                                alt={selectedVehicle.brand} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Car size={48} className="text-gold" />
                            )}
                          </div>
                          <h2 className="text-3xl font-black">{selectedVehicle.brand} {selectedVehicle.model}</h2>
                          <span className="badge badge-primary text-lg mt-2 px-4 py-1">{selectedVehicle.plate}</span>
                        </div>

                        <div className="v-kpi-stack">
                          <div className="kpi-item-v2">
                            <div className="kpi-icon bg-success-light text-success"><TrendingUp size={20} /></div>
                            <div className="kpi-data">
                              <p>{isAr ? 'الإيرادات' : 'Revenus'}</p>
                              <h4 className="text-success">+{s?.revenue.toLocaleString()} MAD</h4>
                            </div>
                          </div>
                          <div className="kpi-item-v2">
                            <div className="kpi-icon bg-error-light text-error"><TrendingDown size={20} /></div>
                            <div className="kpi-data">
                              <p>{isAr ? 'المصاريف' : 'Dépenses'}</p>
                              <h4 className="text-error">-{s?.totalExpenses.toLocaleString()} MAD</h4>
                            </div>
                          </div>
                          <div className="kpi-item-v2 profit-kpi">
                            <div className="kpi-icon bg-white text-gold"><DollarSign size={20} /></div>
                            <div className="kpi-data">
                              <p className="text-white opacity-80">{isAr ? 'صافي الربح' : 'Profit Net'}</p>
                              <h4 className="text-white font-black">{s?.realProfit.toLocaleString()} MAD</h4>
                            </div>
                          </div>
                        </div>
                      </div>
                    </aside>

                    {/* COLUMNA DERECHA: Detalles Tabulares */}
                    <main className="report-details-area">
                      <div className="card p-8">
                        <div className="section-title mb-8">
                          <h3 className="flex items-center gap-3 text-xl font-bold">
                            <FileText className="text-gold" size={24} /> 
                            {isAr ? 'تفاصيل العقود والإيرادات' : 'Détails des Contrats & Revenus'}
                          </h3>
                        </div>
                        <div className="table-modern-wrap">
                          <table className="w-full">
                            <thead>
                              <tr>
                                <th>{isAr ? 'رقم العقد' : 'Nº Contrat'}</th>
                                <th>{isAr ? 'التاريخ' : 'Date'}</th>
                                <th className="text-right">{isAr ? 'المبلغ' : 'Montant'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s?.vContracts.map((c: any) => (
                                <tr key={c.id}>
                                  <td className="font-mono text-primary">{c.contract_number || 'CON-'+c.id.slice(0,4)}</td>
                                  <td className="text-secondary">{c.start_date}</td>
                                  <td className="text-right font-black text-success">+{c.total_ttc.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="card p-8">
                        <div className="section-title mb-8">
                          <h3 className="flex items-center gap-3 text-xl font-bold">
                            <TrendingDown className="text-error" size={24} /> 
                            {isAr ? 'تفاصيل المصاريف التشغيلية' : 'Détails des Dépenses Opérationnelles'}
                          </h3>
                        </div>
                        <div className="table-modern-wrap">
                          <table className="w-full">
                            <thead>
                              <tr>
                                <th>{isAr ? 'الفئة' : 'Catégorie'}</th>
                                <th>{isAr ? 'الوصف' : 'Description'}</th>
                                <th className="text-right">{isAr ? 'المبلغ' : 'Montant'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s?.vTransactions.map((t: any) => (
                                <tr key={t.id}>
                                  <td><span className="badge badge-warning">{t.category}</span></td>
                                  <td className="text-secondary text-sm">{t.description}</td>
                                  <td className="text-right font-black text-error">-{t.amount.toLocaleString()}</td>
                                </tr>
                              ))}
                              {s && s.financingExpenses > 0 && (
                                <tr className="bg-surface-2 font-bold">
                                  <td colSpan={2}>{isAr ? 'مصاريف التمويل (قرض السيارة)' : 'Frais de Financement (Crédit)'}</td>
                                  <td className="text-right text-error">-{s.financingExpenses.toLocaleString()} MAD</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </main>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
