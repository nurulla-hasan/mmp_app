import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  User,
  Phone,
  MessageCircle,
  MapPin,
  Copy,
  ChevronDown,
  Check,
  Camera,
} from 'lucide-react-native';
import { Input } from '../ui/input';
import { AuthService } from '../../services/auth-service';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { SuccessToast, ErrorToast } from '../../lib/utils';
import type { TAuthUser } from '../../types/auth';

interface DistrictOption {
  value: string;
  label: string;
  upazilas: string[];
}

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  user: TAuthUser;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  visible,
  onClose,
  user,
}) => {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isDark = theme === 'dark';
  const { refreshUser } = useAuthStore();

  const [name, setName] = useState(user.name || '');
  const [imageUrl, setImageUrl] = useState(user.imageUrl || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsappNumber || '');
  const [district, setDistrict] = useState(user.district || '');
  const [upazila, setUpazila] = useState(user.upazila || '');
  const [loading, setLoading] = useState(false);

  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [upazilaPickerOpen, setUpazilaPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(user.name || '');
      setImageUrl(user.imageUrl || '');
      setPhone(user.phone || '');
      setWhatsappNumber(user.whatsappNumber || '');
      setDistrict(user.district || '');
      setUpazila(user.upazila || '');
      loadDistricts();
    }
  }, [visible, user]);

  const loadDistricts = async () => {
    try {
      const res = await AuthService.getDistricts();
      if (res.success && res.data) {
        setDistricts(res.data);
      }
    } catch {
      // Ignore fallback
    }
  };

  const selectedDistrictObj = districts.find(
    (d) => d.label === district || d.value === district
  );
  const availableUpazilas = selectedDistrictObj?.upazilas || [];

  const copyPhoneToWhatsapp = () => {
    if (phone.trim()) {
      setWhatsappNumber(phone.trim());
      SuccessToast('মোবাইল নম্বর WhatsApp-এ কপি করা হয়েছে');
    }
  };

  const handlePickAndCropImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('অনুমতি প্রয়োজন', 'গ্যালারি থেকে ছবি নিতে ফটো লাইব্রেরির অনুমতি দিন।');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true, // Native square cropper!
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

      const asset = pickerResult.assets[0];
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName || 'profile.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);

      setLoading(true);
      const res = await AuthService.uploadProfileImage(formData);
      if (res.success && res.data) {
        setImageUrl(res.data.imageUrl || asset.uri);
        await refreshUser();
        SuccessToast('প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে!');
      } else {
        ErrorToast(res.message || 'ছবি আপলোড করা যায়নি।');
      }
    } catch (err: any) {
      ErrorToast(err?.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      ErrorToast('পূর্ণ নাম ফাঁকা রাখা যাবে না।');
      return;
    }

    try {
      setLoading(true);
      const res = await AuthService.updateMe({
        name: name.trim(),
        imageUrl: imageUrl.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsappNumber: whatsappNumber.trim() || undefined,
        district: district.trim() || undefined,
        upazila: upazila.trim() || undefined,
      });

      if (res.success) {
        await refreshUser();
        SuccessToast('প্রোফাইল সফলভাবে আপডেট হয়েছে!');
        onClose();
      } else {
        ErrorToast(res.message || 'প্রোফাইল আপডেট করা যায়নি।');
      }
    } catch (err: any) {
      ErrorToast(err?.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#111827' : '#ffffff',
              borderColor: isDark ? '#1f2937' : '#e2e8f0',
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>প্রোফাইল সম্পাদনা</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                আপনার ব্যক্তিগত পরিচয়, যোগাযোগের নম্বর ও এলাকা আপডেট করুন।
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps='handled'
          >
            {/* 1. Avatar Preview & Image URL Row */}
            <View
              style={[
                styles.avatarPreviewBox,
                {
                  backgroundColor: isDark ? '#131b2e' : '#f8fafc',
                  borderColor: isDark ? '#1f2937' : '#e2e8f0',
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.avatarPickerWrapper}
                onPress={handlePickAndCropImage}
                disabled={loading}
              >
                <View style={[styles.avatarPreviewImgBorder, user.isSubscribed && { borderColor: '#f59e0b' }]}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: '#16a34a' }]}>
                      <Text style={styles.avatarFallbackText}>
                        {name ? name.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.avatarCameraBadge}>
                  <Camera size={10} color='#ffffff' strokeWidth={2.5} />
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Input
                  label='প্রোফাইল ছবির লিংক (Image URL)'
                  placeholder='https://example.com/photo.jpg'
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  autoCapitalize='none'
                />
              </View>
            </View>

            {/* 2. Full Name */}
            <Input
              label='পূর্ণ নাম'
              placeholder='আপনার নাম লিখুন'
              value={name}
              onChangeText={setName}
              leftIcon={<User size={15} color={colors.textMuted} />}
            />

            {/* 3. Phone */}
            <Input
              label='মোবাইল নম্বর'
              placeholder='01XXXXXXXXX'
              keyboardType='phone-pad'
              value={phone}
              onChangeText={setPhone}
              leftIcon={<Phone size={15} color={colors.textMuted} />}
            />

            {/* 4. WhatsApp Number with Copy Action Header */}
            <View style={{ marginBottom: 10 }}>
              <View style={styles.whatsappHeaderRow}>
                <Text style={[styles.inputLabelText, { color: colors.text }]}>
                  হোয়াটসঅ্যাপ নম্বর
                </Text>
                {phone ? (
                  <TouchableOpacity
                    style={styles.copyPhoneBtn}
                    onPress={copyPhoneToWhatsapp}
                    activeOpacity={0.7}
                  >
                    <Copy size={11} color='#16a34a' />
                    <Text style={styles.copyPhoneText}>মোবাইল নম্বর কপি করুন</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Input
                placeholder='01XXXXXXXXX'
                keyboardType='phone-pad'
                value={whatsappNumber}
                onChangeText={setWhatsappNumber}
                leftIcon={<MessageCircle size={15} color={colors.textMuted} />}
              />
            </View>

            {/* 5. District & Upazila Pickers */}
            <View style={styles.pickerRow}>
              {/* District Select */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabelText, { color: colors.text, marginBottom: 4 }]}>
                  জেলা
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.pickerTrigger,
                    {
                      backgroundColor: isDark ? '#111827' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                    },
                  ]}
                  onPress={() => setDistrictPickerOpen(true)}
                >
                  <Text
                    style={[
                      styles.pickerTriggerText,
                      { color: district ? colors.text : colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {district || 'জেলা নির্বাচন করুন'}
                  </Text>
                  <ChevronDown size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Upazila Select */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabelText, { color: colors.text, marginBottom: 4 }]}>
                  উপজেলা / থানা
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.pickerTrigger,
                    {
                      backgroundColor: isDark ? '#111827' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      opacity: !district ? 0.6 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (district) setUpazilaPickerOpen(true);
                    else ErrorToast('আগে জেলা নির্বাচন করুন।');
                  }}
                  disabled={!district}
                >
                  <Text
                    style={[
                      styles.pickerTriggerText,
                      { color: upazila ? colors.text : colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {upazila || (district ? 'উপজেলা নির্বাচন' : 'আগে জেলা নির্বাচন')}
                  </Text>
                  <ChevronDown size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons (Cancel / Save) */}
            <View style={[styles.modalActions, { borderTopColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: isDark ? '#1f2937' : '#f1f5f9',
                    borderColor: isDark ? '#374151' : '#cbd5e1',
                  },
                ]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>বাতিল</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={loading}
              >
                <Check size={14} color='#ffffff' />
                <Text style={styles.saveBtnText}>
                  {loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* District Picker Submodal */}
      <Modal
        visible={districtPickerOpen}
        transparent
        animationType='slide'
        onRequestClose={() => setDistrictPickerOpen(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View
            style={[
              styles.pickerModalContent,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: isDark ? '#1f2937' : '#e2e8f0',
              },
            ]}
          >
            <View style={[styles.pickerModalHeader, { borderBottomColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>জেলা নির্বাচন করুন</Text>
              <TouchableOpacity onPress={() => setDistrictPickerOpen(false)}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              {districts.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: isDark ? '#1f2937' : '#f1f5f9' },
                    district === d.label && { backgroundColor: isDark ? '#131b2e' : '#f0fdf4' },
                  ]}
                  onPress={() => {
                    setDistrict(d.label);
                    setUpazila('');
                    setDistrictPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: district === d.label ? '#16a34a' : colors.text },
                    ]}
                  >
                    {d.label}
                  </Text>
                  {district === d.label && <Check size={14} color='#16a34a' />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Upazila Picker Submodal */}
      <Modal
        visible={upazilaPickerOpen}
        transparent
        animationType='slide'
        onRequestClose={() => setUpazilaPickerOpen(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View
            style={[
              styles.pickerModalContent,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: isDark ? '#1f2937' : '#e2e8f0',
              },
            ]}
          >
            <View style={[styles.pickerModalHeader, { borderBottomColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {district} - উপজেলা নির্বাচন
              </Text>
              <TouchableOpacity onPress={() => setUpazilaPickerOpen(false)}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              {availableUpazilas.map((up, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: isDark ? '#1f2937' : '#f1f5f9' },
                    upazila === up && { backgroundColor: isDark ? '#131b2e' : '#f0fdf4' },
                  ]}
                  onPress={() => {
                    setUpazila(up);
                    setUpazilaPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: upazila === up ? '#16a34a' : colors.text },
                    ]}
                  >
                    {up}
                  </Text>
                  {upazila === up && <Check size={14} color='#16a34a' />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.headingBold,
  },
  modalSubtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    marginTop: 2,
    maxWidth: 240,
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    padding: 14,
  },
  avatarPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatarPickerWrapper: {
    position: 'relative',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#111827',
  },
  avatarPreviewImgBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#334155',
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
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: Fonts.headingBold,
  },
  whatsappHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  inputLabelText: {
    fontSize: 11.5,
    fontFamily: Fonts.sansMedium,
  },
  copyPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  copyPhoneText: {
    color: '#16a34a',
    fontSize: 10.5,
    fontFamily: Fonts.sansMedium,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 38,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 9,
  },
  pickerTriggerText: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.sansMedium,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontFamily: Fonts.sansMedium,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingBottom: 24,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
  },
});

