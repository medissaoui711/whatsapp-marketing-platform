export interface LinkedInProfile {
  id: string;
  username: string;
  fullName: string;
  headline: string;
  location: string;
  about: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  languages: Language[];
  certifications: Certification[];
  followers: number;
  connections: number;
  profileUrl: string;
  profileImage: string;
  isPublic: boolean;
}

export interface Experience {
  title: string;
  company: string;
  companyUrl?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface Education {
  school: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface Language {
  name: string;
  proficiency?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  url?: string;
}

export interface Recommendation {
  authorName: string;
  authorHeadline?: string;
  relationship: string;
  text: string;
  date?: string;
}

export interface LinkedInSearchResult {
  profiles: LinkedInProfile[];
  totalResults: number;
  nextPageToken?: string;
}

export interface LinkedInJob {
  id: string;
  tenantId: string;
  userId: string;
  type: 'profile' | 'search' | 'company' | 'connections';
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentPage: number;
  totalPages: number;
  resultsCount: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
