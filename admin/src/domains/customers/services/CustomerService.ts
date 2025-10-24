/**
 * Customer Domain Service
 * Business logic for customer operations - works for both POS and future website
 */

import { 
  Customer, 
  CreateCustomerData, 
  UpdateCustomerData, 
  CustomerSearchCriteria,
  CustomerType,
  CustomerActivity,
  CustomerActivityType,
  ConsentType,
  ConsentRecord,
  isWalkInCustomer,
  hasValidEmail,
  hasValidPhone,
  CustomerPreferences
} from '../entities/Customer'
import { CustomerRepository } from '../repositories/CustomerRepository'
import { ValidationResult, ValidationError, EntityStatus } from '@shared/types/common'

const defaultPreferences = (): CustomerPreferences => ({
  emailNotifications: true,
  smsNotifications: false,
  phoneCallsAllowed: true,
  promotionalEmails: false,
  birthdayOffers: false,
  seasonalPromotions: false,
  favoriteFlowers: [],
  favoriteColors: [],
});

const mergePreferences = (
  base?: Customer['preferences'],
  overrides?: Partial<CustomerPreferences>
): CustomerPreferences => {
  const basePrefs = base ?? defaultPreferences();
  if (!overrides) {
    return {
      ...basePrefs,
      favoriteFlowers: [...(basePrefs.favoriteFlowers ?? [])],
      favoriteColors: [...(basePrefs.favoriteColors ?? [])],
    };
  }

  return {
    ...basePrefs,
    ...overrides,
    favoriteFlowers: overrides.favoriteFlowers ?? [...(basePrefs.favoriteFlowers ?? [])],
    favoriteColors: overrides.favoriteColors ?? [...(basePrefs.favoriteColors ?? [])],
    allergies: overrides.allergies ?? basePrefs.allergies,
    preferredDeliveryTime: overrides.preferredDeliveryTime ?? basePrefs.preferredDeliveryTime,
    deliveryInstructions: overrides.deliveryInstructions ?? basePrefs.deliveryInstructions,
    language: overrides.language ?? basePrefs.language,
    currency: overrides.currency ?? basePrefs.currency,
    theme: overrides.theme ?? basePrefs.theme,
  };
};

export class CustomerService {
  constructor(
    private customerRepository: CustomerRepository
  ) {}

  // ========== Core CRUD Operations ==========

  /**
   * Create a new customer with validation and activity tracking
   */
  async create(data: CreateCustomerData): Promise<Customer> {
    // Validate input data
    const validation = this.validateCustomerData(data)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Check for duplicates
    await this.checkForDuplicates(data)

    // Create customer with defaults
    const { preferences: prefInput, homeAddress, ...rest } = data

    const customerData: Partial<Customer> = {
      ...rest,
      customerType: data.customerType || CustomerType.INDIVIDUAL,
      status: EntityStatus.ACTIVE,
      loyaltyPoints: 0,
      accountBalance: 0,
      orderCount: 0,
      totalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      id: this.generateCustomerId(),
      preferences: mergePreferences(undefined, prefInput),
      addresses: homeAddress ? [{ ...homeAddress }] : undefined,
      subscriptions: [],
    }

    const customer = await this.customerRepository.save(customerData)

    // Track customer creation activity
    await this.addActivity(customer.id, CustomerActivityType.ACCOUNT_CREATED, 'Customer account created')

    return customer
  }

  /**
   * Find customer by ID
   */
  async findById(id: string): Promise<Customer | null> {
    return this.customerRepository.findById(id)
  }

  /**
   * Update customer with validation and activity tracking
   */
  async update(id: string, data: UpdateCustomerData): Promise<Customer> {
    const existingCustomer = await this.customerRepository.findByIdOrThrow(id)
    
    // Validate update data
    const validation = this.validateCustomerData(data, existingCustomer)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    const { preferences: prefUpdate, homeAddress, ...rest } = data

    const updatePreferences = prefUpdate
      ? mergePreferences(existingCustomer.preferences, prefUpdate)
      : existingCustomer.preferences ?? defaultPreferences();

    const updatePayload: Partial<Customer> = {
      ...existingCustomer,
      ...rest,
      id,
      updatedAt: new Date(),
      preferences: updatePreferences,
      addresses: homeAddress ? [{ ...homeAddress }] : existingCustomer.addresses,
    };

    const updatedCustomer = await this.customerRepository.save(updatePayload)

    // Track significant changes
    await this.trackProfileChanges(existingCustomer, updatedCustomer)

    return updatedCustomer
  }

  /**
   * Delete customer (soft delete)
   */
  async delete(id: string): Promise<void> {
    await this.update(id, { status: EntityStatus.DELETED })
  }

  // ========== POS-Specific Methods (Current Needs) ==========

  /**
   * Find customer by phone (primary POS lookup)
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    if (!phone || phone.length < 10) return null
    
    const normalizedPhone = this.normalizePhoneNumber(phone)
    return this.customerRepository.findByPhone(normalizedPhone)
  }

  /**
   * Create walk-in customer for POS transactions
   */
  async createWalkInCustomer(): Promise<Customer> {
    // Check if a generic walk-in customer already exists
    const existingWalkIn = await this.customerRepository.findByPhone('')
    if (existingWalkIn && isWalkInCustomer(existingWalkIn)) {
      return existingWalkIn
    }

    return this.create({
      firstName: 'Walk-in',
      lastName: 'Customer',
      phone: '',
      customerType: CustomerType.WALK_IN
    })
  }

  /**
   * Quick search for POS customer selection
   */
  async quickSearch(query: string): Promise<Customer[]> {
    if (query.length < 3) return []
    
    return this.customerRepository.quickSearch(query)
  }

  // ========== Website-Specific Methods (Future Ready) ==========

  /**
   * Find customer by email (website login)
   */
  async findByEmail(email: string): Promise<Customer | null> {
    if (!email || !email.includes('@')) return null
    
    return this.customerRepository.findByEmail(email.toLowerCase())
  }

  /**
   * Create customer account with password (website registration)
   */
  async createAccount(data: {
    firstName: string
    lastName: string
    email: string
    password: string
    phone?: string
    marketingConsent?: boolean
  }): Promise<Customer> {
    // Hash password (placeholder - implement proper hashing)
    const passwordHash = await this.hashPassword(data.password)

    // Set up communication consents
    const consents: ConsentRecord[] = [
      {
        consentType: ConsentType.DATA_PROCESSING,
        granted: true,
        grantedAt: new Date(),
        source: 'website'
      }
    ]

    if (data.marketingConsent) {
      consents.push({
        consentType: ConsentType.EMAIL_MARKETING,
        granted: true,
        grantedAt: new Date(),
        source: 'website'
      })
    }

    return this.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      customerType: CustomerType.ONLINE,
      preferences: {
        emailNotifications: true,
        smsNotifications: !!data.phone,
        phoneCallsAllowed: true,
        promotionalEmails: data.marketingConsent || false,
        birthdayOffers: data.marketingConsent || false,
        seasonalPromotions: data.marketingConsent || false,
        favoriteFlowers: [],
        favoriteColors: []
      }
    })
  }

  /**
   * Authenticate customer (website login)
   */
  async authenticate(email: string, password: string): Promise<{
    success: boolean
    customer?: Customer
    error?: string
  }> {
    const customer = await this.findByEmail(email)
    
    if (!customer) {
      return { success: false, error: 'Customer not found' }
    }

    if (customer.status !== EntityStatus.ACTIVE) {
      return { success: false, error: 'Account is not active' }
    }

    // Verify password (placeholder - implement proper verification)
    const isValidPassword = await this.verifyPassword(password, customer.passwordHash!)
    
    if (!isValidPassword) {
      return { success: false, error: 'Invalid password' }
    }

    // Track login activity
    await this.addActivity(customer.id, CustomerActivityType.LOGIN, 'Customer logged in')

    return { success: true, customer }
  }

  // ========== Subscription Methods (Future Ready) ==========

  /**
   * Add subscription to customer
   */
  async addSubscription(customerId: string, subscriptionId: string): Promise<Customer> {
    const customer = await this.customerRepository.findByIdOrThrow(customerId)
    
    const subscriptions = customer.subscriptions || []
    if (!subscriptions.includes(subscriptionId)) {
      subscriptions.push(subscriptionId)
    }

    const updatedCustomer = await this.update(customerId, { 
      subscriptions,
      customerType: CustomerType.SUBSCRIPTION,
    })

    await this.addActivity(customerId, CustomerActivityType.SUBSCRIPTION_STARTED, `Subscription ${subscriptionId} started`)

    return updatedCustomer
  }

  /**
   * Remove subscription from customer
   */
  async removeSubscription(customerId: string, subscriptionId: string): Promise<Customer> {
    const customer = await this.customerRepository.findByIdOrThrow(customerId)
    
    const subscriptions = (customer.subscriptions || []).filter(id => id !== subscriptionId)
    const updatedCustomer = await this.update(customerId, { subscriptions })

    await this.addActivity(customerId, CustomerActivityType.SUBSCRIPTION_CANCELLED, `Subscription ${subscriptionId} cancelled`)

    return updatedCustomer
  }

  // ========== Loyalty and Rewards ==========

  /**
   * Add loyalty points to customer
   */
  async addLoyaltyPoints(customerId: string, points: number, reason: string): Promise<Customer> {
    const customer = await this.customerRepository.findByIdOrThrow(customerId)
    const newBalance = (customer.loyaltyPoints || 0) + points

    const updatedCustomer = await this.customerRepository.updateLoyaltyPoints(customerId, points, reason)

    await this.addActivity(customerId, CustomerActivityType.LOYALTY_POINTS_EARNED, `Earned ${points} points: ${reason}`)

    return updatedCustomer
  }

  /**
   * Redeem loyalty points
   */
  async redeemLoyaltyPoints(customerId: string, points: number, reason: string): Promise<Customer> {
    const customer = await this.customerRepository.findByIdOrThrow(customerId)
    
    if ((customer.loyaltyPoints || 0) < points) {
      throw new Error('Insufficient loyalty points')
    }

    const updatedCustomer = await this.customerRepository.updateLoyaltyPoints(customerId, -points, reason)

    await this.addActivity(customerId, CustomerActivityType.LOYALTY_POINTS_REDEEMED, `Redeemed ${points} points: ${reason}`)

    return updatedCustomer
  }

  // ========== Analytics and Insights ==========

  /**
   * Update customer order statistics
   */
  async updateOrderStats(customerId: string, orderAmount: number): Promise<Customer> {
    const customer = await this.customerRepository.findByIdOrThrow(customerId)
    
    const orderCount = (customer.orderCount || 0) + 1
    const totalSpent = (customer.totalSpent || 0) + orderAmount
    const averageOrderValue = totalSpent / orderCount

    return this.update(customerId, {
      orderCount,
      totalSpent,
      averageOrderValue,
      lastOrderDate: new Date()
    })
  }

  /**
   * Get customer insights for dashboard
   */
  async getCustomerInsights(customerId: string): Promise<{
    customer: Customer
    recentActivity: CustomerActivity[]
    orderHistory: any[] // Will integrate with orders domain
    loyaltyStatus: {
      tier: string
      pointsToNextTier: number
      totalPointsEarned: number
    }
  }> {
    const customer = await this.customerRepository.findByIdOrThrow(customerId)
    const activityResult = await this.customerRepository.getCustomerActivity(customerId, 1, 10)
    
    const loyaltyTier = this.calculateLoyaltyTier(customer.loyaltyPoints || 0)
    
    return {
      customer,
      recentActivity: activityResult.items,
      orderHistory: [], // TODO: Integrate with orders domain
      loyaltyStatus: {
        tier: loyaltyTier.name,
        pointsToNextTier: loyaltyTier.pointsToNext,
        totalPointsEarned: customer.loyaltyPoints || 0
      }
    }
  }

  // ========== Private Helper Methods ==========

  private validateCustomerData(
    data: Partial<CreateCustomerData>, 
    existingCustomer?: Customer
  ): ValidationResult {
    const errors: ValidationError[] = []

    // Required field validation
    if (!data.firstName?.trim()) {
      errors.push({ field: 'firstName', message: 'First name is required' })
    }

    if (!data.lastName?.trim()) {
      errors.push({ field: 'lastName', message: 'Last name is required' })
    }

    // Email validation
    if (data.email && !data.email.includes('@')) {
      errors.push({ field: 'email', message: 'Invalid email format' })
    }

    // Phone validation
    if (data.phone && data.phone.length > 0 && data.phone.length < 10) {
      errors.push({ field: 'phone', message: 'Phone number must be at least 10 digits' })
    }

    return { isValid: errors.length === 0, errors }
  }

  private async checkForDuplicates(data: CreateCustomerData): Promise<void> {
    // Check email duplicate
    if (data.email) {
      const existingByEmail = await this.findByEmail(data.email)
      if (existingByEmail) {
        throw new Error('Customer with this email already exists')
      }
    }

    // Check phone duplicate (only for non-walk-in customers)
    if (data.phone && data.customerType !== CustomerType.WALK_IN) {
      const existingByPhone = await this.findByPhone(data.phone)
      if (existingByPhone && !isWalkInCustomer(existingByPhone)) {
        throw new Error('Customer with this phone number already exists')
      }
    }
  }

  private async addActivity(
    customerId: string, 
    activityType: CustomerActivityType, 
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.customerRepository.addActivity({
      customerId,
      activityType,
      description,
      metadata
    })
  }

  private async trackProfileChanges(oldCustomer: Customer, newCustomer: Customer): Promise<void> {
    const changes: string[] = []
    
    if (oldCustomer.firstName !== newCustomer.firstName) changes.push('name')
    if (oldCustomer.email !== newCustomer.email) changes.push('email')
    if (oldCustomer.phone !== newCustomer.phone) changes.push('phone')
    
    if (changes.length > 0) {
      await this.addActivity(
        newCustomer.id,
        CustomerActivityType.PROFILE_UPDATED,
        `Profile updated: ${changes.join(', ')}`
      )
    }
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    
    // Remove leading 1 if present (North American format)
    return digits.startsWith('1') ? digits.slice(1) : digits
  }

  private generateCustomerId(): string {
    // Generate a UUID or use your preferred ID generation method
    return `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateLoyaltyTier(points: number): { name: string; pointsToNext: number } {
    if (points < 100) return { name: 'Bronze', pointsToNext: 100 - points }
    if (points < 500) return { name: 'Silver', pointsToNext: 500 - points }
    if (points < 1000) return { name: 'Gold', pointsToNext: 1000 - points }
    return { name: 'Platinum', pointsToNext: 0 }
  }

  // Placeholder methods for future authentication implementation
  private async hashPassword(password: string): Promise<string> {
    // TODO: Implement proper password hashing (bcrypt, argon2, etc.)
    return `hashed_${password}`
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // TODO: Implement proper password verification
    return hash === `hashed_${password}`
  }
}
