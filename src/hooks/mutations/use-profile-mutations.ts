import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { AuthService } from '../../services/auth-service';
import { UserService } from '../../services/user-service';
import { queryKeys } from '../../lib/query-keys';
import { useAuthStore } from '../../stores/auth-store';
import { SuccessToast, ErrorToast } from '../../lib/utils';

// Update Profile: PATCH /auth/me
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (payload: Parameters<typeof AuthService.updateMe>[0]) =>
      AuthService.updateMe(payload),
    onSuccess: async (res) => {
      if (res.success && res.data?.user) {
        queryClient.setQueryData(queryKeys.profile.me(), res.data.user);
        await setUser(res.data.user);
        SuccessToast('প্রোফাইল সফলভাবে আপডেট হয়েছে!');
      } else {
        ErrorToast(res.message || 'প্রোফাইল আপডেট করা যায়নি।');
      }
    },
    onError: (err: any) => {
      ErrorToast(err?.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    },
  });
}

// Upload Avatar: PATCH /users/profile-image
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'অনুমতি প্রয়োজন',
          'গ্যালারি থেকে ছবি আপলোড করতে ফটো লাইব্রেরির অনুমতি দিন।'
        );
        throw new Error('PERMISSION_DENIED');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('CANCELLED');
      }

      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);

      return UserService.uploadProfileImage(formData);
    },
    onSuccess: async (res) => {
      if (res.success && res.data) {
        queryClient.setQueryData(queryKeys.profile.me(), res.data);
        await setUser(res.data);
        SuccessToast('প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে!');
      } else {
        ErrorToast(res.message || 'ছবি আপলোড করা যায়নি।');
      }
    },
    onError: (err: any) => {
      if (err?.message === 'CANCELLED' || err?.message === 'PERMISSION_DENIED') return;
      ErrorToast(err?.message || 'ছবি আপলোড করতে সমস্যা হয়েছে।');
    },
  });
}

// Change Password: POST /auth/change-password
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { oldPassword?: string; newPassword: string }) =>
      AuthService.changePassword(payload),
    onSuccess: (res) => {
      if (res.success) {
        SuccessToast('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
      } else {
        ErrorToast(res.message || 'পাসওয়ার্ড পরিবর্তন করা যায়নি।');
      }
    },
    onError: (err: any) => {
      ErrorToast(err?.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    },
  });
}
