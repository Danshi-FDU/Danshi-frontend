/**
 * 将时间戳格式化为相对时间（如"刚刚"、"5分钟前"、"昨天"等）
 * @param dateString ISO 日期字符串
 * @returns 相对时间字符串
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // 刚刚（1分钟内）
  if (diffMinutes < 1) {
    return '刚刚';
  }

  // X分钟前（1小时内）
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }

  // X小时前（24小时内）
  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }

  // 昨天
  if (diffDays === 1) {
    return '昨天';
  }

  // X天前（7天内）
  if (diffDays < 7) {
    return `${diffDays}天前`;
  }

  // 超过7天显示具体日期
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 如果是今年，不显示年份
  if (year === now.getFullYear()) {
    return `${month}月${day}日`;
  }

  return `${year}年${month}月${day}日`;
}

