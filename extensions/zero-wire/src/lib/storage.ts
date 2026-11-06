import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import lockfile from "proper-lockfile";
import { databaseSchema, emptyDatabase, type Database } from "./model";

export class Repository {
  constructor(private readonly directory: string) {}
  async read(): Promise<Database> {
    let raw: string;
    try {
      raw = await readFile(join(this.directory, "state.json"), "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return emptyDatabase();
      throw error;
    }
    return databaseSchema.parse(JSON.parse(raw));
  }
  async exclusive<T>(name: "state" | "sync", operation: () => Promise<T>): Promise<T> {
    await mkdir(this.directory, { recursive: true });
    const release = await lockfile.lock(join(this.directory, name), {
      realpath: false,
      stale: 60000,
      retries: { retries: 100, factor: 1, minTimeout: 200, maxTimeout: 200 },
    });
    try {
      return await operation();
    } finally {
      await release();
    }
  }
  async update(change: (db: Database) => Database): Promise<Database> {
    return this.exclusive("state", async () => {
      const current = await this.read();
      const next = databaseSchema.parse({ ...change(current), revision: current.revision + 1 });
      const temporary = join(this.directory, `state-${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
        await rename(temporary, join(this.directory, "state.json"));
      } finally {
        await unlink(temporary).catch((error) => {
          if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
        });
      }
      return next;
    });
  }
}
