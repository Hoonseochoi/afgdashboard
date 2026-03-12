/**
 * 공지사항 메시지에 포함된 HTML을 안전하게 정리합니다. (서버/클라이언트 공통)
 * 허용: <b>, <strong>, <i>, <em>, <span style="color:...">
 * 그 외 태그는 제거(내용은 유지).
 */
export function sanitizeNoticeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  // script 등 위험 태그 전체 제거
  let s = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  // 허용하지 않는 태그만 제거 (태그만 제거, 내용 유지)
  s = s.replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    const t = tagName.toLowerCase();
    if (["b", "strong", "i", "em"].includes(t)) return `<${t}>`;
    if (t === "span") {
      const styleMatch = match.match(/style\s*=\s*["']([^"']*)["']/i);
      const style = styleMatch ? styleMatch[1] : "";
      const colorMatch = style.match(/color\s*:\s*[^;]+/i);
      if (colorMatch) return `<span style="${colorMatch[0].trim()}">`;
      return "<span>";
    }
    return "";
  });
  s = s.replace(/<\/([a-z][a-z0-9]*)>/gi, (match, tagName) => {
    const t = tagName.toLowerCase();
    return ["b", "strong", "i", "em", "span"].includes(t) ? match : "";
  });
  return s;
}

/** HTML 태그 제거 후 순수 텍스트만 반환 (미리보기/목록용). 서버/클라이언트 공통 */
export function stripNoticeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
