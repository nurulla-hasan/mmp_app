import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'lucide-react-native';
import { ProAvatarRing } from '../ui/pro-avatar-ring';
import { useUploadAvatar } from '../../hooks/mutations/use-profile-mutations';
import { useThemeStore } from '../../stores/theme-store';
import { Fonts } from '../../constants/typography';

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
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const { mutate: uploadAvatar, isPending: uploading } = useUploadAvatar();

  const handlePickAndCropImage = () => {
    if (!editable || uploading) return;

    uploadAvatar(undefined, {
      onSuccess: (res: any) => {
        if (res?.success && res?.data?.imageUrl) {
          setPreviewUri(res.data.imageUrl);
        }
      },
      onError: () => {
        setPreviewUri(null);
      },
    });
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
      <ProAvatarRing size={dim.boxSize} isPro={isPro}>
        <View
          style={[
            styles.avatarBorder,
            {
              width: isPro ? dim.boxSize - 8 : dim.boxSize,
              height: isPro ? dim.boxSize - 8 : dim.boxSize,
              borderRadius: dim.radius,
              borderColor: isDark ? '#334155' : '#cbd5e1',
              borderWidth: isPro ? 0 : 1.5,
            },
          ]}
        >
          {currentImage ? (
            <Image
              source={{ uri: currentImage }}
              style={[styles.avatarImg, { borderRadius: dim.radius }]}
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                { borderRadius: dim.radius, backgroundColor: '#16a34a' },
              ]}
            >
              <Text style={[styles.avatarInitial, { fontSize: dim.initialSize }]}>
                {name ? name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}

          {uploading && (
            <View style={[styles.uploadingOverlay, { borderRadius: dim.radius }]}>
              <ActivityIndicator size='small' color='#ffffff' />
            </View>
          )}
        </View>
      </ProAvatarRing>

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
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#16a34a',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    zIndex: 20,
  },
});
