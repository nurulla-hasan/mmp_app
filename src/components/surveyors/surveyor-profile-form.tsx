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

type DraftService = { serviceId: string; name: string; startingPrice: string };
type DraftArea = { district: string; upazilas: string[] };

type Props = {
  mode: 'apply' | 'edit';
  districts: DistrictOption[];
  services: TSurveyorService[];
  initialProfile?: TSurveyorProfile;
  pending?: boolean;
  onSubmit: (payload: SurveyorApplicationPayload) => void;
};

function SelectChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}14` : colors.background }]}
    >
      {selected ? <Check size={11} color={colors.primary} /> : null}
      <Text style={[styles.chipText, { color: selected ? colors.primary : colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SurveyorProfileForm({ mode, districts, services, initialProfile, pending, onSubmit }: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const [headline, setHeadline] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
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
      (initialProfile.serviceAreas ?? []).map((area) => ({ district: area.district, upazilas: [...area.upazilas] }))
    );
    setTerms(true);
  }, [initialProfile]);

  const selectedServiceIds = useMemo(() => new Set(selectedServices.map((item) => item.serviceId)), [selectedServices]);
  const selectedDistricts = useMemo(() => new Set(serviceAreas.map((item) => item.district)), [serviceAreas]);

  const toggleService = (service: TSurveyorService) => {
    setSelectedServices((current) =>
      current.some((item) => item.serviceId === service.id)
        ? current.filter((item) => item.serviceId !== service.id)
        : [...current, { serviceId: service.id, name: service.name, startingPrice: '0' }]
    );
  };

  const updatePrice = (serviceId: string, value: string) => {
    setSelectedServices((current) => current.map((item) => item.serviceId === serviceId ? { ...item, startingPrice: value.replace(/[^0-9.]/g, '') } : item));
  };

  const toggleDistrict = (district: DistrictOption) => {
    setServiceAreas((current) =>
      current.some((area) => area.district === district.value)
        ? current.filter((area) => area.district !== district.value)
        : [...current, { district: district.value, upazilas: [] }]
    );
  };

  const toggleUpazila = (district: string, upazila: string) => {
    setServiceAreas((current) => current.map((area) => {
      if (area.district !== district) return area;
      return {
        ...area,
        upazilas: area.upazilas.includes(upazila)
          ? area.upazilas.filter((item) => item !== upazila)
          : [...area.upazilas, upazila],
      };
    }));
  };

  const submit = () => {
    const cleanHeadline = headline.trim();
    const years = Number(experienceYears);
    if (cleanHeadline.length < 3) return ErrorToast('পেশাদার শিরোনাম কমপক্ষে ৩ অক্ষরের হতে হবে।');
    if (!Number.isInteger(years) || years < 0 || years > 50) return ErrorToast('অভিজ্ঞতার বছর ০–৫০ এর মধ্যে পূর্ণ সংখ্যা দিন।');
    if (selectedServices.length === 0) return ErrorToast('কমপক্ষে একটি সেবা নির্বাচন করুন।');
    if (serviceAreas.length === 0) return ErrorToast('কমপক্ষে একটি সেবার এলাকা নির্বাচন করুন।');
    if (mode === 'apply' && !terms) return ErrorToast('শর্তাবলীতে সম্মতি দেওয়া আবশ্যক।');

    const normalizedServices = selectedServices.map((item) => ({
      serviceId: item.serviceId,
      startingPrice: Number(item.startingPrice || 0),
    }));
    if (normalizedServices.some((item) => !Number.isFinite(item.startingPrice) || item.startingPrice < 0)) {
      return ErrorToast('সেবার মূল্য সঠিকভাবে দিন।');
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
        <Input label='পেশাদার শিরোনাম' value={headline} onChangeText={setHeadline} placeholder='যেমন: অভিজ্ঞ ডিজিটাল ভূমি জরিপকারী' maxLength={120} />
        <Input label='কাজের অভিজ্ঞতা (বছর)' value={experienceYears} onChangeText={setExperienceYears} keyboardType='number-pad' placeholder='0' />
        <Text style={[styles.label, { color: colors.text }]}>সংক্ষিপ্ত পরিচিতি</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={1000}
          textAlignVertical='top'
          placeholder='আপনার দক্ষতা, অভিজ্ঞতা ও কাজের ধরন সম্পর্কে লিখুন...'
          placeholderTextColor={colors.textMuted}
          style={[styles.bioInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
        />
        <Input label='সার্টিফিকেট URL (ঐচ্ছিক)' value={certificateUrl} onChangeText={setCertificateUrl} autoCapitalize='none' placeholder='https://...' />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeadingRow}><Wrench size={15} color={colors.primary} /><Text style={[styles.sectionTitle, { color: colors.text }]}>সেবাসমূহ ও শুরুর মূল্য</Text></View>
        <Text style={[styles.help, { color: colors.textMuted }]}>কমপক্ষে একটি সেবা নির্বাচন করুন। ওয়েবের মতো service ID + starting price পাঠানো হবে।</Text>
        <View style={styles.wrap}>
          {services.map((service) => <SelectChip key={service.id} label={service.name} selected={selectedServiceIds.has(service.id)} onPress={() => toggleService(service)} />)}
        </View>
        {selectedServices.map((service) => (
          <View key={service.serviceId} style={[styles.selectedRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={1}>{service.name}</Text>
            <Input
              value={service.startingPrice}
              onChangeText={(value) => updatePrice(service.serviceId, value)}
              keyboardType='decimal-pad'
              placeholder='0'
              containerStyle={{ width: 110, marginBottom: 0 }}
            />
          </View>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeadingRow}><MapPin size={15} color={colors.primary} /><Text style={[styles.sectionTitle, { color: colors.text }]}>সেবার এলাকা</Text></View>
        <Text style={[styles.help, { color: colors.textMuted }]}>এক বা একাধিক জেলা নির্বাচন করুন, তারপর প্রয়োজন হলে উপজেলা বাছুন। উপজেলা ফাঁকা থাকলে পুরো জেলা ধরা হবে।</Text>
        <View style={styles.wrap}>
          {districts.map((district) => <SelectChip key={district.value} label={district.label} selected={selectedDistricts.has(district.value)} onPress={() => toggleDistrict(district)} />)}
        </View>
        {serviceAreas.map((area) => {
          const district = districts.find((item) => item.value === area.district);
          return (
            <View key={area.district} style={[styles.areaCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.areaTitle, { color: colors.text }]}>{district?.label || area.district}</Text>
              <View style={styles.wrap}>
                {(district?.upazilas ?? []).map((upazila) => <SelectChip key={upazila} label={upazila} selected={area.upazilas.includes(upazila)} onPress={() => toggleUpazila(area.district, upazila)} />)}
              </View>
              {(district?.upazilas.length ?? 0) > 0 && area.upazilas.length === 0 ? <Text style={[styles.help, { color: colors.textMuted }]}>সমগ্র জেলা নির্বাচিত</Text> : null}
            </View>
          );
        })}
      </View>

      {mode === 'apply' ? (
        <TouchableOpacity activeOpacity={0.75} onPress={() => setTerms((value) => !value)} style={styles.termsRow}>
          {terms ? <CheckCircle2 size={19} color={colors.primary} /> : <Square size={19} color={colors.textMuted} />}
          <Text style={[styles.termsText, { color: colors.textMuted }]}>আমি নিশ্চিত করছি যে প্রদত্ত তথ্য সঠিক এবং প্ল্যাটফর্মের শর্তাবলীতে সম্মত।</Text>
        </TouchableOpacity>
      ) : null}

      <Button title={mode === 'apply' ? 'আবেদন জমা দিন' : 'পরিবর্তন সংরক্ষণ করুন'} size='lg' loading={pending} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  section: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 9 },
  sectionTitle: { fontSize: 13.5, fontFamily: Fonts.headingBold },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11.5, fontFamily: Fonts.sansMedium, marginBottom: -5 },
  bioInput: { minHeight: 100, borderWidth: 1, borderRadius: 7, padding: 10, fontSize: 12, lineHeight: 18, fontFamily: Fonts.sansRegular },
  help: { fontSize: 9.5, lineHeight: 14, fontFamily: Fonts.sansRegular },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 },
  chipText: { fontSize: 10, fontFamily: Fonts.sansMedium },
  selectedRow: { borderWidth: 1, borderRadius: 8, padding: 7, flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedName: { flex: 1, fontSize: 10.5, fontFamily: Fonts.sansMedium },
  areaCard: { borderWidth: 1, borderRadius: 9, padding: 9, gap: 7 },
  areaTitle: { fontSize: 11, fontFamily: Fonts.headingSemiBold },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: 3 },
  termsText: { flex: 1, fontSize: 10, lineHeight: 15, fontFamily: Fonts.sansRegular },
});
