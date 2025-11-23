# Stripe Monetization Setup Guide

This guide will help you configure Stripe for your interactive story app monetization.

## Overview

The app now supports:
- **Free Tier**: 1 story generation per day (soft limit with upgrade prompts)
- **Pro Monthly**: $20/month for unlimited story generation
- **Pro Annual**: $200/year for unlimited story generation (saves $40/year)

## Step 1: Create Stripe Products

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Add Product**

### Create Monthly Product:
- **Name**: Pro Membership (Monthly)
- **Description**: Unlimited story generation with priority processing
- **Pricing**: $20.00 USD
- **Billing Period**: Monthly
- **Recurring**: Yes
- Copy the **Price ID** (starts with `price_...`)

### Create Annual Product:
- **Name**: Pro Membership (Annual)
- **Description**: Unlimited story generation with priority processing - Save $40/year!
- **Pricing**: $200.00 USD
- **Billing Period**: Yearly
- **Recurring**: Yes
- Copy the **Price ID** (starts with `price_...`)

## Step 2: Get Your API Keys

1. Go to **Developers** → **API Keys**
2. Copy your **Publishable key** (starts with `pk_...`)
3. Copy your **Secret key** (starts with `sk_...`)
   - Click "Reveal test key" or "Reveal live key" as needed

## Step 3: Configure Supabase Secrets

The Edge Functions need your Stripe Secret Key. You'll need to add it to Supabase:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions** → **Secrets**
4. Add the following secrets:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET`: (You'll get this in Step 5)

## Step 4: Update Environment Variables

Update your `.env` file with the following:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
VITE_STRIPE_PRICE_MONTHLY=price_... (monthly price ID)
VITE_STRIPE_PRICE_ANNUAL=price_... (annual price ID)
```

## Step 5: Configure Stripe Webhook

1. Go to **Developers** → **Webhooks** in your Stripe Dashboard
2. Click **Add Endpoint**
3. Set the endpoint URL to:
   ```
   https://[YOUR_SUPABASE_PROJECT].supabase.co/functions/v1/stripe-webhook
   ```
4. Select these events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add Endpoint**
6. Copy the **Signing Secret** (starts with `whsec_...`)
7. Add it to Supabase Secrets as `STRIPE_WEBHOOK_SECRET`

## Step 6: Enable Customer Portal (Optional but Recommended)

This allows Pro users to manage their subscriptions:

1. Go to **Settings** → **Customer Portal**
2. Click **Activate**
3. Configure your portal settings:
   - **Business Name**: Your App Name
   - **Privacy Policy**: Your privacy policy URL
   - **Terms of Service**: Your terms of service URL
4. Enable these features:
   - Allow customers to update payment method
   - Allow customers to cancel subscriptions
   - Allow customers to update billing information
5. Save settings

## Step 7: Test the Integration

### Test Mode:
1. Use test credit card: `4242 4242 4242 4242`
2. Use any future expiration date
3. Use any 3-digit CVC
4. Try both monthly and annual subscriptions
5. Verify webhook events are received
6. Test subscription management via customer portal

### Go Live:
1. Switch all keys from test to live mode
2. Update Supabase secrets with live keys
3. Update webhook endpoint with live mode
4. Test with real payment method

## Features Implemented

### Database:
- ✅ Subscription tier tracking (free/pro)
- ✅ Usage counters (daily and total)
- ✅ Grandfathered users (existing users get lifetime Pro)
- ✅ Stripe customer/subscription ID storage

### Backend (Edge Functions):
- ✅ `stripe-webhook`: Handles Stripe events
- ✅ `create-checkout`: Creates checkout sessions
- ✅ `customer-portal`: Opens subscription management
- ✅ `generate-story`: Enforces usage limits

### Frontend:
- ✅ Usage badge showing daily limits
- ✅ Upgrade modal with pricing
- ✅ Subscription management in profile
- ✅ Soft limit prompts (upgrade suggestions)

## Troubleshooting

### Webhooks not working:
- Verify the webhook URL is correct
- Check the webhook secret is added to Supabase
- View webhook logs in Stripe Dashboard

### Checkout not loading:
- Verify publishable key is correct
- Check browser console for errors
- Ensure price IDs are correct

### Usage limits not enforcing:
- Check database migration ran successfully
- Verify user profile has subscription data
- Check Edge Function logs for errors

## Support

For Stripe-related issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)

For Supabase-related issues:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
