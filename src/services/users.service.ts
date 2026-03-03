// users.service.ts - Service for Users API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Usuarios

import api from '@/lib/api';
import type {
  User,
  UserQueryParams,
  UserListResponse,
  CreateUserDto,
  UpdateUserDto,
  EmailVerificationStats,
  VerifiedUsersResponse,
} from '@/types/user';

class UsersService {
  /**
   * Get all users with pagination and filters
   */
  async findAll(params: UserQueryParams = {}): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.customerNumber) queryParams.append('customerNumber', params.customerNumber);
    if (params.role) queryParams.append('role', params.role);
    if (params.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await api.get<UserListResponse>(`/users?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get a single user by ID
   */
  async findById(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  }

  /**
   * Create a new user
   */
  async create(dto: CreateUserDto): Promise<User> {
    const response = await api.post<User>('/users', dto);
    return response.data;
  }

  /**
   * Update an existing user
   */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const response = await api.patch<User>(`/users/${id}`, dto);
    return response.data;
  }

  /**
   * Deactivate a user (soft delete)
   */
  async deactivate(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }

  /**
   * Permanently delete a user
   */
  async hardDelete(id: string): Promise<void> {
    await api.delete(`/users/${id}/hard`);
  }

  /**
   * Activate a user
   */
  async activate(id: string): Promise<User> {
    const response = await api.patch<User>(`/users/${id}`, { isActive: true });
    return response.data;
  }

  /**
   * Reset email verification for a user (clears email and verification status)
   */
  async resetEmailVerification(id: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/users/${id}/reset-email`);
    return response.data;
  }

  /**
   * Get decrypted password for a user (super_admin only)
   */
  async getDecryptedPassword(id: string): Promise<{ password: string | null }> {
    const response = await api.get<{ password: string | null }>(`/users/${id}/password`);
    return response.data;
  }

  /**
   * Get email verification statistics
   */
  async getEmailVerificationStats(): Promise<EmailVerificationStats> {
    const response = await api.get<EmailVerificationStats>('/users/stats/email-verification');
    return response.data;
  }

  /**
   * Get verified users list (paginated)
   */
  async getVerifiedUsers(params: { page?: number; limit?: number } = {}): Promise<VerifiedUsersResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    const response = await api.get<VerifiedUsersResponse>(`/users/stats/verified-users?${queryParams.toString()}`);
    return response.data;
  }
}

export const usersService = new UsersService();
export default usersService;
