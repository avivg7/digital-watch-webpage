// Single source of truth for names, links and copy that appear in more than one place.
// Every external fact is registered in docs/COPY_AND_CLAIM_REGISTER.md with its evidence and status.

export const SITE = {
  name: 'המשמר הדיגיטלי',
  nameLatin: 'Digital Watch',
  // The organisation credit EXACTLY as the owner specified it. NOTE (owner action O-1): CIC's own website and logo read "Civilian Intelligence Center" /
  // "מרכז המודיעין האזרחי"; the owner's text and the Galey Israel article say "מרכז המודיעין לתודעה / Consciousness Intelligence Center". Change it HERE, once.
  orgNameHe: 'מרכז המודיעין לתודעה',
  orgShort: 'CIC',
  orgNameLatin: 'Consciousness Intelligence Center',
  updated: '3 בנובמבר 2026',
  updatedISO: '2026-11-03',
} as const;

export const LINKS = {
  cic: 'https://www.israelcic.com/',
  // VERIFIED (fetched, HTTP 200, title and date read): see claim register C-03
  galey: 'https://gly.co.il/item?id=71212',
  // VERIFIED (fetched with a plain User-Agent: HTTP 200, headline and description read, published 2026-05-16): claim register C-04. The publisher answered 403 to an earlier request with a different User-Agent.
  channel13: 'https://13tv.co.il/item/news/politics/security/soldiers-905155535/',
  govAccessibility: 'https://www.gov.il/he/pages/website_accessibility',
  govDeclaration: 'https://www.gov.il/he/pages/declaration_website_accessibility',
  githubPrivacy: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
} as const;

export const NAV = [
  { href: '#evidence', label: 'הבעיה' },
  { href: '#why', label: 'למה בנינו' },
  { href: '#how', label: 'איך זה עובד' },
  { href: '#product', label: 'המערכת' },
  { href: '#people', label: 'האנשים' },
] as const;

export const GALLERY = [
  {
    id: 'room',
    label: 'חדר העבודה',
    caption: 'חדר העבודה: מפגש הדגמה, כפתור עצירה מיידית ודיווח אירוע מהיר. הפנים הוסתרו באתר זה.',
    alt: 'מסך חדר העבודה במערכת: שני חלונות וידאו של מפגש הדגמה, פנים מטושטשות, שעון משמרת פעיל, כפתור עצירה מיידית וטופס דיווח אירוע מהיר.',
  },
  {
    id: 'overview',
    label: 'סקירה',
    caption: 'סקירה: המשמרת הבאה, מצב ההדרכה והעדכונים האחרונים של המתנדב/ת במקום אחד.',
    alt: 'מסך הסקירה של מתנדב/ת: כרטיס המשמרת הבאה עם סימוני אישור, כרטיס הדרכה, הזמינות והעדכונים האחרונים. כל הנתונים סינתטיים.',
  },
  {
    id: 'availability',
    label: 'הזמינות שלי',
    caption: 'הזמינות שלי: מתנדבים מציעים מתי הם פנויים, ומנהל/ת בונה מהן תוכנית שבועית. הצעה אינה שיבוץ.',
    alt: 'מסך הזמינות: לוח שבועי עם חלונות של ארבע שעות ביום, וכפתורי הצעת זמינות. כל הנתונים סינתטיים.',
  },
  {
    id: 'shifts',
    label: 'המשמרות שלי',
    caption: 'המשמרות שלי: שיבוצים מפורסמים, בקשות ומשמרות פתוחות להזמנה ישירה.',
    alt: 'מסך המשמרות של המתנדב/ת: שיבוצים מפורסמים, מונים של משמרות קרובות ופתוחות, ורשימת משמרות פתוחות לבקשה. כל הנתונים סינתטיים.',
  },
  {
    id: 'training',
    label: 'הדרכה',
    caption: 'הדרכה: מטרת הפעילות, מה אסור ואיך עוצרים ומדווחים, לפני שמתחילים משמרת.',
    alt: 'מסך ההדרכה: שלושה סעיפים (מטרת הפעילות, מה אסור, עצירה ודיווח) ומצב ההדרכה של המתנדב/ת.',
  },
  {
    id: 'preflight',
    label: 'בדיקות מוכנות',
    caption: 'בדיקות מוכנות: לפני שמתחילים משמרת בוחרים איך עובדים ומאשרים הצהרה. המשתתף בהדגמה הוא סימולציה.',
    alt: 'מסך בדיקות המוכנות לפני משמרת: בחירת אופן העבודה, רשימת בדיקות, אישור הצהרה וכפתור התחלת מפגש.',
  },
] as const;

export const SIZES = [640, 1200, 1920] as const;

// Switches for material whose right to publish is still to be confirmed by the owner (docs/RIGHTS_AND_PUBLICATION_GATE.md, O-2 to O-4).
// Setting one to false removes it from every page at the next build: the portraits become text-only profiles, the CIC card loses its logo.
export const SHOW = { portraits: true, cicLogo: true } as const;
