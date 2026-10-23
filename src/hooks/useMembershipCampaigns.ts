// React Query hooks para campañas de membresía (mig 168).

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membershipCampaignsService } from '@/services/membership-campaigns.service';
import { isMigrationMissingError } from '@/lib/membership-campaigns';
import type {
  ApplyMembershipToSaleDto,
  CreateMembershipCampaignDto,
  MembershipCampaignGiftInput,
  MembershipCampaignListQueryParams,
  MembershipRedemptionListQueryParams,
  SetMembershipBranchesDto,
  UpdateMembershipCampaignDto,
} from '@/types/membership-campaign';

export const membershipCampaignKeys = {
  all: ['membership-campaigns'] as const,
  lists: () => [...membershipCampaignKeys.all, 'list'] as const,
  list: (params: MembershipCampaignListQueryParams) =>
    [...membershipCampaignKeys.lists(), params] as const,
  details: () => [...membershipCampaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...membershipCampaignKeys.details(), id] as const,
  redemptions: (id: string, params: MembershipRedemptionListQueryParams = {}) =>
    [...membershipCampaignKeys.detail(id), 'redemptions', params] as const,
};

/** Sin la mig 168 el API contesta 503 siempre: reintentar solo retrasa el aviso. */
const retryUnlessMigrationMissing = (failureCount: number, error: unknown) =>
  !isMigrationMissingError(error) && failureCount < 1;

// ================================================================
// LIST / DETAIL / REDEMPTIONS
// ================================================================

export const useMembershipCampaigns = (params: MembershipCampaignListQueryParams = {}) => {
  return useQuery({
    queryKey: membershipCampaignKeys.list(params),
    queryFn: () => membershipCampaignsService.list(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    retry: retryUnlessMigrationMissing,
  });
};

export const useMembershipCampaign = (id: string | undefined) => {
  return useQuery({
    queryKey: id
      ? membershipCampaignKeys.detail(id)
      : membershipCampaignKeys.detail('disabled'),
    queryFn: () => membershipCampaignsService.getById(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
    retry: retryUnlessMigrationMissing,
  });
};

export const useMembershipRedemptions = (
  id: string | undefined,
  params: MembershipRedemptionListQueryParams = {},
) => {
  return useQuery({
    queryKey: id
      ? membershipCampaignKeys.redemptions(id, params)
      : membershipCampaignKeys.redemptions('disabled', params),
    queryFn: () => membershipCampaignsService.listRedemptions(id!, params),
    enabled: !!id,
    placeholderData: keepPreviousData,
    // Los canjes cambian con cada venta cobrada o cancelada.
    staleTime: 15 * 1000,
    retry: retryUnlessMigrationMissing,
  });
};

// ================================================================
// MUTACIONES
// ================================================================

export const useCreateMembershipCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateMembershipCampaignDto) =>
      membershipCampaignsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipCampaignKeys.lists() });
    },
  });
};

export const useUpdateMembershipCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMembershipCampaignDto }) =>
      membershipCampaignsService.update(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(membershipCampaignKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: membershipCampaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: membershipCampaignKeys.lists() });
    },
  });
};

export const useReplaceMembershipGifts = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gifts: MembershipCampaignGiftInput[]) =>
      membershipCampaignsService.replaceGifts(id, gifts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipCampaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: membershipCampaignKeys.lists() });
    },
  });
};

/** Aplica la campaña a una venta ya cobrada; refresca canjes y contadores. */
export const useApplyMembershipToSale = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ApplyMembershipToSaleDto) =>
      membershipCampaignsService.applyToSale(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipCampaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: membershipCampaignKeys.lists() });
    },
  });
};

export const useSetMembershipBranches = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SetMembershipBranchesDto) =>
      membershipCampaignsService.setBranches(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipCampaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: membershipCampaignKeys.lists() });
    },
  });
};
