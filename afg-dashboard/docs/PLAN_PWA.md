# PWA 플랜: 코드로 설치 유도 (beforeinstallprompt + 커스텀 버튼)

> 크롬 "홈 화면에 추가"를 **우리 버튼 클릭으로** 띄우는 방식입니다.  
> 브라우저 기본 설치 플로우를 그대로 쓰기 때문에, 휴대폰 보안/권한과 무관하게 설치가 가능합니다.

---

## 1. 핵심 로직

| 단계 | 동작 |
|------|------|
| 1 | 브라우저가 "설치 가능"하다고 판단하면 `beforeinstallprompt` 이벤트를 발생시킴 |
| 2 | 우리는 `e.preventDefault()`로 **기본 배너/팝업을 막고**, `e`를 변수(`deferredPrompt`)에 저장 |
| 3 | 화면에 **우리가 만든 "앱 설치" 버튼**을 노출 |
| 4 | 사용자가 **그 버튼을 누르면** `deferredPrompt.prompt()` 호출 → **크롬의 "홈 화면에 추가" UI**가 뜸 |
| 5 | 사용자가 확인하면 설치 완료. `userChoice`로 승인/거절 처리 가능 |

**요약**: "버튼 클릭 → 크롬의 홈 화면에 추가가 눌리게 한다"가 전부. 우리가 만드는 건 **설치 창을 띄우는 트리거**뿐이고, 실제 설치 플로우는 브라우저가 처리합니다.

---

## 2. 참고 코드 (바닐라 JS)

```js
let deferredPrompt;

// 1. 브라우저가 설치 가능함을 감지했을 때
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();      // 기본 팝업을 막고
  deferredPrompt = e;      // 이벤트를 변수에 저장

  // 우리가 만든 '설치 버튼'을 화면에 보이게 함
  const installBtn = document.getElementById("install-button");
  installBtn.style.display = "block";

  installBtn.addEventListener(
    "click",
    async () => {
      // 2. 버튼 클릭 시 설치 창 띄우기 (= 크롬 홈 화면에 추가)
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        console.log("사용자가 앱 설치를 승인했습니다.");
      }
      deferredPrompt = null;
    },
    { once: true }
  );
});
```

- `deferredPrompt.prompt()` 한 번이 **크롬의 "홈 화면에 추가" 다이얼로그**를 띄우는 동작입니다.
- `userChoice`: 사용자가 "추가" / "취소" 중 무엇을 눌렀는지 알 수 있습니다.

---

## 3. React/Next.js에 옮길 때

### 3.1 상태와 리스너

- **클라이언트 전용**: `beforeinstallprompt`는 브라우저 API이므로 `"use client"` 컴포넌트에서만 사용합니다.
- 상태 예:
  - `deferredPrompt`: `BeforeInstallPromptEvent | null` (이벤트 객체 저장)
  - `showInstallButton`: `boolean` (버튼 표시 여부)
- `beforeinstallprompt` 리스너에서:
  - `e.preventDefault()`
  - `setDeferredPrompt(e)`, `setShowInstallButton(true)`

### 3.2 버튼 클릭 핸들러

```ts
const handleInstallClick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") {
    // 설치 승인 시 버튼 숨기기 등
    setShowInstallButton(false);
  }
  setDeferredPrompt(null);
};
```

### 3.3 버튼을 숨겨야 할 때

- **이미 앱으로 실행 중일 때** (standalone): 설치 버튼 노출하지 않음.
- **beforeinstallprompt를 지원하지 않는 환경** (예: iOS Safari): 버튼 자체를 안 보이게 하거나, 안내 문구만 표시.
- **설치 완료 후**: `appinstalled` 이벤트로 감지 후 버튼 숨김.

```js
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  setShowInstallButton?.(false);
});
```

---

## 4. 구현 플로우 제안

| 순서 | 작업 | 비고 |
|------|------|------|
| 1 | **InstallPrompt 컴포넌트** 추가 (`"use client"`) | `beforeinstallprompt` 수신, `deferredPrompt`·`showInstallButton` 상태 관리 |
| 2 | **설치 버튼 UI** | 로그인 후 보이는 헤더/푸터 또는 플로팅 버튼. `showInstallButton && !isStandalone` 일 때만 표시 |
| 3 | **클릭 시** `deferredPrompt.prompt()` 호출 후 `userChoice` 처리 | 승인 시 버튼 숨김, `deferredPrompt` null 처리 |
| 4 | **appinstalled** 리스너로 설치 완료 감지 | 설치 후 버튼 제거 |
| 5 | (선택) **iOS** | `beforeinstallprompt` 없음 → "홈 화면에 추가는 메뉴(⋮) → 홈 화면에 추가를 이용해 주세요" 문구만 표시 가능 |

---

## 5. 배치 위치

- **layout.tsx**: `<body>` 안에 `<InstallPrompt />`를 두면 모든 페이지에서 설치 버튼 노출 가능.
- **page.tsx**: 로그인된 대시보드 상단/하단에만 설치 버튼을 두고 싶다면, `page.tsx`에서 `isStandalone`과 함께 조건부 렌더링.

둘 중 한 곳에만 두면 됩니다. (전역이면 layout, 대시보드 전용이면 page)

---

## 6. 기존 PWA 요소 (유지)

- **manifest.json**: 그대로 유지. `display: standalone`, 아이콘, `theme_color` 등.
- **Service Worker** (`/sw.js`, `RegisterSW`): 유지. 설치 가능 조건·오프라인 동작에 필요.
- **standalone 감지**: 이미 `page.tsx`에서 `display-mode: standalone` / `navigator.standalone` 체크 중이면, 그 값을 InstallPrompt에 전달해 "이미 앱으로 실행 중"일 때 버튼을 숨기면 됩니다.

---

## 7. 정리

- **목표**: 우리 버튼 클릭 → **크롬의 "홈 화면에 추가"가 실행되게** 하는 것.
- **방법**: `beforeinstallprompt`로 이벤트를 받아 두고, 버튼 클릭 시 `deferredPrompt.prompt()`만 호출.
- **보안/권한**: 브라우저 기본 설치 플로우를 쓰므로, 휴대폰 보안과 무관하게 동일하게 동작합니다.

이 플랜대로 구현하면 "코드로 설치를 유도하는 PWA"가 됩니다.
