// states.service.ts - API client for States module

import api from '@/lib/axios';
import type { State, StateQueryParams, CreateStateDto, UpdateStateDto } from '@/types/state';

class StatesService {
  async getStates(params?: StateQueryParams): Promise<State[]> {
    const response = await api.get<State[]>('/states', { params });
    return response.data;
  }

  async getStateById(id: string): Promise<State> {
    const response = await api.get<State>(`/states/${id}`);
    return response.data;
  }

  async createState(dto: CreateStateDto): Promise<State> {
    const response = await api.post<State>('/states', dto);
    return response.data;
  }

  async updateState(id: string, dto: UpdateStateDto): Promise<State> {
    const response = await api.patch<State>(`/states/${id}`, dto);
    return response.data;
  }

  async deleteState(id: string): Promise<void> {
    await api.delete(`/states/${id}`);
  }
}

export const statesService = new StatesService();
export default statesService;
