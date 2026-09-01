import { Alert, ToastAndroid, Platform } from 'react-native';

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export function toBengaliDigits(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (w) => bengaliDigits[Number(w)]);
}

export const SuccessToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('সফল', message);
  }
};

export const ErrorToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('ত্রুটি', message);
  }
};

export const WarningToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('সতর্কতা', message);
  }
};
