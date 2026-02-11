import { LocalStorage, getPreferenceValues } from '@raycast/api'
import { randomUUID } from 'node:crypto'
import { PaystackAccount } from './types'

const ACCOUNTS_KEY = 'paystack_accounts'
const ACTIVE_ACCOUNT_KEY = 'paystack_active_account_id'

export async function getAccounts(): Promise<PaystackAccount[]> {
  const json = await LocalStorage.getItem<string>(ACCOUNTS_KEY)
  if (!json) return []
  return JSON.parse(json) as PaystackAccount[]
}

export async function saveAccounts(
  accounts: PaystackAccount[],
): Promise<void> {
  await LocalStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export async function getActiveAccountId(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(ACTIVE_ACCOUNT_KEY)
}

export async function setActiveAccountId(id: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_ACCOUNT_KEY, id)
}

export async function ensureDefaultAccount(): Promise<void> {
  const accounts = await getAccounts()
  if (accounts.length > 0) return

  const { liveSecretKey, testSecretKey } =
    getPreferenceValues<Preferences>()

  if (!liveSecretKey || !testSecretKey) return

  const id = randomUUID()
  const defaultAccount: PaystackAccount = {
    id,
    name: 'Default',
    liveSecretKey,
    testSecretKey,
    isDefault: true,
  }
  await saveAccounts([defaultAccount])
  await setActiveAccountId(id)
}

export async function getActiveAccount(): Promise<
  PaystackAccount | undefined
> {
  const accounts = await getAccounts()
  if (accounts.length === 0) return undefined

  const activeId = await getActiveAccountId()
  return accounts.find((a) => a.id === activeId) ?? accounts[0]
}

export async function addAccount(
  account: Omit<PaystackAccount, 'id'>,
): Promise<PaystackAccount> {
  const accounts = await getAccounts()
  const newAccount: PaystackAccount = {
    ...account,
    id: randomUUID(),
  }
  accounts.push(newAccount)
  await saveAccounts(accounts)
  await setActiveAccountId(newAccount.id)
  return newAccount
}

export async function updateAccount(
  id: string,
  updates: Partial<Omit<PaystackAccount, 'id'>>,
): Promise<void> {
  const accounts = await getAccounts()
  const index = accounts.findIndex((a) => a.id === id)
  if (index === -1) return
  accounts[index] = { ...accounts[index], ...updates }
  await saveAccounts(accounts)
}

export async function deleteAccount(id: string): Promise<void> {
  const accounts = await getAccounts()
  const remaining = accounts.filter((a) => a.id !== id)
  await saveAccounts(remaining)

  const activeId = await getActiveAccountId()
  if (activeId === id) {
    if (remaining.length > 0) {
      await setActiveAccountId(remaining[0].id)
    } else {
      await LocalStorage.removeItem(ACTIVE_ACCOUNT_KEY)
    }
  }
}
