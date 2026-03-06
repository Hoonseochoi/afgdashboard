---
name: AFG Dashboard Refactor Rules
description: 리팩토링 및 컴포넌트 구조화 시 준수해야 할 규칙들을 정의합니다.
---

# AFG Dashboard Refactoring Rules

이 문서는 AFG 대시보드 프로젝트의 대규모 컴포넌트(Dashboard.tsx)를 분리하고 구조화할 때 에이전트가 반드시 준수해야 하는 규칙을 정의한다.

## 1. 관심사의 분리 (Separation of Concerns)
* **Logic vs UI:** 시상금 계산, 티어 산정 등의 모든 비즈니스 로직은 컴포넌트 외부인 `src/lib/engines/` 폴더로 분리한다.
* **Pure Functions:** 추출된 로직 함수는 입력값에만 의존하는 순수 함수여야 하며, 별도의 사이드 이펙트가 없어야 한다.
* **Custom Hooks:** 데이터 페칭(Supabase) 및 복잡한 상태 관리 로직은 전용 커스텀 훅(`src/hooks/`)으로 추출한다.

## 2. 컴포넌트 구조화 (Component Architecture)
* **Atomic Design:** UI는 재사용 가능한 작은 단위의 카드 컴포넌트로 분리한다.
* **Folder Consistency:** 
    - 파트너 지사 컴포넌트: `src/app/partner/_components/cards/`
    - 직영 지사 컴포넌트: `src/app/direct/_components/cards/`
* **Naming Convention:** 컴포넌트 파일 이름은 파스칼 케이스(PascalCase)를 사용하며(예: `WeeklyRewardCard.tsx`), 기능이 명확히 드러나야 한다.

## 3. 기술 스택 준수 (Tech Stack Integrity)
* **Tailwind CSS 4:** 모든 스타일링은 Tailwind 4의 최신 컨벤션을 따르며, 기존의 디자인 시스템(색상, 간격 등)을 유실하지 않는다.
* **Framer Motion:** 기존의 부드러운 애니메이션 효과를 컴포넌트 분리 후에도 그대로 유지한다.
* **TypeScript:** 모든 Props와 데이터 모델에 대해 엄격한 인터페이스를 정의하며, `any` 타입을 사용하지 않는다.

## 4. 데이터 흐름 (Data Flow)
* **Unidirectional Data Flow:** 상위 컴포넌트(Dashboard)에서 데이터를 페칭하고, 하위 카드 컴포넌트는 필요한 데이터만 Props로 전달받는 구조를 유지한다.
* **Supabase Client:** 서버 사이드와 클라이언트 사이드 환경에 맞는 적절한 Supabase 유틸리티를 사용한다.

## 5. 작업 프로세스 (Workflow)
* **Policy Compliance:** `Always Proceeds` 정책이 활성화된 경우, 파일 생성 후 즉시 `npm run dev`를 통해 빌드 에러 여부를 확인한다.
* **Documentation:** 새로운 파일을 생성하거나 기존 로직을 변경한 경우, 해당 변경 사항을 간략히 요약하여 사용자에게 보고한다. 보고할때는 한글로 번역해서 보고한다.
