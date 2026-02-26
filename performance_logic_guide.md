# Designer Performance Award Calculation Logic Guide

This document provides a detailed breakdown of the performance analysis and award calculation logic used in the Meritz GA Promotion scripts.

## 1. Award Tiers Overview

The system uses five award types: Week 1, Week 2, Monthly Meritz Collection, Double Meritz Club (2배 메리츠클럽), and Meritz Club Plus (메리츠클럽+).

### 🏆 Week 1 Cash Prize (1주차 현금시상)
*   **Target Performance:** `1주차실적`
*   **Tier Matrix:**
    | Performance Threshold (KRW) | Reward Amount (KRW) |
    | :--- | :--- |
    | 200,000 | 200,000 |
    | 300,000 | 300,000 |
    | 500,000 | 1,000,000 |
    | 800,000 | 2,400,000 |
    | 1,000,000 | 4,000,000 |
    | 1,200,000 | 6,000,000 |

### 🏆 Week 2 Cash Prize (2주차 현금시상)
*   **Target Performance:** `2주차실적`
*   **Tier Matrix:**
    | Performance Threshold (KRW) | Reward Amount (KRW) |
    | :--- | :--- |
    | 200,000 | 200,000 |
    | 300,000 | 300,000 |
    | 500,000 | 1,000,000 |
    | 800,000 | 1,600,000 |
    | 1,000,000 | 3,000,000 |
    | 1,200,000 | 4,800,000 |

### 🏆 1월 전용 주차 시상 (1월 마감)
*   **1주차:** 20만→20만, 30만→30만, 50만→100만, 80만→240만, 100만→400만, 120만→600만
*   **2주차:** 20만→20만, 30만→30만, 50만→80만, 80만→160만, 100만→250만, 120만→480만
*   **3주차:** 20만→10만, 30만→30만, 50만→50만, 80만→100만, 100만→200만, 120만→360만

### 🏆 Monthly Meritz Collection (월간 현금시상)
*   **Target Performance:** `당월실적` (Total Current Month Performance)
*   **Tier Matrix:**
    | Performance Threshold (KRW) | Reward Amount (KRW) |
    | :--- | :--- |
    | 1,000,000 | 1,500,000 |
    | 1,200,000 | 2,000,000 |
    | 1,500,000 | 3,000,000 |
    | 1,800,000 | 3,600,000 |
    | 2,000,000 | 4,000,000 |
    | 2,500,000 | 5,000,000 |

---

## 2. Specialized Award Logic

### 🎡 Double Meritz Club (2배 메리츠클럽)
This award rewards consistency across two months.
*   **Eligibility:** `전월실적` >= 200,000 **AND** `당월실적` >= 200,000
*   **Calculation:**
    1.  Base Tier = `floor(당월실적 / 100,000) * 100,000`
    2.  Cap Base Tier at 1,000,000 KRW.
    3.  Final Reward = `Base Tier * 2`

### 💎 Meritz Club Plus (메리츠클럽 PLUS)
Detailed tier system based on the minimum performance across months.
*   **Target Performance:** `min_perf = min(전월실적, 당월실적)`
*   **Logic Matrix:**
    | min_perf Threshold (KRW) | Target Level | Final Reward (KRW) |
    | :--- | :--- | :--- |
    | 1,000,000 | 1,000,000 | 3,000,000 |
    | 800,000 | 800,000 | 2,400,000 |
    | 600,000 | 600,000 | 1,800,000 |
    | 400,000 | 400,000 | 1,200,000 |
    | 200,000 | 200,000 | 600,000 |

---

## 3. Regular Prize & Total Calculation

### 📊 Regular Prize (2월 정규시상)
*   **Calculation:** `당월실적` * 100% (1:1 ratio)

### 💰 Total Estimated Award (총 예상 시상금)
The final estimated prize is the sum of all components:
`Total = Week 1 + Month K + Week 2 + Double Meritz + Regular Prize`

---

## 4. Code Implementation Snippet (Reference)

```python
# Tier Logic Function
def get_tier_info(cur, tiers, awards):
    a_amt = 0
    # Search from highest tier down
    for t, a in zip(reversed(tiers), reversed(awards)):
        if cur >= t:
            a_amt = a
            break
    return a_amt

# Plus Target Logic
def get_plus_target(min_perf):
    if min_perf >= 1000000: return 1000000, 3000000
    elif min_perf >= 800000: return 800000, 2400000
    elif min_perf >= 600000: return 600000, 1800000
    elif min_perf >= 400000: return 400000, 1200000
    elif min_perf >= 200000: return 200000, 600000
    return 0, 0
```
