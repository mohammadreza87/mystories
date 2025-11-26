export type BillingCycle = 'monthly' | 'annual';

export interface PlanDefinition {
  id: 'free' | 'basic' | 'pro' | 'max';
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
  };
  priceIds: {
    monthly: string;
    annual: string;
  };
  badge?: string;
  features: string[];
  limitations?: string[];
}

const priceId = (key: string) => import.meta.env[key] || '';

export const plans: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    description: '1 story/day with images and 3 choices per chapter',
    price: { monthly: 0, annual: 0 },
    priceIds: { monthly: '', annual: '' },
    features: [
      '1 story per day',
      'Up to 8 chapters/story',
      'AI-generated images (standard)',
      '3 choices per chapter',
      'Public library access',
    ],
    limitations: [
      'No editing after generation',
      'No audio narration',
      'Stories auto-public after 7 days',
      'Standard generation speed',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'For regular users and parents creating for kids',
    price: { monthly: 9.99, annual: 99.99 },
    priceIds: {
      monthly: priceId('VITE_STRIPE_PRICE_BASIC_MONTHLY'),
      annual: priceId('VITE_STRIPE_PRICE_BASIC_ANNUAL'),
    },
    badge: 'Best value',
    features: [
      'Everything in Free',
      '5 stories per day',
      'Edit text, choices, images',
      'Up to 12 chapters/story',
      'Keep stories private forever',
      'Priority generation (2x)',
      'Remove watermark',
      'Basic analytics',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For teachers, creators, and serious writers',
    price: { monthly: 19.99, annual: 199.99 },
    priceIds: {
      monthly: priceId('VITE_STRIPE_PRICE_PRO_MONTHLY'),
      annual: priceId('VITE_STRIPE_PRICE_PRO_ANNUAL'),
    },
    features: [
      'Everything in Starter',
      'Unlimited stories (fair use)',
      'Audio narration (10+ voices)',
      'Up to 15 chapters/story',
      'Upload custom images',
      'Advanced structure editing',
      'Regenerate any chapter/image',
      'Download as PDF',
      'Detailed analytics dashboard',
      'Early access to new features',
    ],
  },
  {
    id: 'max',
    name: 'Max',
    description: 'For professionals, agencies, and teams',
    price: { monthly: 79.99, annual: 699.99 },
    priceIds: {
      monthly: priceId('VITE_STRIPE_PRICE_MAX_MONTHLY'),
      annual: priceId('VITE_STRIPE_PRICE_MAX_ANNUAL'),
    },
    features: [
      'Everything in Pro',
      'Video chapters (cinematic)',
      '10+ AI voices + voice cloning',
      'Collaboration & team seats',
      'White-label export',
      'API access',
      'Priority support (24h)',
      'Commercial license',
      'Advanced analytics',
    ],
  },
];

export const getPlanById = (planId: PlanDefinition['id']): PlanDefinition | undefined =>
  plans.find((plan) => plan.id === planId);

export const getPriceId = (planId: PlanDefinition['id'], cycle: BillingCycle): string => {
  const plan = getPlanById(planId);
  if (!plan) return '';
  return cycle === 'monthly' ? plan.priceIds.monthly : plan.priceIds.annual;
};

export const formatPrice = (price: number, currency: string): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(price);
};
