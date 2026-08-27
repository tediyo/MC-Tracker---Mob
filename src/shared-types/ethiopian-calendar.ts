export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
}

export interface EthiopianMonthInfo {
  number: number; // 1 - 13
  nameEn: string;
  nameAm: string;
  label: string; // e.g. "Meskerem (መስከረም)"
}

export const ETHIOPIAN_MONTHS: readonly EthiopianMonthInfo[] = [
  { number: 1, nameEn: "Meskerem", nameAm: "መስከረም", label: "Meskerem (መስከረም)" },
  { number: 2, nameEn: "Tikimt", nameAm: "ጥቅምት", label: "Tikimt (ጥቅምት)" },
  { number: 3, nameEn: "Hidar", nameAm: "ሕዳር", label: "Hidar (ሕዳር)" },
  { number: 4, nameEn: "Tahsas", nameAm: "ታኅሣሥ", label: "Tahsas (ታኅሣሥ)" },
  { number: 5, nameEn: "Tir", nameAm: "ጥር", label: "Tir (ጥር)" },
  { number: 6, nameEn: "Yakatit", nameAm: "የካቲት", label: "Yakatit (የካቲት)" },
  { number: 7, nameEn: "Megabit", nameAm: "መጋቢት", label: "Megabit (መጋቢት)" },
  { number: 8, nameEn: "Miyazya", nameAm: "ሚያዝያ", label: "Miyazya (ሚያዝያ)" },
  { number: 9, nameEn: "Ginbot", nameAm: "ግንቦት", label: "Ginbot (ግንቦት)" },
  { number: 10, nameEn: "Sene", nameAm: "ሰኔ", label: "Sene (ሰኔ)" },
  { number: 11, nameEn: "Hamle", nameAm: "ሐምሌ", label: "Hamle (ሐምሌ)" },
  { number: 12, nameEn: "Nehase", nameAm: "ነሐሴ", label: "Nehase (ነሐሴ)" },
  { number: 13, nameEn: "Pagume", nameAm: "ጳጉሜ", label: "Pagume (ጳጉሜ)" },
];

export function isEthiopianLeapYear(ethYear: number): boolean {
  return ethYear % 4 === 3;
}

export function getDaysInEthiopianMonth(ethYear: number, ethMonth: number): number {
  if (ethMonth >= 1 && ethMonth <= 12) return 30;
  if (ethMonth === 13) return isEthiopianLeapYear(ethYear) ? 6 : 5;
  throw new Error(`Invalid Ethiopian month: ${ethMonth}`);
}

export function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);

  return { year, month, day };
}

export function getEthiopianDate(gregorianInput: Date | string): EthiopianDate {
  let gy: number;
  let gm: number;
  let gd: number;

  if (typeof gregorianInput === "string") {
    const datePart = (gregorianInput.split("T")[0] || gregorianInput) as string;
    const parts = datePart.split("-");
    const p0 = parts[0];
    const p1 = parts[1];
    const p2 = parts[2];
    if (parts.length === 3 && p0 !== undefined && p1 !== undefined && p2 !== undefined) {
      gy = parseInt(p0, 10);
      gm = parseInt(p1, 10);
      gd = parseInt(p2, 10);
    } else {
      const dateObj = new Date(gregorianInput);
      gy = dateObj.getFullYear();
      gm = dateObj.getMonth() + 1;
      gd = dateObj.getDate();
    }
  } else {
    gy = gregorianInput.getFullYear();
    gm = gregorianInput.getMonth() + 1;
    gd = gregorianInput.getDate();
  }

  const jdn = gregorianToJdn(gy, gm, gd);
  const r = jdn - 1724220;
  const ethYear = Math.floor((4 * r + 1463) / 1461);

  const jdnStart = 1724220 + 365 * (ethYear - 1) + Math.floor(ethYear / 4);
  const dInYear = jdn - jdnStart;

  const ethMonth = Math.floor((dInYear - 1) / 30) + 1;
  const ethDay = dInYear - 30 * (ethMonth - 1);

  return { year: ethYear, month: ethMonth, day: ethDay };
}

export function toGregorianDate(ethYear: number, ethMonth: number, ethDay: number): Date {
  const jdnStart = 1724220 + 365 * (ethYear - 1) + Math.floor(ethYear / 4);
  const jdn = jdnStart + 30 * (ethMonth - 1) + ethDay;
  const { year, month, day } = jdnToGregorian(jdn);
  return new Date(year, month - 1, day);
}
