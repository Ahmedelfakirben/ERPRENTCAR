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
    // 1. Overdue Contracts (Return)
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
        title: 'Retour en retard',
        title_ar: 'إرجاع متأخر',
        description: `Le contrat ${c.contract_number} de ${(client as any)?.full_name} est expiré.`,
        description_ar: `العقد ${c.contract_number} لـ ${(client as any)?.full_name_ar || (client as any)?.full_name} منتهي.`,
        severity: 'error',
        link: `/contracts/${c.id}`,
        date: c.end_date
      });
    });

    // 2. Check-out Today
    const { data: checkoutToday } = await supabase
      .from('contracts')
      .select('id, contract_number, start_date, clients(full_name, full_name_ar)')
      .eq('start_date', today)
      .in('status', ['pending', 'active']);

    checkoutToday?.forEach(c => {
      const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
      notifications.push({
        id: `checkout-${c.id}`,
        type: 'contract',
        title: 'Départ aujourd\'hui',
        title_ar: 'خروج اليوم',
        description: `Départ prévu pour ${(client as any)?.full_name} (${c.contract_number}).`,
        description_ar: `من المقرر خروج ${(client as any)?.full_name_ar || (client as any)?.full_name} اليوم.`,
        severity: 'info',
        link: `/contracts/${c.id}`,
        date: c.start_date
      });
    });

    // 3. Check-in Today
    const { data: checkinToday } = await supabase
      .from('contracts')
      .select('id, contract_number, end_date, clients(full_name, full_name_ar)')
      .eq('end_date', today)
      .eq('status', 'active');

    checkinToday?.forEach(c => {
      const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
      notifications.push({
        id: `checkin-${c.id}`,
        type: 'contract',
        title: 'Retour aujourd\'hui',
        title_ar: 'إرجاع اليوم',
        description: `Le retour de ${(client as any)?.full_name} est prévu hoy.`,
        description_ar: `من المقرر إرجاع سيارة ${(client as any)?.full_name_ar || (client as any)?.full_name} اليوم.`,
        severity: 'info',
        link: `/contracts/${c.id}`,
        date: c.end_date
      });
    });

    // 4. Delayed Check-out
    const { data: delayedCheckout } = await supabase
      .from('contracts')
      .select('id, contract_number, start_date, clients(full_name, full_name_ar)')
      .eq('status', 'pending')
      .lt('start_date', today);

    delayedCheckout?.forEach(c => {
      const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
      notifications.push({
        id: `delayed-out-${c.id}`,
        type: 'contract',
        title: 'Départ non validé',
        title_ar: 'لم يتم الخروج',
        description: `Le départ de ${(client as any)?.full_name} (${c.contract_number}) est en retard.`,
        description_ar: `تأخر خروج ${(client as any)?.full_name_ar || (client as any)?.full_name}.`,
        severity: 'warning',
        link: `/contracts/${c.id}`,
        date: c.start_date
      });
    });

    // 5. Documents Expiring
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() + 30);
    const limitStr = dateLimit.toISOString().split('T')[0];

    const { data: docs } = await supabase
      .from('vehicle_documents')
      .select('id, doc_type, expiry_date, vehicles(id, plate)')
      .lte('expiry_date', limitStr)
      .gte('expiry_date', today);

    docs?.forEach(d => {
      const docNames: any = { carte_grise: 'Carte Grise', assurance: 'Assurance', visite_technique: 'Visite Technique' };
      const docNamesAr: any = { carte_grise: 'البطاقة الرمادية', assurance: 'التأمين', visite_technique: 'الفحص التقني' };
      notifications.push({
        id: `doc-${d.id}`,
        type: 'document',
        title: `Expiration: ${docNames[d.doc_type]}`,
        title_ar: `انتهاء: ${docNamesAr[d.doc_type]}`,
        description: `Vehicule ${(d.vehicles as any)?.plate} expire le ${d.expiry_date}.`,
        description_ar: `وثيقة السيارة ${(d.vehicles as any)?.plate} تنتهي في ${d.expiry_date}.`,
        severity: 'warning',
        link: `/fleet/${(d.vehicles as any)?.id}`,
        date: d.expiry_date
      });
    });

    // 6. Maintenance Alerts
    const { data: maintAlerts } = await supabase
      .from('vehicles')
      .select('id, plate, current_km, next_maintenance_km')
      .not('next_maintenance_km', 'is', null);

    maintAlerts?.forEach(v => {
      const remaining = (v.next_maintenance_km || 0) - (v.current_km || 0);
      if (remaining <= 1000) {
        notifications.push({
          id: `maint-${v.id}`,
          type: 'maintenance',
          title: remaining <= 0 ? 'Maint. Échue' : 'Maint. Proche',
          title_ar: remaining <= 0 ? 'صيانة منتهية' : 'صيانة قريبة',
          description: remaining <= 0 
            ? `${v.plate} a dépassé de ${Math.abs(remaining)} km.`
            : `${v.plate} prévue en ${remaining} km.`,
          description_ar: remaining <= 0
            ? `${v.plate} تجاوزت الموعد بـ ${Math.abs(remaining)} كم.`
            : `صيانة ${v.plate} بعد ${remaining} كم.`,
          severity: remaining <= 0 ? 'error' : 'warning',
          link: `/fleet/${v.id}`,
          date: today
        });
      }
    });

  } catch (err) {
    console.error('Error fetching notifications:', err);
  }

  return notifications;
};
