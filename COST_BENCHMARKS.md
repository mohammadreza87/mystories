# Story Cost Benchmarks - Industry Analysis

## Executive Summary

This document provides a comprehensive cost analysis for MyStories based on industry benchmark user numbers for freemium SaaS applications. The analysis reveals that **image generation accounts for 95%+ of costs**, making this the critical lever for profitability.

---

## 1. Industry Benchmark User Numbers

### 1.1 Freemium SaaS Benchmarks (Best Practices)

| Metric | Early Stage | Growth Stage | Mature Stage |
|--------|------------|--------------|--------------|
| **Total Users** | 1,000-10,000 | 10,000-100,000 | 100,000+ |
| **Free-to-Paid Conversion** | 2-5% | 5-10% | 10-15% |
| **DAU/MAU Ratio** | 10-20% | 15-25% | 20-30% |
| **Monthly Churn (Paid)** | 5-10% | 3-5% | 2-3% |

### 1.2 Consumer App Benchmarks (Entertainment/Creative)

| Metric | Low Engagement | Average | High Engagement |
|--------|---------------|---------|-----------------|
| **DAU/MAU Ratio** | 5-10% | 15-25% | 30-50% |
| **Sessions per DAU** | 1-2 | 2-3 | 3-5 |
| **Free-to-Paid Conversion** | 1-3% | 3-7% | 7-15% |
| **Annual Retention (Paid)** | 50-60% | 60-75% | 75-90% |

---

## 2. Per-Story Cost Breakdown

### 2.1 Cost Components (Per Story)

| Component | Service | Min Cost | Avg Cost | Max Cost | % of Total |
|-----------|---------|----------|----------|----------|------------|
| **Story Text** | DeepSeek AI | $0.0003 | $0.0004 | $0.0005 | 0.003% |
| **Images (5-10)** | Leonardo AI | $10.00 | $20.00 | $50.00 | 95%+ |
| **TTS Audio** | OpenAI TTS-HD | $0.075 | $0.10 | $0.15 | 0.5% |
| **Storage** | Supabase | $0.02 | $0.03 | $0.05 | 0.15% |
| **Database** | Supabase | incl. | incl. | incl. | - |
| **Edge Functions** | Supabase | incl. | incl. | incl. | - |
| **TOTAL** | - | **$10.10** | **$20.13** | **$50.20** | 100% |

### 2.2 Cost by Audience Type

| Audience | Tokens Used | Text Cost | Images | Total Cost |
|----------|-------------|-----------|--------|------------|
| Children (5-10) | 480-1,200 | $0.0002 | 5-7 | $10-17 |
| Young Adults (13-18) | 700-2,000 | $0.0003 | 6-8 | $12-25 |
| Adults (18+) | 1,200-3,000 | $0.0005 | 8-12 | $16-50 |

---

## 3. Cost Projections by User Tier

### 3.1 Free Tier User Costs

**Constraints:**
- 1 story per day maximum
- Rate limited to 5 generations/hour

| Scenario | MAU | DAU (15%) | Stories/Mo | Cost/Story | Monthly Cost |
|----------|-----|-----------|------------|------------|--------------|
| **Startup** | 1,000 | 150 | 4,500 | $20 | **$90,000** |
| **Early Growth** | 5,000 | 750 | 22,500 | $20 | **$450,000** |
| **Growth** | 10,000 | 1,500 | 45,000 | $20 | **$900,000** |
| **Scale** | 50,000 | 7,500 | 225,000 | $20 | **$4,500,000** |
| **Mature** | 100,000 | 15,000 | 450,000 | $20 | **$9,000,000** |

### 3.2 Pro Tier User Costs

**Assumptions:**
- Pro users generate 2-5 stories/day on average (power users)
- Higher engagement = higher costs

| Scenario | Pro Users | Conversion | Stories/User/Day | Monthly Stories | Monthly Cost |
|----------|-----------|------------|------------------|-----------------|--------------|
| **Startup** | 50 | 5% | 3 | 4,500 | **$90,000** |
| **Early Growth** | 350 | 7% | 3 | 31,500 | **$630,000** |
| **Growth** | 800 | 8% | 3 | 72,000 | **$1,440,000** |
| **Scale** | 5,000 | 10% | 3 | 450,000 | **$9,000,000** |
| **Mature** | 12,000 | 12% | 3 | 1,080,000 | **$21,600,000** |

---

## 4. Revenue vs Cost Analysis

### 4.1 Current Pricing

| Plan | Price (EUR) | Price (USD) | Annual Revenue/User |
|------|-------------|-------------|---------------------|
| Pro Monthly | 20.00 | ~$22 | $264 |
| Pro Yearly | 200.00 | ~$220 | $220 |

### 4.2 Unit Economics (Per Pro User)

| Metric | Conservative | Average | Aggressive |
|--------|--------------|---------|------------|
| **Revenue/User/Month** | $18 (annual) | $20 | $22 (monthly) |
| **Stories/User/Month** | 30 (1/day) | 60 (2/day) | 90 (3/day) |
| **Cost/User/Month** | $600 | $1,200 | $1,800 |
| **Gross Margin** | **-$582** | **-$1,180** | **-$1,778** |
| **Margin %** | **-3,233%** | **-5,900%** | **-8,082%** |

### 4.3 Combined Scenario Analysis (Growth Stage)

| Metric | Value |
|--------|-------|
| **Total MAU** | 10,000 |
| **Free Users** | 9,200 (92%) |
| **Pro Users** | 800 (8%) |
| **Free User DAU** | 1,380 (15% of free) |
| **Pro User DAU** | 480 (60% of pro) |
| **Free Stories/Month** | 41,400 |
| **Pro Stories/Month** | 43,200 |
| **Total Stories/Month** | 84,600 |
| **Total Cost/Month** | **$1,692,000** |
| **Pro Revenue/Month** | **$16,000** |
| **Net Loss/Month** | **-$1,676,000** |

---

## 5. Break-Even Analysis

### 5.1 Price Required for Break-Even

| Stories/User/Month | Cost/User/Month | Required Price/Month |
|--------------------|-----------------|----------------------|
| 30 (1/day) | $600 | **$600** |
| 60 (2/day) | $1,200 | **$1,200** |
| 90 (3/day) | $1,800 | **$1,800** |

### 5.2 Stories Required at Current Price ($20/month)

| Avg Cost/Story | Max Stories/Month | Max Stories/Day |
|----------------|-------------------|-----------------|
| $20 | 1 | 0.03 |
| $10 (optimized) | 2 | 0.07 |
| $5 (aggressive) | 4 | 0.13 |
| $2 (target) | 10 | 0.33 |

---

## 6. Cost Optimization Strategies

### 6.1 Image Generation Optimization (Highest Impact)

| Strategy | Current Cost | Optimized Cost | Savings |
|----------|--------------|----------------|---------|
| **Reduce images per story** | 8 images | 3 images | 62.5% |
| **Lower resolution** | 1024x1024 | 512x512 | 50-75% |
| **Use cheaper model** | Premium | Basic | 40-60% |
| **Batch/cache similar images** | No caching | With cache | 20-40% |
| **AI image alternatives** | Leonardo | SDXL/Flux | 80-95% |

### 6.2 Self-Hosted Image Generation

| Option | Setup Cost | Monthly Cost (10K images) | Savings vs Leonardo |
|--------|------------|---------------------------|---------------------|
| **Leonardo AI** | $0 | $20,000-50,000 | Baseline |
| **Replicate (SDXL)** | $0 | $1,000-2,000 | 95% |
| **Modal/RunPod** | $100 | $500-1,000 | 97% |
| **Self-hosted GPU** | $10,000 | $200-500 | 99% |

### 6.3 Hybrid Strategy (Recommended)

| User Type | Image Strategy | Est. Cost/Story |
|-----------|----------------|-----------------|
| Free Trial (first story) | Premium (Leonardo) | $20 |
| Free (subsequent) | Basic (self-hosted) | $1-2 |
| Pro (standard) | Mid-tier (Replicate) | $3-5 |
| Pro (premium) | Premium (Leonardo) | $20 |

---

## 7. Realistic Business Model Scenarios

### 7.1 Scenario A: Optimized Costs (Target)

**Assumptions:**
- Self-hosted/cheap image generation: $2/story
- Pro users limited to 10 stories/day
- Free users limited to 1 story/day

| Stage | MAU | Pro Users (8%) | Monthly Cost | Monthly Revenue | Profit/Loss |
|-------|-----|----------------|--------------|-----------------|-------------|
| Startup | 1,000 | 80 | $12,600 | $1,600 | -$11,000 |
| Early | 5,000 | 400 | $63,000 | $8,000 | -$55,000 |
| Growth | 10,000 | 800 | $126,000 | $16,000 | -$110,000 |
| Scale | 50,000 | 4,000 | $630,000 | $80,000 | -$550,000 |
| Mature | 100,000 | 8,000 | $1,260,000 | $160,000 | -$1,100,000 |

### 7.2 Scenario B: Premium Pricing + Optimized Costs

**Assumptions:**
- Optimized costs: $2/story
- Pro Monthly: $99/month
- Pro Annual: $990/year

| Stage | MAU | Pro Users (5%) | Monthly Cost | Monthly Revenue | Profit/Loss |
|-------|-----|----------------|--------------|-----------------|-------------|
| Startup | 1,000 | 50 | $9,000 | $4,950 | -$4,050 |
| Early | 5,000 | 250 | $45,000 | $24,750 | -$20,250 |
| Growth | 10,000 | 500 | $90,000 | $49,500 | -$40,500 |
| Scale | 50,000 | 2,500 | $450,000 | $247,500 | -$202,500 |
| Mature | 100,000 | 5,000 | $900,000 | $495,000 | -$405,000 |

### 7.3 Scenario C: Usage-Based Pricing (Recommended)

**Assumptions:**
- Per-story pricing: $3-5/story
- Subscription: $10/month base + $2/story
- Free tier: 3 stories/month, then pay-per-story

| Stage | MAU | Paying Users (15%) | Stories/Month | Revenue | Cost ($2/story) | Profit |
|-------|-----|-------------------|---------------|---------|-----------------|--------|
| Startup | 1,000 | 150 | 6,000 | $18,000 | $12,000 | **+$6,000** |
| Early | 5,000 | 750 | 30,000 | $90,000 | $60,000 | **+$30,000** |
| Growth | 10,000 | 1,500 | 60,000 | $180,000 | $120,000 | **+$60,000** |
| Scale | 50,000 | 7,500 | 300,000 | $900,000 | $600,000 | **+$300,000** |
| Mature | 100,000 | 15,000 | 600,000 | $1,800,000 | $1,200,000 | **+$600,000** |

---

## 8. Key Recommendations

### 8.1 Immediate Actions (0-30 days)

1. **Switch to cheaper image generation**
   - Replicate SDXL: ~$0.02-0.05/image vs $2-5/image
   - Self-hosted Stable Diffusion: ~$0.01/image
   - **Target: Reduce image cost by 95%**

2. **Implement usage caps**
   - Pro users: Max 10-20 stories/day (prevents abuse)
   - Free users: Keep at 1/day

3. **Add usage tracking dashboard**
   - Monitor cost per user
   - Identify high-cost users

### 8.2 Short-Term (30-90 days)

1. **Introduce usage-based pricing**
   - Base subscription + per-story credits
   - Or pure pay-per-story model

2. **Optimize image generation**
   - Reduce images per story (3-5 vs 8-10)
   - Cache/reuse similar images
   - Lower resolution for preview, HD for final

3. **Consider freemium adjustments**
   - 3 free stories/month (not daily)
   - Upgrade prompts after limit

### 8.3 Long-Term (90+ days)

1. **Revenue diversification**
   - In-app purchases (premium styles, voices)
   - Book printing service
   - Educational/enterprise licensing

2. **Cost structure optimization**
   - Self-hosted inference infrastructure
   - Multi-model strategy (cheap for draft, premium for final)

---

## 9. Summary Tables

### 9.1 Current State (UNSUSTAINABLE)

| Metric | Value |
|--------|-------|
| Cost per story | $10-50 |
| Revenue per pro user/month | $20 |
| Stories to break even | 1-2/month |
| Actual stories (pro) | 60-90/month |
| Loss per pro user/month | **$1,180 average** |

### 9.2 Target State (SUSTAINABLE)

| Metric | Value |
|--------|-------|
| Cost per story | $1-3 |
| Revenue per story | $3-5 |
| Gross margin | 40-60% |
| Break-even users | 5,000 MAU |
| Profitability | 10,000+ MAU |

---

## 10. Appendix: Industry References

### 10.1 Comparable Freemium Apps

| App | Category | Conversion Rate | ARPU | DAU/MAU |
|-----|----------|-----------------|------|---------|
| Spotify | Music | 3-5% | $4-5 | 25-30% |
| Canva | Design | 2-4% | $12 | 15-20% |
| Grammarly | Writing | 5-8% | $15 | 30-40% |
| Notion | Productivity | 4-6% | $8-10 | 25-35% |
| Midjourney | AI Image | 10-15% | $30+ | 40-50% |
| ChatGPT | AI Chat | 5-10% | $20 | 20-30% |

### 10.2 AI Image Generation Pricing Comparison

| Service | Price/Image | Quality | Speed |
|---------|-------------|---------|-------|
| Leonardo AI | $2-5 | Premium | Fast |
| Midjourney | $0.08-0.20 | Premium | Fast |
| DALL-E 3 | $0.04-0.12 | Premium | Fast |
| Replicate SDXL | $0.02-0.05 | Good | Medium |
| RunPod SDXL | $0.01-0.03 | Good | Medium |
| Self-hosted | $0.005-0.01 | Good | Medium |

---

*Generated: November 2025*
*Branch: claude/story-cost-benchmarks-*
