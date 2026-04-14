/**
 * Asaas API client
 * Docs: https://docs.asaas.com
 */

const SANDBOX_URL = 'https://sandbox.asaas.com/api/v3'
const PRODUCTION_URL = 'https://api.asaas.com/v3'

export type AsaasEnv = 'SANDBOX' | 'PRODUCTION'

export interface AsaasCustomer {
  id: string
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
  postalCode?: string
}

export interface AsaasPayment {
  id: string
  customer: string
  billingType: string
  value: number
  dueDate: string
  description?: string
  status: string
  bankSlipUrl?: string
  nossoNumero?: string
  invoiceUrl?: string
  invoiceNumber?: string
}

export interface AsaasIdentificationField {
  identificationField: string
  nossoNumero: string
  barCode: string
}

export class AsaasClient {
  private baseUrl: string
  private apiKey: string

  constructor(apiKey: string, env: AsaasEnv = 'SANDBOX') {
    this.apiKey = apiKey
    this.baseUrl = env === 'PRODUCTION' ? PRODUCTION_URL : SANDBOX_URL
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
        ...(options?.headers ?? {}),
      },
    })

    if (!res.ok) {
      const text = await res.text()
      let message = `Asaas API error ${res.status}`
      try {
        const json = JSON.parse(text)
        message = json.errors?.[0]?.description ?? json.message ?? message
      } catch {}
      throw new Error(message)
    }

    return res.json() as Promise<T>
  }

  /** Find customer by CNPJ/CPF. Returns null if not found. */
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    const clean = cpfCnpj.replace(/\D/g, '')
    const data = await this.fetch<{ data: AsaasCustomer[]; totalCount: number }>(
      `/customers?cpfCnpj=${clean}&limit=1`
    )
    return data.data[0] ?? null
  }

  /** Create a new customer in Asaas. */
  async createCustomer(input: {
    name: string
    cpfCnpj: string
    email?: string | null
    phone?: string | null
    address?: string | null
    addressNumber?: string | null
    province?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
  }): Promise<AsaasCustomer> {
    return this.fetch<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        cpfCnpj: input.cpfCnpj.replace(/\D/g, ''),
        email: input.email ?? undefined,
        phone: input.phone ?? undefined,
        address: input.address ?? undefined,
        addressNumber: input.addressNumber ?? undefined,
        province: input.province ?? undefined,
        city: input.city ?? undefined,
        state: input.state ?? undefined,
        postalCode: input.postalCode ?? undefined,
      }),
    })
  }

  /** Find or create customer by CNPJ. Returns asaas customer id. */
  async findOrCreateCustomer(input: {
    name: string
    cpfCnpj: string
    email?: string | null
    phone?: string | null
    address?: string | null
    address_city?: string | null
    address_state?: string | null
    address_zip?: string | null
    address_number?: string | null
    address_district?: string | null
  }): Promise<string> {
    const existing = await this.findCustomerByCpfCnpj(input.cpfCnpj)
    if (existing) return existing.id

    const created = await this.createCustomer({
      name: input.name,
      cpfCnpj: input.cpfCnpj,
      email: input.email,
      phone: input.phone,
      address: input.address,
      addressNumber: input.address_number,
      province: input.address_district,
      city: input.address_city,
      state: input.address_state,
      postalCode: input.address_zip,
    })
    return created.id
  }

  /** Create a boleto payment. */
  async createBoleto(input: {
    customerId: string
    value: number
    dueDate: string   // YYYY-MM-DD
    description?: string | null
    externalReference?: string  // our internal boleto id
  }): Promise<AsaasPayment> {
    return this.fetch<AsaasPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: input.customerId,
        billingType: 'BOLETO',
        value: input.value,
        dueDate: input.dueDate,
        description: input.description ?? undefined,
        externalReference: input.externalReference ?? undefined,
      }),
    })
  }

  /** Get boleto identification field (linha digitável + barCode). */
  async getBoletoIdentificationField(paymentId: string): Promise<AsaasIdentificationField> {
    return this.fetch<AsaasIdentificationField>(
      `/payments/${paymentId}/identificationField`
    )
  }

  /** Get a payment by Asaas ID. */
  async getPayment(paymentId: string): Promise<AsaasPayment> {
    return this.fetch<AsaasPayment>(`/payments/${paymentId}`)
  }

  /** Cancel/delete a payment. */
  async cancelPayment(paymentId: string): Promise<void> {
    await this.fetch<unknown>(`/payments/${paymentId}`, { method: 'DELETE' })
  }
}

/** Build an Asaas client from empresa config. Throws if not configured. */
export function buildAsaasClient(empresa: {
  asaas_api_key: string | null
  asaas_environment: string
}): AsaasClient {
  if (!empresa.asaas_api_key) {
    throw new Error('Empresa não possui API Key do Asaas configurada.')
  }
  return new AsaasClient(
    empresa.asaas_api_key,
    empresa.asaas_environment === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX'
  )
}
