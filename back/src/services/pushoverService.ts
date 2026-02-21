const ALERTZY_URL = 'https://alertzy.app/send';

interface AlertzyOptions {
  title: string;
  message: string;
  link?: string;
  priority?: 0 | 1 | 2; // 0=normal, 1=high, 2=critical
  group?: string;
}

export async function sendPushoverNotification(opts: AlertzyOptions): Promise<void> {
  const accountKey = process.env.ALERTZY_ACCOUNT_KEY;

  if (!accountKey) {
    return; // Not configured, silently skip
  }

  const body = new URLSearchParams({
    accountKey,
    title: opts.title,
    message: opts.message,
    priority: String(opts.priority ?? 0),
    ...(opts.link ? { link: opts.link } : {}),
    ...(opts.group ? { group: opts.group } : {})
  });

  try {
    const res = await fetch(ALERTZY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Alertzy notification failed:', res.status, text);
    }
  } catch (err) {
    console.error('Alertzy request error:', err);
  }
}
