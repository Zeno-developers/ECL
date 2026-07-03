// config/pricingPlans.js
const pricingPlans = {
  free: {
    name: 'Free',
    description: 'Perfect for testing and small projects',
    price: 0,
    currency: 'USD',
    features: [
      '1,000 requests/month',
      'Basic endpoints only',
      'Community support',
      '7-day data retention'
    ],
    limits: {
      monthlyRequests: 1000,
      rateLimit: 100,
      endpoints: ['read:members', 'read:events', 'read:sermons'],
      maxWebhooks: 0,
      dataRetentionDays: 7,
      concurrentConnections: 1
    },
    stripePriceId: null, // No Stripe price for free tier
    popular: false,
    color: 'gray'
  },
  basic: {
    name: 'Basic',
    description: 'For small churches and developers',
    price: 19.99,
    currency: 'USD',
    interval: 'monthly',
    features: [
      '10,000 requests/month',
      'All read endpoints',
      'Email support',
      '30-day data retention',
      'Basic analytics',
      '3 webhooks'
    ],
    limits: {
      monthlyRequests: 10000,
      rateLimit: 500,
      endpoints: ['read:members', 'read:events', 'read:sermons', 'read:chat'],
      maxWebhooks: 3,
      dataRetentionDays: 30,
      concurrentConnections: 3
    },
    stripePriceId: 'price_basic_monthly', // You'll set this in Stripe dashboard
    popular: false,
    color: 'blue'
  },
  professional: {
    name: 'Professional',
    description: 'For growing churches and applications',
    price: 49.99,
    currency: 'USD',
    interval: 'monthly',
    features: [
      '50,000 requests/month',
      'All endpoints included',
      'Priority support',
      '90-day data retention',
      'Advanced analytics',
      '10 webhooks',
      'SLA guarantee'
    ],
    limits: {
      monthlyRequests: 50000,
      rateLimit: 1000,
      endpoints: ['read:members', 'write:members', 'read:events', 'write:events', 'read:sermons', 'write:sermons', 'read:chat', 'write:chat'],
      maxWebhooks: 10,
      dataRetentionDays: 90,
      concurrentConnections: 10
    },
    stripePriceId: 'price_professional_monthly',
    popular: true,
    color: 'purple'
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For large organizations and custom integrations',
    price: 199.99,
    currency: 'USD',
    interval: 'monthly',
    features: [
      '200,000 requests/month',
      'All endpoints included',
      '24/7 phone support',
      '1-year data retention',
      'Custom analytics',
      'Unlimited webhooks',
      'SLA guarantee',
      'Custom development',
      'Dedicated account manager'
    ],
    limits: {
      monthlyRequests: 200000,
      rateLimit: 5000,
      endpoints: ['read:members', 'write:members', 'read:events', 'write:events', 'read:sermons', 'write:sermons', 'read:chat', 'write:chat'],
      maxWebhooks: -1, // Unlimited
      dataRetentionDays: 365,
      concurrentConnections: 50
    },
    stripePriceId: 'price_enterprise_monthly',
    popular: false,
    color: 'green'
  }
};

// Annual pricing (16% discount)
const annualPricing = {
  basic: 199.99, // $19.99 * 12 * 0.84
  professional: 499.99, // $49.99 * 12 * 0.84
  enterprise: 1999.99 // $199.99 * 12 * 0.84
};

// Pay-per-use rates for overages
const payPerUseRates = {
  requests: 0.001, // $0.001 per additional request
  storage: 0.10,   // $0.10 per MB per month for extra storage
  webhooks: 0.50,  // $0.50 per additional webhook per month
  support: 49.00   // $49/month for priority support add-on
};

// Non-profit discount (40% off)
const nonProfitDiscount = 0.4;

// Educational institution discount (50% off)
const educationalDiscount = 0.5;

// Function to calculate monthly cost with overages
function calculateMonthlyCost(planId, additionalRequests = 0, additionalWebhooks = 0) {
  const plan = pricingPlans[planId];
  if (!plan) return 0;

  let cost = plan.price;
  
  // Calculate overage costs
  if (additionalRequests > 0) {
    cost += additionalRequests * payPerUseRates.requests;
  }
  
  if (additionalWebhooks > 0 && plan.limits.maxWebhooks !== -1) {
    const extraWebhooks = Math.max(0, additionalWebhooks - plan.limits.maxWebhooks);
    cost += extraWebhooks * payPerUseRates.webhooks;
  }
  
  return cost;
}

// Function to apply discounts
function applyDiscount(price, discountType) {
  switch (discountType) {
    case 'non-profit':
      return price * (1 - nonProfitDiscount);
    case 'educational':
      return price * (1 - educationalDiscount);
    case 'annual':
      return price * 0.84; // 16% discount
    default:
      return price;
  }
}

module.exports = {
  pricingPlans,
  annualPricing,
  payPerUseRates,
  calculateMonthlyCost,
  applyDiscount,
  nonProfitDiscount,
  educationalDiscount
};
