export function toE164Phone(countryCode: string, nationalNumber: string) {
  const digits = nationalNumber.replace(/\D/g, '');
  return `${countryCode}${digits}`;
}

export function formatDisplayPhone(phone: string) {
  if (phone.length <= 5) {
    return phone;
  }

  return `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}`.trim();
}
