import { ActionPanel, List, Action, Icon, showToast, Toast,  openExtensionPreferences, } from '@raycast/api'

import { useEffect, useState } from 'react'
import { usePaystack } from './hooks/paystack'
import { useCurrencyFormatter } from './hooks/currency'
import { useDate } from './hooks/date'
import { PaystackResponse, Transaction } from './utils/types'
import { paystackDashboardUrl } from './utils/urls'
export default function Command() {
 const formatCurrency = useCurrencyFormatter()
 const { parseDate } = useDate()
   const { get, isLoading } = usePaystack()
  const [transactions, setTransactions] = useState<Array<Transaction>>([])
  useEffect(() => {
    async function getTransactions() {
      try {
        const transactions = (await get('/transaction')) as PaystackResponse<Transaction[]>
        if (transactions.status) {
          showToast({
            style: Toast.Style.Success,
            title: 'Transactions fetched successfully!',
          })
        }
        setTransactions(transactions.data)
      } catch (error) {
        console.error('Error fetching transactions:', error)
        showToast({
          style: Toast.Style.Failure,
          title: 'Error fetching transactions',
          message: (error as Error).message,
        })
        setTransactions([])
      }
    }
    getTransactions()
  }, [])
  useEffect(() => {
    if (isLoading) {
      showToast({ style: Toast.Style.Animated, title: 'Loading transactions...' })
    }
  }, [isLoading])

const [searchText, setSearchText] = useState<string>('')

const filteredTransactions = transactions.filter((transaction) => {
  const searchLower = searchText.toLowerCase()
  return (
    transaction.id.toString().includes(searchLower) ||
    transaction.reference.toLowerCase().includes(searchLower) ||
    transaction.customer?.email?.toLowerCase().includes(searchLower)
  )
})

  return (
    <List  searchBarPlaceholder="Search transactions by ID, reference, or email"
    onSearchTextChange={setSearchText}>
    {filteredTransactions.map((transaction) => (
      <List.Item
        key={transaction.id}
        title={`${transaction.customer.email} ${ transaction.status == 'success' ? 'paid you' : 'tried to pay you'} ${formatCurrency(transaction.amount, transaction.currency, )}`}
        subtitle={transaction.id.toString()}
        accessories={[{icon: transaction.status === 'success' ? Icon.Checkmark: Icon.Xmark, text: transaction.status}, {text: transaction.paidAt? parseDate(transaction?.paidAt) : null}]}
        icon={Icon.Coins}
        actions={
            <ActionPanel>
            <Action.OpenInBrowser
              url={`${paystackDashboardUrl}/transactions/${transaction.id}/analytics`}
              title="View in Dashboard"
            />
            <Action.CopyToClipboard title="Copy ID" content={transaction.id.toString()} />
            <Action.CopyToClipboard title="Copy Reference" content={transaction.reference} />
            <Action
              onAction={openExtensionPreferences}
              title={"Open Preferences"}
              icon={Icon.Gear}
            />
            </ActionPanel>
        }
      />
    ))}
    </List>
  )
}
