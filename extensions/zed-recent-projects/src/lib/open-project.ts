export async function openProject(open: () => Promise<void>, close: () => Promise<void>): Promise<void> {
  await open();
  await close();
}
