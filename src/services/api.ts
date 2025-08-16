const API_BASE_URL = 'http://localhost:5000/api';

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
}

export const apiService = new ApiService();
export default apiService;
