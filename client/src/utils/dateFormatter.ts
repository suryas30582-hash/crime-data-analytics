/**
 * Format ISO or UTC date string into standard IST (Asia/Kolkata) presentation string.
 * Example output: "28 Sep 2026, 02:15 PM IST"
 */
export function formatISTDateTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  // Format date parts in Asia/Kolkata timezone
  const day = date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit' });
  const month = date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' });
  const year = date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' });

  // Format time parts (12-hour format with AM/PM)
  const timeStr = date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toUpperCase();

  return `${day} ${month} ${year}, ${timeStr} IST`;
}

/**
 * Format ISO or UTC date string into IST Time only.
 * Example output: "06:23 PM"
 */
export function formatISTTimeOnly(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toUpperCase();
}
