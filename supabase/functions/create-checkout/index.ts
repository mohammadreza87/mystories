/**
 * Create Stripe checkout session.
 * Uses shared utilities for CORS, auth, and response handling.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  handleCors,
  authenticate,
  isAuthError,
  createServiceClient,
  success,
  errors,
} from "../_shared/index.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCors();
  }

  // Authenticate user
  const auth = await authenticate(req);
  if (isAuthError(auth)) {
    return auth;
  }

  const { user } = auth;

  try {
    // Parse request body
    const { priceId, successUrl, cancelUrl } = await req.json();

    if (!priceId || !successUrl || !cancelUrl) {
      return errors.badRequest("Missing required fields: priceId, successUrl, cancelUrl");
    }

    // Initialize Stripe
    const stripe = await import("npm:stripe@14.21.0");
    const stripeClient = new stripe.default(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-11-20.acacia",
    });

    // Get service client for admin operations
    const supabaseAdmin = createServiceClient();

    // Check for existing Stripe customer
    const { data: existingCustomer } = await supabaseAdmin
      .from("stripe_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existingCustomer?.customer_id;

    // Create Stripe customer if not exists
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Store customer mapping
      await supabaseAdmin
        .from("stripe_customers")
        .insert({
          user_id: user.id,
          customer_id: customerId,
        });

      // Update user profile
      await supabaseAdmin
        .from("user_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return success({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Checkout creation error:", error);
    return errors.internal(
      "Failed to create checkout session",
      error instanceof Error ? error.message : undefined
    );
  }
});
