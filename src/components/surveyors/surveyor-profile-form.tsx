import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, CheckCircle2, MapPin, Square, Wrench } from 'lucide-react-native';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import { ErrorToast } from '../../lib/utils';
import type {
  DistrictOption,
  SurveyorApplicationPayload,
  TSurveyorProfile,
  TSurveyorService,
} from '../../types/surveyor';

type DraftService = {
  serviceId: string;
  name: string;
  startingPrice: string;
};

type DraftArea = {
  district: string;
  upazilas: string[];
};

type Props = {
  mode: 'apply' | 'edit';
  districts: DistrictOption[];
  services: TSurveyorService[];
  initialProfile?: TSurveyorProfile;
  pending?: boolean;
  onSubmit: (payload: SurveyorApplicationPayload) => void;
};

function SelectChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? `${colors.primary}14` : colors.background,
        },
      ]}
    >
      {selected ? <Check size={11} color={colors.primary} /> : null}
      <Text style={[styles.chipText, { color: selected ? colors.primary : colors.textMuted }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function SurveyorProfileForm({
  mode,
  districts,
  services,
  initialProfile,
  pending,
  onSubmit,
}: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const [headline, setHeadline] = useState('');
  const [experienceYears, setExperienceYears] = useState(mode === 'apply' ? '1' : '0');
  const [bio, setBio] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [selectedServices, setSelectedServices] = useState<DraftService[]>([]);
  const [serviceAreas, setServiceAreas] = useState<DraftArea[]>([]);
  const [terms, setTerms] = useState(mode === 'edit');

  useEffect(() => {
    if (!initialProfile) return;

    setHeadline(initialProfile.headline || '');
    setExperienceYears(String(initialProfile.experienceYears ?? 0));
    setBio(initialProfile.bio || '');
    setCertificateUrl(initialProfile.certificateUrl || '');
    setSelectedServices(
      (initialProfile.surveyorServices ?? []).map((item) => ({
        serviceId: item.serviceId,
        name: item.service.name,
        startingPrice: String(item.startingPrice ?? 0),
      }))
    );
    setServiceAreas(
      (initialProfile.serviceAreas ?? []).map((area) => ({
        district: area.district,
        upazilas: [...area.upazilas],
      }))
    );
    setTerms(true);
  }, [initialProfile]);

  const selectedServiceIds = useMemo(
    () => new Set(selectedServices.map((item) => item.serviceId)),
    [selectedServices]
  );

  const isDistrictSelected = (district: DistrictOption) =>
    serviceAreas.some(
      (area) => area.district === district.label || area.district === district.value
    );

  const toggleService = (service: TSurveyorService) => {
    setSelectedServices((current) =>
      current.some((item) => item.serviceId === service.id)
        ? current.filter((item) => item.serviceId !== service.id)
        : [
            ...current,
            {
              serviceId: service.id,
              name: service.name,
              // Web defaults a newly selected service to ৳1000.
              startingPrice: '1000',
            },
          ]
    );
  };

  const updatePrice = (serviceId: string, value: string) => {
    setSelectedServices((current) =>
      current.map((item) =>
        item.serviceId === serviceId
          ? { ...item, startingPrice: value.replace(/[^0-9.]/g, '') }
          : item
      )
    );
  };

  const toggleDistrict = (district: DistrictOption) => {
    setServiceAreas((current) => {
      const exists = current.some(
        (area) => area.district === district.label || area.district === district.value
      );

      if (exists) {
        return current.filter(
          (area) => area.district !== district.label && area.district !== district.value
        );
      }

      // Mirror web behavior: persist the display name, not the catalog slug,
      // and start with all upazilas selected for the newly added district.
      return [
        ...current,
        {
          district: district.label,
          upazilas: [...district.upazilas],
        },
      ];
    });
  };

  const toggleUpazila = (districtName: string, upazila: string) => {
    setServiceAreas((current) =>
      current.map((area) => {
        if (area.district !== districtName) return area;

        return {
          ...area,
          upazilas: area.upazilas.includes(upazila)
            ? area.upazilas.filter((item) => item !== upazila)
            : [...area.upazilas, upazila],
        };
      })
    );
  };

  const submit = () => {
    const cleanHeadline = headline.trim();
    const years = Number(experienceYears);

    if (cleanHeadline.length < 3) {
      ErrorToast('পেশাদার শিরোনাম কমপক্ষে ৩ অক্ষরের হতে হবে।');
      return;
    }
    if (!Number.isInteger(years) || years < 0 || years > 50) {
      ErrorToast('অভিজ্ঞতার বছর ০–৫০ এর মধ্যে পূর্ণ সংখ্যা দিন।');
      return;
    }
    if (bio.length > 1000) {
      ErrorToast('পরিচিতি ১০০০ অক্ষরের বেশি হতে পারবে না।');
      return;
    }
    if (selectedServices.length === 0) {
      ErrorToast('কমপক্ষে একটি সেবা নির্বাচন করুন।');
      return;
    }
    if (serviceAreas.length === 0) {
      ErrorToast('কমপক্ষে একটি সেবার এলাকা নির্বাচন করুন।');
      return;
    }
    if (mode === 'apply' && !terms) {
      ErrorToast('শর্তাবলীতে সম্মতি দেওয়া আবশ্যক।');
      return;
    }

    const normalizedServices = selectedServices.map((item) => ({
      serviceId: item.serviceId,
      startingPrice: Number(item.startingPrice || 0),
    }));

    if (
      normalizedServices.some(
        (item) => !Number.isFinite(item.startingPrice) || item.startingPrice < 0
      )
    ) {
      ErrorToast('সেবার মূল্য সঠিকভাবে দিন।');
      return;
    }

    onSubmit({
      headline: cleanHeadline,
      bio: bio.trim() || undefined,
      experienceYears: years,
      certificateUrl: certificateUrl.trim() || undefined,
      serviceAreas,
      services: normalizedServices,
    });
  };

  return (
    <View style={styles.form}>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>পেশাদার তথ্য</Text>
        <Input
          label='পেশাদার শিরোনাম'
          value={headline}
          onChangeText={setHeadline}
          placeholder='যেমন: অভিজ্ঞ ডিজিটাল ভূমি জরিপকারী'
          maxLength={120}
        />
        <Input
          label='কাজের অভিজ্ঞতা (বছর)'
          value={experienceYears}
          onChangeText={setExperienceYears}
          keyboardType='number-pad'
          placeholder='1'
        />
        <Text style={[styles.label, { color: colors.text }]}>সংক্ষিপ্ত পরিচিতি</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={1000}
          textAlignVertical='top'
          placeholder='আপনার দক্ষতা, অভিজ্ঞতা ও কাজের ধরন সম্পর্কে লিখুন...'
          placeholderTextColor={colors.textMuted}
          style={[
            styles.bioInput,
            {
              color: colors.text,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        />
        <Input
          label='সার্টিফিকেট URL (ঐচ্ছিক)'
          value={certificateUrl}
          onChangeText={setCertificateUrl}
          autoCapitalize='none'
          placeholder='https://...'
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeadingRow}>
          <Wrench size={15} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>সেবাসমূহ ও শুরুর মূল্য</Text>
        </View>
        <Text style={[styles.help, { color: colors.textMuted }]}>
          কমপক্ষে একটি সেবা নির্বাচন করুন এবং প্রতিটির প্রাথমিক শুরুর মূল্য নির্ধারণ করুন।
        </Text>
        <View style={styles.wrap}>
          {services.map((service) => (
            <SelectChip
              key={service.id}
              label={service.name}
              selected={selectedServiceIds.has(service.id)}
              onPress={() => toggleService(service)}
            />
          ))}
        </View>

        {selectedServices.map((service) => (
          <View
            key={service.serviceId}
            style={[
              styles.selectedRow,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={1}>
              {service.name}
            </Text>
            <Input
              value={service.startingPrice}
              onChangeText={(value) => updatePrice(service.serviceId, value)}
              keyboardType='decimal-pad'
              placeholder='1000'
              containerStyle={{ width: 110, marginBottom: 0 }}
            />
          </View>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeadingRow}>
          <MapPin size={15} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>সেবার এলাকা</Text>
        </View>
        <Text style={[styles.help, { color: colors.textMuted }]}>
          এক বা একাধিক জেলা নির্বাচন করুন। নতুন জেলা যোগ করলে ওয়েবের মতো সব উপজেলা শুরুতে নির্বাচিত থাকবে।
        </Text>
        <View style={styles.wrap}>
          {districts.map((district) => (
            <SelectChip
              key={district.value}
              label={district.label}
              selected={isDistrictSelected(district)}
              onPress={() => toggleDistrict(district)}
            />
          ))}
        </View>

        {serviceAreas.map((area) => {
          const district = districts.find(
            (item) => item.label === area.district || item.value === area.district
          );
          const totalUpazilas = district?.upazilas ?? [];
          const allSelected =
            totalUpazilas.length > 0 && area.upazilas.length === totalUpazilas.length;

          return (
            <View
              key={area.district}
              style={[
                styles.areaCard,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <View style={styles.areaHeader}>
                <Text style={[styles.areaTitle, { color: colors.text }]}>
                  {district?.label || area.district}
                </Text>
                <Text style={[styles.help, { color: colors.textMuted }]}>
                  {area.upazilas.length}/{totalUpazilas.length} উপজেলা
                </Text>
              </View>
              <View style={styles.wrap}>
                {totalUpazilas.map((upazila) => (
                  <SelectChip
                    key={upazila}
                    label={upazila}
                    selected={area.upazilas.includes(upazila)}
                    onPress={() => toggleUpazila(area.district, upazila)}
                  />
                ))}
              </View>
              {allSelected ? (
                <Text style={[styles.help, { color: colors.primary }]}>সব উপজেলা নির্বাচিত</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {mode === 'apply' ? (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setTerms((value) => !value)}
          style={styles.termsRow}
        >
          {terms ? (
            <CheckCircle2 size={19} color={colors.primary} />
          ) : (
            <Square size={19} color={colors.textMuted} />
          )}
          <Text style={[styles.termsText, { color: colors.textMuted }]}>
            আমি নিশ্চিত করছি যে প্রদত্ত তথ্য সঠিক এবং প্ল্যাটফর্মের শর্তাবলীতে সম্মত।
          </Text>
        </TouchableOpacity>
      ) : null}

      <Button
        title={mode === 'apply' ? 'আবেদন জমা দিন' : 'পরিবর্তন সংরক্ষণ করুন'}
        size='lg'
        loading={pending}
        onPress={submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  section: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 9 },
  sectionTitle: { fontSize: 13.5, fontFamily: Fonts.headingBold },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11.5, fontFamily: Fonts.sansMedium, marginBottom: -5 },
  bioInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 7,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.sansRegular,
  },
  help: { fontSize: 9.5, lineHeight: 14, fontFamily: Fonts.sansRegular },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chipText: { fontSize: 10, fontFamily: Fonts.sansMedium },
  selectedRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedName: { flex: 1, fontSize: 10.5, fontFamily: Fonts.sansMedium },
  areaCard: { borderWidth: 1, borderRadius: 9, padding: 9, gap: 7 },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  areaTitle: { fontSize: 11, fontFamily: Fonts.headingSemiBold },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: 3 },
  termsText: { flex: 1, fontSize: 10, lineHeight: 15, fontFamily: Fonts.sansRegular },
});