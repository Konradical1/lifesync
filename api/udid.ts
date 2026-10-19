/**
 * Beta sign-up for ad hoc iPhone installs, which only work on registered
 * devices. GET serves a landing page, ?profile=1 serves a "Profile Service"
 * .mobileconfig; iOS then POSTs the phone's UDID back here inside a signed
 * plist, and we redirect to a page showing it so the friend can text it to
 * Konrad. Nothing stays installed on the phone; nothing is stored here.
 */
import type { VercelRequest, VercelResponse } from "vercel";

const BASE = "https://journal-x-eosin.vercel.app/api/udid";

const PROFILE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>PayloadContent</key><dict>
    <key>URL</key><string>${BASE}</string>
    <key>DeviceAttributes</key><array><string>UDID</string><string>PRODUCT</string><string>DEVICE_NAME</string></array>
  </dict>
  <key>PayloadOrganization</key><string>LifeSync</string>
  <key>PayloadDisplayName</key><string>LifeSync beta sign-up</string>
  <key>PayloadDescription</key><string>Shares this iPhone's device ID so it can be added to the LifeSync beta. Nothing stays installed.</string>
  <key>PayloadIdentifier</key><string>com.konradfischer.lifesync.udid</string>
  <key>PayloadUUID</key><string>6F1D7B2E-3C4A-4F7B-9A51-2B8E0C4D9E11</string>
  <key>PayloadType</key><string>Profile Service</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict></plist>`;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function page(body: string) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LifeSync beta</title>
<style>
  body{margin:0;font:17px -apple-system,system-ui,sans-serif;background:#000;color:#fff;
       display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}
  main{padding:24px;max-width:420px}
  h1{font-size:28px;margin:0 0 8px} p{color:rgba(235,235,245,.65);line-height:1.4}
  a.btn,button{display:block;margin:20px auto 0;padding:16px 28px;border:0;border-radius:28px;
       background:#30D158;color:#fff;font:600 17px -apple-system,system-ui;text-decoration:none}
  code{display:block;margin-top:16px;padding:14px;border-radius:14px;background:#1C1C1E;
       font:15px ui-monospace,monospace;word-break:break-all;user-select:all}
</style></head><body><main>${body}</main></body></html>`;
}

async function readBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length) return Buffer.concat(chunks).toString("latin1");
  const body = (req as { body?: unknown }).body; // already buffered by the runtime
  return Buffer.isBuffer(body) ? body.toString("latin1") : String(body ?? "");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    // The body is a CMS-signed plist; the XML inside is plain text.
    const raw = await readBody(req);
    const field = (key: string) =>
      raw.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`))?.[1] ?? "";
    const udid = field("UDID");
    const name = field("DEVICE_NAME");
    console.log("BETA_DEVICE", JSON.stringify({ udid, name, product: field("PRODUCT") }));
    // iOS only follows a 301 from a profile service back into Safari.
    res.setHeader("Location", `${BASE}?udid=${encodeURIComponent(udid)}&name=${encodeURIComponent(name)}`);
    return res.status(301).end();
  }

  if (req.query.profile) {
    res.setHeader("Content-Type", "application/x-apple-aspen-config");
    return res.status(200).send(PROFILE);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const udid = typeof req.query.udid === "string" ? req.query.udid : "";
  if (udid) {
    const name = typeof req.query.name === "string" ? req.query.name : "iPhone";
    const sms = `sms:&body=${encodeURIComponent(`LifeSync beta device ID (${name}): ${udid}`)}`;
    return res.status(200).send(
      page(`<h1>Got it ✅</h1>
<p>Send this ID to Konrad. Once it's added you'll get an install link.</p>
<code>${escapeHtml(udid)}</code>
<a class="btn" href="${escapeHtml(sms)}">Text it to Konrad</a>
<p style="font-size:14px">You can delete the "LifeSync beta sign-up" profile in Settings › General › VPN &amp; Device Management (it's usually removed automatically).</p>`)
    );
  }

  return res.status(200).send(
    page(`<h1>LifeSync beta</h1>
<p>To install the beta, your iPhone's device ID has to be added first. Open this page in <b>Safari</b>, tap below, tap <b>Allow</b>, then open <b>Settings</b> and tap <b>Profile Downloaded › Install</b>. You'll come right back here with your ID.</p>
<a class="btn" href="${BASE}?profile=1">Get my device ID</a>`)
  );
}
