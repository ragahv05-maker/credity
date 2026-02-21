# CREDITY - PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Version:** 2.0  
**Date:** December 24, 2024  
**Status:** Final - Ready for Development  
**Document Owner:** Product Team

---

## EXECUTIVE SUMMARY

Credity is the world's first complete trust verification platform that solves identity fraud, claims validation, and evidence authentication in the AI era.

While competitors like Humanity Protocol ($1.1B valuation) focus on Web3 identity, Credity targets the **$120B+ enterprise fraud prevention market** with a complete solution: verifying **WHO** someone is, validating **WHAT** they claim, and authenticating the **PROOF** they provide.

**Market Opportunity:** $120B+ TAM across insurance ($32B), e-commerce ($48B), identity verification ($16B), and enterprise fraud ($24B+)

**Competitive Advantage:** Only platform combining identity + claims + evidence verification in one API

**Go-to-Market:** Launch in India (Year 1), expand to Southeast Asia (Year 2), scale to USA/EU (Year 3)

**Funding Ask:** $1.5M seed to reach $1M ARR in 12 months

---

## TABLE OF CONTENTS

1. Product Vision & Strategy
2. Market Analysis & Competitive Landscape
3. User Research & Personas
4. Product Overview & Value Proposition
5. Feature Requirements (Complete)
6. Technical Architecture
7. Security & Privacy
8. Go-to-Market Strategy
9. Business Model & Unit Economics
10. Success Metrics & KPIs
11. Development Roadmap
12. Risk Mitigation
13. Launch Plan
14. Fundraising Strategy
15. Appendices

---

## 1. PRODUCT VISION & STRATEGY

### 1.1 Vision Statement

"To become the universal trust layer for the internet, making every digital interaction verifiable and fraud-proof."

By 2030, Credity will be the invisible infrastructure that powers trust online—like Stripe powers payments, Credity powers verification.

### 1.2 Mission Statement

"We rebuild trust in human interactions by making truth verifiable in real-time, protecting businesses from fraud while preserving individual privacy."

### 1.3 Strategic Positioning

Credity owns the "Enterprise Complete Fraud Prevention" quadrant.

**Key Differentiators:**

1. **Complete Solution:** Identity + Claims + Evidence (competitors do only 1)
2. **Multi-Industry:** Insurance, e-commerce, platforms (competitors are vertical-specific)
3. **B2B SaaS Model:** Predictable revenue (competitors rely on tokens or enterprise-only pricing)
4. **Global from Day 1:** Works with or without government digital ID systems
5. **Privacy-First:** Zero-knowledge proofs, user control, encrypted storage
6. **Reputation, Not Just Identity:** Competitors prove you're human. Credity proves you're trustworthy. Cross-platform reputation scoring (WorkScore, SafeDate, TenantScore) creates a network effect moat that identity-only players cannot replicate.

### 1.4 Strategic Principles

1. **Build for Enterprises, Enable Consumers**
   - Primary revenue: B2B (platforms pay)
   - Consumer benefit: Portable identity
   - Network effects: More platforms = more value

2. **Government Integration is Optional, Not Required**
   - DigiLocker in India: Competitive advantage
   - Manual scanning globally: Core functionality
   - Adapt to local systems as they emerge

3. **Complete Solution > Point Solution**
   - Never just identity (too commoditized)
   - Always identity + claims + evidence
   - Add value competitors can't replicate

4. **Trust Through Transparency**
   - Show users exactly what's shared
   - Explain why we need each data point
   - Give users control over their data

5. **Scale Through Network Effects**
   - Each verification makes AI smarter
   - Each platform integration increases value
   - "Verify once, use everywhere" drives adoption

---

## 2. MARKET ANALYSIS & COMPETITIVE LANDSCAPE

### 2.1 Total Addressable Market (TAM)

#### Primary Markets

**Insurance Fraud Detection: $32B by 2032**

- 5,000+ insurance companies (US)
- 500M+ claims annually
- $100-300 cost per manual review
- Current spend: $8B annually on fraud prevention

**E-commerce Fraud Prevention: $48B by 2030**

- 26M+ online businesses globally
- 15% annual growth rate
- Return/refund fraud epidemic
- Chargeback costs: $100 per incident

**Dating & Social Platform Trust: $5B by 2028** 🆕

- 300M+ dating app users globally
- 40-50% fake/bot accounts
- $1.3B annual fraud losses (US alone)
- Users willing to pay for verified-only experiences

**Gig Economy Reputation: $15B by 2030** 🆕

- 500M+ gig workers globally
- Platform trust scores not portable
- Onboarding friction costs $50-100 per worker
- Cross-platform reputation = massive efficiency gain

**Identity Verification: $16B by 2027**

- Every platform needs KYC/age verification
- Proof-of-human becoming critical
- Regulatory pressure increasing
- Current solutions failing (AI passes CAPTCHAs)

**Enterprise Fraud Detection: $24B+**

- HR fraud (fake resumes)
- Vendor fraud (fake invoices)
- Contract fraud
- Patient identity fraud (healthcare)

#### Geographic Distribution

**Year 1 Focus: India**

- TAM: $5.5B (insurance + e-commerce + dating + gig economy + reputation rail) 🆕
- Population: 1.4B
- DigiLocker advantage
- Digital payment maturity
- High fraud rates
- 90M+ dating app users (Tinder, Bumble, Woo)

**Year 2-3: Southeast Asia**

- TAM: $18B (includes massive dating/social market)
- Philippines, Indonesia, Thailand, Vietnam
- 200M+ dating app users
- No DigiLocker equivalent = greenfield opportunity
- Partner with regional super-apps (Grab, Gojek)

**Year 4-5: Global (USA, EU, Rest of World)**

- USA: $45B TAM
- EU: $30B TAM
- Rest of World: $20B TAM
- **Total Global TAM: $118B+** 🆕

### 2.2 Competitive Landscape

#### Direct Competitors

**Humanity Protocol**

- **Focus:** Web3 identity verification via palm scan + ZK proofs on Polygon CDK
- **Funding:** $20M at $1.1B valuation (Pantera Capital, Jump Crypto)
- **Status:** Mainnet live, 2M verified users, $H token launched (ERC-20, 10B supply)
- **Key Partnerships:** Mastercard (privacy-preserving KYC), Animoca Brands, OKX Wallet, Polygon Labs

**Strengths:**

- Mastercard partnership gives real-world financial utility
- "Less invasive" biometric narrative vs Worldcoin (palm > iris)
- Horizontal SDK play — positioning as developer infrastructure, not consumer app
- ZK-proofs used as a marketing weapon ("We never see your data")
- Polygon co-founder (Sandeep Nailwal) is a "Founding Human"

**Weaknesses:**

- Web3-only focus (ignoring $120B enterprise market)
- Only verifies identity (no claims/evidence/reputation validation)
- $0 SaaS revenue (entirely token-dependent — crashes with crypto market)
- Founder admitted ~88% of initial signups were bots
- $H token dropped 85% in 48 hours post-launch
- No cross-platform reputation system (proves you're human, not trustworthy)
- "zkProofer Nodes" are centralized bottleneck disguised as decentralized

**Our Advantage:** We target enterprise (100x bigger market), solve the COMPLETE problem (identity + claims + evidence + reputation), have real SaaS revenue, and prove trustworthiness — not just existence.

**Worldcoin**

- **Focus:** Iris scanning for Web3 identity
- **Funding:** $250M+ (backed by Sam Altman)
- **Status:** Operating in 35+ countries

**Strengths:**

- High-profile founder (Sam Altman)
- Hardware infrastructure (Orbs deployed)
- Millions of users globally

**Weaknesses:**

- Banned in multiple countries (Kenya, Spain, India investigations)
- Privacy concerns kill adoption
- Requires physical Orb locations
- Web3/crypto focus only
- No claims or fraud detection

**Our Advantage:** No hardware, privacy-first, works everywhere, enterprise-focused, complete fraud solution.

**Shift Technology**

- **Focus:** AI-powered insurance fraud detection
- **Funding:** Valued at $1B+
- **Status:** Leader in insurance fraud detection

**Strengths:**

- Established in insurance
- Major insurer clients
- Proven ROI for customers
- Strong AI/ML capabilities

**Weaknesses:**

- Insurance-only (can't expand to other verticals)
- $1M+ contracts (too expensive for SMBs)
- No identity verification layer
- No consumer-facing product
- Enterprise sales cycle (6-12 months)

**Our Advantage:** 1/10th the price ($50K-200K), multi-industry, includes identity verification, faster sales cycle (30-90 days).

#### Indirect Competitors

**Onfido, Jumio (KYC Providers):**

- Static identity verification
- No fraud detection
- No claims validation
- Document verification only

**Reality Defender, Sensity (Deepfake Detection):**

- Point solution (only detect fakes)
- No identity layer
- Security tools, not platforms
- Don't integrate into workflows

**Dating App Verification (Tinder, Bumble):** 🆕

- Basic photo verification (selfie = profile pic)
- No background checks
- No cross-platform reputation
- High bot/fake profile rates (40-50%)
- Users willing to pay for better verification

**Our Advantage:** Complete verification (identity + reputation + background), cross-platform portability, SafeDate scoring, B2B2C model.

#### Competitive Summary

| Competitor        | Market        | TAM  | Weakness                                      | Our Advantage                                     |
| ----------------- | ------------- | ---- | --------------------------------------------- | ------------------------------------------------- |
| Humanity Protocol | Web3          | $10B | Crypto-only, no claims validation, $0 revenue | Enterprise focus, complete solution, SaaS revenue |
| Worldcoin         | Web3          | $10B | Privacy issues, hardware, banned countries    | Software-only, privacy-first, global              |
| Shift Technology  | Insurance     | $32B | Vertical-specific, $1M+ pricing               | Multi-industry, SMB-friendly pricing              |
| Onfido/Jumio      | Identity      | $16B | Static verification, no fraud detection       | Continuous verification + fraud prevention        |
| Reality Defender  | Security      | $5B  | Point solution, no identity                   | Complete platform with identity                   |
| Dating Apps       | Dating/Social | $5B  | Basic photo verification only                 | Complete trust + reputation + SafeDate            |

**Conclusion:** No competitor solves identity + claims + evidence + portable reputation. We own an empty quadrant.

### 2.3 Market Trends Driving Adoption

1. **AI Fraud Explosion (2024-2025)**
   - Deepfake quality crossed "indistinguishable" threshold
   - 900% increase in AI-powered fraud YoY
   - ChatGPT/Midjourney made synthetic content accessible
   - Old solutions (CAPTCHAs) stopped working

2. **Regulatory Pressure**
   - EU AI Act requires deepfake disclosure (2025)
   - US states passing digital identity laws
   - Insurance regulators demanding fraud prevention
   - COPPA requiring age verification

3. **Technology Maturation**
   - Deepfake detection accuracy: 60% (2022) → 96% (2024)
   - Biometric verification now mobile-native
   - Zero-knowledge proofs practical
   - AI inference costs dropped 10x

4. **Network Effects Window**
   - No dominant "trust layer" yet
   - Market fragmented (opportunity)
   - 12-18 month window before consolidation
   - First mover advantage available

---

## 3. USER RESEARCH & PERSONAS

### 3.1 Primary Personas

#### Persona 1: Insurance Claims Manager (B2B)

**Name:** Vikram Singh  
**Age:** 42  
**Role:** VP of Claims, Regional Auto Insurer  
**Company Size:** 150 employees, 50K claims/year

**Pain Points:**

- "12% of claims are fraudulent, costing us ₹30 crore annually"
- "Manual review takes 12 days per claim, customers are frustrated"
- "AI-generated accident photos are fooling our adjusters"
- "Shift Technology wants ₹1 crore/year - too expensive for us"

**Goals:**

- Reduce fraud by 50%+
- Process claims faster (customer satisfaction)
- Prove ROI to board
- Solution under ₹2 lakh/year

**Technology Adoption:** Early adopter, comfortable with APIs, needs 1-2 week pilot to prove value

**Buying Process:**

1. Hears about solution (referral/LinkedIn)
2. 15-minute demo
3. Free pilot (1,000 claims)
4. Board presentation with results
5. Signs annual contract

**Credity Solution:**

- Process claims through our API
- Get trust scores for each claim
- 60% fraud reduction in pilot
- ₹1 lakh annual contract
- ROI: 15x

#### Persona 2: E-commerce Platform Founder (B2B)

**Name:** Ananya Reddy  
**Age:** 34  
**Role:** CEO, Mid-sized Marketplace  
**Platform Size:** 100K sellers, 1M transactions/month

**Pain Points:**

- "Refund fraud costing us ₹5 crore/year"
- "Buyers claim items didn't arrive with fake tracking"
- "Sellers losing trust in our platform"
- "Manual dispute resolution taking 7 days"

**Goals:**

- Cut refund fraud by 50%
- Resolve disputes in <2 days
- Protect sellers from scams
- Budget: ₹50K-1 lakh/month

**Technology Adoption:** Tech-savvy, open to new solutions, values developer experience

**Buying Process:**

1. Discovers via Product Hunt/tech blogs
2. Self-service signup and testing
3. Integrates API in sandbox
4. Processes 100 disputes (free trial)
5. Upgrades to paid plan

**Credity Solution:**

- API for dispute verification
- Authenticate evidence photos
- Verify buyer history
- Auto-approve/reject with scores
- ₹75K/month (~₹1 per dispute)

#### Persona 3: Individual User - Priya (B2C)

**Name:** Priya Sharma  
**Age:** 28  
**Role:** Software Engineer, Mumbai

**Pain Points:**

- "Tired of KYC for every new app"
- "Dating apps full of fake profiles"
- "Want to freelance but platforms don't trust new users"
- "Concerned about privacy when sharing ID"

**Goals:**

- Verify once, use everywhere
- Prove she's real on platforms
- Skip endless forms
- Control what data is shared

**Technology Adoption:** Mobile-first, privacy-conscious, willing to spend 5 minutes for long-term benefit

**User Journey:**

1. Hears about Credity from platform (dating app requires it)
2. Downloads app
3. Completes verification (3 minutes)
4. Now verified on all connected platforms
5. Becomes advocate (refers friends)

**Credity Solution:**

- Free mobile app
- One-time verification
- Portable credentials
- Privacy controls
- "Verified Human" badge

#### Persona 4: Dating App User - Priya (B2C) 🆕

**Name:** Priya Sharma  
**Age:** 28  
**Role:** Marketing Manager, Mumbai

**Pain Points:**

- "50% of matches are fake profiles or catfishes"
- "Worried about safety when meeting strangers"
- "No way to verify if someone is who they claim"
- "Waste time on people with hidden red flags"

**Goals:**

- Only match with verified, real people
- Check safety reputation before meeting
- Build trust faster with matches
- Budget: ₹149/month acceptable for safety

**Technology Adoption:** Mobile-first, privacy-conscious, will pay for safety features

**User Journey:**

1. Sees "Verified by Credity" badge on match's profile
2. Downloads Credity app to get own verification
3. Completes identity check (3 minutes)
4. Links Uber account (shows 4.9★ rating)
5. Now gets 3x more matches (per our A/B test data)
6. Upgrades to SafeDate Premium to see match scores

**Credity Solution:**

- Free verification for basic badge
- SafeDate Score visibility (₹149/month)
- Cross-platform reputation sync
- Real-time safety alerts

#### Persona 5: Gig Worker - Rahul (B2C) 🆕

**Name:** Rahul Kumar  
**Age:** 24  
**Role:** Delivery Partner (Swiggy, Uber Eats)

**Pain Points:**

- "Had to verify separately for Swiggy, Zomato, Uber - took 3 weeks total"
- "My 4.8 Swiggy rating doesn't help me on Uber Eats"
- "Background check costs ₹500 per platform"
- "Want to freelance but platforms don't trust new users"

**Goals:**

- Verify once, work everywhere
- Carry reputation across platforms
- Get approved faster on new platforms
- Prove reliability to clients

**Technology Adoption:** Mobile-first, cost-sensitive, values time savings

**User Journey:**

1. Completes Credity verification (one-time)
2. Links Swiggy account (imports 4.8★ rating)
3. Applies to Uber Eats with Credity profile
4. Gets approved in 5 minutes (vs. 7 days normally)
5. Reputation from both platforms now visible
6. Starts freelance work with portable reputation

**Credity Solution:**

- Free verification and reputation sync
- Fast-track onboarding on partner platforms
- Universal gig profile
- Reputation portability

### 3.2 User Research Findings

#### Research Methodology

- 50 interviews (30 B2B, 20 B2C)
- 5 user testing sessions
- Competitive product analysis
- Secondary research (fraud reports, industry data)

#### Key Insights

1. **Pain is Acute and Growing**
   - 47/50 businesses reported significant fraud issues
   - 82% said fraud increased in 2024
   - 73% said current solutions inadequate
   - 91% willing to try new solution if ROI clear

2. **Willingness to Pay is High**
   - B2B: Average fraud loss ₹2-10 crore/year
   - Willing to spend 5-10% of fraud losses on prevention
   - ROI must be proven quickly (30-90 days)

3. **Trust Score Resonates**
   - Users liked numerical score (0-100)
   - Wanted to understand how to improve
   - Appreciated transparency
   - Competitive element ("Top 15% of users")

4. **Privacy is Critical**
   - Users want control over data
   - Need to see what's shared vs. not shared
   - Appreciate zero-knowledge approach
   - Will abandon if feels invasive

5. **DigiLocker is Valued But Not Essential**
   - Indian users love DigiLocker integration
   - Global users don't care (don't have it)
   - Speed improvement modest (1 minute saved)
   - Cannot be core differentiator globally

---

## 4. PRODUCT OVERVIEW & VALUE PROPOSITION

### 4.1 Product Description

Credity is a three-layer trust verification platform:

**Layer 1: Identity Verification**  
Verifies users are real, unique humans through biometric liveness detection, document verification, and AI-powered fraud detection.

**Layer 2: Claims Validation**  
Validates the truthfulness of user claims through timeline analysis, pattern matching against 50M+ fraud cases, and behavioral analysis.

**Layer 3: Evidence Authentication**  
Authenticates submitted evidence (photos, videos, documents) using deepfake detection, forensic metadata analysis, and blockchain timestamping.

**Output: Credity Trust Score™ (0-100)**

- 90-100: Instant approval
- 70-89: Quick review
- 50-69: Detailed investigation
- <50: Reject or escalate

### 4.2 Value Propositions

#### For Insurance Companies

**Problem:** Losing ₹30 crore/year to fraud, manual review costs ₹100-300 per claim

**Solution:** Automated verification catches 60% more fraud, processes claims 75% faster

**Value:**

- 60% reduction in fraud payouts
- 75% faster claim processing
- 50% reduction in investigation costs
- ROI: 15-20x
- Pricing: ₹5-15 per claim

#### For E-commerce Platforms

**Problem:** ₹5 crore/year in refund fraud, 7-day dispute resolution

**Solution:** Real-time verification of buyers, claims, and evidence photos

**Value:**

- 55% reduction in refund fraud
- 40% fewer chargebacks
- 2x faster dispute resolution
- Better seller retention
- Pricing: ₹30-80 per dispute or 0.3% of transaction value

#### For Platforms (Dating, Gig, Social)

**Problem:** 40% of users are bots/fakes, users abandoning due to lack of trust

**Solution:** Proof-of-human verification, portable trust credentials

**Value:**

- 90% reduction in fake accounts
- 80% reduction in spam/scams
- Better user experience
- Higher engagement and retention
- Pricing: ₹20 per verification ($0.25)

#### For Individual Users

**Problem:** Endless KYC, fake people everywhere, privacy concerns

**Solution:** Verify once, use everywhere, full privacy control

**Value:**

- Skip KYC on new platforms
- Prove you're real
- Build trust faster
- Control your data
- Pricing: Free (platforms pay)

### 4.3 How It Works

#### For Businesses (B2B)

1. **INTEGRATE**
   - Add Credity API (1 hour integration)
   - Configure verification requirements
   - Set trust score thresholds

2. **VERIFY**
   - User submits claim/profile
   - Credity verifies in <2 minutes
   - Returns trust score + recommendation

3. **DECIDE**
   - Auto-approve high scores (90-100)
   - Flag medium scores (50-89)
   - Reject low scores (<50)
   - Track ROI in dashboard

#### For Users (B2C)

1. **DOWNLOAD**
   - Get Credity Wallet app
   - Sign up (30 seconds)

2. **VERIFY**
   - Liveness check (30 seconds)
   - Scan ID or import DigiLocker (1-2 minutes)
   - Get Trust Score

3. **CONNECT**
   - Connect to platforms
   - Share credentials (you control what)
   - Skip KYC forever

---

## 5. FEATURE REQUIREMENTS (COMPLETE)

### 5.1 Core Features (MVP - Must Have)

#### Feature 1: User Onboarding & Authentication

**Priority:** P0 (Must Have)

**User Stories:**

- As a new user, I want to sign up quickly so I can start verifying
- As a user, I want multiple sign-up options so I can use my preferred method
- As a user, I want secure authentication so my account is protected

**Functional Requirements:**

1. Sign-up methods:
   - Email + OTP verification
   - Phone + SMS verification
   - Google OAuth
   - Apple Sign In

2. Profile creation (name, photo optional)
3. Biometric authentication setup (Face ID/Touch ID/Fingerprint)
4. PIN fallback (6-digit)
5. Session management (30-day expiry)

**Acceptance Criteria:**

- User can sign up in <2 minutes
- OTP arrives within 30 seconds
- Biometric works on 95%+ devices
- Session persists across app restarts

#### Feature 2: Identity Verification (Complete Flow)

**Priority:** P0 (Must Have)

**User Stories:**

- As a user, I want to verify my identity once so I can use it everywhere
- As a user, I want the process to be quick (<5 min) so I don't abandon
- As a user, I want to know why each step is needed so I trust the process

**Functional Requirements:**

**2.1 Bio-Signature Generation**

- Real-time 3D face mapping with depth analysis
- Challenge-response (smile, turn head) for anti-spoofing
- Neural network-powered fraud detection (masks, photos, screens)
- 30-second duration with haptic feedback and visual mesh overlay
- Auto-capture with "Signature Generated ✓" confirmation animation

_Design Note: The scanning UI should feel like creating a digital asset, not filling a KYC form. Use particle effects, scanning grid overlays, and a progress ring. (Learned from Humanity Protocol's biometric branding success.)_

**2.2 Document Scanning**

- Support: Aadhaar, PAN, Passport, Driver's License
- Camera overlay with document guide
- Auto-detect document edges
- Quality checks (glare, blur, completeness)
- Manual capture fallback

**2.3 Document Processing**

- OCR (extract text from document)
- Format validation (check document structure)
- Authenticity checks (holograms, security features)
- Face matching (ID photo vs. liveness)
- Database verification (if available)

**2.4 DigiLocker Integration (India)**

- OAuth flow to DigiLocker
- Document selection interface
- Bulk import (multiple documents)
- Real-time status updates
- Error handling and retry

**Acceptance Criteria:**

- Liveness detection accuracy: >95%
- Document scan success rate: >90% first try
- Face match accuracy: >98%

#### Feature 5: Reputation Rail (Cross-Platform Trust) 🆕

**Priority:** P0 (MVP)

**User Stories:**

- As a user, I want my good behavior on Uber to help me on dating apps
- As a platform, I want to onboard trusted users faster without rebuilding reputation systems
- As a user, I want to carry my reputation across all platforms I use

**Functional Requirements:**

**5.1 Platform Integration Framework**

- OAuth 2.0 consent flow for platform connections
- API for platforms to read/write reputation events
- Selective disclosure (user chooses what to share)
- Real-time sync across connected platforms

**5.2 Reputation Score (0-1000)**

Calculated from:

- Transport: Uber/Ola rider rating (weight: 15%)
- Accommodation: Airbnb guest reviews (weight: 15%)
- Delivery: Swiggy/Zomato order behavior (weight: 10%)
- Employment: LinkedIn recommendations (weight: 20%)
- Finance: Credit score proxy (weight: 15%)
- Social: Dating app reported behavior (weight: 10%)
- Identity: Document verification completeness (weight: 15%)

**5.3 Platform Categories**
| Platform Type | Write Access | Read Access | Anti-Gaming |
|---------------|--------------|-------------|--------------|
| Transport (Uber) | Can write rider scores | Can read aggregate only | Platform-signed events |
| Dating (Tinder) | Can write safety reports | Can read trust + reputation | Blockchain anchored |
| Gig (Swiggy) | Can write completion rates | Can read work history | Rate-limited writes |
| Finance (CIBIL) | Can write payment behavior | Read with explicit consent | External validation |

**5.4 Anti-Gaming Mechanisms**

- Only verified platforms can write (API key + domain verification)
- Blockchain anchoring of all reputation events
- ML fraud detection for suspicious patterns
- Dispute resolution for incorrect reports
- Decay function (old events have less weight)

**5.5 User Experience**

**Connecting Platforms:**

```
┌─────────────────────────────────────────┐
│ Connect Your Accounts                   │
├─────────────────────────────────────────┤
│ 🚗 Uber          [Connect] Connected ✓ │
│ 🏠 Airbnb        [Connect]              │
│ ❤️ Tinder        [Connect]              │
│ 💼 LinkedIn      [Connect] Connected ✓ │
│ 🍕 Swiggy        [Connect]              │
└─────────────────────────────────────────┘
```

**Sharing Control:**

```
┌─────────────────────────────────────────┐
│ Tinder wants to see:                    │
│ ☑ Reputation Score (850/1000)          │
│ ☑ Uber rider rating (4.9★)             │
│ ☐ Airbnb guest reviews                 │
│ ☑ Identity verification status         │
│                                         │
│ [Approve]  [Customize]  [Deny]         │
└─────────────────────────────────────────┘
```

**Acceptance Criteria:**

- Platform connection success rate: >95%
- Reputation sync latency: <5 seconds
- User consent required for all data sharing
- Reputation score explainability (show formula)
- Dispute resolution within 48 hours

---

### 5.2 Dating & Social Platform Features 🆕

#### Feature 6: SafeDate Score (Dating Safety Layer)

**Priority:** P1 (Post-MVP, High Value)

**User Stories:**

- As a woman on dating apps, I want to screen matches for safety before meeting
- As a dating app, I want to reduce harassment and improve user trust
- As a user, I want a "verified human" badge to increase match rates

**Functional Requirements:**

**6.1 SafeDate Score Components (0-100)**

- Identity verified (0-25 points)
- Liveness check passed (0-15 points)
- Background check clean (0-20 points)
- Cross-platform reputation (0-20 points)
- Social validation (LinkedIn, etc.) (0-10 points)
- Behavioral signals (no harassment reports) (0-10 points)

**6.2 Dating Platform Integration**

```
┌─────────────────────────────────────────┐
│ Profile: Rahul, 28                      │
│ ✓ Verified by Credity                   │
│ SafeDate Score: 87/100 🟢               │
│                                         │
│ [View Proof]  [Report Issue]           │
└─────────────────────────────────────────┘
```

**6.3 Premium Insights (₹149/month)**

- See SafeDate scores before matching
- Background check summaries
- Harassment report history (aggregated)
- Identity verification timestamps

**6.4 Platform Safety Features**

- In-app reporting of bad behavior
- Cross-platform ban propagation (optional)
- Video call verification before first meeting
- Meeting safety tips based on SafeDate score

**Acceptance Criteria:**

- 3x match rate increase for verified users (A/B tested)
- 60% reduction in harassment reports on pilot platforms
- 10K+ paid subscribers within 6 months of launch
- 95% user satisfaction with safety features

#### Feature 7: Gig Economy Onboarding Acceleration

**Priority:** P1

**User Stories:**

- As a gig worker, I want to get verified once and join multiple platforms instantly
- As Swiggy/Uber, I want to onboard quality workers faster
- As a worker, I want my good ratings to carry across platforms

**Functional Requirements:**

**7.1 Universal Gig Profile**

- Aggregated ratings from all platforms
- Background verification (one-time)
- Right-to-work documents
- Vehicle verification (for delivery)
- Bank account verification

**7.2 Fast-Track Onboarding API**

- Platform checks Credity verification status
- If verified (score >70): Auto-approve in <5 minutes
- If not verified: Standard flow
- Platform saves ₹50-100 per onboarding

**Acceptance Criteria:**

- Onboarding time: 7 days → 5 minutes (verified users)
- Platform acquisition cost reduced by 50%
- Worker satisfaction increase 40%
- Total verification time: <3 minutes
- DigiLocker import: <1 minute

---

### 5.3 Employment & Hiring Features 🆕

#### Feature 8: WorkScore (Comprehensive Employment Verification)

**Priority:** P0 (Co-equal with Dating, Launch Simultaneously)

**User Stories:**

- As a job seeker, I want to verify my credentials once and use them for all applications
- As an employer, I want to verify candidates in 5 minutes instead of 7-14 days
- As a recruiter, I want to filter for verified candidates to reduce fraud
- As a platform (Naukri/LinkedIn), I want to reduce fake profiles and increase quality

**Strategic Rationale:**

- TAM: $5B India, $200B+ global (employment verification)
- Revenue: ₹20 Cr Year 1, ₹126 Cr Year 2, ₹348 Cr Year 3
- Network Effects: Employment history is MOST valuable cross-vertical signal
- Existing Asset: CredVerseRecruiter already built, just needs activation

**Functional Requirements:**

**8.1 WorkScore Components (0-1000)**

```javascript
WorkScore Breakdown:
├── Identity Verification (0-150 points)
│   ├── Aadhaar verified: 50 pts
│   ├── Liveness check: 30 pts
│   ├── Phone + email verified: 20 pts
│   ├── Address verified: 30 pts
│   └── Criminal background clear: 20 pts
│
├── Education Verification (0-200 points)
│   ├── Degree verified (DigiLocker): 100 pts
│   ├── Institution reputation tier: 50 pts
│   ├── Certifications/upskilling: 30 pts
│   └── Academic performance data: 20 pts
│
├── Employment History (0-300 points)
│   ├── Past employer verifications: 150 pts
│   ├── Tenure stability (no job hopping): 50 pts
│   ├── Role progression: 40 pts
│   ├── Reference checks verified: 30 pts
│   └── Notice period compliance: 30 pts
│
├── Professional Reputation (0-200 points)
│   ├── Manager ratings from past jobs: 80 pts
│   ├── Peer feedback: 40 pts
│   ├── Project delivery quality: 40 pts
│   └── Teamwork scores: 40 pts
│
├── Skills Verification (0-100 points)
│   ├── Skill tests passed: 50 pts
│   ├── GitHub/portfolio verified: 30 pts
│   └── Certifications: 20 pts
│
└── Cross-Platform Trust (0-50 points)
    ├── Gig economy ratings (Uber/Swiggy): 20 pts
    ├── Rental payment history: 15 pts
    └── Financial behavior: 15 pts
```

**8.2 For Job Seekers**

**WorkScore Pro Subscription (₹499/year):**

- Verified badge on all platforms (Naukri, LinkedIn, Indeed)
- Cross-platform reputation visible to employers
- Priority ranking in search results (3x more profile views)
- Skills verification reports
- Background check report PDF (shareable)
- One-click application with verified credentials

**User Experience:**

```
┌─────────────────────────────────────────┐
│ My WorkScore: 850/1000 🏆              │
├─────────────────────────────────────────┤
│ ✅ Identity: 145/150                    │
│ ✅ Education: 180/200                   │
│ ✅ Employment: 280/300                  │
│ ✅ Reputation: 175/200                  │
│ ⚠️ Skills: 70/100 [Improve]            │
│                                         │
│ You rank in top 15% of candidates      │
│ [Share Profile] [Download Report]      │
└─────────────────────────────────────────┘
```

**8.3 For Employers (CredVerseRecruiter Dashboard)**

**SMB Plan (₹5,999/month):**

- 50 WorkScore checks/month
- Instant candidate verification (5 mins vs 7-14 days)
- Background check reports
- Skills assessment integration

**Enterprise Plan (₹49,999-2L/month):**

- Unlimited WorkScore checks
- ATS integration (Darwinbox, Keka, greytHR)
- Custom verification workflows
- Bulk verification APIs
- Fraud detection alerts
- Dedicated account manager

**Employer Dashboard:**

```
┌─────────────────────────────────────────┐
│ Candidate: Priya Sharma                │
│ WorkScore: 850/1000 ✅ Verified        │
├─────────────────────────────────────────┤
│ Identity: ✅ Aadhaar + Liveness         │
│ Education: ✅ B.Tech IIT Delhi          │
│ Employment: ✅ 4 years verified         │
│ Skills: ⚠️ React (Test: 75%)           │
│ Reputation: ✅ 4.6/5 avg rating         │
│                                         │
│ Background: ✅ No red flags             │
│ Notice Period: 30 days (verified)      │
│                                         │
│ [Hire] [Request Interview] [Reject]    │
└─────────────────────────────────────────┘
```

**8.4 For Job Platforms (Naukri, LinkedIn, Indeed)**

**Platform Integration (₹2-5L/year + usage):**

- API access to WorkScore
- "Verified by Credity" badge for profiles
- ₹10-15 per verification (platforms can markup to ₹20-30)
- Premium tier: Verified candidates only (subscription upsell)
- Reduced fake profiles = higher recruiter satisfaction

**Platform Dashboard:**

```
┌─────────────────────────────────────────┐
│ Naukri - Verification Analytics         │
├────────────────────────────────────────┤
│ Verified Profiles: 1.2M (+15% MoM)     │
│ Fake Profile Reduction: 68%            │
│ Recruiter NPS: +42 (was +28)          │
│ Premium Conversion: 3.2x higher        │
│                                         │
│ API Usage: 125K verifications/month    │
│ Revenue Share: ₹18.75L this month      │
└─────────────────────────────────────────┘
```

**Acceptance Criteria:**

- WorkScore calculation accuracy: >95%
- Background verification time: <5 minutes (vs 7-14 days industry standard)
- Job seeker acquisition: 200K WorkScore Pro subscribers Year 1
- Employer acquisition: 550 customers Year 1 (500 SMB + 50 Enterprise)
- Platform partnerships: 2 in Year 1 (Naukri + Internshala pilot)
- 3x profile view increase for verified job seekers
- 68%+ fake profile reduction on partner platforms
- Employer satisfaction (NPS): >50

---

### 5.4 Additional Vertical Applications 🆕

These verticals leverage the same Reputation Rail infrastructure, adding significant TAM with minimal incremental development cost.

#### Feature 9: TenantScore (Rental Housing Verification)

**Priority:** P1 (Year 1-2)
**TAM:** $8B India, $40B Global

**Problem:**

- Landlords lose ₹30-50K due to bad tenants (payment defaults, property damage)
- Tenants face discrimination, need to reverify for every property
- 40% of rental disputes = payment or property issues

**Solution - TenantScore (0-100):**

- Past landlord ratings (60% weight)
- Payment reliability from work/banking (20% weight)
- Property care reputation (10% weight)
- Dispute resolution history (10% weight)

**Business Model:**

- Landlords pay ₹299/comprehensive tenant check
- Tenants pay ₹99/year for "Trusted Tenant" premium profile
- Platforms (NoBroker, Housing.com) pay ₹50K-1L/year API access

**Revenue Potential:** ₹64 Cr ARR by Year 2

#### Feature 10: HealthScore (Healthcare/Telemedicine Trust)

**Priority:** P2 (Year 2)
**TAM:** $3B India, $25B+ Global

**Problem:**

- 60% of online consultations = unverified doctors
- Patients can't verify doctor credentials (fake MCI registrations)
- No patient compliance tracking for doctors

**Solution:**

- **DoctorScore (0-100):** MCI verification + hospital affiliations + patient satisfaction + board certifications
- **PatientScore:** Treatment adherence + appointment reliability + payment history

**Business Model:**

- Doctors pay ₹2,999/year for "Verified Doctor" badge (4x booking increase)
- Patients: ₹149/month premium (priority booking with top docs)
- Platforms (Practo, 1mg): ₹1-2L/year + ₹5 per verification

**Revenue Potential:** ₹17 Cr ARR by Year 2

#### Feature 11: TutorScore (Education Marketplace Verification)

**Priority:** P2 (Year 2)
**TAM:** $5B India, $30B+ Global

**Problem:**

- 60% of online tutors have fake degrees
- Parents can't verify tutor credentials
- No cross-platform reputation for teaching quality

**Solution - TutorScore (0-100):**

- Degree verification + teaching certifications
- Student outcome data
- Parent ratings aggregated across platforms

**Business Model:**

- Tutors pay ₹499/year for universal verified profile
- Parents pay ₹99/month for "Safe Learning" (background verified only)
- Platforms (Vedantu, Unacademy) pay ₹75K-1.5L/year

**Revenue Potential:** ₹16.5 Cr ARR by Year 2

#### Feature 12: HomeWorkerScore (Domestic Services Verification)

**Priority:** P1 (Year 1-2)
**TAM:** $4B India, $20B+ Global

**Problem:**

- 80% of households won't hire without personal reference
- No verification system (theft/safety incidents common)
- Workers lose income due to trust deficit

**Solution - HomeWorkerScore (0-100):**

- Police verification + Aadhaar
- Past employer ratings
- Training certifications
- Theft insurance

**Business Model:**

- Workers pay ₹599/year for verified profile (6x placement increase)
- Employers pay ₹199/comprehensive background check
- Platforms (UrbanClap, Housejoy) pay ₹50K-1L/year

**Revenue Potential:** ₹73 Cr ARR by Year 2

#### Feature 13: TrustScore for Lending (Alternative Credit)

**Priority:** P1 (Year 1-2)
**TAM:** $12B India, $80B+ Global

**Problem:**

- 190M Indians have no credit score (thin-file/no-file)
- Banks reject 70% of gig worker loan applications
- Credit bureaus can't see gig economy reputation

**Solution - TrustScore for Lending (0-100):**

- Gig platform ratings + rental payment history
- Employment verification + social reputation
- Alternative credit model for "credit invisibles"

**Business Model:**

- Lenders pay ₹50-100 per TrustScore pull (like CIBIL)
- Users pay ₹299/year for "Credit Builder" subscription

**Revenue Potential:** ₹40.5 Cr ARR by Year 2

**Summary - Multi-Vertical Expansion:**

| Vertical                   | Priority | Year 1 ARR | Year 2 ARR  | Launch Timeline |
| -------------------------- | -------- | ---------- | ----------- | --------------- |
| Dating (SafeDate)          | P0       | ₹5 Cr      | ₹28 Cr      | Month 1-3       |
| Hiring (WorkScore)         | P0       | ₹20 Cr     | ₹126 Cr     | Month 1-3       |
| Rental (TenantScore)       | P1       | ₹10 Cr     | ₹64 Cr      | Month 4-6       |
| Financial (TrustScore)     | P1       | —          | ₹40 Cr      | Month 7-9       |
| Domestic (HomeWorkerScore) | P1       | —          | ₹73 Cr      | Month 7-9       |
| Healthcare (HealthScore)   | P2       | —          | ₹17 Cr      | Year 2          |
| Education (TutorScore)     | P2       | —          | ₹16 Cr      | Year 2          |
| **Total Multi-Vertical**   |          | **₹35 Cr** | **₹364 Cr** |                 |

**Key Insight:** Each vertical shares the SAME infrastructure (Reputation Rail), creating massive operating leverage. Once core is built, adding verticals = 80% margin incremental revenue.

---

#### Feature 3: Trust Score Calculation

**Priority:** P0 (Must Have)

**User Stories:**

- As a user, I want to see my trust score so I know my standing
- As a user, I want to understand how to improve my score
- As a business, I want a simple number to make decisions

**Functional Requirements:**

**3.1 Score Components**

- Identity Verification (40% weight)
  - Liveness passed: 20 points
  - Document verified: 15 points
  - Biometrics matched: 5 points

- Activity & Behavior (30% weight)
  - Number of verifications: up to 15 points
  - Platform connections: up to 10 points
  - Recency of activity: up to 5 points

- Reputation & Trust (30% weight)
  - No suspicious activity: 15 points
  - Platform endorsements: up to 10 points
  - User feedback: up to 5 points

**3.2 Score Display**

- 0-100 scale
- Status labels: Poor (<50), Fair (50-69), Good (70-84), Excellent (85-94), Outstanding (95-100)
- Visual ring animation
- Breakdown by component
- Historical trend chart

**3.3 Score Improvement Suggestions**

- Quick wins (+3-5 points)
- Long-term actions (+10-15 points)
- Timeframe estimates
- Progress tracking

**Acceptance Criteria:**

- Score calculates in <1 second
- Updates within 5 minutes of new activity
- Breakdown adds up to 100
- Suggestions are actionable

#### Feature 4: Credential Management

**Priority:** P0 (Must Have)

**User Stories:**

- As a user, I want to see all my credentials in one place
- As a user, I want to control what I share with each platform
- As a user, I want to revoke access anytime

**Functional Requirements:**

**4.1 Credential Types**

- Verified Human (default after identity verification)
- Age 18+ (from DOB on ID)
- Location (country/state from ID or GPS)
- Government ID (Aadhaar, PAN, etc.)
- Professional (LinkedIn, work email)
- Custom (platform-specific)

**4.2 Credential Display**

- Card-based layout
- Status indicators (active, expired, pending)
- Usage count
- Last used timestamp
- Expiry dates

**4.3 Credential Sharing**

- Platform connection requests
- Granular permission selection
- Validity period (1 month, 1 year, forever)
- Biometric confirmation before sharing
- Shareable QR codes (5-minute expiry)

**4.3 Credential Revocation**

- Revoke individual platform access
- Revoke all access for credential
- Delete credential entirely
- Confirmation prompts

**Acceptance Criteria:**

- Credentials load in <2 seconds
- Sharing flow takes <30 seconds
- Revocation takes effect immediately
- QR codes refresh every 5 minutes

#### Feature 5: Platform Connections

**Priority:** P0 (Must Have)

**User Stories:**

- As a platform, I want to request user verification via API
- As a user, I want to approve/deny connection requests
- As a user, I want to manage all my connections

**Functional Requirements:**

**5.1 Connection Request Flow**

- Platform sends API request with required credentials
- Push notification to user
- In-app approval interface
- Biometric confirmation
- Platform receives webhook with result

**5.2 Connection Management**

- List all active connections
- Last access timestamp
- Data shared with each platform
- Usage history
- Disconnect option

**5.3 Pending Requests**

- Queue of unapproved requests
- Approve/deny actions
- Bulk actions (approve all, deny all)
- Request expiry (24 hours)

**Acceptance Criteria:**

- Request notification arrives <10 seconds
- Approval flow takes <1 minute
- Platform receives webhook <5 seconds after approval
- Connection list loads <2 seconds

---

## 6. TECHNICAL ARCHITECTURE

### 6.1 Architecture Philosophy: "Hub & Spoke" Model 🆕

**Design Principle:** ONE Core Platform (Reputation Rail) + Multiple Lightweight Vertical UX Layers

Think **Stripe for payments** → **Credity for trust**. One backend infrastructure powers all verticals.

```
                 ┌────────────────────────────────────┐
                 │   REPUTATION RAIL CORE (Hub)    │
                 │                                │
                 │  • Trust Graph Database          │
                 │  • Multi-Vertical Scoring Engine │
                 │  • Cross-Platform Events         │
                 │  • Authority Management          │
                 │  • ZK Proof Generation           │
                 │  • Blockchain Anchoring          │
                 └────────────────┬───────────────────┘
                                  │
                 ┌────────────────┴───────────────────┐
                 │                                    │
       ┌─────────┴─────────┐         ┌───────────────┴────────┐
       │  SafeDate App      │         │  WorkScore App         │
       │  (Dating UX)       │         │  (Hiring UX)           │
       └────────────────────┘         └────────────────────────┘
       │                                                       │
   ┌───┴─────┐                                         ┌──────┴─────┐
   │TenantScore│                                       │ HealthScore│
   │(Rental UX)│                                       │(Medical UX)│
   └───────────┘                                       └────────────┘

Spokes: Vertical-specific React apps (thin UI wrappers)
Hub: Shared infrastructure (scoring, graph, blockchain)
```

**Why This Works:**

1. **No Code Duplication:** Verification logic written once
2. **Vertical Isolation:** Dating data never leaks to hiring platforms
3. **Network Effects:** More verticals = more reputation data = better scores
4. **Operating Leverage:** Add new vertical = 80% margin (minimal dev cost)

---

### 6.1.1 SDK-First Distribution (Learned from Humanity Protocol)

**Principle:** The SDK is the product. The apps are demos of the SDK.

**`@credverse/trust` SDK (npm package):**

- Single package for all verticals
- 3-line integration for any Node.js/React app
- Returns Trust Score + Recommendation in <2 seconds

**Integration Example:**

```typescript
import { CredVerse } from "@credverse/trust";

const cv = new CredVerse({ apiKey: "cv_live_xxx" });

// One line to verify
const result = await cv.verify({
  userId: "user_123",
  vertical: "DATING", // or 'HIRING', 'RENTAL', etc.
  requiredScore: 70,
});

// result = { score: 87, recommendation: 'APPROVE', zkProof: '0x...' }
```

**Why SDK-First Wins:**

- Humanity Protocol raised $20M selling SDKs. We can do the same with real revenue.
- Platforms integrate once, locked in forever (switching cost = re-engineering)
- Every SDK install = a billboard ("Verified by Credity" badge)

---

### 6.2 Layered Architecture Overview (Complete Stack)

```
┌───────────────────────────────── LAYER 4: End Users ─────────────────────────────────────┐
│                                                                                           │
│  BlockWalletDigi (Web) + apps/mobile (React Native)                                     │
│  • User's universal wallet                                                               │
│  • Multi-vertical profile management (Work/Dating/Rental tabs)                          │
│  • ZK proof generation (client-side)                                                     │
│  • Consent controls (what to share where)                                                │
│                                                                                           │
└───────────────────────────────────┬───────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────── LAYER 3: Vertical UX ─────────────────────────────────────┐
│                                                                                           │
│  ┌─────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────┐  │
│  │ CredVerseRecruiter      │   │ SafeDate Vertical App    │   │ TenantScore App      │  │
│  │ (Employer Portal)       │   │ (Dating Users)           │   │ (Landlords)          │  │
│  └─────────────────────────┘   └──────────────────────────┘   └──────────────────────┘  │
│                                                                                           │
│  React apps calling Gateway APIs (vertical-specific logic minimal)                       │
│                                                                                           │
└───────────────────────────────────┬───────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────── LAYER 2: API Gateway ─────────────────────────────────────┐
│                                                                                           │
│  credverse-gateway (Public API Layer)                                                    │
│  • REST + tRPC APIs (type-safe end-to-end)                                              │
│  • Auth (Clerk for users, Unkey for platforms)                                          │
│  • Rate limiting (Kong + Upstash Redis)                                                 │
│  • Vertical routing (/work-score, /safe-date, /tenant-score)                            │
│                                                                                           │
└───────────────────────────────────┬───────────────────────────────────────────────────────┘
                                    │
┌────────────────────────────── LAYER 1: Core Services ────────────────────────────────────┐
│                                                                                           │
│  CredVerseIssuer 3 → Reputation Rail Core Engine                                        │
│  • Trust graph database (Neo4j)                                                          │
│  • Multi-vertical scoring algorithms (WorkScore, SafeDate, TenantScore, etc)            │
│  • Cross-vertical behavioral signals (character traits)                                  │
│  • Authority management (platform verification + scoping)                                │
│  • ZK proof verifier                                                                     │
│  • Fraud detection ML models                                                             │
│                                                                                           │
│  packages/shared-auth                                                                    │
│  • Centralized auth logic                                                                │
│  • JWT validation, Platform API key management                                           │
│                                                                                           │
└───────────────────────────────────┬───────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────── DATA LAYER ───────────────────────────────────────────┐
│                                                                                           │
│  ┌──────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐               │
│  │ PostgreSQL 16+       │  │ Neo4j Community     │  │ TimescaleDB      │               │
│  │ (Neon/Supabase)      │  │ (Trust graph)       │  │ (Event stream)   │               │
│  │                      │  │                     │  │                  │               │
│  │ Users, platforms,    │  │ Reputation graph,   │  │ Time-series      │               │
│  │ verifications        │  │ cross-vertical      │  │ reputation events│               │
│  └──────────────────────┘  └─────────────────────┘  └──────────────────┘               │
│                                                                                           │
│  ┌─────────────────────────────┐  ┌────────────────────────────────────┐                │
│  │ Upstash Redis               │  │ GCP Cloud Storage                  │                │
│  │ (Cache, Queues, Sessions)   │  │ (Encrypted documents, media)       │                │
│  └─────────────────────────────┘  └────────────────────────────────────┘                │
│                                                                                           │
└───────────────────────────────────┬───────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────── BLOCKCHAIN + ML LAYER ──────────────────────────────────────┐
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │ Polygon zkEVM (Zero-Knowledge Layer) 🆕                                         │    │
│  │ • Privacy-native blockchain (ZK proofs)                                          │    │
│  │ • Reputation event anchoring (immutable audit trail)                             │    │
│  │ • ZK proof verification (on-chain + off-chain)                                   │    │
│  │ • Selective disclosure (prove claims without revealing data)                     │    │
│  │ • Cost: ₹0.05/tx (50% cheaper than Polygon PoS)                                  │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │ Python ML Services (FastAPI)                                                     │    │
│  │ • Fraud detection models (TensorFlow, scikit-learn)                              │    │
│  │ • Liveness detection (PyTorch)                                                   │    │
│  │ • Deepfake detection                                                             │    │
│  │ • Cross-vertical pattern analysis                                                │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.3 Technology Stack (Complete & Optimized)

#### 📱 Frontend Layer

**Mobile App (React Native + Expo)**

- Framework: React Native 0.72+ with Expo SDK 50+
- Language: TypeScript 5.0+
- State: React Query (API cache) + Zustand (local state)
- Navigation: Expo Router (file-based)
- UI: React Native Paper + shadcn/ui (native)
- Styling: Tailwind (NativeWind)
- Camera: expo-camera
- Biometrics: react-native-biometrics
- **ZK Proofs:** snarkjs (client-side proof generation)

**Web Apps (React + Vite)**

- Framework: React 18 with Vite
- Language: TypeScript 5.0+
- State: TanStack Query + Zustand
- UI: shadcn/ui + Tailwind CSS
- Forms: React Hook Form + Zod validation
- Charts: Recharts / Tremor (for dashboards)
- **ZK Proofs:** snarkjs (browser-based proof generation)

**Why React Everywhere:**

- Code sharing between web + mobile
- Team expertise (one language, one framework)
- Fast iteration with Vite/Expo hot reload

---

#### ⚙️ Backend Layer

**Core API Services (Node.js + TypeScript)**

- Runtime: Node.js 20 LTS
- Framework: Express.js OR Fastify (migration option)
- Language: TypeScript 5.0+
- **API Layer:** tRPC v10+ (type-safe APIs, end-to-end TypeScript)
- Validation: Zod (shared schemas with frontend)
- **Queue:** BullMQ + Upstash Redis (background jobs)
- ORM: Drizzle ORM (for PostgreSQL)

**Why tRPC:**

```typescript
// Backend defines API
export const router = t.router({
  getWorkScore: t.procedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await calculateWorkScore(input.userId);
    }),
});

// Frontend gets FULL type safety (autocomplete, compile-time errors)
const { data } = trpc.getWorkScore.useQuery({ userId: "user_123" });
//      ^──── TypeScript knows exact return type!
```

**Services Architecture (Monorepo):**

```
/Users/raghav/Desktop/cr/
  ├── credverse-gateway/       ← API Gateway (Kong + tRPC router)
  ├── CredVerseIssuer 3/        ← Reputation Rail Core
  ├── CredVerseRecruiter/       ← WorkScore vertical UX
  ├── BlockWalletDigi/          ← Consumer wallet
  ├── apps/mobile/              ← Mobile app
  └── packages/shared-auth/     ← Centralized auth
```

---

#### 🗄️ Database Layer

**1. PostgreSQL 16+ (Primary Relational DB)**

- Managed: Neon or Supabase (serverless Postgres)
- ORM: Drizzle ORM
- Use Cases:
  - User accounts, authentication
  - Verifications, documents
  - Platform registrations
  - Transactions, billing

**2. Neo4j Community Edition (Reputation Graph) 🆕**

- Purpose: Trust graph, cross-vertical relationships
- Why Graph DB: Reputation IS a graph problem
- Deployment: Self-hosted on GCP Compute Engine
- Cost: ~₹3-15K/month

**Graph Schema Example:**

```cypher
// Nodes
(User)-[:VERIFIED_ON]->(Platform)
(User)-[:HAS_SCORE {vertical: "WORK", score: 850}]->(Vertical)
(User)-[:EMPLOYED_AT]->(Company)
(Company)-[:RATED {score: 4.5}]->(User)

// Cross-vertical query (O(1) in graph vs O(n) in SQL)
MATCH (u:User {id: "user_123"})-[r]->(p)
WHERE r.vertical IN ["WORK", "RENTAL", "DATING"]
RETURN r.score, r.signals
```

**Why Neo4j for Reputation:**

- "Find all platforms User A verified on" = graph traversal (instant)
- Cross-vertical signal aggregation = native graph operation
- Fraud detection = pattern matching in graph
- Scales to billions of relationships

**3. TimescaleDB (Time-Series Events) 🆕**

- Purpose: Reputation events over time
- Implementation: PostgreSQL extension (same DB as primary)
- Use Cases:
  - Reputation event stream (millions/day)
  - Score trend analysis
  - Retention policies (auto-delete old events)

**Example:**

```sql
CREATE TABLE reputation_events (
  time TIMESTAMPTZ NOT NULL,
  user_id TEXT,
  event_type TEXT,
  vertical TEXT,
  score_delta INT,
  metadata JSONB
);

SELECT create_hypertable('reputation_events', 'time');

-- Score trend (6 months)
SELECT time_bucket('1 month', time) AS month,
       AVG(score_delta)
FROM reputation_events
WHERE user_id = 'user_123' AND vertical = 'WORK'
GROUP BY month
ORDER BY month DESC LIMIT 6;
```

**4. Redis (Upstash) - Cache + Queues**

- Serverless Redis (pay per request)
- Use Cases:
  - API response caching
  - Rate limiting
  - Session storage
  - BullMQ job queues
- Cost: ₹1-5K/month

---

#### 🔐 Authentication & Authorization 🆕

**User Auth (B2C):**

- Provider: **Clerk** (recommended) OR Auth0
- Why Clerk:
  - Multi-tenancy support (B2B + B2C)
  - Social auth + Aadhaar integration
  - Organization/team management built-in
  - Webhooks for user lifecycle events
  - Cost: ₹0-5K/month for 10K users

**Platform API Keys (B2B):**

- Provider: **Unkey** (API key management)
- Features:
  - Rate limiting per platform
  - Usage analytics
  - Key rotation
  - Vertical scoping (WorkScore keys can't access SafeDate)
  - Cost: ₹0-2K/month

**packages/shared-auth:**

- Centralized auth logic across all services
- JWT validation helpers
- Permission checking
- Platform verification

---

### 6.4 Zero-Knowledge (ZK) Privacy Layer 🆕

**The Problem ZK Solves:**

```
Without ZK:
  Employer: "Prove WorkScore > 800"
  User: "My score is 850"
  Employer sees: Exact score (privacy leak)

With ZK:
  Employer: "Prove WorkScore > 800"
  User: "Here's ZK proof"
  Employer learns: ONLY that score > 800 is TRUE
  Information leaked: ZERO
```

**Implementation:**

**Blockchain: Polygon zkEVM**

- Native ZK rollup (Ethereum-compatible)
- PLONK proof system
- Cost: ₹0.05/transaction (50% cheaper than Polygon PoS)
- Production-ready (launched 2023)

**ZK Framework:**

- Circuits: **circom** or **noir** (ZK circuit language)
- Proof Generation: **snarkjs** (client-side, 2-5 seconds)
- Verification: On-chain (smart contract) + off-chain (API)

**ZK Use Cases:**

**1. Selective Score Disclosure:**

```typescript
// User proves: "WorkScore > 750" without revealing exact score
const proof = await generateZKProof({
  privateInput: { actualScore: 850, salt: randomBytes(32) },
  publicClaim: { threshold: 750 },
  circuit: "score_threshold",
});

// Employer verifies
const isValid = await verifyZKProof(proof);
// Result: TRUE (score > 750)
// Leaked info: ZERO (employer doesn't know if score is 751 or 900)
```

**2. Age Verification (Aadhaar without PII):**

```typescript
// Prove age > 18 without revealing birthdate or Aadhaar
const proof = await generateZKProof({
  privateInput: { aadhaar: "xxxx", dob: "1998-03-15" },
  publicClaim: { isOver18: true },
  circuit: "age_verification",
});

// Dating app verifies age WITHOUT storing Aadhaar (GDPR/DPDP perfect)
```

**3. Cross-Vertical Aggregation:**

```typescript
// Prove: "Good reputation in 3+ verticals" without revealing which ones
const proof = await generateZKProof({
  privateInput: { workScore: 850, safeDate: 92, tenantScore: 88 },
  publicClaim: { minVerticals: 3, avgScore: 85 },
  circuit: "cross_vertical_aggregate",
});
```

**ZK Smart Contract (Verifier):**

```solidity
// Polygon zkEVM
contract ReputationVerifier {
  IVerifier public zkVerifier;  // Generated by circom

  mapping(bytes32 => bool) public proofExists;

  function verifyAndStoreProof(
    uint[2] calldata pA,
    uint[2][2] calldata pB,
    uint[2] calldata pC,
    uint[1] calldata pubSignals  // [threshold]
  ) external returns (bool) {
    bool isValid = zkVerifier.verifyProof(pA, pB, pC, pubSignals);
    require(isValid, "Invalid ZK proof");

    bytes32 proofHash = keccak256(abi.encodePacked(pA, pB, pC));
    proofExists[proofHash] = true;

    return true;
  }
}
```

**Privacy Guarantees:**

- Math-based privacy (not just policy-based)
- Impossible to extract private data from proof
- GDPR/DPDP compliant by design
- User holds proofs locally (no centralized PII storage)

**Cost Analysis:**

- Proof generation: Free (client-side, 2-5 seconds)
- Proof verification (on-chain): ₹0.05/proof
- Annual cost (10K proofs/day): ₹1.8L (vs ₹3.6L on Polygon PoS)

---

### 6.5 Cross-Vertical Reputation Architecture 🆕

**Core Innovation:** Behavioral signals transfer across verticals with privacy preservation.

**Architecture:**

```
┌───────────────────────────────────────────────────────────┐
│ RAW REPUTATION EVENTS (Private, Vertical-Specific)       │
│ • Rental: "Paid ₹25K rent on Jan 1, 2026"                │
│ • Work: "Rated 4.5/5 by manager"                          │
│ • Dating: "Zero harassment reports in 2 years"            │
└───────────────────────────┬───────────────────────────────┘
                            │
                    Abstraction Layer
                            ↓
┌───────────────────────────────────────────────────────────┐
│ BEHAVIORAL SIGNALS (Abstracted, Cross-Vertical)          │
│ • Financial Reliability: 95/100                           │
│ • Communication Skills: 88/100                            │
│ • Conflict Resolution: 92/100                             │
│ • Trustworthiness: 90/100                                 │
│ • Professionalism: 87/100                                 │
└───────────────────────────┬───────────────────────────────┘
                            │
                 Vertical-Specific Weighting
                            ↓
┌───────────────────────────────────────────────────────────┐
│ VERTICAL SCORES (Domain-Specific, User Controlled)       │
│ • WorkScore: 850/1000 (70% work + 30% cross-vertical)    │
│ • SafeDate: 92/100 (80% dating + 20% cross-vertical)     │
│ • TenantScore: 100/100 (60% rental + 40% cross-vertical) │
└───────────────────────────────────────────────────────────┘
```

**Example: Tenant Behavior → WorkScore**

```javascript
// Priya's rental history (PRIVATE)
const rentalEvents = {
  payments: 36,  // 36 months on-time
  landlordRating: 4.8,
  propertyDamage: 0,
  disputeResolution: 'amicable'
};

// Extract character traits (ABSTRACTED)
const traits = {
  financialReliability: 98/100,  // From payments
  responsibility: 95/100,         // From property care
  communication: 92/100,          // From rating
  longTermCommitment: 85/100      // From 3-year tenure
};

// Apply to WorkScore (30% weight for cross-vertical)
const workScore = (
  directWorkSignals * 0.70 +  // 776 points
  crossVerticalBoost * 0.30    // +70 points from rental
) = 846/1000

// What employer sees:
// "WorkScore: 846/1000"
// "Character: Excellent (enhanced by verified behavior in other contexts)"

// What employer DOESN'T see:
// - Rent amount (₹25K)
// - Landlord name/address
// - Lease dates/terms
```

**Authority & Vertical Isolation:**

```javascript
// Platform Registration (One-time KYC)
const platform = {
  id: 'naukri_india_pvt_ltd',
  type: 'HIRING',
  verified: true,  // We verify it's real Naukri
  allowedScopes: ['WORK_SCORE', 'EMPLOYMENT_HISTORY'],
  deniedScopes: ['SAFE_DATE', 'TENANT_SCORE'],  // Cannot touch
  apiKey: 'pk_live_naukri_xyz123'
};

// Reputation Event Submission
POST /api/reputation/events
Headers: Authorization: Bearer pk_live_naukri_xyz123
{
  userId: 'user_12345',
  eventType: 'EMPLOYMENT_RATING',
  vertical: 'HIRING',  // Must match allowed scopes
  data: { rating: 4.5, skills: ['React'], tenure: '2_years' },
  signature: 'blockchain_signature_abc'  // Anti-tampering
}

// Reputation Rail validates:
// ✅ Is Naukri verified to write HIRING data? YES
// ✅ Is signature valid? YES
// ✅ Is employer (Flipkart) verified? YES
// ❌ Can Naukri write SAFE_DATE data? NO (rejected)
```

**Network Effects Moat:**

```
Value = (# verticals)² × (# platforms/vertical) × (data depth)

Example:
- 10 verticals × 5 platforms = 50 integrations
- 50² = 2,500 cross-enrichment pathways
- Competitor needs 2,500 partnerships to match (10+ years)
```

---

### 6.6 Infrastructure & Deployment

**Cloud Provider: Google Cloud Platform (GCP)**

**Compute:**

- **Cloud Run:** Serverless containers (auto-scaling)
  - credverse-gateway: min 1, max 100 instances
  - credverse-issuer: min 2, max 50 instances
  - vertical apps: min 0 (scale to zero), max 20

**Why Cloud Run:**

- Serverless (pay only for requests)
- Auto-scaling (0 → 1000 instances in seconds)
- No Kubernetes complexity
- Deploy from Docker containers
- Cost: ₹5-40K/month (10K-500K users)

**Database Hosting:**

- PostgreSQL: Neon or Supabase (serverless)
- Neo4j: GCP Compute Engine (self-hosted)
- Redis: Upstash (serverless)

**CI/CD Pipeline:**

```yaml
Source: GitHub
CI/CD: GitHub Actions
Build: Docker images
Registry: GCP Artifact Registry
Deploy: Cloud Run (gcloud CLI)
Secrets: GCP Secret Manager
```

**Monitoring & Observability:**

- Errors: Sentry (₹2-5K/month)
- Logs: Better Stack (₹0-3K/month)
- Analytics: PostHog self-hosted (₹0) OR cloud (₹5K/month)
- Metrics: Prometheus + Grafana (self-hosted, ₹0)
- APM: New Relic or DataDog (optional)

**Cost Estimates:**

**Year 1 (10K users, 100K API calls/day):**

```yaml
Infrastructure:
  - GCP Cloud Run: ₹8,000
  - Cloud SQL (Postgres): ₹5,000
  - Neo4j self-hosted: ₹3,000
  - Redis (Upstash): ₹1,000
  - Cloud Storage: ₹500

Services:
  - Clerk Auth: ₹3,000
  - Sentry: ₹2,000
  - PostHog: ₹3,000
  - Resend (email): ₹1,000

Blockchain:
  - Polygon zkEVM gas: ₹500

Total: ~₹27,000/month (₹3.2L/year)
```

**Year 2 (500K users, 5M API calls/day):**

```yaml
Total: ~₹1.2L/month (₹14.4L/year)
Cost per user: ₹24/month
Charge: ₹99-499/month
Margin: 75-95%
```

---

### 6.7 Security & Privacy

**1. Zero-Knowledge Architecture**

- User Private Keys stored in secure hardware enclave (mobile)
- ZK proofs for selective disclosure (prove claims without revealing data)
- "Verify WorkScore > 750" without revealing exact score (850)

**2. Data Encryption**

- **At Rest:** AES-256 encryption for all database fields
- **In Transit:** TLS 1.3 for all API calls
- **E2EE:** End-to-end encryption for document sharing

**3. Privacy Layers (Defense in Depth)**

- **Layer 1:** Character trait abstraction (no raw events cross verticals)
- **Layer 2:** User consent controls (explicit approval required)
- **Layer 3:** ZK proofs (mathematical privacy guarantee)
- **Layer 4:** Blockchain anchoring (immutable audit trail)

**4. Compliance**

- GDPR (Europe) - ZK proofs = perfect compliance
- DPDP (India)
- CCPA (California)
- SOC2 Type II (Enterprise requirement)

---

## 7. GO-TO-MARKET STRATEGY (Year 1: India)

### 7.1 Target Audience

1. **Primary: Mid-Market E-commerce (100-1000 sellers)**
   - High pain point (refund fraud)
   - Faster sales cycle (1-2 months)
   - Willing to pilot
   - **Channel:** LinkedIn outreach, tech partnerships, Shopify app store

2. **Secondary: Gig Economy Platforms (Delivery/Ride-sharing)**
   - High volume of onboarding
   - Need speed + trust
   - **Channel:** Direct sales to Operations Heads, industry conferences

3. **Tertiary: Consumer Adoption (Viral Growth)**
   - Students/Graduates (job verification)
   - Dating app users (safety)
   - **Channel:** Influencer marketing, "Verified" badge viral loops

### 7.2 Dating App GTM Strategy (Priority Track) 🆕

**Why Dating Apps First:**

- Users WANT to be verified (unlike B2B where you push)
- Viral growth potential (verified users get 3x more matches)
- Fast implementation (2-4 week integration)
- High willingness to pay (both B2B and B2C)

**Phase 1: India Dating App Pilots (Month 1-3)**

**Target Partners (in order):**

1. **Woo** - India-focused, 10M+ users, open to innovation
2. **Aisle** - Premium Indian dating, safety-focused, 5M+ users
3. **QuackQuack** - Tier 2/3 cities, 20M+ users

**Pilot Offer:**

- Free integration (we handle engineering)
- Free verifications for first 10,000 users
- 90-day exclusivity in exchange
- Data sharing for A/B testing

**Success Metrics for Pilot:**

- 60% reduction in reported fake profiles
- 3x match rate increase for verified users
- 70%+ verification completion rate
- Net Promoter Score (NPS) >40

**Phase 2: Revenue Activation (Month 4-6)**

- Platform pays ₹8 per verification (starts Month 4)
- Launch SafeDate Premium for consumers (₹149/month)
- Target: 100K verifications, 5K paid subscribers

**Phase 3: Network Effects (Month 7-12)**

- Expand to 5-7 more dating apps
- "Verified by Credity" becomes recognizable
- Cross-platform reputation starts working
- Users demand verification on new platforms

**Messaging:**
**To Dating Apps:**
"Reduce fake profiles by 60%, increase user trust, and improve match rates — all with a 2-week integration."

**To Users:**
"Get 3x more matches and meet verified, safe people. Verify once, trusted everywhere."

**Competitive Moat:**
Once 3+ dating apps integrate, verified users won't switch to apps WITHOUT Credity. Network lock-in.

**Anti-Gaming Safeguards (Learned from Humanity Protocol's Bot Crisis):**

1. **No Token/Cash Incentives for Signups:** Value = utility (3x matches), never money
2. **Device Fingerprinting:** One verification per physical device
3. **Phone OTP Required:** Prevents automated mass-registration
4. **Behavioral Validation:** Require at least 1 platform connection (Uber/LinkedIn) to activate score — bots don't have real Uber accounts
5. **Graduated Trust:** New users start at Score 50, not 0. Score only improves with real cross-platform data, not referrals

### 7.2 Sales Strategy

1. **Self-Service PLG (Product-Led Growth)**
   - Free developer API (100 verifications/month)
   - Simple documentation
   - "Start verifying in 5 minutes" promise
   - Drive usage -> Upgrade to enterprise

2. **Direct Sales (Enterprise)**
   - Targeted outreach to VPs of Trust & Safety
   - Consultative selling ("Let's analyze your fraud loss")
   - PoC (Proof of Concept) model: "Free 30-day trial, pay if we save you money"

### 7.3 Marketing Strategy

1. **Content Marketing:** Reports on "State of Fraud 2025", "Deepfake Prevention Guide"
2. **Trust Badges:** "Verified by Credity" badge on partner sites acts as billboard
3. **Community:** Developer hackathons for fraud prevention tools
4. **PR:** Stories about "AI vs. AI" (Our AI fighting fraud AI)

---

## 8. BUSINESS MODEL

### 8.1 Pricing Tiers

**A. B2B Enterprise (Primary Revenue - Year 1-2)**

1. **Starter (Developer)**
   - $0/month
   - 100 verifications/month
   - Basic API access
   - Community support

2. **Pro (Growth)**
   - $499/month
   - 5,000 verifications/month (then $0.15 each)
   - Advanced fraud detection
   - Email support (24h SLA)

3. **Enterprise (Scale)**
   - Custom pricing ($20k+ annual contract)
   - Unlimited volume tiering
   - Dedicated account manager
   - Custom ML model tuning
   - On-premise deployment option

**Enterprise Governance — "Trust Council" (Differentiator vs Token DAOs):**

- Top enterprise customers (5-10 seats) get voting rights on scoring algorithm changes
- Quarterly "Trust Council" meetings to review scoring fairness
- Transparency reports published to all Council members
- _Why:_ Humanity Protocol uses a token DAO for governance. Enterprise CXOs don't trust crypto voting. A "Trust Council" builds institutional loyalty and lock-in.

**B. Dating & Social Platforms (New - Year 1+)** 🆕

1. **Dating App Integration**
   - ₹8-12 per verification ($0.10-0.15)
   - Volume discounts at 100K+ verifications
   - White-label badge option
   - Platform dashboard included

2. **SafeDate Premium API**
   - Platform pays ₹5 per score check
   - Real-time reputation updates
   - Harassment report integration
   - Safety analytics dashboard

**C. Consumer Subscription (New - Year 2+)** 🆕

1. **Free Tier**
   - Basic verification
   - 3 credential shares/month
   - Standard support

2. **SafeDate Premium (₹149/month)**
   - See match SafeDate scores
   - Background check summaries
   - Unlimited shares
   - Priority support
   - Target: 50K subscribers by Year 2

3. **Gig Pro (₹99/month)**
   - Fast-track platform onboarding
   - Reputation boosting tools
   - Universal gig profile
   - Work history verification

**D. Reputation Rail Access** 🆕

- Platform API access: ₹50K-2L/year base fee
- Per-reputation-read: ₹2-5
- Per-reputation-write: ₹10-15 (from verified platforms only)
- Data aggregation fees for platforms viewing cross-platform reputation

### 8.2 Unit Economics (Projected)

**B2B Enterprise:**

- **CAC (Customer Acquisition Cost):** $150 (Self-service) / $5,000 (Enterprise)
- **LTV (Lifetime Value):** $3,000 (Self-service) / $60,000 (Enterprise)
- **LTV:CAC Ratio:** ~5:1 (Healthy SaaS metric is 3:1)
- **Gross Margin:** 75% (Software costs are low, main cost is cloud/API)

**Dating & Social Platforms (New):** 🆕

- **CAC per Platform:** ₹50K (partnership + integration support)
- **ARR per Platform:** ₹10-40L (based on 5M-20M verifications at ₹8 each)
- **LTV per Platform:** ₹50-200L (3-5 year relationship)
- **LTV:CAC Ratio:** 10-40:1 (Excellent - once integrated, sticky)
- **Gross Margin:** 80% (Lower API costs than B2B)

**Consumer Subscription (New):** 🆕

- **CAC per User:** ₹100-200 (organic + paid social)
- **LTV per User:** ₹3,000-5,000 (18-24 month retention at ₹149/month)
- **Churn:** 5-8%/month (comparable to dating app premium tiers)
- **LTV:CAC Ratio:** 15-30:1
- **Gross Margin:** 90% (Minimal marginal cost)

### 8.3 Revenue Projections (Updated) 🆕

**Year 1 (India Focus):**
| Revenue Stream | Monthly Users/Txns | Unit Price | Annual Revenue |
|----------------|-------------------|------------|----------------|
| B2B Verification | 50K verifications | ₹50 | ₹3 Cr |
| Dating Platforms (3 partners) | 5M verifications | ₹8 | ₹4 Cr |
| **Total Year 1** | | | **₹7 Cr** |

**Year 2 (India + SEA Expansion):**
| Revenue Stream | Monthly Users/Txns | Unit Price | Annual Revenue |
|----------------|-------------------|------------|----------------|
| B2B Verification | 200K verifications | ₹50 | ₹12 Cr |
| Dating Platforms (10 partners) | 20M verifications | ₹8 | ₹19 Cr |
| Consumer Subscriptions | 50K subscribers | ₹149/mo | ₹9 Cr |
| Reputation Rail API | 30 platforms | ₹1L/year avg | ₹3 Cr |
| **Total Year 2** | | | **₹43 Cr** |

**Year 3 (Global Scale):**
| Revenue Stream | Projection |
|----------------|-----------|
| B2B Verification | ₹40 Cr |
| Dating Platforms (25+ partners) | ₹70 Cr |
| Consumer Subscriptions (200K users) | ₹36 Cr |
| Reputation Rail Network | ₹20 Cr |
| **Total Year 3** | **₹166 Cr** |

**Path to ₹100 Cr ARR:** Dating platforms + consumer subscriptions are the accelerators. B2B alone would take 5+ years to reach ₹100 Cr.

---

## 9. SUCCESS METRICS & KPIs

1. **North Star Metric:** **Total Verified Interactions (TVI)**
   - Measures usage and trust in the network

2. **Acquisition:**
   - New B2B signups/week
   - API integration success rate

3. **Activation:**
   - Time to first verification (<1 hour)
   - Pass/Fail rate (aiming for 85%+ genuine pass rate)

4. **Retension:**
   - Net Revenue Retention (NRR) > 120%
   - Churn rate < 5% annually

5. **Revenue:**
   - MRR (Monthly Recurring Revenue)
   - ARPU (Average Revenue Per User)

---

## 10. RISKS & MITIGATION

1. **Risk: Regulatory Changes**
   - _Impact:_ High (Government bans private ID verifiers)
   - _Mitigation:_ Integrate WITH government systems (DigiLocker) rather than replacing them. Becoming an aggregator.

2. **Risk: AI Arms Race**
   - _Impact:_ Medium (Fraudsters' AI becomes better than our detection)
   - _Mitigation:_ Feedback loops—every fraud attempt caught trains our model. Partnerships with top AI research labs.

3. **Risk: Privacy Breach**
   - _Impact:_ Critical (Loss of trust kills company)
   - _Mitigation:_ Zero-knowledge architecture. We don't store PII if possible. Audit logs on blockchain.

4. **Risk: Adoption Resistance**
   - _Impact:_ Medium (Users don't want another app)
   - _Mitigation:_ Embed directly into partner apps (SDK) first, standalone app second.

---

## 11. LAUNCH PLAN

**Phase 0: Pre-Launch — "Claim Your Reputation" Campaign (Month -2 to 0)**

- Landing page: "Reserve your @username on the Reputation Rail"
- Allow users to link Uber/LinkedIn/Swiggy to generate a "Preview Score"
- Leaderboard: "Top 100 most trusted users get Early Adopter badge"
- Target: 10,000 pre-registrations before Alpha launch
- Anti-bot: Device fingerprinting + phone OTP required (no token incentives)
- Focus: Build a waitlist AND validate platform connection APIs simultaneously
- _Lesson from Humanity Protocol: They got 50K pre-launch signups. But 88% were bots because they used token incentives. We use UTILITY incentives instead (your score improves with more connections → better matches/jobs)._

**Phase 1: Alpha (Months 1-3)**

- Build MVP (Identity + Document Scan)
- Partner with 5 design partners (mid-sized startups)
- Manual onboarding
- Focus: Stability and accuracy

**Phase 2: Beta (Months 4-6)**

- Launch Self-Service Developer Portal
- Add "Trust Score" algorithm
- Public launch on Product Hunt
- Focus: Developer experience and bug fixing

**Phase 3: Public Launch (Months 7-12)**

- Full Sales & Marketing push
- Introduce "Evidence Authentication" layer
- Series A fundraising preparation
- Focus: Scale and revenue
