export type Lang = 'en' | 'ar';

/** Keys are the English strings themselves; a missing Arabic entry falls back to the key. */
const ar: Record<string, string> = {
  'YOUR WORKSPACE': 'مساحة عملك', Library: 'المكتبة', 'Search documents, tags...': 'ابحث في المستندات والوسوم...',
  All: 'الكل', Recent: 'الأحدث', Favorites: 'المفضلة', Study: 'دراسة', Work: 'عمل',
  date: 'التاريخ', name: 'الاسم', size: 'الحجم',
  'Import PDF': 'استيراد PDF', 'Import failed': 'فشل الاستيراد', 'The file could not be imported.': 'تعذّر استيراد الملف.',
  'Not started': 'لم تبدأ', '{n}% complete': 'اكتمل {n}%', 'Page {n}': 'صفحة {n}',
  Settings: 'الإعدادات', 'MD READER': 'قارئ MD', READER: 'القارئ', PREFERENCES: 'التفضيلات',
  'Page direction': 'اتجاه الصفحات', 'Swipe up and down between pages': 'اسحب للأعلى والأسفل بين الصفحات', 'Swipe left and right between pages': 'اسحب يميناً ويساراً بين الصفحات',
  vertical: 'عمودي', horizontal: 'أفقي',
  Appearance: 'المظهر', 'Follow device theme': 'حسب الجهاز', system: 'الجهاز', light: 'فاتح', dark: 'داكن', Light: 'فاتح', Dark: 'داكن',
  Language: 'اللغة', 'Follow device language': 'حسب لغة الجهاز',
  'Haptic feedback': 'الاهتزاز', 'Tactile feedback for tools and strokes': 'اهتزاز خفيف عند استخدام الأدوات والرسم',
  'A focused workspace for reading, thinking, and making sense of complex documents.': 'مساحة عمل مركّزة للقراءة والتفكير وفهم المستندات المعقّدة.',
  'Version {v} · Built with Expo': 'الإصدار {v} · مبني بـ Expo',
  Undo: 'تراجع', Redo: 'إعادة', Read: 'قراءة', Pen: 'قلم', Mark: 'تمييز', Erase: 'ممحاة', Shape: 'شكل', Lasso: 'تحديد',
  Note: 'ملاحظة', Image: 'صورة', Sticker: 'ملصق', Ruler: 'مسطرة', Zoom: 'تكبير', More: 'المزيد', Share: 'مشاركة',
  'MD WORKSPACE': 'مساحة MD', 'Note editor': 'محرّر الملاحظات', 'Loading note…': 'جارٍ تحميل الملاحظة…', 'Write your study notes…': 'اكتب ملاحظات دراستك…',
  Save: 'حفظ', 'Saving…': 'جارٍ الحفظ…', Saved: 'تم الحفظ', Draft: 'مسودة', Cancel: 'إلغاء',
  'Study notes': 'ملاحظات الدراسة', 'Sticky notes': 'الملاحظات اللاصقة',
  // library
  'All documents': 'كل المستندات', file: 'ملف', files: 'ملفات', 'Loading library...': 'جارٍ تحميل المكتبة...', 'Nothing here yet': 'لا يوجد شيء هنا بعد',
  'Try another search or filter.': 'جرّب بحثاً أو فلتراً آخر.', 'Your library is ready': 'مكتبتك جاهزة',
  'Import a PDF to start reading, annotating, and keeping your ideas in one place.': 'استورد ملف PDF لتبدأ القراءة والتعليق وحفظ أفكارك في مكان واحد.',
  Open: 'فتح', Favorite: 'إضافة للمفضلة', Unfavorite: 'إزالة من المفضلة', 'Tag as Study': 'وسم «دراسة»', 'Remove Study tag': 'إزالة وسم «دراسة»',
  'Tag as Work': 'وسم «عمل»', 'Remove Work tag': 'إزالة وسم «عمل»', Rename: 'إعادة تسمية', Delete: 'حذف', 'Rename document': 'إعادة تسمية المستند',
  'Delete “{name}” and its annotations?': 'حذف «{name}» وتعليقاته؟', 'Yes, delete': 'نعم، احذف', OK: 'حسناً',
  // settings
  'Night reading': 'القراءة الليلية', 'Invert page colors for dark rooms (needs Android 12+ or iOS)': 'عكس ألوان الصفحة للأماكن المظلمة (يتطلب أندرويد 12+ أو iOS)',
  // reader
  'Opening document…': 'جارٍ فتح المستند…', 'This document is no longer in your library.': 'هذا المستند لم يعد في مكتبتك.', 'Go back': 'رجوع', 'MD workspace': 'مساحة MD',
  Color: 'اللون', Size: 'الحجم', Stickers: 'الملصقات', Outline: 'الفهرس', Pages: 'الصفحات', Bookmarks: 'العلامات', Notes: 'الملاحظات',
  'No bookmarks yet. Add one from the More menu.': 'لا توجد علامات بعد. أضف واحدة من قائمة «المزيد».', 'No notes yet.': 'لا توجد ملاحظات بعد.',
  'Document tools': 'أدوات المستند', 'Share annotated PDF': 'مشاركة PDF مع التعليقات', 'Share original': 'مشاركة الأصلي', 'Export notes (Markdown)': 'تصدير الملاحظات (Markdown)',
  'Clear this page': 'مسح هذه الصفحة', 'Reader settings': 'إعدادات القارئ', 'Bookmark this page': 'وضع علامة على الصفحة', 'Remove bookmark': 'إزالة العلامة',
  'Go to page': 'اذهب إلى صفحة', 'Go to page (1–{n})': 'اذهب إلى صفحة (1–{n})', Go: 'اذهب', 'Hide annotations': 'إخفاء التعليقات', 'Show annotations': 'إظهار التعليقات',
  'Night reading: on': 'القراءة الليلية: تعمل', 'Night reading: off': 'القراءة الليلية: متوقفة',
  'New sticky note': 'ملاحظة لاصقة جديدة', 'Edit note': 'تعديل الملاحظة', 'Write a note…': 'اكتب ملاحظة…', 'Edit text': 'تعديل النص', Bigger: 'أكبر', Smaller: 'أصغر',
  'Remove everything on page {n}?': 'حذف كل شيء في الصفحة {n}؟', 'Nothing to clear on this page': 'لا يوجد ما يُمسح في هذه الصفحة', 'Clear page': 'مسح الصفحة',
  'PDF error': 'خطأ في PDF', 'This document could not be rendered on this device.': 'تعذّر عرض هذا المستند على هذا الجهاز.',
  'Sharing unavailable': 'المشاركة غير متاحة', 'Sharing is not supported on this device.': 'هذا الجهاز لا يدعم المشاركة.',
  'Export failed': 'فشل التصدير', 'The document could not be exported.': 'تعذّر تصدير المستند.', 'Image failed': 'فشلت إضافة الصورة', 'The image could not be added.': 'تعذّر إضافة الصورة.',
  'Preparing annotated PDF…': 'جارٍ تجهيز PDF مع التعليقات…', 'Nothing to export yet.': 'لا يوجد شيء لتصديره بعد.',
};

const tables: Record<Lang, Record<string, string>> = { en: {}, ar };

export function systemLang(): Lang {
  try { return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('ar') ? 'ar' : 'en'; } catch { return 'en'; }
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let text = tables[lang][key] ?? key;
  if (vars) Object.entries(vars).forEach(([k, v]) => { text = text.split(`{${k}}`).join(String(v)); });
  return text;
}
