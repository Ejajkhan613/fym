export function toE164Phone(countryCode: string, phone: string) {
  const digits = phone.replace(/\D/g, '');
  const normalizedCountry = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;

  if (phone.trim().startsWith('+')) {
    return `+${digits}`;
  }

  return `${normalizedCountry}${digits}`;
}

export function formatDisplayPhone(phone: string) {
  if (phone.startsWith('+91') && phone.length > 3) {
    return `+91 ${phone.slice(3)}`;
  }

  return phone;
}
