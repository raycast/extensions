export interface Transaction {
  id: number
  reference: string
  amount: number
  status: string
  customer: Customer
  created_at: string
}

export interface Customer {
  id: number
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

export interface Balance {
  currency: string
  balance: number
}
