import assert from "node:assert/strict";
import { test } from "node:test";
import { M1ddc, M1ddcNotFoundError } from "../../extensions/monitor-control/src/lib/m1ddc";
import { MonitorService } from "../../extensions/monitor-control/src/lib/monitors";
import type { Execute } from "../../extensions/monitor-control/src/lib/m1ddc";
import type { Monitor } from "../../extensions/monitor-control/src/lib/monitors";

const builtin: Monitor = {
  id: "AA000000-0000-0000-0000-000000000001",
  name: "Built-in Display",
  builtIn: true,
  ddc: false,
};
const external: Monitor = {
  id: "BB000000-0000-0000-0000-000000000002",
  name: "DELL U2723QE",
  builtIn: false,
  ddc: true,
};

function createClient(execute: Execute): M1ddc {
  return new M1ddc(execute, async () => undefined);
}

test("discovery matches DDC displays to native UUIDs regardless of casing", async () => {
  const client = createClient(async () => `[1] DELL U2723QE (${external.id.toLowerCase()})`);
  const service = new MonitorService(
    async () => JSON.stringify([builtin, external]),
    undefined,
    async () => client,
  );
  const result = await service.discover();
  assert.equal(result.monitors.length, 2);
  assert.equal(result.monitors[1].ddc, true);
  assert.equal(result.warning, undefined);
  assert.equal(result.m1ddcMissing, false);
});

test("DDC displays remain usable when the native display lookup fails", async () => {
  const client = createClient(async (args) => {
    if (args[1] === "list") return `[1] DELL U2723QE (${external.id})`;
    return args[2] === "max" ? "100" : "50";
  });
  const service = new MonitorService(
    async () => {
      throw new Error("macOS could not list displays.");
    },
    undefined,
    async () => client,
  );
  const result = await service.discover();
  assert.deepEqual(result.monitors, [external]);
  assert.match(result.warning ?? "", /macOS could not list displays/);
  assert.equal((await service.readControls(result.monitors[0])).volume.reading?.current, 50);
});

test("built-in controls remain usable when m1ddc is missing", async () => {
  const calls: string[][] = [];
  const native: Execute = async (args) => {
    calls.push(args);
    return args[0] === "list" ? JSON.stringify([builtin, external]) : JSON.stringify({ current: 42, maximum: 100 });
  };
  const service = new MonitorService(native, undefined, async () => {
    throw new M1ddcNotFoundError();
  });
  const result = await service.discover();
  assert.match(result.warning ?? "", /Install m1ddc/);
  assert.equal(result.m1ddcMissing, true);
  assert.equal(result.monitors[1].ddc, false);
  const state = await service.readControls(result.monitors[0]);
  assert.equal(state.volume.reading?.current, 42);
  assert.equal(state.luminance.reading?.current, 42);
  assert.match(state.contrast.error ?? "", /does not expose contrast/);
  assert.equal((await service.readControls(result.monitors[1])).volume.reading, undefined);
  await service.adjust(result.monitors[0], "volume", -1, 5);
  assert.deepEqual(calls.at(-1), ["adjust", builtin.id, "volume", "-5"]);
  assert.ok(!calls.some((args) => args.includes("contrast")));
});

test("checking again clears the installation prompt after m1ddc becomes available", async () => {
  let installed = false;
  const client = createClient(async () => `[1] DELL U2723QE (${external.id})`);
  const service = new MonitorService(
    async () => JSON.stringify([builtin, external]),
    undefined,
    async () => {
      if (!installed) throw new M1ddcNotFoundError();
      return client;
    },
  );
  assert.equal((await service.discover()).m1ddcMissing, true);
  installed = true;
  const result = await service.discover();
  assert.equal(result.m1ddcMissing, false);
  assert.equal(result.monitors[1].ddc, true);
  assert.equal(result.warning, undefined);
});

test("display communication failures do not ask users to install an existing dependency", async () => {
  const service = new MonitorService(
    async () => JSON.stringify([builtin, external]),
    undefined,
    async () =>
      createClient(async () => {
        throw new Error("DDC communication failure.");
      }),
  );
  const result = await service.discover();
  assert.equal(result.m1ddcMissing, false);
  assert.match(result.warning ?? "", /DDC communication failure/);
});

test("one failed native control does not hide another, and invalid readings are unavailable", async () => {
  const service = new MonitorService(async (args) => {
    if (args[2] === "volume") throw new Error("The built-in speakers are unavailable.");
    return JSON.stringify({ current: 63.25, maximum: 100 });
  });
  const state = await service.readControls(builtin);
  assert.match(state.volume.error ?? "", /speakers are unavailable/);
  assert.equal(state.luminance.reading?.current, 63.25);
  const invalid = new MonitorService(async () => JSON.stringify({ current: 150, maximum: 100 }));
  assert.equal((await invalid.readControls(builtin)).luminance.reading, undefined);
});

test("native adjustments execute serially and keep targeting the chosen display", async () => {
  let current = 40;
  let active = false;
  const service = new MonitorService(async (args) => {
    assert.equal(active, false);
    active = true;
    assert.equal(args[1], builtin.id);
    await new Promise((resolve) => setTimeout(resolve, 1));
    current += Number(args[3]);
    active = false;
    return JSON.stringify({ current, maximum: 100 });
  });
  const results = await Promise.all([service.adjust(builtin, "volume", 1, 5), service.adjust(builtin, "volume", 1, 5)]);
  assert.deepEqual(
    results.map((value) => value.current),
    [45, 50],
  );
  await assert.rejects(service.adjust(builtin, "contrast", 1, 5), /does not support contrast/);
  await assert.rejects(service.adjust({ ...external, ddc: false }, "volume", 1, 5), /unavailable through m1ddc/);
});

test("rediscovery waits for an in-flight DDC read before replacing its transport", async () => {
  let releaseRead: () => void;
  let notifyStarted: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  const started = new Promise<void>((resolve) => {
    notifyStarted = resolve;
  });
  let clients = 0;
  const client = createClient(async (args) => {
    if (args[1] === "list") return `[1] DELL U2723QE (${external.id})`;
    if (args[2] === "get") {
      notifyStarted();
      await gate;
    }
    return args[2] === "max" ? "100" : "50";
  });
  const service = new MonitorService(
    async () => JSON.stringify([builtin, external]),
    undefined,
    async () => {
      clients++;
      return client;
    },
  );
  await service.discover();
  const controller = new AbortController();
  const rejectedRead = assert.rejects(service.readControls(external, controller.signal), { name: "AbortError" });
  await started;
  const discovery = service.discover();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const clientsBeforeReadFinished = clients;
  controller.abort();
  releaseRead!();
  await rejectedRead;
  await discovery;
  assert.equal(clientsBeforeReadFinished, 1);
  assert.equal(clients, 2);
});

test("native resets use an absolute percentage and reject unsupported controls before writing", async () => {
  const calls: string[][] = [];
  const service = new MonitorService(async (args) => {
    calls.push(args);
    assert.equal(args[0], "set");
    return JSON.stringify({ current: Number(args[3]), maximum: 100 });
  });
  assert.equal((await service.set(builtin, "volume", 20)).current, 20);
  assert.equal((await service.set(builtin, "luminance", 50)).current, 50);
  assert.deepEqual(calls, [
    ["set", builtin.id, "volume", "20"],
    ["set", builtin.id, "luminance", "50"],
  ]);
  await assert.rejects(service.set(builtin, "contrast", 50), /does not support contrast/);
  await assert.rejects(service.set(builtin, "volume", -1), /between 0% and 100%/);
  assert.equal(calls.length, 2);
});

test("external resets target the selected monitor and setting without discovery cannot write", async () => {
  let current = 75;
  const targets: string[][] = [];
  const client = createClient(async (args) => {
    if (args[1] === "list") return `[1] DELL U2723QE (${external.id})`;
    if (args[2] === "max") return "100";
    if (args[2] === "set") {
      targets.push(args);
      current = Number(args[4]);
      return `Writing ${current}`;
    }
    return String(current);
  });
  const service = new MonitorService(
    async () => JSON.stringify([builtin, external]),
    undefined,
    async () => client,
  );
  await assert.rejects(service.set(external, "contrast", 50), /unavailable through m1ddc/);
  await service.discover();
  assert.equal((await service.set(external, "contrast", 50)).current, 50);
  assert.deepEqual(targets, [["display", external.id, "set", "contrast", "50"]]);
});
