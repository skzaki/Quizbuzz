export function formatIST(date) {
  const value = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value) + " IST";
}

export function formatCurrency(paise) {
  const amount = Number(paise);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return `₹${Math.round(amount / 100)}`;
}

export function formatRank(rank) {
  const value = Number(rank);

  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}