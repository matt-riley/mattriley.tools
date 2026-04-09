const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatUtcTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid ISO timestamp: ${isoTimestamp}`);
  }

  const day = date.getUTCDate();
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hour24 = date.getUTCHours();
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const hour12 = hour24 % 12 || 12;
  const meridiem = hour24 >= 12 ? "PM" : "AM";

  return `${day} ${month}, ${year}, ${hour12}:${minute} ${meridiem} UTC`;
}
