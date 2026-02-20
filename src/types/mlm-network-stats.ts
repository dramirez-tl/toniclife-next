export interface NetworkStats {
  customerId: string;
  totalMembers: number;
  activeMembers: number;
  totalPoints: number;
  groupPoints: number;
  rank: string;
}

export interface NetworkStatsStatus {
  lastRefresh: string;
  isRefreshing: boolean;
  totalRecords: number;
}

export interface TopPerformer {
  customerId: string;
  customerName: string;
  value: number;
  rank: string;
}
