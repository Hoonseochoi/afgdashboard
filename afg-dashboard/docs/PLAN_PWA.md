# PWA(Progressive Web App) 전환 플랜

> 웹 대시보드를 **앱처럼 설치·실행**할 수 있게 만드는 계획입니다.  
> 휴대폰 홈 화면에 추가, 독립 창으로 실행, (선택) 오프라인 캐시까지 지원합니다.

**✅ 안드로이드용 구현 완료**: `manifest.json`, 레이아웃 연동, Service Worker 등록까지 적용됨.  
배포 후 Android Chrome에서 "앱 설치" 또는 "홈 화면에 추가"로 설치 가능.

---

## 1. PWA가 되는 원리 (핵심 2가지)

| 요소 | 역할 |
|------|------|
| **Manifest (manifest.json)** | 앱 이름, 아이콘, 배경색, 실행 시 **화면 모드**(전체화면/독립 창) 등을 정의. 이 파일이 있어야 브라우저/OS가 "설치 가능한 앱"으로 인식합니다. |
| **Service Worker (JS)** | 브라우저 **백그라운드**에서 동작. 정적 자원·페이지를 **캐싱**해 오프라인에서도 동작하게 하고, (선택) 푸시 알림을 처리하는 '일꾼' 역할을 합니다. |

이 두 가지가 있고, **HTTPS**로 서비스되면 "앱으로 설치" 버튼이 뜨고, 홈 화면에 추가 시 앱처럼 실행됩니다.

---

## 2. 현재 프로젝트 기준 정리

- **프레임워크**: Next.js 16 (App Router)
- **배포**: Vercel 등 (HTTPS 만족)
- **앱 이름**: Meritz Individual Agent Dashboard (또는 짧게 "AFG 대시보드")
- **아이콘 후보**: `public/meritzair.png` 등 → PWA용 크기로 재생성 필요

---

## 3. 구현 단계

### 3.1 Manifest 파일 (`manifest.json`)

**위치**: `public/manifest.json` (또는 `public/manifest.webmanifest`)

**필수/권장 필드**:

```json
{
  "name": "AFG 대시보드",
  "short_name": "AFG대시보드",
  "description": "Meritz GA 실적 대시보드",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e40af",
  "orientation": "any",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- **display**: `standalone` → 주소창 없이 앱처럼 전체 화면에 가깝게 실행.
- **theme_color**: 상단 상태바 색 (OS/브라우저가 사용).
- **icons**: 최소 **192x192**, **512x512** 필요. `maskable`은 안전 영역을 두고 잘리는 아이콘용.

**Next.js 연동**: `app/layout.tsx`의 `<head>`에 manifest 링크 추가.

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1e40af" />
```

---

### 3.2 아이콘 준비

| 크기 | 용도 |
|------|------|
| 192×192 | Android "홈 화면에 추가", 일부 브라우저 |
| 512×512 | 스플래시/스플래시 화면, 설치 UI |
| 180×180 (선택) | iOS `apple-touch-icon` |

**작업**:
1. `public/meritzair.png` 또는 로고를 기준으로 192, 512 픽셀 PNG 생성.
2. `public/icons/` 폴더에 `icon-192.png`, `icon-512.png` 저장.
3. (선택) iOS용: `public/apple-touch-icon.png` (180×180) 및 layout에 `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` 추가.

---

### 3.3 Service Worker

**역할**:
- **캐싱**: HTML/JS/CSS/이미지 등 정적 자원을 캐시 → 오프라인에서도 앱 껍데기(UI) 표시.
- **API/데이터**: 대시보드 데이터는 **실시간성이 중요**하므로 보통 **네트워크 우선**(online일 때만 최신 데이터). 오프라인 시 "연결 없음" 메시지 또는 마지막 캐시 응답 선택 가능.

**구현 방식 (택 1)**:

| 방식 | 설명 |
|------|------|
| **next-pwa** | Next.js 플러그인. 빌드 시 Workbox로 Service Worker 자동 생성. 설정만으로 캐시 전략 적용. (Next.js 16 호환 여부 확인 필요) |
| **직접 작성** | `public/sw.js` 또는 별도 경로에 Service Worker 작성 후, 클라이언트에서 `navigator.serviceWorker.register('/sw.js')` 호출. 캐시 전략을 완전히 직접 제어. |

**권장 (단순화)**:
1. **1단계**: Manifest + 아이콘만 구현 → **설치 가능 + 앱처럼 실행**까지 달성.
2. **2단계**: Service Worker는 "정적 자원만 캐시"(캐시 우선), `/api/*`는 네트워크 우선으로 두어, 오프라인에서는 "데이터를 불러올 수 없습니다"만 보여 주는 수준으로 구현.

---

### 3.4 Next.js 레이아웃 반영

**수정 대상**: `src/app/layout.tsx`

- `metadata`에 PWA 관련 추가 (선택):
  - `applicationName`, `appleWebApp: { capable: true, title: "AFG대시보드" }` 등.
- `<head>` 내부에:
  - `<link rel="manifest" href="/manifest.json" />`
  - `<meta name="theme-color" content="…" />`
  - `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` (iOS)

이렇게 하면 배포된 URL에서 "앱으로 설치" / "홈 화면에 추가"가 동작합니다.

---

## 4. 설치 가능 조건 (체크리스트)

- [ ] **HTTPS**로 서비스 (Vercel/배포 환경은 기본 만족)
- [ ] **manifest.json** 접근 가능 (`/manifest.json` 200 응답)
- [ ] **Service Worker** 등록 (선택이지만, 있으면 오프라인·설치 경험 향상)
- [ ] **아이콘** 최소 192×192, 512×512 제공
- [ ] **start_url**이 실제 동작하는 경로 (`/`)

---

## 5. 구현 순서 제안

| 순서 | 작업 | 결과 |
|------|------|------|
| 1 | `public/manifest.json` 생성 및 `layout.tsx`에 manifest + theme-color 링크 | 설치 가능 인식 |
| 2 | PWA용 아이콘 192/512 생성 → `public/icons/` 배치 | 설치/스플래시 아이콘 표시 |
| 3 | (선택) `layout.tsx`에 apple-touch-icon 등 iOS 메타 추가 | iOS 홈 화면 추가 시 아이콘 정상 |
| 4 | (선택) Service Worker 도입 (next-pwa 또는 직접 sw.js) | 오프라인 캐시, 더 나은 "앱" 경험 |

---

## 6. 참고

- [web.dev - Install criteria (PWA)](https://web.dev/install-criteria/)
- [MDN - Web app manifests](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [next-pwa](https://github.com/shadowwalker/next-pwa) (Next.js + Workbox)

이 플랜대로 진행하면 **웹사이트를 앱처럼 설치·실행**할 수 있는 PWA로 전환할 수 있습니다.  
원하면 1단계(Manifest + 아이콘 + layout 연동)부터 구체적인 코드 단위로 이어서 작성해 줄 수 있습니다.
