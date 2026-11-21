import assert from "node:assert/strict";
import { test } from "node:test";
import { CoalescedAdjustments, PressAcceleration } from "../../extensions/display-control/src/lib/adjustment-input";

test("quick presses progressively accelerate from the base step and stop at ten percent", () => {
  const acceleration = new PressAcceleration();
  const steps = Array.from({ length: 12 }, (_, index) => acceleration.nextStep("display-a/volume", 1, 1, index * 100));
  assert.deepEqual(steps, [1, 1, 2, 2, 2, 5, 5, 5, 5, 10, 10, 10]);
});

test("slower input immediately restores precision and a new burst starts from the base", () => {
  const acceleration = new PressAcceleration();
  for (let index = 0; index < 10; index++) acceleration.nextStep("display-a/volume", 1, 1, index * 100);
  assert.equal(acceleration.nextStep("display-a/volume", 1, 1, 1251), 1);
  assert.equal(acceleration.nextStep("display-a/volume", 1, 1, 1351), 1);
  assert.equal(acceleration.nextStep("display-a/volume", 1, 1, 1451), 2);
});

test("changing direction, display, or control starts at the base step", () => {
  const acceleration = new PressAcceleration();
  for (let index = 0; index < 10; index++) acceleration.nextStep("display-a/volume", 1, 1, index * 100);
  assert.equal(acceleration.nextStep("display-a/volume", -1, 1, 1000), 1);
  assert.equal(acceleration.nextStep("display-b/volume", -1, 1, 1100), 1);
  assert.equal(acceleration.nextStep("display-b/luminance", -1, 1, 1200), 1);
  assert.equal(acceleration.nextStep("display-a/volume", 1, 1, 1300), 1);
});

test("resetting or changing the base step clears the previous acceleration", () => {
  const acceleration = new PressAcceleration();
  for (let index = 0; index < 10; index++) acceleration.nextStep("display-a/volume", 1, 1, index * 100);
  acceleration.reset();
  assert.equal(acceleration.nextStep("display-a/volume", 1, 1, 1000), 1);
  assert.equal(acceleration.nextStep("display-a/volume", 1, 5, 1100), 5);
  assert.equal(acceleration.nextStep("display-a/volume", 1, 5, 1200), 5);
  assert.equal(acceleration.nextStep("display-a/volume", 1, 5, 1300), 10);
  for (let index = 0; index < 20; index++)
    assert.equal(acceleration.nextStep("display-a/volume", 1, 10, 1400 + index * 10), 10);
});

test("quick presses are measured when input arrives while a slow monitor is still responding", async () => {
  const acceleration = new PressAcceleration();
  const queue = new CoalescedAdjustments();
  const applied: number[] = [];
  let finish: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const firstStep = acceleration.nextStep("display-a/volume", 1, 1, 0);
  const first = queue.enqueue("display-a/volume", async () => {
    applied.push(firstStep);
    await gate;
  });
  for (const time of [100, 200, 300, 400, 500]) {
    const step = acceleration.nextStep("display-a/volume", 1, 1, time);
    void queue.enqueue("display-a/volume", async () => {
      applied.push(step);
    });
  }
  assert.deepEqual(applied, [1]);
  finish!();
  await first;
  assert.deepEqual(applied, [1, 5]);
});

test("pending controls remain separate and reversing direction replaces the waiting repeat", async () => {
  const queue = new CoalescedAdjustments();
  const applied: string[] = [];
  let finish: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const completion = queue.enqueue("display-a/volume", async () => {
    applied.push("volume first");
    await gate;
  });
  void queue.enqueue("display-a/volume", async () => {
    applied.push("volume up fast");
  });
  void queue.enqueue("display-a/luminance", async () => {
    applied.push("brightness up");
  });
  void queue.enqueue("display-a/volume", async () => {
    applied.push("volume down precisely");
  });
  finish!();
  await completion;
  assert.deepEqual(applied, ["volume first", "volume down precisely", "brightness up"]);
});

test("clearing pending input lets the in-flight write finish without applying old repeats", async () => {
  const queue = new CoalescedAdjustments();
  const applied: string[] = [];
  let finish: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const completion = queue.enqueue("display-a/volume", async () => {
    applied.push("in flight");
    await gate;
  });
  void queue.enqueue("display-a/volume", async () => {
    applied.push("stale repeat");
  });
  queue.clear();
  void queue.enqueue("display-b/volume", async () => {
    applied.push("new display");
  });
  finish!();
  await completion;
  assert.deepEqual(applied, ["in flight", "new display"]);
});

test("a failed operation drops waiting repeats and leaves the queue reusable", async () => {
  const queue = new CoalescedAdjustments();
  const applied: string[] = [];
  const failure = queue.enqueue("display-a/volume", async () => {
    throw new Error("The display disconnected.");
  });
  void queue.enqueue("display-a/volume", async () => {
    applied.push("stale repeat");
  });
  await assert.rejects(failure, /disconnected/);
  await queue.enqueue("display-a/volume", async () => {
    applied.push("retry");
  });
  assert.deepEqual(applied, ["retry"]);
});
