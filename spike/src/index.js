// Fake "database": which host + path goes where. The real product reads this from D1.
const CODES = {
  "qr.customer-test.example/menu": "https://example.com/menu",
  "qr.customer-test.example/sale": "https://example.com/sale",
  "qr-spike.qr-tool-spike.workers.dev/menu": "https://example.com/menu",
};

export default {
  async fetch(request) {
    // Read the Host header: for a customer's domain it is THEIR hostname, not ours.
    const host = request.headers.get("host")?.toLowerCase() ?? "";
    const path = new URL(request.url).pathname;
    const destination = CODES[host + path];

    // 302 (temporary), not 301, so browsers never cache a destination we may edit later.
    if (destination) return Response.redirect(destination, 302);

    return new Response(`No code for host="${host}" path="${path}"\n`, { status: 404 });
  },
};
