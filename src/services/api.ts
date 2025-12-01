const API_BASE_URL = 'http://localhost:5001/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'librarian' | 'faculty' | 'student';
  studentId?: string;
  department?: string;
  section?: string;
  gender?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface EntryRecord {
  _id: string;
  user: User;
  entryType: 'entry' | 'exit';
  timestamp: string;
  method: 'id_card' | 'manual_entry' | 'qr_code';
  registrationNumber?: string;
  idCardNumber?: string;
  location: 'main_gate' | 'side_entrance' | 'emergency_exit';
  purpose?: 'study' | 'research' | 'meeting' | 'event' | 'other';
  duration?: number;
  timeSpent?: string;
  entryTime?: string;
  notes?: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  subcategory?: string;
  publisher?: string;
  publicationYear?: number;
  edition?: string;
  pages?: number;
  language: string;
  description?: string;
  coverImage?: string;
  totalCopies: number;
  availableCopies: number;
  location?: {
    shelf?: string;
    row?: string;
    section?: string;
  };
  tags?: string[];
  status: 'available' | 'low_stock' | 'out_of_stock' | 'maintenance';
  addedBy: string;
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: any): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/me');
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // Entry/Exit endpoints
  async recordEntry(entryData: any): Promise<ApiResponse<{ entry: EntryRecord }>> {
    return this.request<{ entry: EntryRecord }>('/entry/enter', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  async recordExit(exitData: any): Promise<ApiResponse<{ exit: EntryRecord }>> {
    return this.request<{ exit: EntryRecord }>('/entry/exit', {
      method: 'POST',
      body: JSON.stringify(exitData),
    });
  }

  async getActiveEntries(): Promise<ApiResponse<{ entries: EntryRecord[] }>> {
    return this.request<{ entries: EntryRecord[] }>('/entry/active');
  }

  async getUserStatus(userId: string): Promise<ApiResponse<{ user: User; status: string; currentEntry: EntryRecord | null }>> {
    return this.request<{ user: User; status: string; currentEntry: EntryRecord | null }>(`/entry/status/${userId}`);
  }

  async getEntryStats(startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.request(`/entry/stats?${params.toString()}`);
  }

  async getHistoricalEntries(limit: number = 50): Promise<ApiResponse<{ entries: EntryRecord[] }>> {
    return this.request<{ entries: EntryRecord[] }>(`/entry/history?limit=${limit}&type=exit`);
  }

  async getDashboardStats(): Promise<ApiResponse<{
    current: {
      totalStudents: number;
      girls: number;
      boys: number;
      unknown: number;
    };
    today: {
      totalEntries: number;
      totalExits: number;
      netEntries: number;
    };
    breakdown: {
      departments: Record<string, number>;
      gender: Record<string, number>;
    };
    analytics: {
      peakHour: number;
      peakHourCount: number;
      avgSessionTime: number;
      hourlyDistribution: Array<{ _id: number; count: number }>;
    };
    lastUpdated: string;
  }>> {
    return this.request('/entry/dashboard-stats');
  }

  // User management endpoints
  async getUsers(params?: { page?: number; limit?: number; role?: string; department?: string; search?: string }): Promise<ApiResponse<{ users: User[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.department) queryParams.append('department', params.department);
    if (params?.search) queryParams.append('search', params.search);
    
    return this.request<{ users: User[]; pagination: any }>(`/users?${queryParams.toString()}`);
  }

  async getUserById(userId: string): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>(`/users/${userId}`);
  }

  // Book endpoints (placeholder for future implementation)
  async getBooks(): Promise<ApiResponse<{ books: Book[] }>> {
    return this.request<{ books: Book[] }>('/books');
  }

  // Koha borrower lookup (by cardnumber or userid)
  async getKohaBorrower(query: string): Promise<ApiResponse<{ cardnumber: string; surname: string; sex: string; userid: string; branchcode: string; categorycode: string; email?: string }>> {
    const params = new URLSearchParams({ q: query });
    return this.request(`/koha/borrower?${params.toString()}`);
  }

  // Koha in/out logging to Mongo (inouts)
  async createKohaInOut(payload: { id: string; entryType?: 'entry' | 'exit'; method?: 'manual_entry' | 'auto_scan' | 'id_card' | 'qr_code'; location?: string; purpose?: string; status?: string }): Promise<ApiResponse<{ inout: any }>> {
    return this.request<{ inout: any }>(`/koha/inout`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Koha scan: toggle IN/OUT and write to MySQL gate_logs
  async kohaScan(id: string): Promise<ApiResponse<{ action: 'IN' | 'OUT'; cardnumber: string; name: string; gender: string; branch: string; cc: string; userid?: string; email?: string }>> {
    return this.request(`/koha/scan`, {
      method: 'POST',
      body: JSON.stringify({ id })
    });
  }

  // Fetch gate_logs from MySQL
  async getGateLogs(params?: { limit?: number; date?: string }): Promise<ApiResponse<{ logs: any[] }>> {
    const qp = new URLSearchParams();
    if (params?.limit) qp.append('limit', String(params.limit));
    if (params?.date) qp.append('date', params.date);
    return this.request(`/koha/gate-logs?${qp.toString()}`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Library halls & bookings
  async getHalls(): Promise<ApiResponse<{ halls: any[] }>> {
    return this.request<{ halls: any[] }>(`/library/halls`);
  }

  // Create a hall booking. Backend accepts purpose_title and purpose_description (stored as JSON).
  async createBooking(payload: { hall_id: number; start_datetime: string; end_datetime: string; num_students?: number; purpose_title?: string; purpose_description?: string }): Promise<ApiResponse<{ booking: any }>> {
    return this.request<{ booking: any }>(`/library/bookings`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getBookings(params?: { status?: string; mine?: boolean; hall_id?: number }): Promise<ApiResponse<{ bookings: any[] }>> {
    const qp = new URLSearchParams();
    if (params?.status) qp.append('status', params.status);
    if (params?.mine) qp.append('mine', String(params.mine));
    if (params?.hall_id) qp.append('hall_id', String(params.hall_id));
    return this.request<{ bookings: any[] }>(`/library/bookings?${qp.toString()}`);
  }

  async approveBooking(id: number, action: 'approve' | 'reject', comment?: string): Promise<ApiResponse> {
    return this.request(`/library/bookings/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ action, comment })
    });
  }

  async cancelBooking(id: number): Promise<ApiResponse> {
    return this.request(`/library/bookings/${id}/cancel`, { method: 'PUT' });
  }
}

export const apiService = new ApiService();
export default apiService;
