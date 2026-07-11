import { randomUUID } from "node:crypto";

export function createId(): string {
  return randomUUID();
}
