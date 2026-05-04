import { useState, useEffect } from 'react';

import { useTranslation } from 'react-i18next';
import { 
  Save, User, Users, Sun, Moon, Loader2, 
  Globe, Building2, LayoutGrid, X,
  Settings as SettingsIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Settings.css';

const Settings = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [tab, setTab] = useState<'general' | 'users'>('general');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // States for real data
  const [company, setCompany] = useState<any>({ company_name: '', phone: '', address: '', tva_default_rate: 20, ice: '' });
  const [users, setUsers] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'employee' });
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    // Sync dark mode from local storage or document attribute
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setDarkMode(isDark);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [compRes, userRes] = await Promise.all([
        supabase.from('company_settings').select('*').single(),
        supabase.from('profiles').select('*')
      ]);

      if (compRes.data) setCompany(compRes.data);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!company.id) {
      alert(isAr ? 'لم يتم العثور على سجل الشركة' : 'ID de la société non trouvé');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from('company_settings')
        .update({
          company_name: company.company_name,
          phone: company.phone,
          address: company.address,
          ice: company.ice,
          tva_default_rate: Number(company.tva_default_rate || 20)
        })
        .eq('id', company.id);

      if (error) throw error;
      alert(isAr ? 'تم حفظ التعديلات بنجاح' : 'Paramètres enregistrés avec succès');
    } catch (err) {
      console.error('Save error:', err);
      alert(isAr ? 'حدث خطأ أثناء الحفظ' : 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      alert(isAr ? 'يرجى ملء جميع الحقول' : 'Veuillez remplir todos los campos');
      return;
    }
    setSavingUser(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
            role: newUser.role
          }
        }
      });

      if (error) throw error;
      alert(isAr ? 'تم إنشاء المستخدم بنجاح' : 'Utilisateur créé avec succès');
      setShowAddUser(false);
      setNewUser({ full_name: '', email: '', password: '', role: 'employee' });
      fetchSettings();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error creating user');
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin text-primary inline-block" /></div>;

  return (
    <>
      <div className="settings-page">
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="tab-bar">
            <button className={`tab ${tab === 'general' ? 'tab-active' : ''}`} onClick={() => setTab('general')}>
              <Building2 size={16} /> {isAr ? 'بيانات الوكالة' : 'Informations'}
            </button>
            <button className={`tab ${tab === 'users' ? 'tab-active' : ''}`} onClick={() => setTab('users')}>
              <Users size={16} /> {isAr ? 'المستخدمون' : 'Utilisateurs'}
            </button>
          </div>

          {tab === 'general' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="settings-main-grid">
                <section className="settings-card">
                  <div className="card-header">
                    <Building2 size={20} className="text-gold" />
                    <h3>{isAr ? 'هوية الوكالة' : 'Identité de l\'Agence'}</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-grid">
                      <div className="input-group">
                        <label className="input-label">{isAr ? 'اسم الشركة' : 'Nom de la Société'}</label>
                        <input className="input-field" value={company.company_name} 
                          onChange={e => setCompany({...company, company_name: e.target.value})} />
                      </div>
                      <div className="input-group">
                        <label className="input-label">{isAr ? 'الهاتف' : 'Téléphone'}</label>
                        <input className="input-field" value={company.phone}
                          onChange={e => setCompany({...company, phone: e.target.value})} />
                      </div>
                      <div className="input-group" style={{ gridColumn: 'span 2' }}>
                        <label className="input-label">{isAr ? 'العنوان' : 'Adresse'}</label>
                        <input className="input-field" value={company.address}
                          onChange={e => setCompany({...company, address: e.target.value})} />
                      </div>
                      <div className="input-group">
                        <label className="input-label">ICE</label>
                        <input className="input-field" value={company.ice}
                          onChange={e => setCompany({...company, ice: e.target.value})} />
                      </div>
                      <div className="input-group">
                        <label className="input-label">TVA (%)</label>
                        <input className="input-field" type="number" value={company.tva_default_rate}
                          onChange={e => setCompany({...company, tva_default_rate: e.target.value})} />
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-top flex justify-end">
                      <button className="btn btn-primary px-10" onClick={handleSaveCompany} disabled={loading}>
                        <Save size={18} /> {isAr ? 'حفظ التغييرات' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                </section>

                <aside className="settings-sidebar-col">
                  <div className="settings-card mb-6">
                    <div className="card-header">
                      <LayoutGrid size={18} className="text-gold" />
                      <h3>{isAr ? 'التخصيص' : 'Personnalisation'}</h3>
                    </div>
                    <div className="card-body">
                      <div className="input-group mb-6">
                        <label className="input-label">{isAr ? 'اللغة الافتراضية' : 'Langue par Défaut'}</label>
                        <select className="input-field" value={i18n.language} onChange={e => handleLangChange(e.target.value)}>
                          <option value="fr">Français</option>
                          <option value="ar">العربية</option>
                        </select>
                      </div>

                      <div className="theme-toggle-row flex items-center justify-between p-4 bg-surface-2 rounded-lg border">
                        <span className="text-sm font-bold">{darkMode ? (isAr ? 'الوضع الليلي' : 'Mode Nuit') : (isAr ? 'الوضع النهاري' : 'Mode Jour')}</span>
                        <button className="theme-switch-btn" onClick={toggleTheme}>
                          {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="settings-card p-6 bg-surface-2 border-dashed flex items-center gap-4">
                     <div className="icon-badge bg-gold-light text-gold"><Globe size={20} /></div>
                     <p className="text-xs text-secondary m-0 leading-relaxed">
                       {isAr ? 'سيتم تطبيق التغييرات على جميع المستندات والتقارير الصادرة.' : 'Les changements seront appliqués à tous les documents et rapports.'}
                     </p>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="settings-card user-table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{isAr ? 'المستخدم' : 'COLLABORATEUR'}</th>
                      <th>{isAr ? 'البريد الإلكتروني' : 'EMAIL'}</th>
                      <th>{isAr ? 'الصلاحية' : 'RÔLE'}</th>
                      <th style={{ textAlign: 'right' }}>{isAr ? 'إجراءات' : 'ACTIONS'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="user-row">
                        <td>
                          <div className="flex items-center gap-4">
                            <div className="avatar-xs" style={{ background: 'var(--gold-light)', color: '#fff' }}>
                              {u.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-bold">{u.full_name || 'Utilisateur'}</div>
                              <div className="text-xs text-secondary italic">Membre depuis 2024</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-secondary font-mono text-sm">{u.email}</td>
                        <td>
                          <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-employee'}`}>
                            {u.role || 'employee'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm" title="Modifier">
                            <SettingsIcon size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Floating Action for Users tab only */}
        {tab === 'users' && (
          <div className="page-actions">
             <button className="btn btn-primary px-12 py-4 shadow-lg text-lg" onClick={() => setShowAddUser(true)}>
                <User size={20} /> {isAr ? 'إضافة مستخدم جديد' : 'Ajouter un Collaborateur'}
             </button>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
           <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                 <h3 className="m-0">{isAr ? 'إضافة مستخدم جديد' : 'Ajouter un usuario'}</h3>
                 <button className="btn btn-ghost" onClick={() => setShowAddUser(false)}><X size={20} /></button>
              </div>

              <div className="form-grid">
                 <div className="input-group" style={{ gridColumn: 'span 2' }}>
                    <label className="input-label">{isAr ? 'الاسم الكامل' : 'Nom Complet'}</label>
                    <input className="input-field" value={newUser.full_name} 
                      onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
                 </div>
                 <div className="input-group">
                    <label className="input-label">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input className="input-field" type="email" value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})} />
                 </div>
                 <div className="input-group">
                    <label className="input-label">{isAr ? 'كلمة المرور' : 'Mot de passe'}</label>
                    <input className="input-field" type="password" value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})} />
                 </div>
                 <div className="input-group" style={{ gridColumn: 'span 2' }}>
                    <label className="input-label">{isAr ? 'الدور' : 'Rôle'}</label>
                    <select className="input-field" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                       <option value="employee">{isAr ? 'موظف' : 'Employé'}</option>
                       <option value="admin">Admin</option>
                    </select>
                 </div>
              </div>

              <div className="flex gap-4 mt-8 justify-end">
                 <button className="btn btn-outline" onClick={() => setShowAddUser(false)}>{isAr ? 'إلغاء' : 'Annuler'}</button>
                 <button className="btn btn-primary px-8" onClick={handleCreateUser} disabled={savingUser}>
                    {savingUser ? <Loader2 className="animate-spin" size={16} /> : (isAr ? 'إنشاء' : 'Créer')}
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default Settings;
