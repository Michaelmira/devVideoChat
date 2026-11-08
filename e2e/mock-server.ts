/**
 * Fake VideoSDK REST API and Stripe API for end-to-end tests.
 *
 *   /videosdk/v2/...   rooms and recordings
 *   /v1/...            the Stripe endpoints the app calls (form-encoded, like the real API)
 *   /checkout/:id      a stand-in for the hosted Stripe Checkout page
 *   /__mock/...        test controls (inspect calls, seed data)
 *
 * State is in memory and keyed by unique ids, so parallel tests don't collide.
 */
import { randomBytes } from "node:crypto";
import http from "node:http";
import { MOCK_PORT } from "./env";

type Json = Record<string, unknown>;

type Subscription = {
  id: string;
  object: "subscription";
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  items: { object: "list"; data: { id: string; current_period_end: number }[] };
};

const id = (prefix: string) => `${prefix}_${randomBytes(8).toString("hex")}`;

const state = {
  calls: [] as { service: "videosdk" | "stripe"; method: string; path: string; body: unknown; at: number }[],
  rooms: new Map<string, { active: boolean; recording: boolean }>(),
  recordings: new Map<string, { id: string; roomId: string; file: { fileUrl: string }; end: string }[]>(),
  /** Number of upcoming room creations that should fail. */
  failRooms: 0,
  customers: new Map<string, Json>(),
  sessions: new Map<string, Json>(),
  subscriptions: new Map<string, Subscription>(),
};

function newSubscription(customer: string, overrides: Partial<Subscription> = {}): Subscription {
  const sub: Subscription = {
    id: id("sub"),
    object: "subscription",
    customer,
    status: "active",
    cancel_at_period_end: false,
    items: {
      object: "list",
      data: [{ id: id("si"), current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 }],
    },
    ...overrides,
  };
  state.subscriptions.set(sub.id, sub);
  return sub;
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function send(res: http.ServerResponse, status: number, body: unknown, type = "application/json") {
  res.writeHead(status, { "Content-Type": type });
  res.end(type === "application/json" ? JSON.stringify(body) : String(body));
}

function stripeError(res: http.ServerResponse, status: number, message: string) {
  send(res, status, { error: { type: "invalid_request_error", message } });
}

async function videosdk(req: http.IncomingMessage, res: http.ServerResponse, path: string, url: URL) {
  if (!req.headers.authorization) return send(res, 401, { error: "missing token" });
  const raw = await readBody(req);
  const body = raw ? JSON.parse(raw) : {};
  state.calls.push({ service: "videosdk", method: req.method!, path, body, at: Date.now() });

  if (req.method === "POST" && path === "/rooms") {
    if (state.failRooms > 0) {
      state.failRooms--;
      return send(res, 500, { error: "mock failure" });
    }
    const roomId = `${randomBytes(2).toString("hex")}-${randomBytes(2).toString("hex")}-${randomBytes(2).toString("hex")}`;
    state.rooms.set(roomId, { active: true, recording: false });
    return send(res, 200, { roomId, autoCloseConfig: body.autoCloseConfig });
  }
  if (req.method === "POST" && path === "/rooms/deactivate") {
    const room = state.rooms.get(body.roomId);
    if (room) room.active = false;
    return send(res, 200, { roomId: body.roomId, disabled: true });
  }
  if (req.method === "POST" && path === "/recordings/start") {
    const room = state.rooms.get(body.roomId);
    if (!room) return send(res, 404, { error: "room not found" });
    room.recording = true;
    return send(res, 200, { message: "recording started" });
  }
  if (req.method === "POST" && path === "/recordings/end") {
    const room = state.rooms.get(body.roomId);
    if (!room?.recording) return send(res, 400, { error: "no recording" });
    room.recording = false;
    return send(res, 200, { message: "recording stopped" });
  }
  if (req.method === "GET" && path === "/recordings") {
    return send(res, 200, { data: state.recordings.get(url.searchParams.get("roomId") ?? "") ?? [] });
  }
  return send(res, 404, { error: `unknown videosdk route ${req.method} ${path}` });
}

async function stripe(req: http.IncomingMessage, res: http.ServerResponse, path: string, url: URL) {
  if (req.headers.authorization !== "Bearer sk_test_e2e") return stripeError(res, 401, "Invalid API key");
  const form = new URLSearchParams(await readBody(req));
  const body = Object.fromEntries(form);
  state.calls.push({ service: "stripe", method: req.method!, path, body, at: Date.now() });
  const parts = path.split("/").filter(Boolean); // ["v1", resource, id?]

  if (parts[1] === "customers") {
    if (req.method === "POST" && !parts[2]) {
      const customer = { id: id("cus"), object: "customer", email: body.email, name: body.name };
      state.customers.set(customer.id, customer);
      return send(res, 200, customer);
    }
    const c = state.customers.get(parts[2]);
    return c ? send(res, 200, c) : stripeError(res, 404, `No such customer: '${parts[2]}'`);
  }

  if (parts[1] === "checkout" && parts[2] === "sessions") {
    if (req.method === "POST" && !parts[3]) {
      const sid = id("cs_test");
      const session = {
        id: sid,
        object: "checkout.session",
        mode: body.mode,
        customer: body.customer,
        client_reference_id: body.client_reference_id,
        success_url: body.success_url,
        cancel_url: body.cancel_url,
        price: body["line_items[0][price]"],
        status: "open",
        subscription: null as string | null,
        url: `http://localhost:${MOCK_PORT}/checkout/${sid}`,
      };
      state.sessions.set(sid, session);
      return send(res, 200, session);
    }
    const s = state.sessions.get(parts[3]);
    if (!s) return stripeError(res, 404, `No such checkout session: '${parts[3]}'`);
    const expand = url.searchParams.getAll("expand[]").concat(url.searchParams.getAll("expand[0]"));
    if (expand.includes("subscription") && typeof s.subscription === "string") {
      return send(res, 200, { ...s, subscription: state.subscriptions.get(s.subscription) });
    }
    return send(res, 200, s);
  }

  if (parts[1] === "subscriptions" && parts[2]) {
    const sub = state.subscriptions.get(parts[2]);
    if (!sub) return stripeError(res, 404, `No such subscription: '${parts[2]}'`);
    if (req.method === "POST" && body.cancel_at_period_end !== undefined) {
      sub.cancel_at_period_end = body.cancel_at_period_end === "true";
    }
    return send(res, 200, sub);
  }

  return stripeError(res, 404, `Unrecognized request URL (${req.method}: ${path})`);
}

function checkoutPage(res: http.ServerResponse, sid: string) {
  const s = state.sessions.get(sid);
  if (!s) return send(res, 404, "No such session", "text/html");
  send(
    res,
    200,
    `<!doctype html><title>Mock Checkout</title><h1>Mock Stripe Checkout</h1>
     <p>Price: ${s.price}</p>
     <a id="pay" href="/checkout/${sid}/pay">Pay $3.00</a>
     <a id="cancel" href="${s.cancel_url}">Back</a>`,
    "text/html",
  );
}

async function control(req: http.IncomingMessage, res: http.ServerResponse, path: string, url: URL) {
  const raw = req.method === "POST" ? await readBody(req) : "";
  const body = raw ? JSON.parse(raw) : {};
  if (path === "/__mock/calls") {
    const service = url.searchParams.get("service");
    const contains = url.searchParams.get("contains");
    return send(
      res,
      200,
      state.calls.filter(
        (c) => (!service || c.service === service) && (!contains || JSON.stringify(c).includes(contains)),
      ),
    );
  }
  if (path === "/__mock/rooms") return send(res, 200, Object.fromEntries(state.rooms));
  if (path === "/__mock/fail-rooms") {
    state.failRooms += Number(body.count ?? 1);
    return send(res, 200, { failRooms: state.failRooms });
  }
  if (path === "/__mock/recordings") {
    const list = state.recordings.get(body.roomId) ?? [];
    list.push({ id: id("rec"), roomId: body.roomId, file: { fileUrl: body.fileUrl }, end: new Date().toISOString() });
    state.recordings.set(body.roomId, list);
    return send(res, 200, list);
  }
  if (path === "/__mock/customers") {
    const customer = { id: id("cus"), object: "customer", email: body.email };
    state.customers.set(customer.id, customer);
    return send(res, 200, customer);
  }
  if (path === "/__mock/subscriptions") {
    return send(res, 200, newSubscription(body.customer, body.overrides ?? {}));
  }
  if (path.startsWith("/__mock/subscriptions/")) {
    const sub = state.subscriptions.get(path.split("/").pop()!);
    if (!sub) return send(res, 404, { error: "no such subscription" });
    Object.assign(sub, body);
    return send(res, 200, sub);
  }
  return send(res, 404, { error: "unknown control route" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${MOCK_PORT}`);
    const path = url.pathname;
    if (path === "/health") return send(res, 200, { ok: true });
    if (path.startsWith("/videosdk/v2")) return await videosdk(req, res, path.slice("/videosdk/v2".length), url);
    if (path.startsWith("/v1/")) return await stripe(req, res, path, url);
    if (path.startsWith("/__mock/")) return await control(req, res, path, url);

    const pay = path.match(/^\/checkout\/([^/]+)\/pay$/);
    if (pay) {
      const s = state.sessions.get(pay[1]);
      if (!s) return send(res, 404, "No such session", "text/html");
      const sub = newSubscription(s.customer as string);
      s.subscription = sub.id;
      s.status = "complete";
      res.writeHead(303, { Location: String(s.success_url).replace("{CHECKOUT_SESSION_ID}", pay[1]) });
      return res.end();
    }
    const page = path.match(/^\/checkout\/([^/]+)$/);
    if (page) return checkoutPage(res, page[1]);
    send(res, 404, { error: "not found" });
  } catch (err) {
    console.error("[mock]", err);
    send(res, 500, { error: String(err) });
  }
});

server.listen(MOCK_PORT, () => console.log(`mock server on :${MOCK_PORT}`));
