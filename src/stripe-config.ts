export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  mode: 'subscription' | 'payment';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_TSoaFahNuoeYBL',
    priceId: 'price_1SVsx4LBbCgYbnpUkAi4CPwp',
    name: 'Pro Monthly',
    description: 'Unlimited story generation with premium features',
    price: 20.00,
    currency: 'eur',
    mode: 'subscription'
  },
  {
    id: 'prod_TSoaKcEJy6gPRg',
    priceId: 'price_1SVsxaLBbCgYbnpUIJ3Smg2o',
    name: 'Pro Yearly',
    description: 'Unlimited story generation with premium features - Save 17%',
    price: 200.00,
    currency: 'eur',
    mode: 'subscription'
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};

export const formatPrice = (price: number, currency: string): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(price);
};