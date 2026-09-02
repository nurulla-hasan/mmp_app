import type { TSurveyorProfile } from '../types/surveyor';

export function getSurveyorDisplayName(surveyor: TSurveyorProfile): string {
  return surveyor.user?.name || surveyor.fullName || 'সার্ভেয়ার';
}

export function getSurveyorLocation(surveyor: TSurveyorProfile): {
  district: string;
  upazila: string;
} {
  return {
    district:
      surveyor.user?.district ||
      surveyor.primaryLocation?.district ||
      surveyor.serviceAreas?.[0]?.district ||
      '',
    upazila:
      surveyor.user?.upazila ||
      surveyor.primaryLocation?.upazila ||
      surveyor.serviceAreas?.[0]?.upazilas?.[0] ||
      '',
  };
}

export function getSurveyorWhatsApp(surveyor: TSurveyorProfile): string {
  return surveyor.user?.whatsappNumber || surveyor.whatsappNumber || '';
}

export function getSurveyorMinimumPrice(surveyor: TSurveyorProfile): number | null {
  const prices = (surveyor.surveyorServices ?? [])
    .map((item) => Number(item.startingPrice))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : null;
}
