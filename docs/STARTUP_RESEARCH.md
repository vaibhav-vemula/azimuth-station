# Azimuth — Startup Viability Research
## Ground Station as a Service (GSaaS) | DePIN | Space Tech

> Deep research on market opportunity, competitors, fundraising landscape, and path to fundability.

---

## The Core Finding: A Real Gap Nobody Has Filled

**AWS Ground Station, Azure Orbital, and KSAT cannot serve LoRa satellites.** They operate at S-band (2–4 GHz) and X-band (8–12 GHz). LoRa satellites transmit in ISM bands: 433 MHz, 868 MHz (EU), 915 MHz (US). These require entirely different antenna systems. There is currently **zero** commercial ground-station-as-a-service offering for LoRa satellites.

That is the market.

---

## 1. Market Size

| Segment | 2024 | 2030–2033 | CAGR |
|---|---|---|---|
| Ground Station as a Service (pure-play) | $520M–$1.4B | $5.1B | 15–19% |
| Satellite IoT (actual customer base) | $1.77B | $9.2B | 22.8% |
| Full satellite ground station market | $41B | $83B | 15% |

The fastest-growing segment within GSaaS is the smallsat/CubeSat tier — Azimuth's direct target.

---

## 2. Existing GSaaS Players (and Why They Can't Compete Here)

| Provider | Frequencies | Price | LoRa Support |
|---|---|---|---|
| AWS Ground Station | S-band, X-band | $3–$22/min | ❌ None |
| Azure Orbital | S-band, X-band | Contact-based | ❌ None |
| KSAT | S/X/UHF/VHF (legacy) | $5–$25/min (est.) | ❌ None |
| Leaf Space | S-band, UHF | Negotiated | ❌ None |
| Atlas Space Operations | S-band | Negotiated | ❌ None |

**Pain points of existing solutions:**
- Minimum commitments: AWS requires ~150 min/month; most require annual contracts
- Frequency gap: No provider offers LoRa ISM band reception as a service
- Coverage gaps: Networks concentrated in polar/Arctic regions (KSAT's advantage); equatorial Africa, South America, Pacific Islands, Southeast Asia are under-served
- Cost vs. data value: $30–$100/pass for LoRa IoT data worth far less than that
- Latency: Satellites store data on-board for 4–12 hours waiting for a ground contact

---

## 3. Real Enterprise Customers With a Real Ground Station Problem

### Astrocast (Switzerland) — Best Fit
- 18 commercial LEO satellites using Semtech LoRa chips on-orbit
- Sparse proprietary ground station network — added Inuvik, Canada in 2024 as a meaningful expansion
- Went private in 2024 because public capital markets wouldn't fund ground infrastructure expansion
- Capital-constrained and ground-station-constrained simultaneously
- **Target**: Direct outreach for ground coverage partnership LOI

### Kineis (France)
- 25 nanosatellites deployed 2024–2025; $111M raised (Bpifrance, CNES, BNP Paribas, Dassault)
- Only 20 proprietary ground stations globally for 25 satellites — insufficient for global coverage
- Partners with Semtech: standard LoRa Edge chips (LR1110, LR1120) access their network
- 20,000+ active IoT devices on network; needs ground density to reduce latency

### Lacuna Space (UK)
- €20M invested over 10 years in LR-FHSS (LoRa derivative for satellites)
- Co-funded by UK Space Agency and ESA
- In February 2026 pivoted to licensing their LoneWhisper platform internationally — clear signal they cannot afford to build global ground infrastructure themselves
- A licensee-based ground network is exactly what Azimuth provides

### Sateliot (Spain)
- NB-IoT (5G non-terrestrial), not LoRa — but validates the market
- €200M in contracted recurring revenue, 400+ clients across 50 countries
- **Entirely relies on KSAT and Leaf Space for GSaaS** — no native LoRa support from either
- Projects €500M revenue by 2027, €1B by 2030

### What They All Share
Each operator pays $50K–$300K per proprietary ground station. A decentralized network of $100 Raspberry Pi nodes provides the same coverage expansion at 500–3,000x lower capex per node. Data latency drops directly with each added node in an under-served region.

---

## 4. TinyGS — The Most Important Comparable

TinyGS is an open-source, community-driven LoRa satellite ground station network:
- Hundreds of operators globally, receiving data from FossaSat, USNA-16, and other LoRa CubeSats
- Uses the exact same hardware stack: ESP32 + SX126x LoRa modules
- **They do this for free, today, with no financial incentive**

Azimuth is the commercial, incentivized, enterprise-grade version of TinyGS.

**Strategy**: Make Azimuth firmware TinyGS-compatible. Offer retroactive AZM rewards for historical TinyGS data. Convert hundreds of existing operators instantly — zero hardware distribution cost, immediate global node count.

---

## 5. DePIN Comparables — What to Copy, What to Avoid

### GEODNET — The Template to Follow

- Miners deploy GNSS correction stations (~$500); sell RTK data to agriculture, surveying, autonomous vehicles
- 19,000+ active miners in 145 countries; 219% growth in 2024
- Revenue: ~$3M/year ARR growing fast
- **80% of all revenue used to buy and burn GEOD tokens** — direct deflation from real enterprise sales
- VanEck (major asset manager) published a bullish public thesis on GEODNET
- Token FDV grew 59% QoQ, 524% YoY in 2024

This is the Azimuth model: enterprise pays USD/stablecoins → buys and burns AZM → miners earn AZM → sustainable.

### Helium IoT — The Cautionary Tale

- Peak: ~1 million hotspots (Q1 2023); current: ~350K–400K (60% decline)
- In 2022, real DC (data credit) usage from actual IoT customers: less than $2K/month
- Paying millions in token rewards with essentially zero real demand
- Circular dependency: no real buyers → token value from speculation → collapse
- The LoRa IoT subDAO still struggles; only the Mobile (cellular) subDAO has real organic demand

**Lesson**: Never pay for supply without verifiable demand. Azimuth's Proof of Reception — actual packet received from actual satellite, verifiable via orbital mechanics + packet hash — is a fundamentally stronger mechanism than Helium's Proof of Coverage, which was gamed with RF beacons.

### Tokenomics Sustainability Check

At $0.50/AZM and 1,000 stations earning 1 AZM/day:
- Daily emission: $500/day
- To offset with 80% burn: need $625/day revenue = **$228K/year**
- If Astrocast pays $10K/year per coverage region: need 23 paying regions
- That is achievable at 1,000+ nodes

### Other DePIN Projects

| Project | Model | Key Lesson |
|---|---|---|
| Hivemapper | Dashcam → map data → logistics buyers burn HONEY | Real B2B demand creates sustainable burn |
| WeatherXM | Weather stations → data to agriculture/insurance | Sensor network DePIN with real data buyers works |
| GEODNET | GNSS stations → RTK data → enterprise buyers | Best analog; copy this model |
| Helium Mobile | Cellular hotspots → $20/month consumer plans | Mobile succeeded where IoT failed — demand is king |
| Pollen Mobile | Coverage hotspots → rewards | Demand still materializing; coverage without users |

---

## 6. Fundraising Landscape

### DePIN Venture Capital

- **$744M** invested in 165+ DePIN startups between January 2024 and July 2025
- DePIN sector market cap: **$19.2B** (up 270% YoY)
- Average new DePIN project FDV in 2025: ~$760M (nearly double 2023 levels)

**Key investors to target:**

| Investor | Why Relevant |
|---|---|
| **Multicoin Capital** | Helium, Hivemapper, GEODNET, Render — the definitive DePIN VC |
| **Borderless Capital** | $100M DePIN Fund III (Sept 2024); consistent DePIN specialist |
| **Dragonfly Capital** | Active in DePIN infrastructure; co-invested in $28M DePIN round |
| **VanEck Digital Assets** | Published bullish GEODNET thesis — open to satellite-adjacent DePIN |
| **Lux Capital** | 21 space deals; focused on deep tech |
| **Bessemer Venture Partners** | Planet, Spire in portfolio; understands satellite infrastructure |

### Grants (Zero Dilution — Pursue Immediately)

| Grant | Amount | Fit | Action |
|---|---|---|---|
| **HBAR Foundation** | $250K–$500K+ | ⭐ Very High — built on Hedera, novel DePIN use case | Apply now at hbarfoundation.org |
| **ESA BIC** (EU entity) | €50K–€90K | High — satellite ground infrastructure is core domain | Apply if EU entity possible |
| **NSF SBIR Phase I** | $275K | High — "satellite comms for commercial space" topic | Active program |
| **NSF SBIR Phase II** | Up to $1M | Follow-on from Phase I | — |
| NASA SBIR | $150K | Medium | ⚠️ Authorization expired Sept 2025, pending Congress |

### Recommended Funding Path

```
Now            →  HBAR Foundation grant ($250K–$500K) + hackathon prizes
~6 months      →  Pre-seed: $500K–$1.5M (angels: ex-Planet, ex-Spire founders)
~12–18 months  →  Seed: $3M–$5M (Multicoin + Borderless, 500+ nodes + 1–2 paying customers)
~24–36 months  →  Series A: $15M–$30M with meaningful ARR
```

### Seed Round Benchmarks

- DePHY (DePIN infrastructure): $40M valuation at seed (early 2024)
- Standard crypto/Web3 seed: $3M–$8M at $10M–$40M post-money
- Investors want: working demo, team, path to $1M ARR within 18–24 months

---

## 7. Regulatory Position (Unusually Clean)

Receive-only ground stations in ISM bands require **no spectrum license** in most jurisdictions.

| Infrastructure Type | Licensing Required |
|---|---|
| Azimuth LoRa receive node | ❌ None (receive-only ISM band) |
| Helium Mobile hotspot | ✅ Carrier agreements + spectrum |
| Cell tower | ✅ National spectrum authority |
| Traditional ground station | ✅ ITU coordination + national filings |

A LoRa receive-only ground station is legally closer to a radio telescope than a cell tower. This removes months of regulatory lag that constrains other hardware DePIN projects.

**Only risk**: If nodes ever need to *transmit* (commands, acknowledgements to satellites), FCC Part 25 or Part 97 licensing applies. Stay receive-only.

**Local ISM band variations** (configuration, not licensing):
- US: 915 MHz
- EU: 868 MHz
- Asia: 433 MHz

Hardware must handle all three — software-configurable via existing LoRa module support.

---

## 8. Critical Technical Question to Resolve Before Any Pitch

**Which direction does the LoRa link go for target satellites?**

Most large commercial LoRa satellite operators (Astrocast, Kineis, Lacuna) use LoRa for the **uplink** — IoT devices on the ground transmit to the satellite. The satellite then **downlinks** collected data to a ground station, sometimes in S-band or proprietary protocols.

If they downlink in S-band, a Raspberry Pi + LoRa radio cannot receive it.

**Satellites with confirmed LoRa downlink to ground stations:**
- FossaSat series (TinyGS receives these today)
- Amateur CubeSats on 433/868/915 MHz
- Astrocast — uses Semtech LoRa on-orbit; downlink frequency needs direct verification

**Action required**: Confirm Astrocast's downlink frequency directly via their BD team. Then record a logged satellite pass on-chain. A single HCS transaction with `{passId, packetHashes[], rssi, snr, timestamp}` from a real satellite is worth more than any whitepaper.

---

## 9. Key Risks

| Risk | Severity | Mitigation |
|---|---|---|
| LoRa downlink frequency mismatch | High | Verify with Astrocast directly; pivot to confirmed downlink satellites |
| Token circular dependency | High | GEODNET model: 80% revenue → buy-and-burn from day one |
| Bootstrap chicken-and-egg | Medium | TinyGS community + one anchor customer LOI |
| Enterprise customer hesitancy | Medium | Signed LOI before seed raise |
| Hedera liquidity vs. Solana | Medium | Position Hedera as enterprise-grade; consider dual-chain for token layer |
| Hardware at scale (quality control) | Low-Medium | Open hardware spec + on-chain node registration at onboarding |
| No enterprise customer → token collapse | High | This is the make-or-break risk — solve it first |

---

## 10. Positioning

**The one-sentence pitch:**
> "We are building the only commercial ground station network for LoRa satellites — a segment completely ignored by AWS, Azure, and KSAT — using a $100 Raspberry Pi node that anyone can run, paid with tokens backed by enterprise data sales."

**Frame as**: *GEODNET for Satellite IoT* — not Helium for satellites.
GEODNET is what sophisticated DePIN investors respect. Helium IoT is the cautionary tale. Lead with the enterprise revenue model, not token speculation.

**Competitive moat**: There is no commercial LoRa GSaaS today. TinyGS proves the community exists and the hardware works. Astrocast/Kineis prove the satellite operators exist and face coverage constraints. The only missing piece is the commercial bridge between them — that is Azimuth.

---

## 11. Prioritized Action Plan

| Priority | Action | Impact |
|---|---|---|
| 1 | **Verify Astrocast's downlink frequency** — call their BD team directly | Confirms or reframes the entire technical thesis |
| 2 | **Record a satellite pass on-chain** — log a real HCS transaction from a real satellite | Most powerful fundraising asset possible |
| 3 | **Get an LOI from Astrocast or Kineis** — even $25K/year transforms investor conversations | Converts thesis into revenue-generating infrastructure story |
| 4 | **Apply to HBAR Foundation** — most natural grant source; built on Hedera | $250K–$500K non-dilutive |
| 5 | **Engage TinyGS community** — post in their Telegram, offer retroactive AZM for historical data | Instant global node count, zero hardware cost |
| 6 | **Apply to NSF SBIR** — "satellite communications for commercial space" topic | $275K non-dilutive, currently active |
| 7 | **Design token burn from day one** — 80% of revenue buys and burns AZM; fixed emission schedule | Prevents Helium IoT failure mode |
| 8 | **Target Multicoin + Borderless Capital for seed** — after LOI and working demo | $3M–$5M seed at $15M–$25M post-money |

---

## Summary Scorecard

| Dimension | Rating | Key Finding |
|---|---|---|
| Market gap | ✅ Real | AWS/Azure literally cannot serve this market |
| Technical feasibility | ✅ Proven | TinyGS + academic literature validate the hardware stack |
| Enterprise customers | ⚠️ Unconfirmed | Astrocast/Kineis exist and face the problem; haven't committed to pay |
| Token sustainability | ⚠️ Conditional | GEODNET model works; Helium IoT model doesn't — must choose correctly |
| Regulatory risk | ✅ Low | Receive-only ISM band; no license needed in most jurisdictions |
| Bootstrap difficulty | ⚠️ Hard | TinyGS community + anchor LOI are the solutions |
| Fundraising environment | ✅ Favorable | $744M DePIN VC in 2024–2025; HBAR grants; NSF SBIR active |
| **Overall** | **Fundable** | Seed-fundable with working on-chain demo + one enterprise LOI |

---

*Research conducted March 2026. Sources include: MarketsandMarkets, SNS Insider, Grand View Research, IoT Analytics, Messari (Helium Q4 2024, GEODNET Q4 2024), VanEck Digital Assets, The Block DePIN Report 2025, DePIN Scan, Space Capital, Crunchbase, AWS Ground Station pricing, HBAR Foundation, ESA BIC, NSF SBIR, ACM Transactions on Sensor Networks, TinyGS GitHub, Satellite Today, Via Satellite, IoT Business News.*
