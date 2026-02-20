import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { customersService } from '@/services/customers.service';
import {
  Customer,
  CustomerQueryParams,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerAddress,
  CreateAddressDto,
  UpdateAddressDto,
  CustomerBankAccount,
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from '@/types/customer';

// Types
export interface CustomersState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
  filters: CustomerQueryParams;
}

// Helper to extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || 'Error de conexión';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Error desconocido';
};

// Initial state
const initialState: CustomersState = {
  customers: [],
  selectedCustomer: null,
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  isLoading: false,
  isLoadingDetail: false,
  error: null,
  filters: {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
};

// Async thunks
export const fetchCustomers = createAsyncThunk(
  'customers/fetchAll',
  async (params: CustomerQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await customersService.getAll(params);
      return response;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const customer = await customersService.getById(id);
      return customer;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchCustomerByReferralCode = createAsyncThunk(
  'customers/fetchByReferralCode',
  async (code: string, { rejectWithValue }) => {
    try {
      const customer = await customersService.getByReferralCode(code);
      return customer;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customers/create',
  async (data: CreateCustomerDto, { rejectWithValue }) => {
    try {
      const customer = await customersService.create(data);
      return customer;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateCustomer = createAsyncThunk(
  'customers/update',
  async ({ id, data }: { id: string; data: UpdateCustomerDto }, { rejectWithValue }) => {
    try {
      const customer = await customersService.update(id, data);
      return customer;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await customersService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const acceptTerms = createAsyncThunk(
  'customers/acceptTerms',
  async (id: string, { rejectWithValue }) => {
    try {
      const customer = await customersService.acceptTerms(id);
      return customer;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Address thunks
export const fetchAddresses = createAsyncThunk(
  'customers/fetchAddresses',
  async (customerId: string, { rejectWithValue }) => {
    try {
      const addresses = await customersService.getAddresses(customerId);
      return { customerId, addresses };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createAddress = createAsyncThunk(
  'customers/createAddress',
  async (
    { customerId, data }: { customerId: string; data: CreateAddressDto },
    { rejectWithValue }
  ) => {
    try {
      const address = await customersService.createAddress(customerId, data);
      return { customerId, address };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateAddress = createAsyncThunk(
  'customers/updateAddress',
  async (
    {
      customerId,
      addressId,
      data,
    }: { customerId: string; addressId: string; data: UpdateAddressDto },
    { rejectWithValue }
  ) => {
    try {
      const address = await customersService.updateAddress(customerId, addressId, data);
      return { customerId, address };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteAddress = createAsyncThunk(
  'customers/deleteAddress',
  async (
    { customerId, addressId }: { customerId: string; addressId: string },
    { rejectWithValue }
  ) => {
    try {
      await customersService.deleteAddress(customerId, addressId);
      return { customerId, addressId };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Bank account thunks
export const fetchBankAccounts = createAsyncThunk(
  'customers/fetchBankAccounts',
  async (customerId: string, { rejectWithValue }) => {
    try {
      const accounts = await customersService.getBankAccounts(customerId);
      return { customerId, accounts };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createBankAccount = createAsyncThunk(
  'customers/createBankAccount',
  async (
    { customerId, data }: { customerId: string; data: CreateBankAccountDto },
    { rejectWithValue }
  ) => {
    try {
      const account = await customersService.createBankAccount(customerId, data);
      return { customerId, account };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateBankAccount = createAsyncThunk(
  'customers/updateBankAccount',
  async (
    {
      customerId,
      accountId,
      data,
    }: { customerId: string; accountId: string; data: UpdateBankAccountDto },
    { rejectWithValue }
  ) => {
    try {
      const account = await customersService.updateBankAccount(customerId, accountId, data);
      return { customerId, account };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteBankAccount = createAsyncThunk(
  'customers/deleteBankAccount',
  async (
    { customerId, accountId }: { customerId: string; accountId: string },
    { rejectWithValue }
  ) => {
    try {
      await customersService.deleteBankAccount(customerId, accountId);
      return { customerId, accountId };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Slice
const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<CustomerQueryParams>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch customers
      .addCase(fetchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch customer by ID
      .addCase(fetchCustomerById.pending, (state) => {
        state.isLoadingDetail = true;
        state.error = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.isLoadingDetail = false;
        state.selectedCustomer = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.isLoadingDetail = false;
        state.error = action.payload as string;
      })
      // Fetch by referral code
      .addCase(fetchCustomerByReferralCode.pending, (state) => {
        state.isLoadingDetail = true;
        state.error = null;
      })
      .addCase(fetchCustomerByReferralCode.fulfilled, (state, action) => {
        state.isLoadingDetail = false;
        state.selectedCustomer = action.payload;
      })
      .addCase(fetchCustomerByReferralCode.rejected, (state, action) => {
        state.isLoadingDetail = false;
        state.error = action.payload as string;
      })
      // Create customer
      .addCase(createCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update customer
      .addCase(updateCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.customers.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
        if (state.selectedCustomer?.id === action.payload.id) {
          state.selectedCustomer = action.payload;
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete customer
      .addCase(deleteCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = state.customers.filter((c) => c.id !== action.payload);
        state.total -= 1;
        if (state.selectedCustomer?.id === action.payload) {
          state.selectedCustomer = null;
        }
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Accept terms
      .addCase(acceptTerms.fulfilled, (state, action) => {
        const index = state.customers.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
        if (state.selectedCustomer?.id === action.payload.id) {
          state.selectedCustomer = action.payload;
        }
      })
      // Addresses
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        if (state.selectedCustomer?.id === action.payload.customerId) {
          state.selectedCustomer.addresses = action.payload.addresses;
        }
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        if (state.selectedCustomer?.id === action.payload.customerId) {
          if (!state.selectedCustomer.addresses) {
            state.selectedCustomer.addresses = [];
          }
          state.selectedCustomer.addresses.push(action.payload.address);
        }
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        if (state.selectedCustomer?.id === action.payload.customerId) {
          const addresses = state.selectedCustomer.addresses || [];
          const index = addresses.findIndex((a) => a.id === action.payload.address.id);
          if (index !== -1) {
            addresses[index] = action.payload.address;
          }
        }
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        if (state.selectedCustomer?.id === action.payload.customerId) {
          state.selectedCustomer.addresses = (state.selectedCustomer.addresses || []).filter(
            (a) => a.id !== action.payload.addressId
          );
        }
      })
      // Bank accounts
      .addCase(fetchBankAccounts.fulfilled, (state, action) => {
        if (state.selectedCustomer?.id === action.payload.customerId) {
          state.selectedCustomer.bankAccounts = action.payload.accounts;
        }
      })
      .addCase(createBankAccount.fulfilled, (state, action) => {
        if (state.selectedCustomer?.id === action.payload.customerId) {
          if (!state.selectedCustomer.bankAccounts) {
            state.selectedCustomer.bankAccounts = [];
          }
          state.selectedCustomer.bankAccounts.push(action.payload.account);
        }
      })
      .addCase(updateBankAccount.fulfilled, (state, action) => {
        if (state.selectedCustomer?.id === action.payload.customerId) {
          const accounts = state.selectedCustomer.bankAccounts || [];
          const index = accounts.findIndex((a) => a.id === action.payload.account.id);
          if (index !== -1) {
            accounts[index] = action.payload.account;
          }
        }
      })
      .addCase(deleteBankAccount.fulfilled, (state, action) => {
        if (state.selectedCustomer?.id === action.payload.customerId) {
          state.selectedCustomer.bankAccounts = (
            state.selectedCustomer.bankAccounts || []
          ).filter((a) => a.id !== action.payload.accountId);
        }
      });
  },
});

export const { setFilters, clearFilters, clearSelectedCustomer, clearError } =
  customersSlice.actions;
export default customersSlice.reducer;

// Selectors
export const selectCustomers = (state: { customers: CustomersState }) => state.customers.customers;
export const selectSelectedCustomer = (state: { customers: CustomersState }) =>
  state.customers.selectedCustomer;
export const selectCustomersLoading = (state: { customers: CustomersState }) =>
  state.customers.isLoading;
export const selectCustomersError = (state: { customers: CustomersState }) =>
  state.customers.error;
export const selectCustomersPagination = (state: { customers: CustomersState }) => ({
  total: state.customers.total,
  page: state.customers.page,
  limit: state.customers.limit,
  totalPages: state.customers.totalPages,
});
export const selectCustomersFilters = (state: { customers: CustomersState }) =>
  state.customers.filters;
