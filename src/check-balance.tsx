import {
  showToast,
  Toast,
  List,
  ActionPanel,
  Action,
  openExtensionPreferences,
  Icon,
} from '@raycast/api'
import { useEffect, useState } from 'react'
import { usePaystack } from './hooks/paystack'
import { useCurrencyFormatter } from './hooks/currency'

export default function Command() {
  const formatCurrency = useCurrencyFormatter()
  const { get, isLoading } = usePaystack()
  interface Balance {
    currency: string
    balance: number
  }

  const [balances, setBalance] = useState<Array<Balance>>([])

  useEffect(() => {
    async function getBalance() {
      try {
        const balance = (await get('/balance')) as {
          status: boolean
          message: string
          data: { currency: string; balance: number }[]
        }
        if (balance.status) {
          showToast({
            style: Toast.Style.Success,
            title: 'Balances fetched successfully!',
          })
        }
        if (balance.status) {
          showToast({
            style: Toast.Style.Success,
            title: 'Balances fetched successfully!',
          })
          setBalance(balance.data)
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: 'Failed to fetch balances',
            message: balance.message,
          })
        }
      } catch (error) {
        console.error('Error fetching balance:', error)
        showToast({
          style: Toast.Style.Failure,
          title: 'Error fetching balance',
          message: (error as Error).message,
        })
        setBalance([])
      }
    }
    getBalance()
  }, [])

  useEffect(() => {
    if (isLoading) {
      showToast({ style: Toast.Style.Animated, title: 'Loading balances...' })
    }
  }, [isLoading])

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search balances...">
      {balances.map((balance, index) => (
        <List.Item
          key={index}
          title={formatCurrency(balance.balance, balance.currency)}
          subtitle={balance.currency}
          icon={Icon.Wallet}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://dashboard.paystack.com/#/dashboard?currency=${balance.currency}`}
                shortcut={{
                  modifiers: ['cmd'],
                  key: 'o',
                }}
                title="Open in Dashboard"
              />
              <Action.CopyToClipboard
                title="Copy Balance"
                content={formatCurrency(balance.balance, balance.currency)}
                shortcut={{ modifiers: ['cmd'], key: 'c' }}
              />
              <Action
                onAction={openExtensionPreferences}
                title={'Open Preferences'}
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
