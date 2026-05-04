import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Eye, History, Loader2, X, User, Phone, Mail, CreditCard, Award, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportToCSV } from '../utils/exportUtils';
import './Clients.css';



const Clients = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    full_name_ar: '',
    phone: '',
    email: '',
    cin: '',
    passport: '',
    driver_license: '',
    license_delivery_date: '',
    birth_date: '',
    birth_place: '',
    nationality: 'Marocaine',
    address: '',
    license_expiry_date: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    try {
      const payload = {
        ...formData,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        birth_date: formData.birth_date || null,
        license_delivery_date: formData.license_delivery_date || null,
        license_expiry_date: formData.license_expiry_date || null
      };

      const { error } = await supabase
        .from('clients')
        .insert([payload]);

      if (error) throw error;
      setShowAdd(false);
      setFormData({
        first_name: '', last_name: '', full_name_ar: '', phone: '', email: '',
        cin: '', passport: '', driver_license: '', license_delivery_date: '',
        birth_date: '', birth_place: '', nationality: 'Marocaine', address: '',
        license_expiry_date: ''
      });
      fetchClients();
    } catch (err) {
      console.error('Error adding client:', err);
      alert('Error adding client');
    }
  };

  const filtered = clients.filter(c => {
    const name = (isAr ? (c.full_name_ar || c.full_name) : c.full_name) || '';
    return name.toLowerCase().includes(search.toLowerCase()) || 
           (c.cin || '').toLowerCase().includes(search.toLowerCase()) ||
           (c.phone || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
    <div className="clients-page">
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Filter Bar */}
        <div className="clients-filter-bar">
          <div className="search-field" style={{ flex: 1, minWidth: 200 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالاسم أو رقم البطاقة...' : 'Rechercher par nom ou CIN...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Client Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isAr ? 'العميل' : 'Client'}</th>
                  <th className="hide-mobile">{isAr ? 'الهاتف' : 'Téléphone'}</th>
                  <th>CIN</th>
                  <th className="hide-mobile">{isAr ? 'الإيجارات' : 'Locations'}</th>
                  <th>{isAr ? 'المجموع' : 'Total Dépensé'}</th>
                  <th className="hide-mobile">{isAr ? 'آخر إيجار' : 'Dernier'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center p-8"><Loader2 className="animate-spin text-primary inline-block" /></td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/crm/${c.id}`)}>
                    <td>
                      <div className="client-name-cell">
                        <div className="client-avatar">{(isAr ? (c.full_name_ar || c.full_name) : c.full_name).charAt(0)}</div>
                        <div>
                          <span className="font-medium">{isAr ? (c.full_name_ar || c.full_name) : c.full_name}</span>
                          <span className="text-sm text-secondary hide-mobile" style={{ display: 'block' }}>{c.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-secondary hide-mobile">{c.phone}</td>
                    <td className="font-medium" style={{ fontFamily: 'monospace' }}>{c.cin}</td>
                    <td className="hide-mobile">{c.total_rentals || 0}</td>
                    <td className="font-semibold">{(c.total_spent || 0).toLocaleString()} MAD</td>
                    <td className="text-secondary hide-mobile">{c.last_rental || '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/crm/${c.id}`)}><Eye size={16} /></button>
                        <button className="btn btn-ghost btn-sm hide-mobile" onClick={() => navigate(`/crm/${c.id}`)}><History size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        </div>
      </div>

      <div className="page-actions">
        <button className="btn btn-outline px-8" onClick={() => exportToCSV(clients, 'clients_rentacar')}>
          <Download size={18} /> {isAr ? 'تصدير' : 'Exporter'}
        </button>
        <button className="btn btn-primary shadow-lg px-12 py-3 text-lg" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> {t('crm.add_client')}
        </button>
      </div>

      {/* Add Client Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="kpi-gold p-2 rounded-md">
                   <User size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="m-0 text-xl">{t('crm.add_client')}</h2>
                  <p className="text-xs text-secondary">{isAr ? 'إضافة عميل جديد إلى قاعدة البيانات' : 'Ajouter un nouveau client à la base de données'}</p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body mt-6">
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">
                    <User size={14} className="inline mr-1" /> {isAr ? 'الإسم' : 'Prénom'}
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="Jean"
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                     {isAr ? 'النسب' : 'Nom'}
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="Dupont"
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                     {isAr ? 'الاسم بالعربية' : 'Nom en Arabe'}
                  </label>
                  <input 
                    className="input-field text-right" 
                    dir="rtl" 
                    placeholder="الاسم الكامل"
                    value={formData.full_name_ar}
                    onChange={e => setFormData({...formData, full_name_ar: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                    <Phone size={14} className="inline mr-1" /> {isAr ? 'الهاتف' : 'Téléphone'}
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="+212 6XX XXX XXX" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                    <Mail size={14} className="inline mr-1" /> {isAr ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input 
                    className="input-field" 
                    type="email" 
                    placeholder="client@example.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                    <CreditCard size={14} className="inline mr-1" /> CIN / {isAr ? 'جواز السفر' : 'Passeport'}
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="AB123456"
                    value={formData.cin}
                    onChange={e => setFormData({...formData, cin: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                    {isAr ? 'رقم جواز السفر' : 'Passeport N°'}
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="P1234567"
                    value={formData.passport}
                    onChange={e => setFormData({...formData, passport: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                    <Award size={14} className="inline mr-1" /> {isAr ? 'رقم رخصة القيادة' : 'Permis N°'}
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="12/345678"
                    value={formData.driver_license}
                    onChange={e => setFormData({...formData, driver_license: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                    {isAr ? 'تاريخ الإصدار' : 'Délivré le'}
                  </label>
                  <input 
                    type="date"
                    className="input-field" 
                    value={formData.license_delivery_date}
                    onChange={e => setFormData({...formData, license_delivery_date: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                    {isAr ? 'تاريخ الانتهاء' : 'Expire le'}
                  </label>
                  <input 
                    type="date"
                    className="input-field" 
                    value={formData.license_expiry_date}
                    onChange={e => setFormData({...formData, license_expiry_date: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                    {isAr ? 'تاريخ الازدياد' : 'Date de Naissance'}
                  </label>
                  <input 
                    type="date"
                    className="input-field" 
                    value={formData.birth_date}
                    onChange={e => setFormData({...formData, birth_date: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                    {isAr ? 'مكان الازدياد' : 'Lieu de Naissance'}
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="Casablanca"
                    value={formData.birth_place}
                    onChange={e => setFormData({...formData, birth_place: e.target.value})}
                  />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">
                    {isAr ? 'العنوان' : 'Adresse'}
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="123 Rue Principale"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>
                {isAr ? 'إلغاء' : 'Annuler'}
              </button>
              <button className="btn btn-primary px-8" onClick={handleAddClient}>
                {isAr ? 'حفظ العميل' : 'Enregistrer Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Clients;
