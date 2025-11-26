/**
 * SEO Component for managing page-level meta tags and structured data.
 * Uses react-helmet-async for dynamic head management in the SPA.
 */

import { Helmet } from 'react-helmet-async';

// Configuration - Update these with your actual domain
const SITE_NAME = 'Next Tale';
const BASE_URL = 'https://nexttale.app';
const DEFAULT_DESCRIPTION = 'Create and explore AI-powered interactive stories. Choose your own adventure with Next Tale - the platform for immersive, personalized storytelling for kids, teens, and adults.';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

export interface SEOProps {
  /** Page title (will be appended with site name) */
  title?: string;
  /** Page description for meta and social sharing */
  description?: string;
  /** Image URL for social sharing */
  image?: string;
  /** Canonical URL for the page */
  url?: string;
  /** Open Graph type */
  type?: 'website' | 'article' | 'product';
  /** JSON-LD structured data object */
  schema?: object | object[];
  /** Prevent indexing this page */
  noindex?: boolean;
  /** Additional keywords */
  keywords?: string[];
  /** Article published date (for article type) */
  publishedTime?: string;
  /** Article author name */
  author?: string;
}

/**
 * SEO component for managing dynamic meta tags per page.
 *
 * @example
 * // Basic usage
 * <SEO title="Story Title" description="Story description" />
 *
 * @example
 * // With structured data
 * <SEO
 *   title="My Story"
 *   description="An exciting adventure"
 *   schema={{
 *     "@type": "CreativeWork",
 *     "name": "My Story"
 *   }}
 * />
 */
export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  schema,
  noindex = false,
  keywords = [],
  publishedTime,
  author,
}: SEOProps) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} - AI-Powered Interactive Stories`;

  const canonicalUrl = url ? `${BASE_URL}${url}` : BASE_URL;

  // Ensure image URL is absolute
  const imageUrl = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  // Combine default keywords with page-specific ones
  const allKeywords = [
    'interactive stories',
    'AI stories',
    'choose your own adventure',
    'storytelling',
    ...keywords,
  ].join(', ');

  // Prepare schema as array if single object provided
  const schemas = schema ? (Array.isArray(schema) ? schema : [schema]) : [];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={title || SITE_NAME} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Article-specific OG tags */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={title || SITE_NAME} />

      {/* JSON-LD Structured Data */}
      {schemas.map((s, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            ...s,
          })}
        </script>
      ))}
    </Helmet>
  );
}

/**
 * Helper to generate CreativeWork schema for stories.
 */
export function generateStorySchema(story: {
  id: string;
  title: string;
  description: string;
  cover_image_url?: string | null;
  age_range: string;
  estimated_duration: number;
  created_at?: string;
  creator?: {
    display_name: string | null;
    avatar_url?: string | null;
  };
  likes_count?: number;
}) {
  return {
    '@type': 'CreativeWork',
    '@id': `${BASE_URL}/story/${story.id}`,
    name: story.title,
    headline: story.title,
    description: story.description,
    image: story.cover_image_url || DEFAULT_IMAGE,
    url: `${BASE_URL}/story/${story.id}`,
    author: story.creator
      ? {
          '@type': 'Person',
          name: story.creator.display_name || 'Anonymous',
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
    },
    datePublished: story.created_at,
    genre: ['Interactive Fiction', 'Choose Your Own Adventure'],
    audience: {
      '@type': 'Audience',
      audienceType: `Ages ${story.age_range}`,
    },
    interactivityType: 'mixed',
    timeRequired: `PT${story.estimated_duration}M`,
    inLanguage: 'en',
    ...(story.likes_count !== undefined && story.likes_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.5',
            ratingCount: story.likes_count,
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
  };
}

/**
 * Helper to generate Product schema for subscription plans.
 */
export function generateSubscriptionSchema() {
  return {
    '@type': 'Product',
    name: 'Next Tale Subscription',
    description: 'Premium subscription for unlimited AI-powered story creation with priority processing and advanced features.',
    brand: {
      '@type': 'Brand',
      name: 'Next Tale',
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Pro Monthly',
        price: '9.99',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        url: `${BASE_URL}/subscription`,
        priceValidUntil: '2026-12-31',
      },
      {
        '@type': 'Offer',
        name: 'Pro Annual',
        price: '99.99',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        url: `${BASE_URL}/subscription`,
        priceValidUntil: '2026-12-31',
      },
      {
        '@type': 'Offer',
        name: 'Creator Monthly',
        price: '19.99',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        url: `${BASE_URL}/subscription`,
        priceValidUntil: '2026-12-31',
      },
      {
        '@type': 'Offer',
        name: 'Creator Annual',
        price: '199.99',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        url: `${BASE_URL}/subscription`,
        priceValidUntil: '2026-12-31',
      },
    ],
  };
}

/**
 * Helper to generate BreadcrumbList schema.
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * Helper to generate Person schema for user profiles.
 */
export function generatePersonSchema(profile: {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
}) {
  return {
    '@type': 'Person',
    '@id': `${BASE_URL}/user/${profile.id}`,
    name: profile.display_name,
    description: profile.bio,
    image: profile.avatar_url,
    url: `${BASE_URL}/user/${profile.id}`,
  };
}
