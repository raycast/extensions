export async function openProject(open: () => Promise<void>, close: () => Promise<void>): Promise<void> {
  await Promise.all([open(), close()]);
}
