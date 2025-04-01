import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  openExtensionPreferences,
} from '@raycast/api'

import { useEffect, useState } from 'react'
import { usePaystack } from './hooks/paystack'
import { useCurrencyFormatter } from './hooks/currency'
import { useDate } from './hooks/date'
import { Currency, PaystackResponse } from './utils/types'
import { paystackDashboardUrl } from './utils/urls'

interface Settlement {
  id: number
  domain: string
  status: string
  currency: Currency
  integration: number
  total_amount: number
  effective_amount: number
  total_fees: number
  total_processed: number
  deductions: null | string
  settlement_date: string
  settled_by: null | string
  createdAt: string
  updatedAt: string
}
export default function Command() {
  const formatCurrency = useCurrencyFormatter()
  const { parseDate } = useDate()
  const { get, isLoading } = usePaystack()
  const [settlements, setSettlements] = useState<Array<Settlement>>([])
  const [filteredSettlements, setFilteredSettlements] = useState<
    Array<Settlement>
  >([])
  const [searchText, setSearchText] = useState<string>('')
  const [currentStatus, setCurrentStatus] = useState<string>('all')

  useEffect(() => {
    async function getSettlements() {
      try {
        const settlements = (await get('/settlement')) as PaystackResponse<
          Settlement[]
        >
        if (settlements.status) {
          showToast({
            style: Toast.Style.Success,
            title: 'Settlements fetched successfully!',
          })
        }
        setSettlements(settlements.data)
        setFilteredSettlements(settlements.data)
      } catch (error) {
        console.error('Error fetching payouts:', error)
        showToast({
          style: Toast.Style.Failure,
          title: 'Error fetching settlements',
          message: (error as Error).message,
        })
        setSettlements([])
        setFilteredSettlements([])
      }
    }
    getSettlements()
  }, [])

  useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: 'Loading settlements...',
      })
    }
  }, [isLoading])

  const filterSettlements = (text: string, status: string) => {
    const searchLower = text.toLowerCase()
    return settlements.filter((settlement) => {
      const matchesSearch =
        settlement.id.toString().includes(searchLower) ||
        settlement.currency?.includes(searchLower)

      const matchesStatus = status === 'all' || settlement.status === status

      return matchesSearch && matchesStatus
    })
  }

  useEffect(() => {
    setFilteredSettlements(filterSettlements(searchText, currentStatus))
  }, [searchText, currentStatus, settlements])

  function onStatusChange(status: string) {
    setCurrentStatus(status)
  }

  return (
    <List
      searchBarPlaceholder="Search settlements by ID, currency, or, status."
      onSearchTextChange={setSearchText}
      searchBarAccessory={StatusDropdown(onStatusChange)}
    >
      {filteredSettlements.map((settlement) => (
        <List.Item
          key={settlement.id}
          title={`${
            settlement.status === 'success'
              ? 'Settled'
              : settlement.status === 'pending'
                ? 'Settlement pending'
                : settlement.status === 'processing'
                  ? 'Settlement processing'
                  : 'Settlement attempted'
          } ${formatCurrency(settlement.total_amount, settlement.currency)}`}
          subtitle={settlement.id.toString()}
          accessories={[
            {
              text: `+${formatCurrency(settlement.total_processed, settlement.currency)}`,
            },
            {
              text: `-${formatCurrency(settlement.total_fees, settlement.currency)}`,
            },
            {
              icon:
                settlement.status === 'success'
                  ? Icon.CheckCircle
                  : settlement.status === 'pending'
                    ? Icon.CircleProgress25
                    : settlement.status === 'processing'
                      ? Icon.CircleProgress50
                      : Icon.XMarkCircle,
              text: settlement.status,
            },
            {
              text: settlement.settlement_date
                ? parseDate(settlement.settlement_date)
                : null,
            },
          ]}
          icon={Icon.Coins}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`${paystackDashboardUrl}/payouts/${settlement.id}`}
                title="View in Dashboard"
              />
              <Action.CopyToClipboard
                title="Copy ID"
                content={settlement.id.toString()}
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

function StatusDropdown(onStatusChange: (status: string) => void) {
  return (
    <List.Dropdown
      tooltip="Status"
      storeValue
      onChange={(newValue) => onStatusChange(newValue)}
    >
      <List.Dropdown.Section title="Status">
        <List.Dropdown.Item title="All" value="all" icon={Icon.Coins} />
        <List.Dropdown.Item
          title="Success"
          value="success"
          icon={Icon.CheckCircle}
        />
        <List.Dropdown.Item
          title="Processing"
          value="processing"
          icon={Icon.CircleProgress50}
        />
        <List.Dropdown.Item
          title="Pending"
          value="pending"
          icon={Icon.CircleProgress25}
        />
        <List.Dropdown.Item
          title="Failed"
          value="failed"
          icon={Icon.XMarkCircle}
        />
      </List.Dropdown.Section>
    </List.Dropdown>
  )
}
