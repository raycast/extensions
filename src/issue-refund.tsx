import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  confirmAlert,
  Icon,
  Alert,
  Detail,
  launchCommand,
  LaunchType,
} from '@raycast/api'
import { Currency, PaystackResponse } from './utils/types'
import { SUPPORTED_CURRENCIES } from './data/supported-currencies'
import { useForm, FormValidation } from '@raycast/utils'
import { usePaystack } from './hooks/paystack'
import { useEffect } from 'react'
import { paystackDocsUrl } from './utils/urls'
import { useActiveAccount } from './hooks/accounts'

interface RefundFormValues {
  transactionId: string
  amount?: string
  currency?: Currency
  customerNote?: string
  merchantNote?: string
}

export default function Command({
  transactionId,
  currency,
}: {
  transactionId: string
  currency: Currency
}) {
  const { account, isLoading: accountLoading } = useActiveAccount()
  const { post, isLoading } = usePaystack(account)
  const { handleSubmit } = useForm<RefundFormValues>({
    async onSubmit(values) {
      if (
        await confirmAlert({
          title: 'Are you sure you want to issue this refund?',
          message: 'This action cannot be undone.',
          icon: Icon.Warning,
          primaryAction: {
            title: 'Issue Refund',
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        try {
          const refundPayload = {
            transaction: values.transactionId,
            amount: values.amount ? parseInt(values.amount) : undefined,
            currency: values.currency,
            customer_note: values.customerNote,
            merchant_note: values.merchantNote,
          }
          const refund = (await post('/refund', {
            ...refundPayload,
          })) as PaystackResponse<{ status: boolean; message: string }>
          if (refund.status) {
            showToast({
              style: Toast.Style.Success,
              title: 'Refund Issued',
              message: refund.message,
            })
          }
        } catch (error) {
          console.error('Error issuing refund:', error)
          showToast({
            style: Toast.Style.Failure,
            title: 'Error issuing refund',
            message: (error as Error).message,
          })
        }
      }
    },
    validation: {
      transactionId: FormValidation.Required,
    },
  })

  useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: 'Refunding transaction...',
      })
    }
  }, [isLoading])

  if (accountLoading) {
    return <Detail isLoading={true} />
  }

  return (
    <Form
      navigationTitle={
        account ? `Issue Refund — ${account.name}` : 'Issue Refund'
      }
      searchBarAccessory={
        <Form.LinkAccessory
          target={`${paystackDocsUrl}/refund`}
          text="Refunds Documentation"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Issue Refund" />
          <Action
            onAction={() =>
              launchCommand({
                name: 'manage-accounts',
                type: LaunchType.UserInitiated,
              })
            }
            title="Switch Account"
            icon={Icon.Switch}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="transactionId"
        title="Transaction ID"
        placeholder="Enter transaction ID"
        defaultValue={transactionId}
        info="The ID of the transaction to refund"
      />
      <Form.Separator />
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="Enter amount"
        info="An optional amount. If not provided, the full amount of the transaction will be refunded."
      />
      <Form.Dropdown
        id="currency"
        title="Currency"
        defaultValue={currency}
        info="An optional currency of the transaction"
      >
        {SUPPORTED_CURRENCIES.map((currency) => (
          <Form.Dropdown.Item
            key={currency}
            title={currency}
            value={currency}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="customerNote"
        title="Customer Note"
        placeholder="Customer's reason for refund"
        info="An optional note for the customer."
      />
      <Form.TextArea
        id="merchantNote"
        title="Merchant Note"
        placeholder="Merchant's reason for refund"
        info="An optional note for the merchant."
      />
    </Form>
  )
}
