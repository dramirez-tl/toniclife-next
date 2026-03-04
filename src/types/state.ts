// state.ts - TypeScript types for States module

export interface State {
  id: string;
  countryId: string;
  countryName?: string;
  countryCode?: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StateQueryParams {
  countryId?: string;
  isActive?: boolean;
}

export interface CreateStateDto {
  countryId: string;
  code: string;
  name: string;
}

export interface UpdateStateDto {
  code?: string;
  name?: string;
  isActive?: boolean;
}
