/**
 * UTF-8로만 읽고 써서 인코딩 깨짐 방지. 한 번에 한 패치만 적용.
 * 사용: node scripts/patch-utf8.js <패치이름>
 * 패치: add-partner-import, add-partner-vars, partner-tier-and-total, partner-card-and-grid, partner-hoist, partner-grid-close-fix, partner-jsx-close-oneline
 */
const fs = require("fs");
const path = require("path");

const PAGE_PATH = path.join(__dirname, "../src/app/page.tsx");

function read() {
  return fs.readFileSync(PAGE_PATH, "utf8");
}

function write(content) {
  fs.writeFileSync(PAGE_PATH, content, "utf8");
}

const patches = {
  "add-partner-import": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const old = `import januaryClosedData from "@/data/january_closed.json";${nl}${nl}const januaryClosed`;
    const new_ = `import januaryClosedData from "@/data/january_closed.json";${nl}import type { PartnerPrizeData } from "@/lib/appwrite-server";${nl}${nl}const januaryClosed`;
    if (!content.includes(old)) throw new Error("add-partner-import: 찾을 문자열 없음");
    return content.replace(old, new_);
  },
  "add-partner-vars": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const old = `  if (selectedAgent && selectedAgent.performance) {${nl}    performanceData = [`;
    const new_ = `  if (selectedAgent && selectedAgent.performance) {${nl}    const isPartnerBranch = (selectedAgent?.branch || "").includes("파트너");${nl}    const p = selectedAgent?.partner as PartnerPrizeData | undefined;${nl}    performanceData = [`;
    if (!content.includes(old)) throw new Error("add-partner-vars: 찾을 문자열 없음");
    return content.replace(old, new_);
  },
  "partner-tier-and-total": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const getWeekPrizeEnd = `return 0;${nl}    };${nl}    ${nl}    // 1주차 시상 (1월/2월 티어 다름)`;
    const getPartnerTier = `return 0;${nl}    };${nl}    const getPartnerTierPrize = (perf: number) => {${nl}      if (perf >= 500000) return 500000; if (perf >= 300000) return 300000; if (perf >= 200000) return 200000; if (perf >= 100000) return 100000;${nl}      return 0;${nl}    };${nl}    ${nl}    // 1주차 시상 (1월/2월 티어 다름)`;
    if (!content.includes(getWeekPrizeEnd)) throw new Error("partner-tier-and-total: getWeekPrize 끝 없음");
    let c = content.replace(getWeekPrizeEnd, getPartnerTier);

    const totalLine = `totalEstimatedPrize = week1Prize + week2Prize + week3Prize + monthlyPrize + doubleMeritzPrize + meritzClubPlusPrize + regularPrize;`;
    const totalWithPartner = `totalEstimatedPrize = week1Prize + week2Prize + week3Prize + monthlyPrize + doubleMeritzPrize + meritzClubPlusPrize + regularPrize;${nl}    if (isPartnerBranch && p) {${nl}      if (isJanuaryView) {${nl}        totalEstimatedPrize = (p.productWeek1PrizeJan ?? 0) + (p.productWeek2PrizeJan ?? 0) + (p.continuous121Prize ?? 0) + (p.week3PrizeJan ?? 0) + (p.week4PrizeJan ?? 0) + (p.continuous12Prize ?? 0) + (p.continuous12ExtraPrize ?? 0) + meritzClubPlusPrize + regularPrize;${nl}      } else {${nl}        const pw1 = p.productWeek1Prize ?? 0; const pw2 = getPartnerTierPrize(viewW2); const w34 = getPartnerTierPrize(p.week34Sum ?? 0);${nl}        totalEstimatedPrize = pw1 + pw2 + w34 + (p.continuous12Prize ?? 0) + (p.continuous12ExtraPrize ?? 0) + meritzClubPlusPrize + regularPrize;${nl}      }${nl}    }`;
    if (!c.includes(totalLine)) throw new Error("partner-tier-and-total: totalEstimatedPrize 줄 없음");
    c = c.replace(totalLine, totalWithPartner);
    return c;
  },
  "partner-card-and-grid": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const beforeExport = `const RANK_EXCLUDE_CODE = "712345678"; // 테스트용 노연지 계정 — 랭킹·실적 순위에서 제외${nl}${nl}export default function Dashboard()`;
    const withCard = `const RANK_EXCLUDE_CODE = "712345678"; // 테스트용 노연지 계정 — 랭킹·실적 순위에서 제외${nl}${nl}function PartnerPrizeCard({ title, value }: { title: string; value: number }) {${nl}  return (${nl}    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/5 dark:bg-gray-800/50">${nl}      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>${nl}      <p className="text-base font-bold text-primary">{Math.round(value / 10000).toLocaleString()}만원</p>${nl}    </div>${nl}  );${nl}}${nl}${nl}export default function Dashboard()`;
    if (!content.includes(beforeExport)) throw new Error("partner-card-and-grid: RANK_EXCLUDE 앞 없음");
    let c = content.replace(beforeExport, withCard);

    const gridOpen = `<div className={\`grid grid-cols-1 gap-4 md:gap-5 mb-6 \${selectedViewMonth === 1 ? "md:grid-cols-4" : "md:grid-cols-3"}\`}>${nl}                {/* 1줄: 1주차, 2주차, (3주차 1월만), 월간 */}`;
    const gridWithPartner = `<div className={\`grid grid-cols-1 gap-4 md:gap-5 mb-6 \${selectedViewMonth === 1 ? "md:grid-cols-4" : "md:grid-cols-3"}\`}>${nl}                {isPartnerBranch && selectedViewMonth === 1 && (${nl}                  <>${nl}                    <PartnerPrizeCard title="정규+파트너" value={regularPrize} />${nl}                    <PartnerPrizeCard title="1주 인보험" value={p?.productWeek1PrizeJan ?? 0} />${nl}                    <PartnerPrizeCard title="1주 상품" value={p?.productWeek1PrizeJan ?? 0} />${nl}                    <PartnerPrizeCard title="2주 인보험" value={p?.productWeek2PrizeJan ?? 0} />${nl}                    <PartnerPrizeCard title="2주 상품" value={p?.productWeek2PrizeJan ?? 0} />${nl}                    <PartnerPrizeCard title="12~1월 연속가동" value={p?.continuous121Prize ?? 0} />${nl}                    <PartnerPrizeCard title="3주 인보험" value={p?.week3PrizeJan ?? 0} />${nl}                    <PartnerPrizeCard title="4주 인보험" value={p?.week4PrizeJan ?? 0} />${nl}                    <PartnerPrizeCard title="1~2월 연속가동" value={p?.continuous12Prize ?? 0} />${nl}                    <PartnerPrizeCard title="1~2월 추가 연속가동" value={p?.continuous12ExtraPrize ?? 0} />${nl}                    <PartnerPrizeCard title="메리츠클럽+" value={meritzClubPlusPrize} />${nl}                  </>${nl}                )}${nl}                {isPartnerBranch && selectedViewMonth === 2 && (${nl}                  <>${nl}                    <PartnerPrizeCard title="정규+파트너" value={regularPrize} />${nl}                    <PartnerPrizeCard title="1주 인보험" value={p?.productWeek1Prize ?? 0} />${nl}                    <PartnerPrizeCard title="1주 상품" value={p?.productWeek1Prize ?? 0} />${nl}                    <PartnerPrizeCard title="2주 인보험" value={getPartnerTierPrize(viewW2)} />${nl}                    <PartnerPrizeCard title="2주 상품" value={getPartnerTierPrize(viewW2)} />${nl}                    <PartnerPrizeCard title="1~2월 연속가동" value={p?.continuous12Prize ?? 0} />${nl}                    <PartnerPrizeCard title="3~4주 인보험" value={getPartnerTierPrize(p?.week34Sum ?? 0)} />${nl}                    <PartnerPrizeCard title="1~2월 추가 연속가동" value={p?.continuous12ExtraPrize ?? 0} />${nl}                    <PartnerPrizeCard title="메리츠클럽+" value={meritzClubPlusPrize} />${nl}                  </>${nl}                )}${nl}                {!isPartnerBranch && (${nl}                <div style={{ display: "contents" }}>${nl}                {/* 1줄: 1주차, 2주차, (3주차 1월만), 월간 */}`;
    if (!c.includes(gridOpen)) throw new Error("partner-card-and-grid: grid 열기 없음");
    c = c.replace(gridOpen, gridWithPartner);

    const gridClose = `                </div>${nl}              </div>${nl}            </div>${nl}${nl}            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 md:gap-5 mb-6 lg:items-stretch">`;
    const gridCloseWithPartner = `                </div>${nl}              </div>${nl}                </div>${nl}                )}${nl}            </div>${nl}            </div>${nl}${nl}            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 md:gap-5 mb-6 lg:items-stretch">`;
    if (!c.includes(gridClose)) throw new Error("partner-card-and-grid: grid 닫기 없음");
    c = c.replace(gridClose, gridCloseWithPartner);
    return c;
  },
  "partner-hoist": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const oldIf = `  const dayFromUpdate = (updateDate && updateDate.length >= 4) ? parseInt(updateDate.slice(2, 4), 10) : todayDay;${nl}${nl}  if (selectedAgent && selectedAgent.performance) {${nl}    const isPartnerBranch = (selectedAgent?.branch || "").includes("파트너");${nl}    const p = selectedAgent?.partner as PartnerPrizeData | undefined;${nl}    performanceData = [`;
    const newIf = `  const dayFromUpdate = (updateDate && updateDate.length >= 4) ? parseInt(updateDate.slice(2, 4), 10) : todayDay;${nl}${nl}  const isPartnerBranch = (selectedAgent?.branch || "").includes("파트너");${nl}  const p = selectedAgent?.partner as PartnerPrizeData | undefined;${nl}  const getPartnerTierPrize = (perf: number) => { if (perf >= 500000) return 500000; if (perf >= 300000) return 300000; if (perf >= 200000) return 200000; if (perf >= 100000) return 100000; return 0; };${nl}${nl}  if (selectedAgent && selectedAgent.performance) {${nl}    performanceData = [`;
    if (!content.includes(oldIf)) throw new Error("partner-hoist: dayFromUpdate/if 블록 없음");
    let c = content.replace(oldIf, newIf);
    const removeInner = `return 0;${nl}    };${nl}    const getPartnerTierPrize = (perf: number) => {${nl}      if (perf >= 500000) return 500000; if (perf >= 300000) return 300000; if (perf >= 200000) return 200000; if (perf >= 100000) return 100000;${nl}      return 0;${nl}    };${nl}    ${nl}    // 1주차 시상 (1월/2월 티어 다름)`;
    const keepOnly = `return 0;${nl}    };${nl}    ${nl}    // 1주차 시상 (1월/2월 티어 다름)`;
    if (!c.includes(removeInner)) throw new Error("partner-hoist: getPartnerTierPrize 내부 정의 없음");
    c = c.replace(removeInner, keepOnly);
    return c;
  },
  "partner-grid-close-fix": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const broken = `                </div>${nl}                )}${nl}            </div>${nl}            </div>${nl}${nl}            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 md:gap-5 mb-6 lg:items-stretch">`;
    const fixed = `                </div>${nl}                )}${nl}            </div>${nl}${nl}            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 md:gap-5 mb-6 lg:items-stretch">`;
    if (!content.includes(broken)) throw new Error("partner-grid-close-fix: 대상 없음");
    return content.replace(broken, fixed);
  },
  "partner-jsx-close-oneline": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const old = `                </div>)}${nl}            </div>${nl}${nl}            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]`;
    const new_ = `                </div>${nl}            </div>${nl}${nl}            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]`;
    if (!content.includes(old)) throw new Error("partner-jsx-close-oneline: 대상 없음");
    return content.replace(old, new_);
  },
  "partner-undo-fragment": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const oldOpen = `{!isPartnerBranch ? (${nl}                <>${nl}                <div style={{ display: "contents" }}>`;
    const newOpen = `{!isPartnerBranch ? (${nl}                <div style={{ display: "contents" }}>`;
    const oldClose = `                </div>${nl}                </>${nl}            ) : null}`;
    const newClose = `                </div>${nl}            ) : null}`;
    if (!content.includes(oldOpen)) throw new Error("partner-undo-fragment: open 없음");
    let c = content.replace(oldOpen, newOpen);
    if (!c.includes(oldClose)) throw new Error("partner-undo-fragment: close 없음");
    c = c.replace(oldClose, newClose);
    return c;
  },
  "partner-undo-section-close": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const old = `            ) : null}${nl}            </div>${nl}            </div>${nl}${nl}            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4`;
    const new_ = `            ) : null}${nl}            </div>${nl}${nl}            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4`;
    if (!content.includes(old)) throw new Error("partner-undo-section-close: 대상 없음");
    return content.replace(old, new_);
  },
  "partner-ternary": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const oldOpen = `{!isPartnerBranch && (${nl}                <div style={{ display: "contents" }}>`;
    const newOpen = `{!isPartnerBranch ? (${nl}                <div style={{ display: "contents" }}>`;
    const oldClose = `                </div>)}${nl}            </div>`;
    const newClose = `                </div>${nl}            ) : null}${nl}            </div>`;
    if (!content.includes(oldOpen)) throw new Error("partner-ternary: open 없음");
    let c = content.replace(oldOpen, newOpen);
    if (!c.includes(oldClose)) throw new Error("partner-ternary: close 없음");
    c = c.replace(oldClose, newClose);
    return c;
  },
  "partner-nonpartner-var": (content) => {
    const nl = content.includes("\r\n") ? "\r\n" : "\n";
    const openTag = `                {!isPartnerBranch && (${nl}                <div style={{ display: "contents" }}>`;
    const closeBlock = `${nl}                </div>${nl}                )${nl}                }${nl}            </div>`;
    const startIdx = content.indexOf(openTag);
    const endIdx = content.indexOf(closeBlock, startIdx);
    if (startIdx === -1 || endIdx === -1) throw new Error("partner-nonpartner-var: 블록 찾을 수 없음");
    const prefixLen = `                {!isPartnerBranch && (${nl}                `.length;
    const cardsContent = content.slice(startIdx + prefixLen, endIdx + `${nl}                </div>`.length);
    const fullBlock = content.slice(startIdx, endIdx + closeBlock.length);
    const replacement = `                {!isPartnerBranch && nonPartnerCardsEl}${nl}            </div>`;
    let c = content.replace(fullBlock, replacement);
    c = c.replace("  let totalEstimatedPrize = 0;\n\n  ", "  let totalEstimatedPrize = 0;\n  let nonPartnerCardsEl: React.ReactNode = null;\n\n  ");
    const beforeReturn = `${nl}  }${nl}${nl}  return (`;
    if (!c.includes(beforeReturn)) throw new Error("partner-nonpartner-var: return 앞 패턴 없음");
    c = c.replace(beforeReturn, `${nl}  if (!isPartnerBranch) {${nl}  nonPartnerCardsEl = (${nl}${cardsContent}${nl}  );${nl}  }${nl}  }${nl}${nl}  return (`);
    return c;
  },
};

const name = process.argv[2];
if (!name || !patches[name]) {
  console.error("사용법: node scripts/patch-utf8.js <패치이름>");
  console.error("패치:", Object.keys(patches).join(", "));
  process.exit(1);
}

const content = read();
const next = patches[name](content);
write(next);
console.log("OK:", name);
