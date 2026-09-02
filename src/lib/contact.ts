import { Linking } from 'react-native';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeBangladeshWhatsApp(value: string): string {
  const digits = digitsOnly(value);
  if (!digits) return '';
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `880${digits.slice(1)}`;
  if (digits.startsWith('1')) return `880${digits}`;
  return digits;
}

export async function openPhoneCall(phone: string): Promise<void> {
  const digits = digitsOnly(phone);
  if (!digits) return;
  await Linking.openURL(`tel:${digits}`);
}

export async function openSurveyorWhatsApp(phone: string, fullName: string): Promise<void> {
  const normalized = normalizeBangladeshWhatsApp(phone);
  if (!normalized) return;
  const message = `হ্যালো, আমি ${fullName} এর প্রোফাইল Mouza Map Pro থেকে দেখছি। আপনার সেবা সম্পর্কে জানতে চাই।`;
  await Linking.openURL(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`);
}
