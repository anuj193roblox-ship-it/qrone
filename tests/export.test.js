import test from "node:test";
import assert from "node:assert/strict";
import { toCsv, toNetlify, toHtaccess, toNginx, toCloudflare, FORMATS, build } from "../app/src/export.js";

const NOW = 1_800_000_000; // 2027-01-15T08:00:00.000Z
const H = "go.example.test";
const code = (o) => ({ hostname: H, url: `https://${H}/${o.slug}`, label: "", expires_at: null, disabled: false, created_at: NOW - 86400, ...o });

const CODES = [
  code({ slug: "menu", label: "Table menu", destination: "https://example.com/menu" }),
  code({ slug: "trial", label: "=HYPERLINK(\"evil\")", destination: "https://example.com/a b?x=1,2", expires_at: NOW + 86400 }),
  code({ slug: "old", label: "Old, flyer", destination: "https://example.com/old", expires_at: NOW - 1 }),
  code({ slug: "off", label: "Reported", destination: "https://example.com/off", disabled: true }),
  code({ slug: "pay", destination: "https://example.com/p?ref=$ID" }),
];

const HEADER = [
  "# QrOne export, 2027-01-15T08:00:00.000Z",
  "# Each rule sends /<code> to that code's destination with a 302 (temporary) redirect.",
  "# The rules only take over your printed codes if those codes use a domain you control.",
];

test("E1 CSV: every code with its status, safe against spreadsheet formulas", () => {
  assert.equal(toCsv(CODES, NOW), [
    "short_url,name,destination,status,expires_at,ends_at,created_at",
    "https://go.example.test/menu,Table menu,https://example.com/menu,never expires,,,2027-01-14T08:00:00.000Z",
    `https://go.example.test/trial,"'=HYPERLINK(""evil"")","https://example.com/a b?x=1,2",active,2027-01-16T08:00:00.000Z,,2027-01-14T08:00:00.000Z`,
    `https://go.example.test/old,"Old, flyer",https://example.com/old,expired,2027-01-15T07:59:59.000Z,,2027-01-14T08:00:00.000Z`,
    "https://go.example.test/off,Reported,https://example.com/off,switched off,,,2027-01-14T08:00:00.000Z",
    "https://go.example.test/pay,,https://example.com/p?ref=$ID,never expires,,,2027-01-14T08:00:00.000Z",
  ].join("\r\n") + "\r\n");
});

test("E2 Netlify _redirects: one line per live code, switched-off codes left out", () => {
  assert.equal(toNetlify(CODES, NOW), [
    ...HEADER,
    "/menu  https://example.com/menu  302",
    "/trial  https://example.com/a%20b?x=1,2  302",
    "/old  https://example.com/old  302",
    "/pay  https://example.com/p?ref=$ID  302",
  ].join("\n") + "\n");
});

test("E3 .htaccess: Apache Redirect lines, quoted", () => {
  assert.equal(toHtaccess(CODES, NOW), [
    ...HEADER,
    "# Rename this file to .htaccess and put it in your site's top folder (Apache, mod_alias).",
    'Redirect 302 /menu "https://example.com/menu"',
    'Redirect 302 /trial "https://example.com/a%20b?x=1,2"',
    'Redirect 302 /old "https://example.com/old"',
    'Redirect 302 /pay "https://example.com/p?ref=$ID"',
  ].join("\n") + "\n");
});

test("E4 nginx: exact-match locations; $ is encoded so nginx can't read it as a variable", () => {
  assert.equal(toNginx(CODES, NOW), [
    ...HEADER,
    "# Paste these lines inside your server { } block, then reload nginx.",
    'location = /menu { return 302 "https://example.com/menu"; }',
    'location = /trial { return 302 "https://example.com/a%20b?x=1,2"; }',
    'location = /old { return 302 "https://example.com/old"; }',
    'location = /pay { return 302 "https://example.com/p?ref=%24ID"; }',
  ].join("\n") + "\n");
});

test("E5 Cloudflare Bulk Redirects: no header, hostname/path source, commas quoted", () => {
  assert.equal(toCloudflare(CODES), [
    "go.example.test/menu,https://example.com/menu,302",
    'go.example.test/trial,"https://example.com/a%20b?x=1,2",302',
    "go.example.test/old,https://example.com/old,302",
    "go.example.test/pay,https://example.com/p?ref=$ID,302",
  ].join("\n") + "\n");
});

test("no rule line can be split by a destination (no raw spaces, quotes or newlines)", () => {
  const nasty = [code({ slug: "x", destination: 'https://example.com/"a"\nb c' })];
  for (const f of ["netlify", "htaccess", "nginx", "cloudflare"]) {
    const rules = build[f](nasty, NOW).split("\n").filter((l) => l && !l.startsWith("#"));
    assert.equal(rules.length, 1, f); // the newline did not split the rule
    assert.ok(rules[0].includes("https://example.com/%22a%22b%20c"), `${f}: ${rules[0]}`); // quotes and space encoded
  }
});

test("every format has a file name and a builder, and an empty account exports cleanly", () => {
  for (const [key, meta] of Object.entries(FORMATS)) {
    assert.ok(meta.file && meta.type, key);
    assert.equal(typeof build[key], "function", key);
    assert.doesNotThrow(() => build[key]([], NOW), key);
  }
});

test("owner-set end times: the CSV shows them; rule files leave out codes that have ended", () => {
  const timed = [
    code({ slug: "sale", destination: "https://example.com/sale", ends_at: NOW + 3600 }),
    code({ slug: "done", destination: "https://example.com/done", ends_at: NOW - 1 }),
  ];
  const csv = toCsv(timed, NOW);
  assert.ok(csv.includes("https://example.com/sale,active,,2027-01-15T09:00:00.000Z,"), csv);
  assert.ok(csv.includes("https://example.com/done,ended,,2027-01-15T07:59:59.000Z,"), csv);
  for (const f of ["netlify", "htaccess", "nginx", "cloudflare"]) {
    const out = build[f](timed, NOW);
    assert.ok(out.includes("example.com/sale"), `${f}: a code still running is kept`);
    assert.ok(!out.includes("example.com/done"), `${f}: an ended code is left out`);
  }
});
