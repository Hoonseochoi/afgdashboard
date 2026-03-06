/** 테스트용 노연지 계정 — 랭킹·실적 순위에서 제외 */
export const RANK_EXCLUDE_CODE = "712345678";

/** 파트너 시상 구간: 10만, 20만, 30만, 50만 (만원) */
export const PARTNER_TIERS = [100000, 200000, 300000, 500000];

/** 파트너 카드 variant (색상 테마) */
export type PartnerCardVariant = "green" | "sky" | "purple" | "yellow";

/** 파트너 전용 Apple 스타일 기본 카드 컨테이너 클래스 */
export const APPLE_CARD_BASE =
  "relative rounded-2xl p-2.5 md:p-3 flex flex-col overflow-hidden bg-gradient-to-br from-white to-gray-50/90 dark:from-[#050509] dark:to-[#050509] border border-gray-200/80 dark:border-gray-800 shadow-[0_18px_45px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-0.5";
