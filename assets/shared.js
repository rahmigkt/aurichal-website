// AURICHAL — ortak Supabase istemcisi ve yardımcı fonksiyonlar
const SUPABASE_URL = "https://xcsvobtewvjlnjeyqiux.supabase.co";
const SUPABASE_KEY = "sb_publishable_yjwxxm5IaMkEi1TCugejzA__cqLpYnP";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function publicImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = sb.storage.from("aurichal-images").getPublicUrl(path);
  return data.publicUrl;
}

// Kategori ikonları (örnek görsel yoksa yedek olarak kullanılır)
const CATEGORY_ICONS = {
  "avize": '<svg viewBox="0 0 60 60"><circle cx="30" cy="10" r="3"/><line x1="30" y1="13" x2="30" y2="24"/><line x1="30" y1="24" x2="10" y2="50"/><line x1="30" y1="24" x2="50" y2="50"/><line x1="30" y1="24" x2="30" y2="54"/><circle cx="10" cy="52" r="2.4"/><circle cx="50" cy="52" r="2.4"/><circle cx="30" cy="56" r="2.4"/></svg>',
  "kapi-kolu": '<svg viewBox="0 0 60 60"><rect x="26" y="8" width="8" height="8"/><line x1="30" y1="16" x2="30" y2="40"/><circle cx="30" cy="48" r="6"/></svg>',
  "aydinlatma": '<svg viewBox="0 0 60 60"><polygon points="30,10 46,20 46,40 30,50 14,40 14,20"/><line x1="30" y1="10" x2="30" y2="50"/><line x1="14" y1="20" x2="46" y2="40"/><line x1="46" y1="20" x2="14" y2="40"/></svg>',
  "mimari-detaylar": '<svg viewBox="0 0 60 60"><path d="M12 48 L12 20 L40 20"/><line x1="12" y1="20" x2="48" y2="20"/><line x1="40" y1="20" x2="40" y2="48"/></svg>',
  "default": '<svg viewBox="0 0 60 60"><polygon points="30,8 48,20 48,40 30,52 12,40 12,20"/></svg>'
};

function categoryIcon(slug) {
  return CATEGORY_ICONS[slug] || CATEGORY_ICONS["default"];
}
