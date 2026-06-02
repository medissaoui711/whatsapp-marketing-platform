export interface ContactItem {
  id: string;
  profileName: string | null;
  phoneNumber: string;
  whatsappAccount: string | null;
  tags: string[];
  assignedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactsResponse {
  contacts: ContactItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search?: string;
  };
  availableTags: string[];
}
