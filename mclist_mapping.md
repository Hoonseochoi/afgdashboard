# MCLIST OUT Column Mapping Overview

This document summarizes the column index mappings for the `MC_LIST_OUT` Excel files used in this project. You can use these mappings as a reference for integration into other projects.

## Core Mapping (from [AFG Feb Airticket v2.py](file:///c:/Users/chlgn/OneDrive/Desktop/git%20GA%20promotion/AFG%20Feb%20Airticket%20v2.py))

This script is the most recent and uses the following column indices (0-based):

| Index | Column Name (Korean) | English/Internal Column Name | Description |
| :--- | :--- | :--- | :--- |
| **3** | 소속코드 | `소속코드` | Team/Affiliation code |
| **4** | 담당매니저 | `담당매니저` | Manager in charge |
| **5** | 사용인코드 | `사용인코드` / `코드` | Unique ID for the agent/user |
| **6** | 설계사명 | `설계사명` | Name of the agent |
| **10** | 당월실적 | `당월실적` | Performance for the current month |
| **18** | 전월실적 | `전월실적` | Performance for the previous month |
| **19** | 전전월실적 | `전전월실적` | Performance for the after previous month |
| **20** | 1주차실적 | `1주차실적` | Performance achieved in Week 1 |
| **21** | 2주차실적 | `2주차실적` | Performance achieved in Week 2 |
| **22** | 3주차실적 | `3주차실적` | Performance achieved in Week 3 |
| **23** | 4주차실적 | `4주차실적` | Performance achieved in Week 4 |
| **37** | 지사명 | `지사명` | Branch/Office name |

---

## Detailed Mapping (from [general_prize.py](file:///c:/Users/chlgn/OneDrive/Desktop/git%20GA%20promotion/general_prize.py))

In addition to the core performance metrics, this script includes mappings for organizational structure levels:

| Index | English/Internal Name | Description |
| :--- | :--- | :--- |
| **4** | `Mgr` | Manager (same as Index 4 above) |
| **5** | `Code` | Agent Code (same as Index 5 above) |
| **6** | `Name` | Agent Name (same as Index 6 above) |
| **10** | `FebPerf` | Current Month Performance (Index 10) |
| **18** | `JanPerf` | Previous Month Performance (Index 18) |
| **20** | `Week1In` | Week 1 Performance (Index 20) |
| **31** | `HQ` | Headquarters (e.g., "GA4본부") |
| **33** | `Branch` | Region/Branch Office |
| **37** | `Team` | Specific Team Name |

---

## Usage Example (Python/Pandas)

```python
import pandas as pd

# Data Loading Example
df_raw = pd.read_excel("MC_LIST_OUT_202602.xlsx")

# Selecting columns by index
df = df_raw.iloc[:, [3, 4, 5, 6, 10, 18, 20, 21, 37]].copy()
df.columns = ['소속코드', '담당매니저', '사용인코드', '설계사명', '당월실적', '전월실적', '1주차실적', '2주차실적', '지사명']
```

> [!NOTE]
> All indices are **0-based**. If you are looking at the Excel file directly, Index 0 is Column A, Index 3 is Column D, and so on.

> [!IMPORTANT]
> Some files use Index 37 for `지사명` (Branch), while others might refer to it as `Team` depending on the organizational hierarchy level being focused on.
