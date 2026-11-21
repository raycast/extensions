import assert from "node:assert/strict";
import { test } from "node:test";
import { M1ddc, M1ddcNotFoundError } from "../../extensions/display-control/src/lib/m1ddc";
import { MonitorService } from "../../extensions/display-control/src/lib/monitors";
import type { Execute } from "../../extensions/display-control/src/lib/m1ddc";
import type { Monitor } from "../../extensions/display-control/src/lib/monitors";

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

test("a fresh DDC client retains last known levels after a failed refresh and uses fresh hardware values for recovery", async () => {
  let clients = 0;
  let failVolume = false;
  let volume = 42;
  let brightness = 60;
  const targets: string[][] = [];
  const service = new MonitorService(
    async () => JSON.stringify([external]),
    undefined,
    async () => {
      clients++;
      return createClient(async (args) => {
        if (args[1] === "list") return `[1] DELL U2723QE (${external.id})`;
        if (args[3] === "volume" && failVolume) throw new Error("DDC communication failure.");
        if (args[2] === "max") return "100";
        if (args[2] === "set") {
          targets.push(args);
          volume = Number(args[4]);
          return `Writing ${volume}`;
        }
        return String(args[3] === "volume" ? volume : args[3] === "luminance" ? brightness : 75);
      });
    },
  );
  await service.discover();
  await service.readControls(external);
  volume = 70;
  brightness = 80;
  await service.discover();
  assert.equal(clients, 2);
  assert.equal(service.getState(external.id)?.volume.reading?.current, 42);
  failVolume = true;
  const refreshed = await service.readControls(external);
  assert.equal(refreshed.volume.reading?.current, 42);
  assert.match(refreshed.volume.error ?? "", /DDC communication failure/);
  assert.equal(refreshed.luminance.reading?.current, 80);
  assert.equal(refreshed.luminance.error, undefined);
  assert.deepEqual(service.getState(external.id.toLowerCase()), refreshed);
  failVolume = false;
  assert.equal((await service.adjust(external, "volume", 1, 1)).current, 71);
  assert.deepEqual(targets, [["display", external.id, "set", "volume", "71"]]);
  assert.equal(service.getState(external.id)?.volume.reading?.current, 71);
  assert.equal(service.getState(external.id)?.volume.error, undefined);
});

test("rediscovery removes cached levels for a disconnected display", async () => {
  let connected = true;
  const service = new MonitorService(
    async () => JSON.stringify(connected ? [external] : []),
    undefined,
    async () =>
      createClient(async (args) => {
        if (args[1] === "list") return connected ? `[1] DELL U2723QE (${external.id})` : "";
        return args[2] === "max" ? "100" : "50";
      }),
  );
  await service.discover();
  await service.readControls(external);
  assert.ok(service.getState(external.id)?.volume.reading);
  connected = false;
  assert.deepEqual((await service.discover()).monitors, []);
  assert.equal(service.getState(external.id), undefined);
});

test("native levels survive rediscovery and failed writes until a successful update replaces them", async () => {
  let volume = 42;
  let failing = false;
  const service = new MonitorService(
    async (args) => {
      if (args[0] === "list") return JSON.stringify([builtin]);
      if (args[2] === "volume") {
        if (failing) throw new Error("The built-in speakers are unavailable.");
        if (args[0] === "set") volume = Number(args[3]);
        if (args[0] === "adjust") volume += Number(args[3]);
        return JSON.stringify({ current: volume, maximum: 100 });
      }
      return JSON.stringify({ current: 60, maximum: 100 });
    },
    undefined,
    async () => createClient(async () => ""),
  );
  await service.discover();
  await service.readControls(builtin);
  await service.set(builtin, "volume", 20);
  await service.discover();
  failing = true;
  const state = await service.readControls(builtin);
  assert.equal(state.volume.reading?.current, 20);
  assert.match(state.volume.error ?? "", /speakers are unavailable/);
  assert.equal(state.luminance.reading?.current, 60);
  await assert.rejects(service.adjust(builtin, "volume", 1, 1), /speakers are unavailable/);
  assert.equal(service.getState(builtin.id)?.volume.reading?.current, 20);
  failing = false;
  await service.adjust(builtin, "volume", 1, 1);
  assert.deepEqual(service.getState(builtin.id)?.volume, { reading: { current: 21, maximum: 100 } });
});

test("resetting an external display leaves another display's first read intact", async () => {
  let releaseWrite: () => void;
  let notifyWrite: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  const started = new Promise<void>((resolve) => {
    notifyWrite = resolve;
  });
  const nativeReads: string[] = [];
  const targets: string[][] = [];
  const levels = { volume: 50, luminance: 60, contrast: 75 };
  const client = createClient(async (args) => {
    if (args[1] === "list") return `[1] DELL U2723QE (${external.id})`;
    const control = args[3] as keyof typeof levels;
    if (args[2] === "max") return "100";
    if (args[2] === "set") {
      targets.push(args);
      if (control === "volume") {
        notifyWrite();
        await gate;
      }
      levels[control] = Number(args[4]);
      return `Writing ${args[4]}`;
    }
    return String(levels[control]);
  });
  const service = new MonitorService(
    async (args, signal) => {
      if (args[0] === "list") return JSON.stringify([external, builtin]);
      assert.equal(signal?.aborted, false);
      nativeReads.push(args[2]);
      return JSON.stringify({ current: args[2] === "volume" ? 25 : 56, maximum: 100 });
    },
    undefined,
    async () => client,
  );
  await service.discover();
  const resetting = (async () => {
    await service.set(external, "volume", 20);
    await service.set(external, "luminance", 50);
    await service.set(external, "contrast", 50);
  })();
  await started;
  const controller = new AbortController();
  const reading = service.readControls(builtin, controller.signal);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(nativeReads, []);
  releaseWrite!();
  const state = await reading;
  await resetting;
  assert.equal(controller.signal.aborted, false);
  assert.deepEqual(nativeReads, ["volume", "luminance"]);
  assert.equal(state.volume.reading?.current, 25);
  assert.equal(state.luminance.reading?.current, 56);
  assert.deepEqual(service.getState(builtin.id), state);
  assert.deepEqual(
    targets.map((args) => [args[1], args[3], args[4]]),
    [
      [external.id, "volume", "20"],
      [external.id, "luminance", "50"],
      [external.id, "contrast", "50"],
    ],
  );
});
