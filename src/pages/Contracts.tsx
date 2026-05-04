import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronLeft, ChevronRight, Download, Printer, Search, ArrowUpDown, FileSpreadsheet, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './Contracts.css';
import PageLoader from '../components/layout/PageLoader';

const Contracts = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const lang = isAr ? 'ar' : 'fr';
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const contractsRes = await supabase
        .from('contracts')
        .select('*, clients (full_name, full_name_ar), vehicles (brand, model, plate)')
        .order('start_date', { ascending: false });

      if (contractsRes.error) throw contractsRes.error;

      setContracts(contractsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const statusLabels: Record<string, Record<string, string>> = {
    fr: { active: 'Actif', completed: 'Terminé', pending: 'En attente' },
    ar: { active: 'نشط', completed: 'مكتمل', pending: 'معلق' },
  };
  const statusBadge: Record<string, string> = {
    active: 'badge-success', completed: 'badge-secondary', pending: 'badge-warning',
  };

  // Filtering
  let filteredContracts = contracts.filter(c => {
    if (filterStartDate && c.start_date < filterStartDate) return false;
    if (filterEndDate && c.start_date > filterEndDate) return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const clientName = (c.clients?.full_name || '').toLowerCase();
      const vehicleName = (`${c.vehicles?.brand} ${c.vehicles?.model}`).toLowerCase();
      const contractNum = (c.contract_number || '').toLowerCase();
      const status = (statusLabels[lang][c.status] || c.status).toLowerCase();
      
      if (!clientName.includes(term) && !vehicleName.includes(term) && !contractNum.includes(term) && !status.includes(term)) {
        return false;
      }
    }
    return true;
  });

  // Sorting
  if (sortConfig.key && sortConfig.direction) {
    filteredContracts.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      
      if (sortConfig.key === 'contract_number') { valA = a.contract_number; valB = b.contract_number; }
      if (sortConfig.key === 'client') { valA = a.clients?.full_name || ''; valB = b.clients?.full_name || ''; }
      if (sortConfig.key === 'vehicle') { valA = `${a.vehicles?.brand} ${a.vehicles?.model}`; valB = `${b.vehicles?.brand} ${b.vehicles?.model}`; }
      if (sortConfig.key === 'start_date') { valA = a.start_date; valB = b.start_date; }
      if (sortConfig.key === 'end_date') { valA = a.end_date; valB = b.end_date; }
      if (sortConfig.key === 'total_ttc') { valA = a.total_ttc || 0; valB = b.total_ttc || 0; }
      if (sortConfig.key === 'status') { valA = statusLabels[lang][a.status] || a.status; valB = statusLabels[lang][b.status] || b.status; }
      
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / PAGE_SIZE));
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearch = (val: string) => { setSearchTerm(val); setCurrentPage(1); };
  const handleFilterStart = (val: string) => { setFilterStartDate(val); setCurrentPage(1); };
  const handleFilterEnd = (val: string) => { setFilterEndDate(val); setCurrentPage(1); };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Contrats');

    // Corporate Header
    worksheet.mergeCells('A1:G2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '201M RENT A CAR - RAPPORT DES CONTRATS';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1A1200' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9A84C' } };

    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow([
      'N° Contrat', 'Client', 'Véhicule', 'Début', 'Fin', 'Total (MAD)', 'Statut'
    ]);
    
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1200' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Data
    filteredContracts.forEach(c => {
      const row = worksheet.addRow([
        c.contract_number,
        isAr ? (c.clients?.full_name_ar || c.clients?.full_name) : c.clients?.full_name,
        `${c.vehicles?.brand} ${c.vehicles?.model}`,
        c.start_date,
        c.end_date,
        c.total_ttc || 0,
        statusLabels[lang][c.status] || c.status
      ]);
      row.getCell(6).numFmt = '#,##0.00 "MAD"';
    });

    worksheet.columns.forEach(column => { column.width = 20; });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Contrats_201M_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="contracts-page">
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Filters */}
        <div className="card flex items-center justify-between gap-4 flex-wrap no-print" style={{ padding: '1rem 1.5rem' }}>
          <div className="input-group" style={{ margin: 0, flex: 1, minWidth: '250px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} className="text-secondary" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                className="input-field" 
                style={{ paddingLeft: '2.8rem' }}
                placeholder={isAr ? 'ابحث عن عقد، عميل، سيارة...' : 'Rechercher un contrat, client, véhicule...'}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-secondary" />
              <span className="text-sm font-medium">{isAr ? 'من:' : 'De:'}</span>
              <input type="date" className="input-field py-2" value={filterStartDate} onChange={e => handleFilterStart(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{isAr ? 'إلى:' : 'À:'}</span>
              <input type="date" className="input-field py-2" value={filterEndDate} onChange={e => handleFilterEnd(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('contract_number')} className="cursor-pointer hover:bg-surface transition-colors">
                    <div className="flex items-center gap-1">{isAr ? 'رقم العقد' : 'N° Contrat'} <ArrowUpDown size={14} className="opacity-50" /></div>
                  </th>
                  <th onClick={() => handleSort('client')} className="cursor-pointer hover:bg-surface transition-colors">
                    <div className="flex items-center gap-1">{isAr ? 'العميل' : 'Client'} <ArrowUpDown size={14} className="opacity-50" /></div>
                  </th>
                  <th onClick={() => handleSort('vehicle')} className="cursor-pointer hover:bg-surface transition-colors hide-mobile">
                    <div className="flex items-center gap-1">{isAr ? 'السيارة' : 'Véhicule'} <ArrowUpDown size={14} className="opacity-50" /></div>
                  </th>
                  <th onClick={() => handleSort('start_date')} className="cursor-pointer hover:bg-surface transition-colors">
                    <div className="flex items-center gap-1">{isAr ? 'البداية' : 'Début'} <ArrowUpDown size={14} className="opacity-50" /></div>
                  </th>
                  <th onClick={() => handleSort('end_date')} className="cursor-pointer hover:bg-surface transition-colors hide-mobile">
                    <div className="flex items-center gap-1">{isAr ? 'النهاية' : 'Fin'} <ArrowUpDown size={14} className="opacity-50" /></div>
                  </th>
                  <th onClick={() => handleSort('total_ttc')} className="cursor-pointer hover:bg-surface transition-colors">
                    <div className="flex items-center gap-1">{isAr ? 'المجموع' : 'Total'} <ArrowUpDown size={14} className="opacity-50" /></div>
                  </th>
                  <th onClick={() => handleSort('status')} className="cursor-pointer hover:bg-surface transition-colors hide-mobile">
                    <div className="flex items-center gap-1">{isAr ? 'الحالة' : 'Statut'} <ArrowUpDown size={14} className="opacity-50" /></div>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center p-8"><PageLoader /></td></tr>
                ) : filteredContracts.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-8 text-secondary">{isAr ? 'لا توجد نتائج' : 'Aucun résultat trouvé'}</td></tr>
                ) : paginatedContracts.map(c => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/contracts/${c.id}`)}>
                    <td className="font-medium text-primary">{c.contract_number}</td>
                    <td>{isAr ? (c.clients?.full_name_ar || c.clients?.full_name) : c.clients?.full_name}</td>
                    <td className="hide-mobile">{c.vehicles?.brand} {c.vehicles?.model}</td>
                    <td className="text-secondary">{c.start_date}</td>
                    <td className="text-secondary hide-mobile">{c.end_date}</td>
                    <td className="font-semibold">{(c.total_ttc || 0).toLocaleString()} MAD</td>
                    <td className="hide-mobile"><span className={`badge ${statusBadge[c.status] || 'badge-secondary'} ${c.status === 'active' ? 'badge-pulse' : ''}`}>{statusLabels[lang][c.status] || c.status}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}/print`); }} title={isAr ? 'طباعة' : 'Imprimer'}><Printer size={16} /></button>
                        <button className="btn btn-ghost btn-sm hide-mobile" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}/print?action=download`); }} title={isAr ? 'تحميل PDF' : 'Télécharger PDF'}><Download size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <div className="text-sm text-secondary">
              {isAr
                ? `${filteredContracts.length} نتيجة — صفحة ${currentPage} من ${totalPages}`
                : `${filteredContracts.length} résultats — Page ${currentPage} sur ${totalPages}`}
            </div>
            <div className="flex items-center gap-1">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-secondary">...</span>
                  ) : (
                    <button
                      key={p}
                      className={`btn btn-sm ${currentPage === p ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setCurrentPage(p as number)}
                    >
                      {p}
                    </button>
                  )
                )
              }
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="page-actions">
        <button className="btn btn-outline px-8" onClick={exportToExcel}>
          <FileSpreadsheet size={18} /> {isAr ? 'تصدير' : 'Exporter Excel'}
        </button>
        <button className="btn btn-primary shadow-lg px-12 py-3 text-lg" onClick={() => navigate('/contracts/new')}>
          <Plus size={18} /> {t('contracts.new_contract')}
        </button>
      </div>
    </div>
  );
};

export default Contracts;
