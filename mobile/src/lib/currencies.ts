/**
 * Currencies offered in the restaurant setup dropdown.
 *
 * The server stores the plain ISO 4217 code, so this list only controls what
 * owners can pick — an unlisted code coming back from the API still displays
 * fine (see `currencyOptions`). Common markets are listed first; everything
 * after that is alphabetical, and the picker is searchable.
 */
export type Currency = { code: string; name: string; symbol: string };

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },

  { code: "ARS", name: "Argentine Peso", symbol: "$" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв" },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CLP", name: "Chilean Peso", symbol: "$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "COP", name: "Colombian Peso", symbol: "$" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  { code: "FJD", name: "Fijian Dollar", symbol: "FJ$" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪" },
  { code: "ISK", name: "Icelandic Króna", symbol: "kr" },
  { code: "JOD", name: "Jordanian Dinar", symbol: "د.ا" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "LBP", name: "Lebanese Pound", symbol: "ل.ل" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "د.م." },
  { code: "MUR", name: "Mauritian Rupee", symbol: "₨" },
  { code: "MVR", name: "Maldivian Rufiyaa", symbol: "Rf" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "₨" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "OMR", name: "Omani Rial", symbol: "ر.ع." },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "PLN", name: "Polish Złoty", symbol: "zł" },
  { code: "QAR", name: "Qatari Riyal", symbol: "ر.ق" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
  { code: "RSD", name: "Serbian Dinar", symbol: "дин." },
  { code: "SAR", name: "Saudi Riyal", symbol: "ر.س" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "NT$" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴" },
  { code: "VND", name: "Vietnamese Đồng", symbol: "₫" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

/** Human label for the picker field, e.g. "LKR — Sri Lankan Rupee (Rs)". */
export function currencyLabel(code: string): string {
  const c = BY_CODE.get(code.toUpperCase());
  return c ? `${c.code} — ${c.name} (${c.symbol})` : code.toUpperCase();
}

/**
 * Options for the <Select>. If the restaurant already uses a code we don't
 * list (set on the web, or added later), it's prepended so the field never
 * shows an empty value or silently drops the owner's choice.
 */
export function currencyOptions(current?: string) {
  const opts = CURRENCIES.map((c) => ({
    value: c.code,
    label: `${c.code} — ${c.name}`,
    hint: c.symbol,
  }));
  const code = current?.toUpperCase();
  if (code && !BY_CODE.has(code)) {
    return [{ value: code, label: code, hint: "Current setting" }, ...opts];
  }
  return opts;
}
