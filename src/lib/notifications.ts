import { supabase } from './supabase';

export interface AppNotification {
  id: string;
  type: 'contract' | 'document' | 'maintenance';
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  severity: 'info' | 'warning' | 'error';
  link: string;
  date: string;
}

export const fetchAppNotifications = async (): Promise<AppNotification[]> => {
  const notifications: AppNotification[] = [];
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Overdue Contracts
    const { data: overdue } = await supabase
      .from('contracts')
      .select('id, contract_number, end_date, clients(full_name, full_name_ar)')
      .eq('status', 'active')
      .lt('end_date', today);

    overdue?.forEach(c => {
      const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
      notifications.push({
        id: `overdue-${c.id}`,
        type: 'contract',
        title: 'Contrat en retard',
        title_ar: 'عقد متأخر',
        description: `Le contrat ${c.contract_number} de ${(client as any)?.full_name} est expiré.`,
        description_ar: `العقد ${c.contract_number} لـ ${(client as any)?.full_name_ar || (client as any)?.full_name} منتهي.`,
        severity: 'error',
        link: `/contracts/${c.id}`,
        date: c.end_date
      });
    });

    // 2. Expiring Documents (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const dateLimit = thirtyDaysFromNow.toISOString().split('T')[0];

    const { data: docs } = await supabase
      .from('vehicle_documents')
      .select('id, doc_type, expiry_date, vehicles(id, plate, brand, model)')
      .lte('expiry_date', dateLimit)
      .gte('expiry_date', today);

    docs?.forEach(d => {
      const docNames: any = { carte_grise: 'Carte Grise', assurance: 'Assurance', visite_technique: 'Visite Technique' };
      const docNamesAr: any = { carte_grise: 'البطاقة الرمادية', assurance: 'التأمين', visite_technique: 'الفحص التقني' };
      
      notifications.push({
        id: `doc-${d.id}`,
        type: 'document',
        title: `Expiration: ${docNames[d.doc_type]}`,
        title_ar: `انتهاء: ${docNamesAr[d.doc_type]}`,
        description: `Le document du véhicule ${(d.vehicles as any)?.plate} expire le ${d.expiry_date}.`,
        description_ar: `وثيقة السيارة ${(d.vehicles as any)?.plate} تنتهي في ${d.expiry_date}.`,
        severity: 'warning',
        link: `/fleet/${(d.vehicles as any)?.id}`,
        date: d.expiry_date
      });
    });

    // 3. Maintenance Due
    await supabase
      .from('vehicles')
      .select('id, brand, model, plate, current_km')
      .not('current_km', 'is', null);

    // We can't easily join maintenance with a simple query for "next due" without complex logic, 
    // but we can fetch vehicles that have maintenance records where next_due_km is close.
    // For now, let's keep it simple or skip until we have a better way.

  } catch (err) {
    console.error('Error fetching notifications:', err);
  }

  return notifications;
};
