import { convertToSqFeet, convertFromSqFeet, type LandUnitKey } from './calculations';

export type HeirResult = {
  id: string;
  relation: string;
  relationEn: string;
  count: number;
  individualShareFraction: string;
  individualPercentage: number;
  totalPercentage: number;
  individualLand: number;
  totalLand: number;
  individualSqFeet: number;
  note?: string;
};

export type FaraezCalculationInput = {
  deceasedGender: 'male' | 'female';
  totalLand: number;
  unit: LandUnitKey;
  wivesCount: number; // 0-4 (only if deceased is male)
  husband: boolean;   // only if deceased is female
  father: boolean;
  mother: boolean;
  sonsCount: number;
  daughtersCount: number;
  brothersCount: number;
  sistersCount: number;
};

export type FaraezCalculationResult = {
  heirs: HeirResult[];
  totalDistributedPercentage: number;
  totalDistributedLand: number;
  remainingLand: number;
  isAulApplied: boolean;
  isRaddApplied: boolean;
  formulaSummary: string;
};

export function calculateIslamicInheritance(
  input: FaraezCalculationInput
): FaraezCalculationResult {
  const {
    deceasedGender,
    totalLand,
    unit,
    wivesCount,
    husband,
    father,
    mother,
    sonsCount,
    daughtersCount,
    brothersCount,
    sistersCount,
  } = input;

  const totalSqFeet = convertToSqFeet(totalLand, unit);
  const heirs: HeirResult[] = [];

  const hasChildren = sonsCount > 0 || daughtersCount > 0;
  const hasMultipleSiblings = brothersCount + sistersCount >= 2;

  // Track raw shares
  let spouseShare = 0;
  let motherShare = 0;
  let fatherFixedShare = 0;
  let daughtersFixedShare = 0;

  // 1. Spouse Share
  if (deceasedGender === 'male' && wivesCount > 0) {
    spouseShare = hasChildren ? 1 / 8 : 1 / 4;
  } else if (deceasedGender === 'female' && husband) {
    spouseShare = hasChildren ? 1 / 4 : 1 / 2;
  }

  // 2. Mother Share
  if (mother) {
    motherShare = hasChildren || hasMultipleSiblings ? 1 / 6 : 1 / 3;
  }

  // 3. Father Fixed Share
  if (father) {
    if (sonsCount > 0) {
      fatherFixedShare = 1 / 6;
    } else if (daughtersCount > 0) {
      fatherFixedShare = 1 / 6;
    }
  }

  // 4. Daughters Fixed Share (if no sons)
  if (sonsCount === 0 && daughtersCount > 0) {
    daughtersFixedShare = daughtersCount === 1 ? 1 / 2 : 2 / 3;
  }

  // Total Quranic fixed shares
  const fixedTotal = spouseShare + motherShare + fatherFixedShare + daughtersFixedShare;
  let isAul = false;
  let isRadd = false;

  // Case A: Total fixed shares exceed 1 (Aul / আউল)
  if (fixedTotal > 1) {
    isAul = true;
    const factor = 1 / fixedTotal;

    if (deceasedGender === 'male' && wivesCount > 0) {
      const adjusted = spouseShare * factor;
      heirs.push({
        id: 'wife',
        relation: wivesCount > 1 ? `স্ত্রী (${wivesCount} জন)` : 'স্ত্রী',
        relationEn: 'Wife',
        count: wivesCount,
        individualShareFraction: `${(hasChildren ? '১/৮' : '১/৪')} (আউল সমন্বিত)`,
        individualPercentage: (adjusted / wivesCount) * 100,
        totalPercentage: adjusted * 100,
        individualLand: (totalLand * adjusted) / wivesCount,
        totalLand: totalLand * adjusted,
        individualSqFeet: (totalSqFeet * adjusted) / wivesCount,
        note: `${wivesCount} জনের মধ্যে সমান বণ্টন`,
      });
    } else if (deceasedGender === 'female' && husband) {
      const adjusted = spouseShare * factor;
      heirs.push({
        id: 'husband',
        relation: 'স্বামী',
        relationEn: 'Husband',
        count: 1,
        individualShareFraction: `${(hasChildren ? '১/৪' : '১/২')} (আউল সমন্বিত)`,
        individualPercentage: adjusted * 100,
        totalPercentage: adjusted * 100,
        individualLand: totalLand * adjusted,
        totalLand: totalLand * adjusted,
        individualSqFeet: totalSqFeet * adjusted,
      });
    }

    if (mother) {
      const adjusted = motherShare * factor;
      heirs.push({
        id: 'mother',
        relation: 'মাতা',
        relationEn: 'Mother',
        count: 1,
        individualShareFraction: '১/৬ (আউল সমন্বিত)',
        individualPercentage: adjusted * 100,
        totalPercentage: adjusted * 100,
        individualLand: totalLand * adjusted,
        totalLand: totalLand * adjusted,
        individualSqFeet: totalSqFeet * adjusted,
      });
    }

    if (father && fatherFixedShare > 0) {
      const adjusted = fatherFixedShare * factor;
      heirs.push({
        id: 'father',
        relation: 'পিতা',
        relationEn: 'Father',
        count: 1,
        individualShareFraction: '১/৬ (আউল সমন্বিত)',
        individualPercentage: adjusted * 100,
        totalPercentage: adjusted * 100,
        individualLand: totalLand * adjusted,
        totalLand: totalLand * adjusted,
        individualSqFeet: totalSqFeet * adjusted,
      });
    }

    if (daughtersCount > 0 && sonsCount === 0) {
      const adjusted = daughtersFixedShare * factor;
      heirs.push({
        id: 'daughter',
        relation: daughtersCount > 1 ? `কন্যা (${daughtersCount} জন)` : 'কন্যা',
        relationEn: 'Daughter',
        count: daughtersCount,
        individualShareFraction: `${daughtersCount === 1 ? '১/২' : '২/৩'} (আউল সমন্বিত)`,
        individualPercentage: (adjusted / daughtersCount) * 100,
        totalPercentage: adjusted * 100,
        individualLand: (totalLand * adjusted) / daughtersCount,
        totalLand: totalLand * adjusted,
        individualSqFeet: (totalSqFeet * adjusted) / daughtersCount,
        note: `${daughtersCount} জনের মধ্যে সমান বণ্টন`,
      });
    }
  } else {
    // Normal Distribution or Asaba
    let remainder = 1 - (spouseShare + motherShare + fatherFixedShare + daughtersFixedShare);

    // Add Spouse
    if (deceasedGender === 'male' && wivesCount > 0) {
      heirs.push({
        id: 'wife',
        relation: wivesCount > 1 ? `স্ত্রী (${wivesCount} জন)` : 'স্ত্রী',
        relationEn: 'Wife',
        count: wivesCount,
        individualShareFraction: hasChildren ? '১/৮ (১২.৫%)' : '১/৪ (২৫%)',
        individualPercentage: (spouseShare / wivesCount) * 100,
        totalPercentage: spouseShare * 100,
        individualLand: (totalLand * spouseShare) / wivesCount,
        totalLand: totalLand * spouseShare,
        individualSqFeet: (totalSqFeet * spouseShare) / wivesCount,
        note: `${wivesCount} জনের মধ্যে সমান বণ্টন`,
      });
    } else if (deceasedGender === 'female' && husband) {
      heirs.push({
        id: 'husband',
        relation: 'স্বামী',
        relationEn: 'Husband',
        count: 1,
        individualShareFraction: hasChildren ? '১/৪ (২৫%)' : '১/২ (৫০%)',
        individualPercentage: spouseShare * 100,
        totalPercentage: spouseShare * 100,
        individualLand: totalLand * spouseShare,
        totalLand: totalLand * spouseShare,
        individualSqFeet: totalSqFeet * spouseShare,
      });
    }

    // Add Mother
    let actualMotherShare = motherShare;
    if (mother && !hasChildren && !hasMultipleSiblings && father && spouseShare > 0) {
      // Umariyyatan case: Mother gets 1/3 of remainder after spouse
      actualMotherShare = (1 - spouseShare) / 3;
    }

    // Add Mother
    if (mother) {
      heirs.push({
        id: 'mother',
        relation: 'মাতা',
        relationEn: 'Mother',
        count: 1,
        individualShareFraction: hasChildren || hasMultipleSiblings ? '১/৬ (১৬.৬৭%)' : '১/৩ (৩৩.৩৩%)',
        individualPercentage: actualMotherShare * 100,
        totalPercentage: actualMotherShare * 100,
        individualLand: totalLand * actualMotherShare,
        totalLand: totalLand * actualMotherShare,
        individualSqFeet: totalSqFeet * actualMotherShare,
      });
      remainder = 1 - spouseShare - actualMotherShare - fatherFixedShare - daughtersFixedShare;
    }

    // If Sons exist: Sons & Daughters take all remainder (2 : 1)
    if (sonsCount > 0) {
      if (father) {
        heirs.push({
          id: 'father',
          relation: 'পিতা',
          relationEn: 'Father',
          count: 1,
          individualShareFraction: '১/৬ (১৬.৬৭%)',
          individualPercentage: (1 / 6) * 100,
          totalPercentage: (1 / 6) * 100,
          individualLand: totalLand * (1 / 6),
          totalLand: totalLand * (1 / 6),
          individualSqFeet: totalSqFeet * (1 / 6),
          note: 'সন্তানের উপস্থিতিতে নির্ধারিত ১/৬ অংশ',
        });
      }

      const totalShares = sonsCount * 2 + daughtersCount;
      const sonTotalShare = remainder * ((sonsCount * 2) / totalShares);
      const daughterTotalShare = daughtersCount > 0 ? remainder * (daughtersCount / totalShares) : 0;

      heirs.push({
        id: 'son',
        relation: sonsCount > 1 ? `পুত্র (${sonsCount} জন)` : 'পুত্র',
        relationEn: 'Son',
        count: sonsCount,
        individualShareFraction: 'আসাবা (২ অংশ)',
        individualPercentage: (sonTotalShare / sonsCount) * 100,
        totalPercentage: sonTotalShare * 100,
        individualLand: (totalLand * sonTotalShare) / sonsCount,
        totalLand: totalLand * sonTotalShare,
        individualSqFeet: (totalSqFeet * sonTotalShare) / sonsCount,
        note: 'কন্যার দ্বিগুণ অংশ (২:১ অনুপাত)',
      });

      if (daughtersCount > 0) {
        heirs.push({
          id: 'daughter',
          relation: daughtersCount > 1 ? `কন্যা (${daughtersCount} জন)` : 'কন্যা',
          relationEn: 'Daughter',
          count: daughtersCount,
          individualShareFraction: 'আসাবা (১ অংশ)',
          individualPercentage: (daughterTotalShare / daughtersCount) * 100,
          totalPercentage: daughterTotalShare * 100,
          individualLand: (totalLand * daughterTotalShare) / daughtersCount,
          totalLand: totalLand * daughterTotalShare,
          individualSqFeet: (totalSqFeet * daughterTotalShare) / daughtersCount,
          note: 'পুত্রের অর্ধেক অংশ (২:১ অনুপাত)',
        });
      }
    } else if (daughtersCount > 0 && sonsCount === 0) {
      // Only Daughters
      heirs.push({
        id: 'daughter',
        relation: daughtersCount > 1 ? `কন্যা (${daughtersCount} জন)` : 'কন্যা',
        relationEn: 'Daughter',
        count: daughtersCount,
        individualShareFraction: daughtersCount === 1 ? '১/২ (৫০%)' : '২/৩ (৬৬.৬৭%)',
        individualPercentage: (daughtersFixedShare / daughtersCount) * 100,
        totalPercentage: daughtersFixedShare * 100,
        individualLand: (totalLand * daughtersFixedShare) / daughtersCount,
        totalLand: totalLand * daughtersFixedShare,
        individualSqFeet: (totalSqFeet * daughtersFixedShare) / daughtersCount,
        note: `${daughtersCount} জনের মধ্যে সমান বণ্টন`,
      });

      if (father) {
        // Father gets fixed 1/6 + any remaining surplus as Asaba
        const fatherTotal = fatherFixedShare + remainder;
        heirs.push({
          id: 'father',
          relation: 'পিতা',
          relationEn: 'Father',
          count: 1,
          individualShareFraction: `১/৬ + অবশিষ্টাংশ (${(fatherTotal * 100).toFixed(2)}%)`,
          individualPercentage: fatherTotal * 100,
          totalPercentage: fatherTotal * 100,
          individualLand: totalLand * fatherTotal,
          totalLand: totalLand * fatherTotal,
          individualSqFeet: totalSqFeet * fatherTotal,
          note: '১/৬ নির্ধারিত অংশ + আসাবা হিসেবে বাকি অংশ',
        });
      } else if (brothersCount > 0 || sistersCount > 0) {
        // Brothers/Sisters get remaining as Asaba
        const sibShares = brothersCount * 2 + sistersCount;
        if (brothersCount > 0) {
          const brShare = remainder * ((brothersCount * 2) / sibShares);
          heirs.push({
            id: 'brother',
            relation: brothersCount > 1 ? `ভাই (${brothersCount} জন)` : 'ভাই',
            relationEn: 'Brother',
            count: brothersCount,
            individualShareFraction: 'আসাবা',
            individualPercentage: (brShare / brothersCount) * 100,
            totalPercentage: brShare * 100,
            individualLand: (totalLand * brShare) / brothersCount,
            totalLand: totalLand * brShare,
            individualSqFeet: (totalSqFeet * brShare) / brothersCount,
          });
        }
        if (sistersCount > 0) {
          const sisShare = remainder * (sistersCount / sibShares);
          heirs.push({
            id: 'sister',
            relation: sistersCount > 1 ? `বোন (${sistersCount} জন)` : 'বোন',
            relationEn: 'Sister',
            count: sistersCount,
            individualShareFraction: 'আসাবা',
            individualPercentage: (sisShare / sistersCount) * 100,
            totalPercentage: sisShare * 100,
            individualLand: (totalLand * sisShare) / sistersCount,
            totalLand: totalLand * sisShare,
            individualSqFeet: (totalSqFeet * sisShare) / sistersCount,
          });
        }
      } else if (remainder > 0.0001) {
        // Radd (রদ) - distribute back to daughters/mother
        isRadd = true;
        // In Radd, the remaining is proportionally added to blood relatives
      }
    } else {
      // No children at all
      if (father) {
        // Father takes all remaining as Asaba
        heirs.push({
          id: 'father',
          relation: 'পিতা',
          relationEn: 'Father',
          count: 1,
          individualShareFraction: `আসাবা (${(remainder * 100).toFixed(2)}%)`,
          individualPercentage: remainder * 100,
          totalPercentage: remainder * 100,
          individualLand: totalLand * remainder,
          totalLand: totalLand * remainder,
          individualSqFeet: totalSqFeet * remainder,
          note: 'সন্তান না থাকায় প্রধান আসাবা হিসেবে সমুদয় অবশিষ্টাংশ',
        });
      } else if (brothersCount > 0 || sistersCount > 0) {
        const sibShares = brothersCount * 2 + sistersCount;
        if (brothersCount > 0) {
          const brShare = remainder * ((brothersCount * 2) / sibShares);
          heirs.push({
            id: 'brother',
            relation: brothersCount > 1 ? `ভাই (${brothersCount} জন)` : 'ভাই',
            relationEn: 'Brother',
            count: brothersCount,
            individualShareFraction: 'আসাবা',
            individualPercentage: (brShare / brothersCount) * 100,
            totalPercentage: brShare * 100,
            individualLand: (totalLand * brShare) / brothersCount,
            totalLand: totalLand * brShare,
            individualSqFeet: (totalSqFeet * brShare) / brothersCount,
          });
        }
        if (sistersCount > 0) {
          const sisShare = remainder * (sistersCount / sibShares);
          heirs.push({
            id: 'sister',
            relation: sistersCount > 1 ? `বোন (${sistersCount} জন)` : 'বোন',
            relationEn: 'Sister',
            count: sistersCount,
            individualShareFraction: 'আসাবা',
            individualPercentage: (sisShare / sistersCount) * 100,
            totalPercentage: sisShare * 100,
            individualLand: (totalLand * sisShare) / sistersCount,
            totalLand: totalLand * sisShare,
            individualSqFeet: (totalSqFeet * sisShare) / sistersCount,
          });
        }
      }
    }
  }

  const totalDistributedPercentage = heirs.reduce((sum, h) => sum + h.totalPercentage, 0);
  const totalDistributedLand = heirs.reduce((sum, h) => sum + h.totalLand, 0);
  const remainingLand = Math.max(0, totalLand - totalDistributedLand);

  return {
    heirs,
    totalDistributedPercentage: Number(totalDistributedPercentage.toFixed(2)),
    totalDistributedLand: Number(totalDistributedLand.toFixed(4)),
    remainingLand: Number(remainingLand.toFixed(4)),
    isAulApplied: isAul,
    isRaddApplied: isRadd,
    formulaSummary: isAul
      ? 'মোট হিস্যা ১০০% এর বেশি হওয়ায় আউল (Aul) নীতিতে সংখ্যানুপাতে সমন্বয় করা হয়েছে।'
      : isRadd
      ? 'অবশিষ্টাংশ রদ (Radd) নীতি অনুযায়ী রক্তীয় অংশীদারদের মাঝে বণ্টনযোগ্য।'
      : 'শরিয়াহ্ আইন ও বাংলাদেশ মুসলিম পারিবারিক আইন অনুযায়ী বণ্টন সম্পন্ন হয়েছে।',
  };
}

// 16-Anna (আনা-গণ্ডা-কড়া-ক্রান্তি-তিল) helper
export function convertAnnaToFraction(
  anna: number,
  gonda: number,
  kora: number,
  kranti: number,
  til: number
): number {
  const totalTil =
    (anna || 0) * 4800 +
    (gonda || 0) * 240 +
    (kora || 0) * 60 +
    (kranti || 0) * 20 +
    (til || 0);

  return totalTil / 76800; // 16 Anna = 76800 Til
}
