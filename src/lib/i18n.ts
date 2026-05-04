import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  fr: {
    translation: {
      "app_name": "ERP Rentacar",
      "sidebar": {
        "dashboard": "Tableau de Bord",
        "fleet": "Gestion de Flotte",
        "contracts": "Contrats",
        "crm": "Clients (CRM)",
        "finance": "Finances & Factures",
        "morocco": "Module Maroc",
        "settings": "Paramètres"
      },
      "dashboard": {
        "title": "Tableau de Bord",
        "fleet_utilization": "Occupation de la Flotte",
        "monthly_revenue": "Revenus du Mois",
        "upcoming_bookings": "Prochaines Réservations"
      },
      "fleet": {
        "title": "Gestion de Flotte",
        "add_vehicle": "Ajouter Véhicule",
        "inventory_placeholder": "L'inventaire des véhicules apparaîtra ici."
      },
      "contracts": {
        "title": "Réservations & Contrats",
        "new_contract": "Nouveau Contrat",
        "gantt_placeholder": "Le Gantt des réservations apparaîtra ici."
      },
      "crm": {
        "title": "Clients (CRM)",
        "add_client": "Ajouter Client",
        "directory_placeholder": "L'annuaire des clients apparaîtra ici."
      },
      "finance": {
        "title": "Finances & Factures",
        "add_expense": "Ajouter Dépense",
        "ledger_placeholder": "Le grand livre des finances apparaîtra ici."
      },
      "morocco": {
        "title": "Module Maroc",
        "export_police": "Exporter Fiche de Police",
        "fines_placeholder": "Le système de gestion des amendes apparaîtra ici."
      },
      "settings": {
        "title": "Paramètres",
        "save": "Sauvegarder",
        "settings_placeholder": "Les paramètres de l'application apparaîtront ici."
      }
    }
  },
  ar: {
    translation: {
      "app_name": "نظام إدارة تأجير السيارات",
      "sidebar": {
        "dashboard": "لوحة القيادة",
        "fleet": "إدارة الأسطول",
        "contracts": "العقود",
        "crm": "العملاء (إدارة العلاقات)",
        "finance": "المالية والفواتير",
        "morocco": "وحدة المغرب",
        "settings": "الإعدادات"
      },
      "dashboard": {
        "title": "لوحة القيادة",
        "fleet_utilization": "إشغال الأسطول",
        "monthly_revenue": "دخل الشهر",
        "upcoming_bookings": "الحجوزات القادمة"
      },
      "fleet": {
        "title": "إدارة الأسطول",
        "add_vehicle": "إضافة سيارة",
        "inventory_placeholder": "سيظهر جرد السيارات هنا."
      },
      "contracts": {
        "title": "الحجوزات والعقود",
        "new_contract": "عقد جديد",
        "gantt_placeholder": "سيظهر جدول الحجوزات الزمني هنا."
      },
      "crm": {
        "title": "العملاء (إدارة العلاقات)",
        "add_client": "إضافة عميل",
        "directory_placeholder": "سيظهر دليل العملاء هنا."
      },
      "finance": {
        "title": "المالية والفواتير",
        "add_expense": "إضافة مصاريف",
        "ledger_placeholder": "سيظهر دفتر الأستاذ المالي هنا."
      },
      "morocco": {
        "title": "وحدة المغرب",
        "export_police": "تصدير ورقة الشرطة",
        "fines_placeholder": "سيظهر نظام إدارة المخالفات هنا."
      },
      "settings": {
        "title": "الإعدادات",
        "save": "حفظ",
        "settings_placeholder": "ستظهر إعدادات التطبيق هنا."
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false 
    }
  });

// Handle RTL direction when language changes
i18n.on('languageChanged', (lng) => {
  document.dir = i18n.dir(lng);
  document.documentElement.lang = lng;
});

export default i18n;
