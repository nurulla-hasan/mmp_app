import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { AuthService } from '../../services/auth-service';
import { UserService } from '../../services/user-service';
import { unwrapApiResult } from '../../lib/api-result';
import { queryKeys } from '../../lib/query-keys';
import { useAuthStore } from '../../stores/auth-store';
import { SuccessToast, ErrorToast } from '../../lib/utils';
import type { ChangePasswordPayload, TAuthUser } from '../../types/auth';

// Merge safe profile projections into the complete auth identity. The backend
// deliberately omits fields such as hasPassword from profile mutation responses.
async function syncUserPatch(
  queryClient: ReturnType<typeof useQueryClient>,
  patch: Partial<TAuthUser>,
  fallbackUser: TAuthUser | null,
  setUser: (user: TAuthUser) => Promise<void>,
  refreshUser: () => Promise<void>
) {
  const currentUser =
    queryClient.getQueryData<TAuthUser>(queryKeys.profile.me()) ?? fallbackUser;

  if (!currentUser) {
    await refreshUser();
    return;
  }

  const mergedUser: TAuthUser = { ...currentUser, ...patch };
  queryClient.setQueryData(queryKeys.profile.me(), mergedUser);
  await setUser(mergedUser);
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return useMutation({
    mutationFn: async (payload: Parameters<typeof AuthService.updateMe>[0]) =>
      unwrapApiResult(await AuthService.updateMe(payload)),
    onSuccess: async (data) => {
      await syncUserPatch(
        queryClient,
        data.user,
        user,
        setUser,
        refreshUser
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
      SuccessToast('প্রোফাইল সফলভাবে আপডেট হয়েছে!');
    },
    onError: (error: Error) => {
      ErrorToast(error.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const refreshUser = useAuthStore((state) => state.refreshUser);

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

      return unwrapApiResult(await UserService.uploadProfileImage(formData));
    },
    onSuccess: async (data) => {
      await syncUserPatch(queryClient, data, user, setUser, refreshUser);
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
      SuccessToast('প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে!');
    },
    onError: (error: Error) => {
      if (error.message === 'CANCELLED' || error.message === 'PERMISSION_DENIED') return;
      ErrorToast(error.message || 'ছবি আপলোড করতে সমস্যা হয়েছে।');
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) =>
      unwrapApiResult(await AuthService.changePassword(payload)),
    onSuccess: async () => {
      // Important for Google-only accounts: hasPassword changes false -> true.
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
      SuccessToast('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
    },
    onError: (error: Error) => {
      ErrorToast(error.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    },
  });
}
