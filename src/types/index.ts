// ==========================================
// MY WELLNESS HUB - TYPE DEFINITIONS
// ==========================================

// Product Types
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  fullDescription?: string;
  benefits: string[];
  usage: {
    ideal: string;
    regular?: string;
    notes?: string;
  };
  dosage?: string;
  ingredients?: string[];
  combinations?: string[];
  category: ProductCategory;
  tags: string[];
  price: number;
  compareAtPrice?: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  inStock: boolean;
  stock?: number;
  rating?: number;
  reviews?: number;
  badge?: string;
  featured?: boolean;
}

export type ProductCategory =
  | 'energia'
  | 'detox'
  | 'belleza'
  | 'estres'
  | 'hormonal'
  | 'masculino'
  | 'inmune'
  | 'circulacion'
  | 'digestion'
  | 'peso';

export interface ProductBundle {
  id: string;
  name: string;
  description: string;
  products: Product[];
  originalPrice: number;
  bundlePrice: number;
  discount: number;
  goal: WellnessGoal;
}

// Quiz Types
export type WellnessGoal =
  | 'detox'
  | 'energia'
  | 'belleza'
  | 'estres'
  | 'hormonal'
  | 'masculino';

export interface QuizQuestion {
  id: number;
  category: string;
  question: string;
  options: QuizOption[];
  conditionalDisplay?: {
    questionId: number;
    requiredAnswer: string;
  };
}

export interface QuizOption {
  id: string;
  text: string;
  value: number; // 0 = no issue, 1 = mild, 2 = significant
  triggersProducts?: string[]; // Product IDs that this answer triggers
  triggersCategory?: ProductCategory;
}

export interface QuizAnswer {
  questionId: number;
  optionId: string;
  value: number;
}

export interface QuizResult {
  userInfo: {
    name: string;
    email: string;
    age: number;
    gender: 'female' | 'male';
  };
  answers: QuizAnswer[];
  primaryGoal: WellnessGoal;
  recommendedProducts: Product[];
  recommendedBundle: ProductBundle;
  healthProfile: HealthProfile;
}

export interface HealthProfile {
  energy: number; // 0-100
  digestion: number;
  stress: number;
  skin: number;
  immune: number;
  circulation: number;
  hormonal: number;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

export type UserRole = 'customer' | 'distributor' | 'admin' | 'support' | 'hr';

export interface Distributor extends User {
  distributorId: string;
  rank: DistributorRank;
  uplineId?: string;
  downlineIds: string[];
  totalSales: number;
  monthlyCommission: number;
  joinDate: Date;
  personalLink: string;
  qrCode: string;
}

export type DistributorRank = 'bronze' | 'silver' | 'gold' | 'diamond';

// Cart & Checkout Types
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode?: string;
}

export interface Order {
  id: string;
  userId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Address {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

// Testimonial Types
export interface Testimonial {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
  beforeImage?: string;
  afterImage?: string;
  products: string[];
  date: Date;
}

// Daily Habit Tracker Types
export interface DailyHabit {
  id: string;
  userId: string;
  date: Date;
  water: number; // glasses
  supplements: SupplementLog[];
  exercise: number; // minutes
  sleep: number; // hours
  energyLevel: number; // 1-10
  notes?: string;
}

export interface SupplementLog {
  productId: string;
  taken: boolean;
  time?: string;
}

// Navigation Types
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
  icon?: string;
}

// Form Types
export interface ContactForm {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}
