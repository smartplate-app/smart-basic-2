export async function notifyOS({ title, body, tag, url }) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    let permission = Notification.permission;
    if (permission !== 'granted') {
      try {
        permission = await Notification.requestPermission();
      } catch (_) {
        // ignore
      }
    }
    if (permission !== 'granted') return false;

    const icon = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg';
    const n = new Notification(title || 'Smart Plate', {
      body: body || '',
      tag: tag || undefined,
      icon
    });
    n.onclick = (e) => {
      try {
        e?.preventDefault?.();
      } catch {}
      try { window.focus(); } catch {}
      if (url) {
        try { window.location.href = url; } catch {}
      }
      try { n.close(); } catch {}
    };
    return true;
  } catch (_) {
    return false;
  }
}