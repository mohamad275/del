/**
 * Internationalization (i18n) system for RouteFlow.
 * Arabic is the default language. English is available as a toggle.
 */

export type Language = 'ar' | 'en';

const translations: Record<Language, Record<string, string>> = {
    ar: {
        // App
        'app.name': 'روت فلو',
        'app.subtitle': 'محسّن مسار التوصيل',
        'app.footer': 'روت فلو — محسّن مسار التوصيل · مصمم للسرعة',
        'app.loadingMap': 'جاري تحميل الخريطة...',
        'app.setApiKey': 'أدخل مفتاح API في ملف .env',
        'app.mapClickHint': 'اضغط على الخريطة لإضافة نقطة',

        // Header
        'header.savedRoutes': 'المسارات المحفوظة',
        'header.darkMode': 'الوضع الليلي',
        'header.language': 'EN',

        // Location Input
        'location.start': 'نقطة البداية',
        'location.end': 'نقطة النهاية',
        'location.endHint': '(نفس البداية إذا فارغ)',
        'location.optional': '(اختياري)',
        'location.placeholder': 'أدخل عنوان أو الصق رابط Google Maps...',
        'location.gps': 'موقعي',
        'location.detecting': 'جاري...',
        'location.notFound': 'الموقع غير موجود',

        // Stops
        'stops.title': 'نقاط التوصيل',
        'stops.clearAll': 'مسح الكل',
        'stops.addPlaceholder': 'عنوان، اسم مبنى، أو رابط خرائط...',
        'stops.emptyMessage': 'أضف نقاط التوصيل أعلاه للبدء.\nيمكنك سحب النقاط لإعادة ترتيبها.',

        // Optimize
        'optimize.button': 'تحسين المسار',
        'optimize.optimizing': 'جاري تحسين',
        'optimize.stops': 'نقطة',
        'optimize.addStops': 'أضف نقاط للتحسين',

        // Route Summary
        'summary.title': 'ملخص المسار',
        'summary.stops': 'النقاط',
        'summary.distance': 'المسافة',
        'summary.duration': 'المدة',
        'summary.stopDetails': 'تفاصيل النقاط',
        'summary.start': 'البداية',
        'summary.now': 'الآن',
        'summary.navigate': 'ابدأ الملاحة',

        // Saved Routes
        'saved.title': 'المسارات المحفوظة',
        'saved.namePlaceholder': 'اسم المسار...',
        'saved.save': 'حفظ',
        'saved.empty': 'لا توجد مسارات محفوظة',
        'saved.stops': 'نقطة',

        // Errors
        'error.startRequired': 'يجب تحديد نقطة البداية',
        'error.addStops': 'أضف نقطة توصيل واحدة على الأقل',
        'error.noDirections': 'تعذر حساب الاتجاهات',
        'error.distanceMatrix': 'فشل حساب المسافات',
        'error.optimizationFailed': 'فشل التحسين',
    },

    en: {
        // App
        'app.name': 'RouteFlow',
        'app.subtitle': 'Delivery Optimizer',
        'app.footer': 'RouteFlow — Delivery Route Optimizer · Built for speed',
        'app.loadingMap': 'Loading map...',
        'app.setApiKey': 'Set your API key in .env file',
        'app.mapClickHint': 'Click on map to add a stop',

        // Header
        'header.savedRoutes': 'Saved Routes',
        'header.darkMode': 'Dark Mode',
        'header.language': 'عربي',

        // Location Input
        'location.start': 'Start Location',
        'location.end': 'End Location',
        'location.endHint': '(same as start if empty)',
        'location.optional': '(Optional)',
        'location.placeholder': 'Enter address or paste Google Maps link...',
        'location.gps': 'GPS',
        'location.detecting': 'GPS...',
        'location.notFound': 'Location not found',

        // Stops
        'stops.title': 'Delivery Stops',
        'stops.clearAll': 'Clear all',
        'stops.addPlaceholder': 'Address, building name, or Maps link...',
        'stops.emptyMessage': 'Add delivery stops above to get started.\nYou can drag to reorder them.',

        // Optimize
        'optimize.button': 'Optimize Route',
        'optimize.optimizing': 'Optimizing',
        'optimize.stops': 'stops',
        'optimize.addStops': 'Add stops to optimize',

        // Route Summary
        'summary.title': 'Route Summary',
        'summary.stops': 'Stops',
        'summary.distance': 'Distance',
        'summary.duration': 'Duration',
        'summary.stopDetails': 'Stop Details',
        'summary.start': 'Start',
        'summary.now': 'Now',
        'summary.navigate': 'Start Navigation',

        // Saved Routes
        'saved.title': 'Saved Routes',
        'saved.namePlaceholder': 'Route name...',
        'saved.save': 'Save',
        'saved.empty': 'No saved routes yet',
        'saved.stops': 'stops',

        // Errors
        'error.startRequired': 'Start location must be set',
        'error.addStops': 'Add at least one delivery stop',
        'error.noDirections': 'Could not compute directions',
        'error.distanceMatrix': 'Distance Matrix failed',
        'error.optimizationFailed': 'Optimization failed',
    },
};

/** Get the currently saved language, defaults to Arabic */
export function getSavedLanguage(): Language {
    const saved = localStorage.getItem('routeflow_lang');
    return saved === 'en' ? 'en' : 'ar';
}

/** Save language preference */
export function saveLanguage(lang: Language) {
    localStorage.setItem('routeflow_lang', lang);
}

/** Get a translation string */
export function t(key: string, lang: Language): string {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
}

/** Check if current language is RTL */
export function isRTL(lang: Language): boolean {
    return lang === 'ar';
}
