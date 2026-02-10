# Sizing Calculator Math Explained

## Overview
The sizing calculator determines the appropriate server model and token count for each site based on workload metrics.

---

## Step 1: Calculate Active IPs

```
Active IPs = Knowledge Workers × IP Multiplier
```

**Example:**
- Knowledge Workers: 10,000
- IP Multiplier: 2.5
- **Active IPs = 10,000 × 2.5 = 25,000**

---

## Step 2: Calculate Workload Metrics

### DNS Queries Per Second (QPS)
```
QPS = Active IPs ÷ 3 (NIOS)
QPS = Active IPs ÷ 50 (UDDI)
```

### DHCP Leases Per Second (LPS)
```
DHCP Clients = Active IPs × (DHCP Percent ÷ 100)
LPS = DHCP Clients ÷ 900 (15-minute window)
```

### Database Objects
```
DNS Objects = (DHCP Clients × 3) + (Static Clients × 2)
DHCP Objects = DHCP Clients × 2
Total Objects = DNS Objects + DHCP Objects
```

**Example (25,000 IPs, 80% DHCP):**
- DHCP Clients: 25,000 × 0.80 = 20,000
- Static Clients: 25,000 × 0.20 = 5,000
- QPS (NIOS): 25,000 ÷ 3 = 8,333
- LPS: 20,000 ÷ 900 = 22
- DNS Objects: (20,000 × 3) + (5,000 × 2) = 70,000
- DHCP Objects: 20,000 × 2 = 40,000
- **Total Objects: 110,000**

---

## Step 3: Find Recommended Server Model

The system finds the smallest server that can handle the workload at **60% utilization** (headroom for peaks).

### NIOS Server Models (TE-Series)
| Model | Max Objects | Max QPS | Max LPS | Tokens |
|-------|-------------|---------|---------|--------|
| TE-926 | 110,000 | 33,750 | 225 | 880 |
| TE-1516 | 440,000 | 67,500 | 400 | 2,270 |
| TE-1526 | 880,000 | 112,500 | 675 | 2,995 |
| TE-2326 | 4,500,000 | 250,000 | 1,200 | 6,755 |
| TE-4126 | 24,000,000 | 450,000 | 1,500 | 17,010 |

### NIOS-X Virtual Server (NXVS)
| Size | Max Objects | Max QPS | Max LPS | Tokens |
|------|-------------|---------|---------|--------|
| 3XS | 1,000 | 1,000 | 15 | 60 |
| 2XS | 3,000 | 5,000 | 75 | 130 |
| XS | 7,500 | 10,000 | 150 | 250 |
| S | 29,000 | 20,000 | 200 | 470 |
| M | 110,000 | 40,000 | 300 | 880 |
| L | 440,000 | 70,000 | 400 | 1,900 |
| XL | 880,000 | 115,000 | 675 | 2,700 |

**Selection Logic:**
```
For each server (smallest to largest):
  if server.maxObjects × 0.6 >= workload.objects AND
     server.maxQPS × 0.6 >= workload.qps AND
     server.maxLPS × 0.6 >= workload.lps:
    return this server
```

---

## Step 4: Role-Based Adjustments

### Grid Master (GM) / Grid Master Candidate (GMC)
- Sized by **total grid objects**, not site workload
- Must handle all objects across the entire grid
- Adds 100 IPs capacity per enabled service

### DNS/DHCP Roles
- Sized by QPS, LPS, and object count
- Multi-role (DNS/DHCP) adds 30% capacity buffer

---

## Step 5: Service Impact on Tokens

Enabled services increase token cost:

| Service | Token Impact |
|---------|--------------|
| Reporting | +10% |
| Security (TD) | +15% |
| DHCP Fingerprinting | +5% |
| DNS Traffic Control | +10% |

```
Final Tokens = Base Tokens × (1 + Total Service Impact %)
```

---

## Step 6: Calculate Total Tokens

```
Total Tokens = Sum of tokens for all sites
```

---

## Step 7: Determine Partner SKU

| Token Range | Partner SKU |
|-------------|-------------|
| 0 - 5,000 | IB-TOKENS-5K |
| 5,001 - 10,000 | IB-TOKENS-10K |
| 10,001 - 25,000 | IB-TOKENS-25K |
| 25,001 - 50,000 | IB-TOKENS-50K |
| 50,001 - 100,000 | IB-TOKENS-100K |
| 100,001+ | IB-TOKENS-200K |

---

## Full Example

**Input:**
- 4 Data Centers, each with 10,000 Knowledge Workers
- IP Multiplier: 2.5
- DHCP: 80%
- Platform: NIOS
- Roles: 1 GM, 1 GMC, 2 DNS/DHCP

**Calculation:**
1. Active IPs per DC: 10,000 × 2.5 = 25,000
2. Total Grid Objects: ~110,000 per DC × 4 = 440,000
3. GM: TE-1516 (handles 440K objects) = 2,270 tokens
4. GMC: TE-1516 = 2,270 tokens  
5. DNS/DHCP #1: TE-926 (handles 25K IPs) = 880 tokens
6. DNS/DHCP #2: TE-926 = 880 tokens

**Total: 2,270 + 2,270 + 880 + 880 = 6,300 tokens**
**Partner SKU: IB-TOKENS-10K**
