import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Run with: node --test scripts/sensor-ingestion.test.mjs
// All Firebase access is replaced with in-memory documents. No credentials,
// network requests, or production writes are used by this regression suite.
const timestamp = (value = Date.now()) => ({ toMillis: () => value });
const station = {
  name: "Test River",
  thresholds: { watchCm: 20, warningCm: 40, dangerCm: 60, riseRateThresholdCmPerHour: 10 },
};

function harness({ stationExists = true, failRead, failWrite, failNotifications } = {}) {
  const documents = new Map();
  if (stationExists) documents.set("stations/test", station);
  const errors = [];
  const deliverySizes = [];
  let nextId = 0;
  let failDelivery = failNotifications;

  const snapshot = (path) => ({
    id: path.split("/").at(-1),
    ref: doc(path),
    exists: documents.has(path),
    data: () => documents.get(path),
  });
  function doc(path) {
    return {
      id: path.split("/").at(-1),
      path,
      get: async () => snapshot(path),
      collection: (name) => query(`${path}/${name}`),
      set: async (data) => {
        if (failWrite) throw new Error("Simulated storage failure");
        documents.set(path, data);
      },
      update: async (data) => documents.set(path, { ...documents.get(path), ...data }),
    };
  }
  function query(path, filters = [], ordering, count = Infinity) {
    return {
      doc: (id = `generated-${++nextId}`) => doc(`${path}/${id}`),
      where: (field, op, value) => query(path, [...filters, { field, op, value }], ordering, count),
      orderBy: (field, direction) => query(path, filters, { field, direction }, count),
      limit: (value) => query(path, filters, ordering, value),
      get: async () => {
        if (failRead?.(path)) throw new Error("Simulated query failure");
        let matches = [...documents.keys()].filter((key) =>
          key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes("/")
        ).map(snapshot).filter((item) => filters.every(({ field, op, value }) => {
          const current = item.data()[field];
          if (op === "==") return current === value;
          if (op === "array-contains") return current?.includes(value);
          if (op === ">=") return current.toMillis() >= value.toMillis();
          throw new Error(`Unexpected query operator ${op}`);
        }));
        if (ordering) {
          matches.sort((a, b) => (a.data()[ordering.field].toMillis() - b.data()[ordering.field].toMillis()) *
            (ordering.direction === "desc" ? -1 : 1));
        }
        matches = matches.slice(0, count);
        return { docs: matches, size: matches.length, empty: matches.length === 0 };
      },
    };
  }
  const adminDb = {
    collection: query,
    runTransaction: async (callback) => {
      const pending = [];
      const result = await callback({
        get: (reference) => reference.get(),
        getAll: async (...references) => {
          if (failDelivery) {
            failDelivery = false;
            throw new Error("Simulated notification failure");
          }
          deliverySizes.push(references.length);
          return references.map((reference) => snapshot(reference.path));
        },
        create: (reference, data) => {
          assert.equal(documents.has(reference.path), false, "create must not overwrite an existing document");
          pending.push([reference.path, data]);
        },
      });
      for (const [path, data] of pending) documents.set(path, data);
      return result;
    },
  };
  const cache = new Map();
  const modules = {
    "@/lib/firebase-admin": { adminDb, Timestamp: { now: timestamp, fromMillis: timestamp } },
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options.status }) } },
  };
  function load(relativePath) {
    if (cache.has(relativePath)) return cache.get(relativePath);
    const filename = fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
    const source = readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    });
    const loadedModule = { exports: {} };
    cache.set(relativePath, loadedModule.exports);
    vm.runInNewContext(outputText, {
      module: loadedModule,
      exports: loadedModule.exports,
      require: (name) => {
        if (modules[name]) return modules[name];
        if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
        throw new Error(`Unexpected import: ${name}`);
      },
      process: { env: { DEVICE_API_KEY: "device-test-key" } },
      console: { error: (...args) => errors.push(args) },
    }, { filename });
    return loadedModule.exports;
  }
  const { POST } = load("app/api/sensors/[stationId]/reading/route.ts");
  return {
    documents,
    errors,
    deliverySizes,
    notifications: load("lib/notifications.ts"),
    post: (body, { key = "device-test-key", invalidJson = false } = {}) => POST({
      headers: { get: () => key },
      json: async () => {
        if (invalidJson) throw new SyntaxError("Invalid JSON");
        return body;
      },
    }, { params: Promise.resolve({ stationId: "test" }) }),
  };
}

test("unauthorized devices cannot write readings", async () => {
  const app = harness();
  const response = await app.post({ waterLevel: 10 }, { key: "wrong-key" });
  assert.equal(response.status, 401);
  assert.equal(app.documents.size, 1);
});

test("invalid JSON and malformed sensor values return 400 without saving", async () => {
  const app = harness();
  for (const body of [null, [], "text", 12, {}, { waterLevel: "10" }, { waterLevel: -1 },
    { waterLevel: 1001 }, { waterLevel: NaN }, { waterLevel: 10, rainfall: -1 },
    { waterLevel: 10, rainfall: "5" }, { waterLevel: 10, rainfall: null }]) {
    assert.equal((await app.post(body)).status, 400, `invalid body: ${JSON.stringify(body)}`);
  }
  assert.equal((await app.post({}, { invalidJson: true })).status, 400);
  assert.equal(app.documents.size, 1);
});

test("unknown stations and storage failures are reported accurately", async () => {
  assert.equal((await harness({ stationExists: false }).post({ waterLevel: 10 })).status, 404);
  const app = harness({ failWrite: true });
  assert.equal((await app.post({ waterLevel: 10 })).status, 500);
  assert.equal(app.documents.size, 1);
});

test("valid readings are saved and omitted rainfall defaults to zero", async () => {
  const app = harness();
  const response = await app.post({ waterLevel: 0 });
  assert.equal(response.status, 201);
  assert.equal(response.body.ok, true);
  const reading = app.documents.get(`stations/test/readings/${response.body.readingId}`);
  assert.equal(reading.waterLevel, 0);
  assert.equal(reading.rainfall, 0);
  assert.equal(typeof reading.timestamp.toMillis(), "number");
});

test("alert query failures do not report an already persisted sample as failed", async () => {
  const app = harness({ failRead: (path) => path === "alerts" });
  const response = await app.post({ waterLevel: 70, rainfall: 8 });
  assert.equal(response.status, 201);
  assert.match(response.body.warning, /Reading saved/);
  assert.equal(app.documents.get(`stations/test/readings/${response.body.readingId}`).waterLevel, 70);
  assert.equal(app.errors.length, 1);
});

test("hard-threshold alerts work without a trend query and notify once", async () => {
  const app = harness({ failRead: (path) => path.endsWith("/readings") });
  app.documents.set("users/resident", { role: "resident", subscribedStationIds: ["test"] });
  const first = await app.post({ waterLevel: 70 });
  assert.equal(first.status, 201);
  assert.equal(first.body.warning, undefined);
  const [notificationPath, notification] = [...app.documents].find(([path]) => path.startsWith("notifications/"));
  app.documents.set(notificationPath, { ...notification, read: true });
  await app.post({ waterLevel: 75 });
  assert.equal([...app.documents.keys()].filter((path) => path.startsWith("alerts/")).length, 1);
  assert.equal([...app.documents.keys()].filter((path) => path.startsWith("notifications/")).length, 1);
  assert.equal(app.documents.get(notificationPath).read, true);
  assert.equal(app.deliverySizes.length, 1);
});

test("failed notification delivery remains pending and is retried on the next reading", async () => {
  const app = harness({ failNotifications: true });
  app.documents.set("users/resident", { role: "resident", subscribedStationIds: ["test"] });
  assert.match((await app.post({ waterLevel: 70 })).body.warning, /Reading saved/);
  const [alertPath] = [...app.documents].find(([path]) => path.startsWith("alerts/"));
  assert.equal(app.documents.get(alertPath).notificationsSentAt, null);
  assert.equal((await app.post({ waterLevel: 72 })).body.warning, undefined);
  assert.ok(app.documents.get(alertPath).notificationsSentAt);
  assert.equal([...app.documents.keys()].filter((path) => path.startsWith("notifications/")).length, 1);
});

test("notification retries preserve read state and split large subscriber lists", async () => {
  const app = harness();
  for (let index = 0; index < 401; index++) {
    app.documents.set(`users/resident-${index}`, { role: "resident", subscribedStationIds: ["test"] });
  }
  const alert = { alertId: "incident", waterLevel: 70, cause: "threshold" };
  await app.notifications.notifySubscribedResidents("test", "danger", alert);
  const itemPath = "notifications/resident-0/items/incident";
  app.documents.set(itemPath, { ...app.documents.get(itemPath), read: true });
  await app.notifications.notifySubscribedResidents("test", "danger", alert);
  assert.equal(app.documents.get(itemPath).read, true);
  assert.equal([...app.documents.keys()].filter((path) => path.startsWith("notifications/")).length, 401);
  assert.deepEqual(app.deliverySizes, [400, 1, 400, 1]);
});

test("rising-trend notifications do not falsely claim the threshold was crossed", () => {
  const { notifications } = harness();
  const message = notifications.buildAlertMessage("Test River", "watch", 10, 20, "rising_trend");
  assert.match(message, /rate of rise/);
  assert.doesNotMatch(message, /above.*threshold/);
  assert.match(notifications.buildAlertMessage("Test River", "watch", 20, 20), /at or above/);
});
