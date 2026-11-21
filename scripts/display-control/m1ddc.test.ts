import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  adjustedValue,
  createExecutor,
  findM1ddc,
  M1ddc,
  parseDisplays,
  percentage,
  valueAtPercentage,
} from "../../extensions/display-control/src/lib/m1ddc";
import type { Execute } from "../../extensions/display-control/src/lib/m1ddc";

const first = "10ACB8A0-0000-0000-1419-0104A2435078";
const second = "10ACB8A0-0000-0000-1419-0104A2435079";

function createClient(execute: Execute): M1ddc {
  return new M1ddc(execute, async () => undefined);
}

test("the parser preserves UUID targets for identically named monitors and names containing parentheses", () => {
  assert.deepEqual(
    parseDisplays(`[1] DELL U2723QE (${first})\n[2] DELL U2723QE (${second})\n[3] Display (USB-C) (${first})`),
    [
      { id: first, name: "DELL U2723QE" },
      { id: second, name: "DELL U2723QE" },
      { id: first, name: "Display (USB-C)" },
    ],
  );
});

test("the parser distinguishes an empty display list from malformed output", () => {
  assert.deepEqual(parseDisplays(""), []);
  assert.deepEqual(parseDisplays("No external display found, aborting"), []);
  assert.throws(() => parseDisplays("DDC communication failure: 42"), /unexpected display list/);
  assert.throws(() => parseDisplays("[1] Monitor (null)"), /unexpected display list/);
});

test("adjustments respect the hardware range and still move on a low-resolution scale", () => {
  assert.equal(adjustedValue({ current: 200, maximum: 255 }, 1, 5), 213);
  assert.equal(percentage({ current: 200, maximum: 255 }), 78);
  assert.equal(adjustedValue({ current: 254, maximum: 255 }, 1, 5), 255);
  assert.equal(adjustedValue({ current: 1, maximum: 255 }, -1, 5), 0);
  assert.equal(adjustedValue({ current: 4, maximum: 10 }, 1, 1), 5);
  assert.throws(() => adjustedValue({ current: 50, maximum: 100 }, 1, NaN));
  assert.throws(() => adjustedValue({ current: 50, maximum: 100 }, 1, 101));
});

test("one unsupported control does not hide the remaining controls", async () => {
  const client = createClient(async (args) => {
    assert.equal(args[1], first);
    if (args[3] === "volume") throw new Error("The display rejected the volume query.");
    return args[2] === "max" ? "255" : "100";
  });
  const state = await client.readControls(first);
  assert.match(state.volume.error ?? "", /rejected/);
  assert.deepEqual(state.luminance.reading, { current: 100, maximum: 255 });
  assert.deepEqual(state.contrast.reading, { current: 100, maximum: 255 });
});

test("invalid numeric replies and unsupported ranges remain unavailable", async () => {
  for (const output of ["", "error 50", "-1", "65536", "NaN", "Writing 50", "50.5"]) {
    const state = await createClient(async () => output).readControls(first);
    assert.ok(state.volume.error, output);
  }
  const zero = await createClient(async () => "0").readControls(first);
  assert.match(zero.volume.error ?? "", /invalid range/);
  const overflow = await createClient(async (args) => (args[2] === "max" ? "50" : "60")).readControls(first);
  assert.match(overflow.luminance.error ?? "", /invalid range/);
});

test("rapid presses execute serially and use fresh values while preserving the selected UUID", async () => {
  const calls: string[][] = [];
  let current = 50;
  let active = 0;
  const execute: Execute = async (args) => {
    calls.push(args);
    assert.equal(args[1], first);
    assert.equal(active++, 0);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active--;
    if (args[2] === "max") return "100";
    if (args[2] === "set") {
      current = Number(args[4]);
      return `Writing ${current}`;
    }
    return String(current);
  };
  const client = createClient(execute);
  const results = await Promise.all([
    client.adjust(first, "volume", 1, 5),
    client.adjust(first, "volume", 1, 5),
    client.adjust(first, "volume", -1, 5),
  ]);
  assert.deepEqual(
    results.map((reading) => reading.current),
    [55, 60, 55],
  );
  assert.deepEqual(
    calls.filter((args) => args[2] === "set").map((args) => args[4]),
    ["55", "60", "55"],
  );
});

test("a write reports the monitor's readback rather than the requested target", async () => {
  let wrote = false;
  const client = createClient(async (args) => {
    if (args[2] === "max") return "100";
    if (args[2] === "set") {
      wrote = true;
      return "Writing 55";
    }
    return wrote ? "54" : "50";
  });
  assert.deepEqual(await client.adjust(first, "volume", 1, 5), { current: 54, maximum: 100 });
});

test("a disconnected monitor never falls back to another display and does not poison the queue", async () => {
  const calls: string[][] = [];
  const client = createClient(async (args) => {
    calls.push(args);
    if (args[1] === first) throw new Error("The specified display does not exist.");
    return args[2] === "max" ? "100" : "50";
  });
  await assert.rejects(client.adjust(first, "volume", 1, 5), /does not exist/);
  const state = await client.readControls(second);
  assert.equal(state.volume.reading?.current, 50);
  assert.ok(calls.every((args) => args[0] === "display" && [first, second].includes(args[1])));
  assert.ok(!calls.some((args) => args[2] === "set"));
});

test("an aborted selection stops further control reads", async () => {
  const controller = new AbortController();
  const calls: string[][] = [];
  const client = createClient(async (args) => {
    calls.push(args);
    controller.abort();
    return "50";
  });
  await assert.rejects(client.readControls(first, controller.signal), { name: "AbortError" });
  assert.equal(calls.length, 1);
});

test("the process boundary handles paths with spaces and passes arguments without a shell", async () => {
  const directory = await mkdtemp(join(tmpdir(), "display control test "));
  const executable = join(directory, "fake m1ddc");
  try {
    await writeFile(
      executable,
      `#!${process.execPath}\nif (process.argv[2] === 'fail') { console.log('The specified display does not exist.'); process.exit(1); }\nconsole.log(JSON.stringify(process.argv.slice(2)));\n`,
      { mode: 0o755 },
    );
    assert.equal(await findM1ddc(executable), executable);
    const execute = createExecutor(executable);
    const args = ["display", "$(touch should-never-exist)", "get", "volume"];
    assert.deepEqual(JSON.parse(await execute(args)), args);
    await assert.rejects(execute(["fail"]), /specified display does not exist/);
    await assert.rejects(findM1ddc("relative/m1ddc"), /absolute path/);
    await assert.rejects(findM1ddc(join(directory, "missing")), /configured m1ddc executable/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("an out-of-range readback is retried without repeating a successful write", async () => {
  let current = 50;
  let writes = 0;
  let badReply = true;
  const calls: string[][] = [];
  const client = createClient(async (args) => {
    calls.push(args);
    if (args[2] === "max") return "100";
    if (args[2] === "set") {
      current = Number(args[4]);
      writes++;
      return `Writing ${current}`;
    }
    if (writes && badReply) {
      badReply = false;
      return "48750";
    }
    return String(current);
  });
  assert.deepEqual(await client.adjust(first, "volume", 1, 5), { current: 55, maximum: 100 });
  assert.equal(writes, 1);
  assert.equal(calls.filter((args) => args[2] === "max").length, 2);
});

test("an inconsistent maximum cannot turn into an unsafe volume target", async () => {
  let maximumReads = 0;
  let current = 50;
  const targets: string[] = [];
  const client = createClient(async (args) => {
    if (args[2] === "max") return ++maximumReads === 1 ? "48750" : "100";
    if (args[2] === "set") {
      targets.push(args[4]);
      current = Number(args[4]);
      return `Writing ${current}`;
    }
    return String(current);
  });
  assert.equal((await client.adjust(first, "volume", 1, 5)).current, 55);
  assert.deepEqual(targets, ["55"]);
});

test("failed readback keeps a labeled requested level and subsequent presses remain bounded", async () => {
  const targets: number[] = [];
  const client = createClient(async (args) => {
    if (args[2] === "max") return "100";
    if (args[2] === "set") {
      targets.push(Number(args[4]));
      return `Writing ${args[4]}`;
    }
    return targets.length ? "48750" : "50";
  });
  assert.deepEqual(await client.adjust(first, "volume", 1, 5), { current: 55, maximum: 100, unconfirmed: true });
  assert.deepEqual(await client.adjust(first, "volume", 1, 5), { current: 60, maximum: 100, unconfirmed: true });
  assert.deepEqual(targets, [55, 60]);
});

test("a temporary transport failure retries the same absolute target on the same display", async () => {
  let current = 50;
  const targets: string[] = [];
  const client = createClient(async (args) => {
    assert.equal(args[1], first);
    if (args[2] === "max") return "100";
    if (args[2] === "set") {
      targets.push(args[4]);
      if (targets.length === 1) throw new Error("Could not find a suitable external display.");
      current = Number(args[4]);
      return `Writing ${current}`;
    }
    return String(current);
  });
  assert.equal((await client.adjust(first, "volume", 1, 5)).current, 55);
  assert.deepEqual(targets, ["55", "55"]);
});

test("an unreadable refresh retains the last valid control so the user can retry", async () => {
  let fails = false;
  const client = createClient(async (args) => {
    if (fails) throw new Error("Could not find a suitable external display.");
    return args[2] === "max" ? "100" : "50";
  });
  await client.readControls(first);
  fails = true;
  const state = await client.readControls(first);
  assert.deepEqual(state.volume.reading, { current: 50, maximum: 100 });
  assert.match(state.volume.error ?? "", /suitable external display/);
});

test("DDC commands have a cooldown and in-flight queries do not inherit selection cancellation", async () => {
  const delays: number[] = [];
  let commands = 0;
  const client = new M1ddc(
    async (args, signal) => {
      assert.equal(signal, undefined);
      commands++;
      return args[2] === "max" ? "100" : "50";
    },
    async (milliseconds) => {
      delays.push(milliseconds);
    },
  );
  await client.readControls(first);
  assert.equal(commands, 9);
  assert.deepEqual(delays, Array(commands - 1).fill(100));
});

test("reset percentages map to the hardware range including zero and the maximum", () => {
  assert.equal(valueAtPercentage(20, 255), 51);
  assert.equal(valueAtPercentage(0, 255), 0);
  assert.equal(valueAtPercentage(100, 255), 255);
  for (const invalid of [-1, 101, NaN, Infinity]) assert.throws(() => valueAtPercentage(invalid, 100));
});

test("reset writes the configured percentage on the selected display instead of applying a step", async () => {
  let current = 180;
  const targets: string[] = [];
  const client = createClient(async (args) => {
    assert.equal(args[1], first);
    if (args[2] === "max") return "255";
    if (args[2] === "set") {
      targets.push(args[4]);
      current = Number(args[4]);
      return `Writing ${current}`;
    }
    return String(current);
  });
  assert.deepEqual(await client.set(first, "volume", 20), { current: 51, maximum: 255 });
  assert.deepEqual(await client.set(first, "volume", 0), { current: 0, maximum: 255 });
  assert.deepEqual(targets, ["51", "0"]);
});

test("reset keeps an unconfirmed value labeled and invalid reset values never reach the display", async () => {
  const targets: string[] = [];
  const client = createClient(async (args) => {
    if (args[2] === "max") return "100";
    if (args[2] === "set") {
      targets.push(args[4]);
      return `Writing ${args[4]}`;
    }
    return targets.length ? "48750" : "50";
  });
  await assert.rejects(client.set(first, "volume", 101), /between 0% and 100%/);
  assert.deepEqual(targets, []);
  assert.deepEqual(await client.set(first, "volume", 20), { current: 20, maximum: 100, unconfirmed: true });
  assert.deepEqual(targets, ["20"]);
});
