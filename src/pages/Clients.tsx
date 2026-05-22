import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Eye, History, Loader2, X, User, Phone, Mail, CreditCard, Award, Download, Camera } from 'lucide-react';
import { scanDocument } from '../lib/ocr';
import { supabase } from '../lib/supabase';
import { exportToCSV } from '../utils/exportUtils';
import ImageUpload from '../components/common/ImageUpload';
import './Clients.css';



const Clients = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

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
    foreign_address: '',
    license_expiry_date: '',
    cin_front: '',
    cin_back: '',
    license_front: '',
    license_back: '',
    passport_front: '',
    passport_back: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*, contracts(total_ttc, start_date)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((c: any) => {
        const total_rentals = c.contracts ? c.contracts.length : 0;
        const total_spent = c.contracts ? c.contracts.reduce((sum: number, co: any) => sum + (co.total_ttc || 0), 0) : 0;
        const last_rental = c.contracts && c.contracts.length > 0 ? c.contracts.reduce((latest: string, co: any) => {
          if (!co.start_date) return latest;
          if (!latest || latest === '-') return co.start_date;
          return new Date(co.start_date) > new Date(latest) ? co.start_date : latest;
        }, '-') : '-';

        const { contracts, ...rest } = c;
        return {
          ...rest,
          total_rentals,
          total_spent,
          last_rental
        };
      });

      setClients(mapped);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalOCR = async () => {
    // Collect all uploaded images
    const urls = [
      formData.cin_front, formData.cin_back,
      formData.license_front, formData.license_back,
      formData.passport_front, formData.passport_back
    ].filter(u => u);

    if (urls.length === 0) {
      alert(isAr ? 'الرجاء تحميل صورة واحدة على الأقل' : 'Veuillez télécharger au moins une image');
      return;
    }

    setIsScanning(true);
    try {
      const result = await scanDocument(urls);
      console.log('Processed Global OCR Result:', result);
      
      if (result) {
        setFormData(prev => {
          const newState = { ...prev };
          
          if (result.cin) newState.cin = result.cin;
          if (result.birth_date) newState.birth_date = result.birth_date;
          if (result.address) newState.address = result.address;
          if (result.driver_license) newState.driver_license = result.driver_license;
          if (result.license_delivery_date) newState.license_delivery_date = result.license_delivery_date;
          if (result.license_expiry_date) newState.license_expiry_date = result.license_expiry_date;
          if (result.passport) newState.passport = result.passport;
          if (result.birth_place) newState.birth_place = result.birth_place;
          if (result.foreign_address) newState.foreign_address = result.foreign_address;
          
          if (result.full_name) {
            const nameParts = result.full_name.trim().split(/\s+/);
            if (nameParts.length >= 2) {
              newState.first_name = nameParts[0];
              newState.last_name = nameParts.slice(1).join(' ');
            } else {
              newState.first_name = result.full_name;
            }
          }
          
          return newState;
        });

        // Show success alert and scroll to top for review
        alert(isAr ? 'تم استخراج البيانات بنجاح! يرجى المراجعة.' : 'Données extraites avec succès ! Veuillez vérifier.');
        const modal = document.querySelector('.modal-content');
        if (modal) {
          modal.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (err) {
      console.error('OCR Error:', err);
      alert(isAr ? 'فشل المسح الضوئي للذكاء الاصطناعي' : 'Échec du scan IA');
    } finally {
      setIsScanning(false);
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
        foreign_address: '',
        license_expiry_date: '', cin_front: '', cin_back: '', license_front: '', license_back: '',
        passport_front: '', passport_back: ''
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
           (c.passport || '').toLowerCase().includes(search.toLowerCase()) ||
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
              placeholder={isAr ? 'بحث بالاسم أو رقم الوثيقة...' : 'Rechercher par nom, CIN, Passeport...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Client Table */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isAr ? 'العميل' : 'Client'}</th>
                  <th className="hide-mobile">{isAr ? 'الهاتف' : 'Téléphone'}</th>
                  <th>CIN</th>
                  <th>{isAr ? 'جواز السفر' : 'Passeport'}</th>
                  <th className="hide-mobile">{isAr ? 'الإيجارات' : 'Locations'}</th>
                  <th>{isAr ? 'المجموع' : 'Total Dépensé'}</th>
                  <th className="hide-mobile">{isAr ? 'آخر إيجار' : 'Dernier'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center p-8"><Loader2 className="animate-spin text-primary inline-block" /></td></tr>
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
                    <td className="font-medium" style={{ fontFamily: 'monospace' }}>{c.cin || '—'}</td>
                    <td className="font-medium" style={{ fontFamily: 'monospace' }}>{c.passport || '—'}</td>
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
                <div className="input-group">
                  <label className="input-label">
                    {isAr ? 'العنوان بالمغرب' : 'Adresse au Maroc'}
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="123 Rue Principale, Tétouan"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">
                    {isAr ? 'العنوان بالخارج' : "Adresse à l'étranger"}
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="123 Rue de Paris, France"
                    value={formData.foreign_address}
                    onChange={e => setFormData({...formData, foreign_address: e.target.value})}
                  />
                </div>
              </div>

              {/* Document Photos Section */}
              <div className="mt-8 pt-6 border-t border-dashed">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Camera size={16} className="text-primary" />
                  {isAr ? 'صور الوثائق (وجهين)' : 'Photos des Documents (Recto/Verso)'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CIN Photos */}
                  <div className="p-4 bg-surface-2 rounded-xl border border-border">
                    <label className="text-xs font-bold text-secondary uppercase mb-3 block">CIN / Carte National</label>
                    <div className="flex gap-4">
                      <div className="document-upload-box relative flex-1">
                        <span className="text-[10px] text-center mb-1 block">Recto (Front)</span>
                        <div className={`upload-preview-square ${formData.cin_front ? 'has-image' : ''}`}>
                          {formData.cin_front ? (
                            <img src={formData.cin_front} alt="CIN Front" />
                          ) : (
                            <div className="flex flex-col items-center">
                               {isScanning ? <Loader2 className="animate-spin text-primary" /> : <Plus size={20} />}
                            </div>
                          )}
                          <ImageUpload 
                            bucket="clients" 
                            useCamera={true}
                            onUploadComplete={(url) => {
                              setFormData({...formData, cin_front: url});
                            }} 
                          />
                        </div>
                      </div>

                      <div className="document-upload-box relative flex-1">
                        <span className="text-[10px] text-center mb-1 block">Verso (Back)</span>
                        <div className={`upload-preview-square ${formData.cin_back ? 'has-image' : ''}`}>
                          {formData.cin_back ? (
                            <img src={formData.cin_back} alt="CIN Back" />
                          ) : (
                            <Plus size={20} />
                          )}
                          <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => setFormData({...formData, cin_back: url})} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* License Photos */}
                  <div className="p-4 bg-surface-2 rounded-xl border border-border">
                    <label className="text-xs font-bold text-secondary uppercase mb-3 block">{isAr ? 'رخصة السياقة' : 'Permis de Conduire'}</label>
                    <div className="flex gap-4">
                      <div className="document-upload-box relative flex-1">
                        <span className="text-[10px] text-center mb-1 block">Recto (Front)</span>
                        <div className={`upload-preview-square ${formData.license_front ? 'has-image' : ''}`}>
                          {formData.license_front ? (
                            <img src={formData.license_front} alt="License Front" />
                          ) : (
                            <Plus size={20} />
                          )}
                          <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => setFormData({...formData, license_front: url})} />
                        </div>
                      </div>
                      <div className="document-upload-box relative flex-1">
                        <span className="text-[10px] text-center mb-1 block">Verso (Back)</span>
                        <div className={`upload-preview-square ${formData.license_back ? 'has-image' : ''}`}>
                          {formData.license_back ? (
                            <img src={formData.license_back} alt="License Back" />
                          ) : (
                            <Plus size={20} />
                          )}
                          <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => setFormData({...formData, license_back: url})} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Passport Photos */}
                  <div className="p-4 bg-surface-2 rounded-xl border border-border">
                    <label className="text-xs font-bold text-secondary uppercase mb-3 block">{isAr ? 'جواز السفر' : 'Passeport'}</label>
                    <div className="flex gap-4">
                      <div className="document-upload-box relative flex-1">
                        <span className="text-[10px] text-center mb-1 block">Recto (Front)</span>
                        <div className={`upload-preview-square ${formData.passport_front ? 'has-image' : ''}`}>
                          {formData.passport_front ? (
                            <img src={formData.passport_front} alt="Passport Front" />
                          ) : (
                            <Plus size={20} />
                          )}
                          <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => setFormData({...formData, passport_front: url})} />
                        </div>
                      </div>
                      <div className="document-upload-box relative flex-1">
                        <span className="text-[10px] text-center mb-1 block">Verso (Back)</span>
                        <div className={`upload-preview-square ${formData.passport_back ? 'has-image' : ''}`}>
                          {formData.passport_back ? (
                            <img src={formData.passport_back} alt="Passport Back" />
                          ) : (
                            <Plus size={20} />
                          )}
                          <ImageUpload bucket="clients" useCamera={true} onUploadComplete={(url) => setFormData({...formData, passport_back: url})} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Global AI Scan Button */}
                <div className="mt-8 mb-4">
                  <button 
                    className="btn btn-primary w-full flex items-center justify-center gap-2 py-3"
                    onClick={(e) => {
                      e.preventDefault();
                      handleGlobalOCR();
                    }}
                    disabled={isScanning || (!formData.cin_front && !formData.license_front && !formData.passport_front)}
                    style={{ fontSize: '1.1rem' }}
                  >
                    {isScanning ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
                    {isAr ? 'استخراج جميع البيانات' : 'Extraire toutes les données'}
                  </button>
                  <p className="text-center text-xs text-secondary mt-2">
                    {isAr ? 'سيتم مسح جميع الوثائق المرفقة دفعة واحدة لملء الاستمارة' : 'Tous les documents téléchargés seront analysés en une seule fois pour remplir le formulaire'}
                  </p>
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
