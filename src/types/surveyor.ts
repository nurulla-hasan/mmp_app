export type SurveyorVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type DistrictOption = {
  value: string;
  label: string;
  upazilas: string[];
};

export type TSurveyorService = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
};

export type TSurveyorServiceWithPrice = {
  id: string;
  serviceId: string;
  startingPrice: number;
  service: TSurveyorService;
};

export type TSurveyorServiceArea = {
  id?: string;
  district: string;
  upazilas: string[];
};

export type TSurveyorReview = {
  id: string;
  surveyorProfileId?: string;
  userId?: string | null;
  reviewerName: string;
  reviewerEmail?: string | null;
  serviceName?: string | null;
  rating: number;
  comment: string;
  status: SurveyorVerificationStatus;
  createdAt: string;
};

export type TSurveyorProfile = {
  id?: string;
  userId?: string;
  slug?: string;
  headline?: string;
  bio?: string | null;
  experienceYears?: number;
  certificateUrl?: string | null;
  verificationStatus?: SurveyorVerificationStatus;
  isVerified?: boolean;
  verifiedAt?: string | null;
  adminNote?: string | null;
  rating?: number;
  totalReviews?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    imageUrl?: string | null;
    phone?: string | null;
    whatsappNumber?: string | null;
    district?: string | null;
    upazila?: string | null;
    isSubscribed?: boolean;
    createdAt?: string;
  };
  fullName?: string;
  profilePhoto?: string;
  isSubscribed?: boolean;
  joinedAt?: string;
  primaryLocation?: { district: string; upazila: string };
  whatsappNumber?: string;
  completedRequests?: number;
  verification?: {
    identityReviewed: boolean;
    professionalInformationReviewed: boolean;
    verifiedAt: string;
    note: string;
  };
  surveyorServices?: TSurveyorServiceWithPrice[];
  serviceAreas?: TSurveyorServiceArea[];
  reviews?: TSurveyorReview[];
};

export type SurveyorQuery = {
  searchTerm?: string;
  district?: string;
  service?: string;
  rating?: string | number;
  experienceMin?: string | number;
  experienceMax?: string | number;
  sortBy?: 'rating_desc' | 'experience_desc' | 'newest' | 'oldest';
  page?: number;
  limit?: number;
};

export type SurveyorServiceInput = {
  serviceId: string;
  startingPrice: number;
};

export type SurveyorApplicationPayload = {
  headline: string;
  bio?: string;
  experienceYears: number;
  certificateUrl?: string;
  serviceAreas: Array<{ district: string; upazilas: string[] }>;
  services: SurveyorServiceInput[];
};

export type UpdateSurveyorProfilePayload = Partial<SurveyorApplicationPayload>;

export type CreateSurveyorReviewPayload = {
  surveyorProfileId: string;
  serviceName?: string | null;
  rating: number;
  comment: string;
};
