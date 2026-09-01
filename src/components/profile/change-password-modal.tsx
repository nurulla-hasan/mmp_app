import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Lock, ShieldCheck } from 'lucide-react-native';
import { Input } from '../ui/input';
import { AuthService } from '../../services/auth-service';
import { useThemeStore } from '../../stores/theme-store';
import { Fonts } from '../../constants/typography';
import { Colors } from '../../constants/colors';
import { SuccessToast, ErrorToast } from '../../lib/utils';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  hasPassword?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
  hasPassword = true,
}) => {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ old?: string; new?: string; confirm?: string }>({});

  const validate = () => {
    const errs: { old?: string; new?: string; confirm?: string } = {};

    if (hasPassword && !oldPassword) {
      errs.old = 'বর্তমান পাসওয়ার্ড লিখুন।';
    }

    if (!newPassword || newPassword.length < 8) {
      errs.new = 'কমপক্ষে ৮ অক্ষরের নতুন পাসওয়ার্ড দিন।';
    }

    if (newPassword !== confirmPassword) {
      errs.confirm = 'পাসওয়ার্ড দুটি মিলছে না।';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await AuthService.changePassword({
        oldPassword: hasPassword ? oldPassword.trim() : undefined,
        newPassword: newPassword.trim(),
      });

      if (res.success) {
        SuccessToast(
          hasPassword
            ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।'
            : 'পাসওয়ার্ড সফলভাবে সেট করা হয়েছে।'
        );
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setErrors({});
        onClose();
      } else {
        ErrorToast(res.message || 'পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      ErrorToast(err?.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const title = hasPassword ? 'পাসওয়ার্ড পরিবর্তন' : 'পাসওয়ার্ড সেট করুন';
  const description = hasPassword
    ? 'আপনার অ্যাকাউন্টের সুরক্ষার জন্য শক্তিশালী ও নিরাপদ পাসওয়ার্ড ব্যবহার করুন।'
    : 'আপনার অ্যাকাউন্টের সাথে একটি নতুন পাসওয়ার্ড যুক্ত করুন।';

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
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                {description}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
            {hasPassword && (
              <Input
                label='বর্তমান পাসওয়ার্ড'
                placeholder='বর্তমান পাসওয়ার্ড লিখুন'
                isPassword
                value={oldPassword}
                onChangeText={setOldPassword}
                error={errors.old}
                leftIcon={<Lock size={15} color={colors.textMuted} />}
              />
            )}

            <Input
              label={hasPassword ? 'নতুন পাসওয়ার্ড' : 'পাসওয়ার্ড'}
              placeholder='কমপক্ষে ৮ অক্ষরের নতুন পাসওয়ার্ড'
              isPassword
              value={newPassword}
              onChangeText={setNewPassword}
              error={errors.new}
              leftIcon={<Lock size={15} color={colors.textMuted} />}
            />

            <Input
              label='নতুন পাসওয়ার্ড নিশ্চিত করুন'
              placeholder='নতুন পাসওয়ার্ডটি আবার লিখুন'
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirm}
              leftIcon={<Lock size={15} color={colors.textMuted} />}
            />

            {/* Actions */}
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
                <ShieldCheck size={14} color='#ffffff' />
                <Text style={styles.saveBtnText}>
                  {loading
                    ? (hasPassword ? 'পরিবর্তন হচ্ছে...' : 'সংরক্ষণ হচ্ছে...')
                    : (hasPassword ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'পাসওয়ার্ড সেট করুন')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    lineHeight: 14,
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    padding: 14,
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
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontFamily: Fonts.sansMedium,
  },
});

