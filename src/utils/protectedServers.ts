import { LocalStorage } from "@raycast/api";
import { EditorType } from "../types/mcpServer";

const DEFAULT_PROTECTED_SERVERS = ["mcp-server-time"];

const UNLOCKED_SERVERS_KEY = "unlocked-protected-servers-v2";
const USER_LOCKED_SERVERS_KEY = "user-locked-servers-v2";

function createServerKey(editorType: EditorType, serverName: string): string {
  return `${editorType}:${serverName}`;
}

export async function getUserLockedServers(editorType?: EditorType): Promise<string[]> {
  try {
    const lockedData = await LocalStorage.getItem<string>(USER_LOCKED_SERVERS_KEY);
    const allLocked: string[] = lockedData ? JSON.parse(lockedData) : [];

    if (!editorType) {
      return allLocked;
    }

    const editorPrefix = `${editorType}:`;
    return allLocked.filter((key) => key.startsWith(editorPrefix)).map((key) => key.substring(editorPrefix.length));
  } catch (error) {
    console.error("Failed to load user-locked servers:", error);
    return [];
  }
}

export async function isProtectedServer(serverName: string, editorType: EditorType): Promise<boolean> {
  const isDefaultProtected = DEFAULT_PROTECTED_SERVERS.includes(serverName);
  const userLockedServers = await getUserLockedServers(editorType);
  const isUserLocked = userLockedServers.includes(serverName);
  return isDefaultProtected || isUserLocked;
}

export function isDefaultProtectedServer(serverName: string): boolean {
  return DEFAULT_PROTECTED_SERVERS.includes(serverName);
}

export async function getUnlockedServers(editorType?: EditorType): Promise<string[]> {
  try {
    const unlockedData = await LocalStorage.getItem<string>(UNLOCKED_SERVERS_KEY);
    const allUnlocked: string[] = unlockedData ? JSON.parse(unlockedData) : [];

    if (!editorType) {
      return allUnlocked;
    }

    const editorPrefix = `${editorType}:`;
    return allUnlocked.filter((key) => key.startsWith(editorPrefix)).map((key) => key.substring(editorPrefix.length));
  } catch (error) {
    console.error("Failed to load unlocked servers:", error);
    return [];
  }
}

export async function isServerUnlocked(serverName: string, editorType: EditorType): Promise<boolean> {
  const isProtected = await isProtectedServer(serverName, editorType);
  if (!isProtected) {
    return true;
  }

  const unlockedServers = await getUnlockedServers(editorType);
  return unlockedServers.includes(serverName);
}

export async function unlockServer(serverName: string, editorType: EditorType): Promise<void> {
  const isProtected = await isProtectedServer(serverName, editorType);
  if (!isProtected) {
    return;
  }

  const serverKey = createServerKey(editorType, serverName);

  const unlockedData = await LocalStorage.getItem<string>(UNLOCKED_SERVERS_KEY);
  const allUnlockedServers: string[] = unlockedData ? JSON.parse(unlockedData) : [];

  if (!allUnlockedServers.includes(serverKey)) {
    allUnlockedServers.push(serverKey);
    await LocalStorage.setItem(UNLOCKED_SERVERS_KEY, JSON.stringify(allUnlockedServers));
  }
}

export async function lockServer(serverName: string, editorType: EditorType): Promise<void> {
  const isDefaultProtected = isDefaultProtectedServer(serverName);
  const serverKey = createServerKey(editorType, serverName);

  if (isDefaultProtected) {
    const unlockedData = await LocalStorage.getItem<string>(UNLOCKED_SERVERS_KEY);
    const allUnlockedServers: string[] = unlockedData ? JSON.parse(unlockedData) : [];
    const filteredServers = allUnlockedServers.filter((key) => key !== serverKey);
    await LocalStorage.setItem(UNLOCKED_SERVERS_KEY, JSON.stringify(filteredServers));
  } else {
    const lockedData = await LocalStorage.getItem<string>(USER_LOCKED_SERVERS_KEY);
    const allUserLockedServers: string[] = lockedData ? JSON.parse(lockedData) : [];
    if (!allUserLockedServers.includes(serverKey)) {
      allUserLockedServers.push(serverKey);
      await LocalStorage.setItem(USER_LOCKED_SERVERS_KEY, JSON.stringify(allUserLockedServers));
    }

    const unlockedData = await LocalStorage.getItem<string>(UNLOCKED_SERVERS_KEY);
    const allUnlockedServers: string[] = unlockedData ? JSON.parse(unlockedData) : [];
    const filteredUnlocked = allUnlockedServers.filter((key) => key !== serverKey);
    await LocalStorage.setItem(UNLOCKED_SERVERS_KEY, JSON.stringify(filteredUnlocked));
  }
}

export async function unlockUserLockedServer(serverName: string, editorType: EditorType): Promise<void> {
  const serverKey = createServerKey(editorType, serverName);

  const lockedData = await LocalStorage.getItem<string>(USER_LOCKED_SERVERS_KEY);
  const allUserLockedServers: string[] = lockedData ? JSON.parse(lockedData) : [];
  const filteredServers = allUserLockedServers.filter((key) => key !== serverKey);
  await LocalStorage.setItem(USER_LOCKED_SERVERS_KEY, JSON.stringify(filteredServers));
}

export async function lockAllProtectedServers(): Promise<void> {
  await LocalStorage.setItem(UNLOCKED_SERVERS_KEY, JSON.stringify([]));
}

export async function getAllProtectedServers(editorType: EditorType): Promise<string[]> {
  const userLockedServers = await getUserLockedServers(editorType);
  return [...DEFAULT_PROTECTED_SERVERS, ...userLockedServers];
}

export async function validateLockedServersPresent(
  serverNames: string[],
  editorType: EditorType,
  currentServerNames?: string[],
): Promise<{
  isValid: boolean;
  missingServers: string[];
  message?: string;
}> {
  const protectedServers = await getAllProtectedServers(editorType);
  const unlockedServers = await getUnlockedServers(editorType);

  const lockedServers = protectedServers.filter((name) => !unlockedServers.includes(name));

  const relevantLockedServers = currentServerNames
    ? lockedServers.filter((name) => currentServerNames.includes(name))
    : lockedServers;

  const missingServers = relevantLockedServers.filter((name) => !serverNames.includes(name));

  if (missingServers.length > 0) {
    return {
      isValid: false,
      missingServers,
      message: `Cannot save configuration: ${missingServers.length} locked server${missingServers.length > 1 ? "s are" : " is"} missing: ${missingServers.join(", ")}. Please unlock these servers or add them to the configuration.`,
    };
  }

  return {
    isValid: true,
    missingServers: [],
  };
}
