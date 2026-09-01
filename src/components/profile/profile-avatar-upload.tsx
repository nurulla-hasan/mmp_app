import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { AuthService } from '../../services/auth-service';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { Fonts } from '../../constants/typography';
import { SuccessToast, ErrorToast } from '../../lib/utils';

interface ProfileAvatarUploadProps {
  src?: string | null;
  name?: string;
  isPro?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'xl';
  editable?: boolean;
}

export const ProfileAvatarUpload: React.FC<ProfileAvatarUploadProps> = ({
  src,
  name = 'User',
  isPro = false,
  size = 'xl',
  editable = true,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { refreshUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const handlePickAndCropImage = async () => {
    if (!editable || uploading) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'অনুমতি প্রয়োজন',
          'গ্যালারি থেকে ছবি আপলোড করতে ফটো লাইব্রেরির অনুমতি দিন।'
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true, // Native square cropper!
        aspect: [1, 1],      // 1:1 Aspect ratio
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const asset = pickerResult.assets[0];
      setPreviewUri(asset.uri);
      setUploading(true);

      const filename = asset.fileName || `avatar_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';

      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: filename,
        type: mimeType,
      } as any);

      const res = await AuthService.uploadProfileImage(formData);

      if (res.success) {
        await refreshUser();
        SuccessToast('প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে!');
      } else {
        setPreviewUri(null);
        ErrorToast(res.message || 'ছবি আপলোড করা যায়নি। আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setPreviewUri(null);
      ErrorToast(err?.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setUploading(false);
    }
  };

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { boxSize: 44, radius: 22, initialSize: 16, cameraSize: 16, iconSize: 9 };
      case 'lg':
        return { boxSize: 64, radius: 32, initialSize: 22, cameraSize: 20, iconSize: 10 };
      case 'xl':
      default:
        return { boxSize: 76, radius: 38, initialSize: 26, cameraSize: 24, iconSize: 12 };
    }
  };

  const dim = getDimensions();
  const currentImage = previewUri || src;

  return (
    <View style={[styles.container, { width: dim.boxSize, height: dim.boxSize }]}>
      <View
        style={[
          styles.avatarBorder,
          {
            width: dim.boxSize,
            height: dim.boxSize,
            borderRadius: dim.radius,
            borderColor: isPro ? '#f59e0b' : isDark ? '#334155' : '#cbd5e1',
          },
        ]}
      >
        {currentImage ? (
          <Image
            source={{ uri: currentImage }}
            style={[styles.avatarImg, { borderRadius: dim.radius - 2 }]}
          />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              { borderRadius: dim.radius - 2, backgroundColor: '#16a34a' },
            ]}
          >
            <Text style={[styles.avatarInitial, { fontSize: dim.initialSize }]}>
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        )}

        {uploading && (
          <View style={[styles.uploadingOverlay, { borderRadius: dim.radius - 2 }]}>
            <ActivityIndicator size='small' color='#ffffff' />
          </View>
        )}
      </View>

      {editable && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.cameraBtn,
            {
              width: dim.cameraSize,
              height: dim.cameraSize,
              borderRadius: dim.cameraSize / 2,
              borderColor: isDark ? '#111827' : '#ffffff',
            },
          ]}
          onPress={handlePickAndCropImage}
          disabled={uploading}
        >
          <Camera size={dim.iconSize} color='#ffffff' strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBorder: {
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontFamily: Fonts.headingBold,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});

