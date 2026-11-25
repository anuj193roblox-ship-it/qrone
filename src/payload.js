// Turns what the user typed into the exact text stored inside the QR code.
// Pure (no page access) so it can be tested. Returns one of:
//   { data }   valid, encode this
//   { empty }  nothing typed yet (no error message needed)
//   { error }  typed something we cannot use

// Wi-Fi codes treat \ ; , : " as special, so each one needs a backslash in front.
const wifiEscape = (s) => s.replace(/([\\;,:"])/g, "\\$1");

export function buildData(type, v) {
  switch (type) {
    case "url": {
      const raw = v.url.trim();
      if (!raw) return { empty: true };
      const withScheme = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
      try {
        const u = new URL(withScheme);
        if (!u.hostname.includes(".")) throw new Error("no dot in hostname");
        return { data: withScheme };
      } catch {
        return { error: "That doesn't look like a web address. Try something like example.com/menu." };
      }
    }
    case "text": {
      return v.text.trim() ? { data: v.text } : { empty: true };
    }
    case "wifi": {
      const ssid = v.ssid.trim();
      if (!ssid) return { empty: true };
      const sec = v.wifiSec; // WPA, WEP or nopass
      if (sec !== "nopass" && !v.wifiPass) return { error: "Enter the Wi-Fi password, or choose 'No password'." };
      const pass = sec === "nopass" ? "" : `P:${wifiEscape(v.wifiPass)};`;
      return { data: `WIFI:T:${sec};S:${wifiEscape(ssid)};${pass}H:${v.wifiHidden ? "true" : "false"};;` };
    }
    case "email": {
      const to = v.mailTo.trim();
      if (!to) return { empty: true };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: "That doesn't look like an email address." };
      const parts = [];
      if (v.mailSubject.trim()) parts.push("subject=" + encodeURIComponent(v.mailSubject.trim()));
      if (v.mailBody.trim()) parts.push("body=" + encodeURIComponent(v.mailBody.trim()));
      return { data: "mailto:" + to + (parts.length ? "?" + parts.join("&") : "") };
    }
    default:
      return { empty: true };
  }
}
