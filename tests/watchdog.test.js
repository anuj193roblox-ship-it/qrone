import test from "node:test";
import assert from "node:assert/strict";
import { classify, checkUrl, nextState, runChecks, FAILS_TO_SWITCH } from "../app/src/watchdog.js";
import { decide } from "../worker/src/resolve.js";

const NOW = 1_800_000_000;
const OWN = ["qrone-redirect.example.dev"];
const reply = (status, location) => new Response(null, { status, headers: location ? { location } : {} });

test("only clear signs of a dead page count as failures", () => {
  for (const s of [200, 204, 301, 302, 304]) assert.equal(classify(s), "ok", String(s));
  for (const s of [404, 410, 500, 502, 503]) assert.equal(classify(s), "fail", String(s));
  for (const s of [401, 403, 429, 400, 405, 451]) assert.equal(classify(s), "unknown", String(s));
});

test("redirects are followed by hand, including relative ones", async (t) => {
  const seen = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    seen.push(url);
    assert.equal(init.redirect, "manual");
    if (url === "https://a.example/menu") return reply(301, "/menu/");
    if (url === "https://a.example/menu/") return reply(302, "https://b.example/final");
    return reply(200);
  });
  assert.equal(await checkUrl("https://a.example/menu", OWN), "ok");
  assert.deepEqual(seen, ["https://a.example/menu", "https://a.example/menu/", "https://b.example/final"]);
});

test("a redirect to an unsafe place, our own short links, or nowhere fails", async (t) => {
  for (const location of ["javascript:alert(1)", "https://qrone-redirect.example.dev/abc", "http://user:pw@x.example/"]) {
    t.mock.method(globalThis, "fetch", async () => reply(302, location));
    assert.equal(await checkUrl("https://a.example/", OWN), "fail", location);
    t.mock.restoreAll();
  }
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("getaddrinfo ENOTFOUND"); });
  assert.equal(await checkUrl("https://gone.example/", OWN), "fail");
});

test("an endless chain of redirects is 'unknown', not proof the page is gone", async (t) => {
  let n = 0;
  t.mock.method(globalThis, "fetch", async () => reply(302, `https://a.example/${++n}`));
  assert.equal(await checkUrl("https://a.example/0", OWN), "unknown");
  assert.equal(n, 4, "the first request plus 3 redirects, then stop");
});

test("three failures in a row make a code failing; one success brings it back", () => {
  let row = { check_status: "ok", check_fails: 0, failing_since: null };
  for (let i = 1; i < FAILS_TO_SWITCH; i++) {
    row = nextState(row, "fail", NOW + i);
    assert.equal(row.check_status, "ok", `still ok after ${i} failure(s)`);
  }
  row = nextState(row, "fail", NOW + 99);
  assert.deepEqual(row, { check_status: "failing", check_fails: 3, failing_since: NOW + 99 });
  row = nextState(row, "fail", NOW + 200);
  assert.equal(row.failing_since, NOW + 99, "keeps the time it first started failing");
  assert.deepEqual(nextState(row, "ok", NOW + 300), { check_status: "ok", check_fails: 0, failing_since: null });
});

test("'unknown' never flips a code either way", () => {
  const failing = { check_status: "failing", check_fails: 4, failing_since: NOW };
  assert.deepEqual(nextState(failing, "unknown", NOW + 1), failing);
  const halfway = { check_status: "ok", check_fails: 2, failing_since: null };
  assert.deepEqual(nextState(halfway, "unknown", NOW + 1), { check_status: "unknown", check_fails: 0, failing_since: null });
});

test("scans go to the backup only while the destination is failing", () => {
  const row = { destination: "https://shop.example/menu", backup_destination: "https://shop.example/closed", expires_at: null, ends_at: null, disabled: 0 };
  assert.deepEqual(decide({ ...row, check_status: "ok" }, NOW), { status: 302, location: row.destination });
  assert.deepEqual(decide({ ...row, check_status: "failing" }, NOW), { status: 302, location: row.backup_destination });
  assert.deepEqual(decide({ ...row, check_status: "failing", backup_destination: null }, NOW), { status: 302, location: row.destination },
    "no backup: keep sending people to the destination");
  assert.equal(decide({ ...row, check_status: "failing", ends_at: NOW - 1 }, NOW).page, "ended", "an ended code stays ended");
  assert.equal(decide({ ...row, check_status: "failing", disabled: 1 }, NOW).page, "disabled");
  assert.deepEqual(decide({ ...row, check_status: "failing", backup_destination: "https://qrone-redirect.example.dev/x" }, NOW, OWN),
    { status: 302, location: row.destination }, "an unsafe backup is ignored");
});

test("a run checks the due codes and saves each result only if the destination didn't change meanwhile", async (t) => {
  const due = [
    { id: 1, destination: "https://up.example/", check_status: null, check_fails: 0, failing_since: null },
    { id: 2, destination: "https://down.example/", check_status: "ok", check_fails: 2, failing_since: null },
  ];
  const updates = [];
  const DB = {
    prepare: (sql) => ({
      bind: (...args) => ({
        sql, args,
        all: async () => {
          assert.deepEqual(args, [NOW, 10]);
          return { results: due };
        },
      }),
    }),
    batch: async (stmts) => { updates.push(...stmts); },
  };
  t.mock.method(globalThis, "fetch", async (url) => reply(url.startsWith("https://up.") ? 200 : 503));
  assert.equal(await runChecks({ DB, REDIRECT_ORIGIN: "https://qrone-redirect.example.dev" }, NOW), 2);
  assert.match(updates[0].sql, /WHERE id = \?5 AND destination = \?6$/);
  assert.deepEqual(updates[0].args, ["ok", 0, null, NOW, 1, "https://up.example/"]);
  assert.deepEqual(updates[1].args, ["failing", 3, NOW, NOW, 2, "https://down.example/"]);
});
