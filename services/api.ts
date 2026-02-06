import { Platform } from "react-native";
const DEV_API_HOST =
  process.env.EXPO_PUBLIC_API_HOST ||
  Platform.select({
    ios: "192.168.100.16",
    android: "192.168.100.16",
    default: "192.168.100.16",
  });

const DEV_API_PORT = process.env.EXPO_PUBLIC_API_PORT || "8000";

export const API_HOST = __DEV__
  ? `http://${DEV_API_HOST}:${DEV_API_PORT}`
  : "https://my-production-api.com";

export const API_BASE_URL = `${API_HOST}/api`;

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface RegisterResponse {
  email: string;
  full_name: string;
  role: string;
}

export interface VerifyOTPResponse {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  email_verified: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: number;
    full_name: string;
    email: string;
    role: string;
    phone: string | null;
    profile_image: string | null;
    bio: string | null;
    kyc_verified: boolean;
    email_verified: boolean;
  };
}

export interface UpdateProfilePayload {
  full_name?: string;
  phone?: string;
  profile_image?: string;
  bio?: string;
  specialization?: string;
  location?: string;
}

export interface CreateBookingPayload {
  photographer_id: string;
  package_id: number;
  date: string; // ISO or YYYY-MM-DD
  end_date?: string; // ISO or YYYY-MM-DD
  event_type?: string;
  amount: number;
  location: string;
  notes?: string;
}

export interface UpdateProfileResponse {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  profile_image: string | null;
  bio: string | null;
  specialization: string | null;
  location: string | null;
  role: string;
  kyc_verified: boolean;
}

export interface KycFormPayload {
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  contact_number: string;
  email: string;
  address_city: string;
  address_district: string;
  address_province: string;
  user_role?: string;
  username?: string;
  registered_email?: string;
  registered_phone?: string;
  document_type: "CITIZENSHIP" | "PASSPORT" | "DRIVING_LICENSE";
  document_number: string;
  issued_by?: string;
  issue_date?: string;
  expiry_date?: string;
  document_front_url: string;
  document_back_url?: string;
  consent_confirmed: boolean;
  consent_verify: boolean;
  consent_false_info: boolean;
}

export interface KycStatusData {
  kyc_id: number;
  status: string;
  remarks: string | null;
  verified_at: string | null;
  verified_by?: number | null;
  document_type: string;
  document_number: string;
  document_front_url: string;
  document_back_url: string | null;
  updated_at: string;
  created_at?: string;
}

export interface KycReviewPayload {
  kyc_id: number;
  status: "APPROVED" | "REJECTED";
  remarks?: string;
}

export type PortfolioCategoryName =
  | "WEDDING"
  | "EVENT"
  | "PRODUCT"
  | "PORTRAIT"
  | "AERIAL"
  | "FASHION"
  | "TRAVEL"
  | "LANDSCAPE"
  | "CULTURE"
  | "NATURE"
  | "WILDLIFE"
  | "SPORTS"
  | "FAMILY"
  | "NEWBORN"
  | "COMMERCIAL"
  | "FINE_ART"
  | "REAL_ESTATE"
  | "OTHER";

export interface PortfolioCategory {
  category_id: number;
  category_name: PortfolioCategoryName;
}

export interface Portfolio {
  portfolio_id: number;
  user_id: string;
  title: string;
  description: string | null;
  category?: PortfolioCategory;
}

export interface PortfolioImage {
  image_id: number;
  portfolio_id: number;
  title: string | null;
  description: string | null;
  image_url: string;
  likes_count?: number;
  views_count?: number;
  comments_count?: number;
  portfolio?: Portfolio;
}

export interface Comment {
  comment_id: number;
  image_id: number;
  user_id: string;
  comment_text: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  user?: {
    user_id: string;
    full_name: string;
    profile_image: string | null;
  };
  replies?: Comment[];
}

export interface UploadPortfolioImagePayload {
  title: string;
  description?: string | null;
  category: PortfolioCategoryName;
  file: {
    uri: string;
    name: string;
    type: string;
  };
}

// API Service Functions
export const apiService = {
  // Register user
  async register(data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    role?: "PHOTOGRAPHER" | "CLIENT";
  }): Promise<ApiResponse<RegisterResponse>> {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Registration failed");
    }
    return result;
  },

  // Verify OTP
  async verifyOTP(data: {
    email: string;
    otp_code: string;
  }): Promise<ApiResponse<VerifyOTPResponse>> {
    const response = await fetch(`${API_BASE_URL}/users/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "OTP verification failed");
    }
    return result;
  },

  // Resend OTP
  async resendOTP(data: { email: string }): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/users/resend-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to resend OTP");
    }
    return result;
  },

  // Login user
  async login(data: {
    email: string;
    password: string;
  }): Promise<ApiResponse<LoginResponse>> {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Login failed");
    }
    return result;
  },

  // Update photographer profile info (requires bearer token)
  async updatePhotographerProfile(
    payload: UpdateProfilePayload,
    token: string,
  ): Promise<ApiResponse<UpdateProfileResponse>> {
    const response = await fetch(`${API_BASE_URL}/users/photographer-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    let result;
    const text = await response.text();
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(`Non-JSON response: ${text.substring(0, 200)}`);
    }
    if (!response.ok) {
      throw new Error(
        result.message || "Failed to update photographer profile",
      );
    }
    return result;
  },

  // Update basic profile info (requires bearer token)
  async updateProfile(
    payload: UpdateProfilePayload,
    token: string,
  ): Promise<ApiResponse<UpdateProfileResponse>> {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to update profile");
    }
    return result;
  },

  async uploadProfileImage(
    file: { uri: string; name: string; type: string },
    token: string,
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append("image", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const response = await fetch(`${API_BASE_URL}/users/profile-image`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to upload profile image");
    }
    return result;
  },

  // Forgot Password - Send OTP
  async forgotPassword(data: { email: string }): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/users/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to send OTP");
    }
    return result;
  },

  // Reset Password - Verify OTP and set new password
  async resetPassword(data: {
    email: string;
    otp_code: string;
    new_password: string;
  }): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/users/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to reset password");
    }
    return result;
  },

  // Submit or update KYC verification form (requires bearer token)
  async submitKycForm(
    payload: KycFormPayload,
    token: string,
  ): Promise<ApiResponse<KycStatusData>> {
    const response = await fetch(`${API_BASE_URL}/users/kyc/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to submit KYC");
    }
    return result;
  },

  // Get current user's KYC status (requires bearer token)
  async getKycStatus(token: string): Promise<ApiResponse<KycStatusData>> {
    const response = await fetch(`${API_BASE_URL}/users/kyc/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch KYC status");
    }
    return result;
  },

  async uploadKycDocument(
    file: { uri: string; name: string; type: string },
    token: string,
  ): Promise<ApiResponse<{ url: string; filename: string }>> {
    const formData = new FormData();
    formData.append("image", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const response = await fetch(`${API_BASE_URL}/users/kyc/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to upload KYC document");
    }
    return result;
  },

  // Admin reviews a KYC submission (requires admin bearer token)
  async reviewKyc(
    payload: KycReviewPayload,
    token: string,
  ): Promise<ApiResponse<KycStatusData>> {
    const response = await fetch(`${API_BASE_URL}/kyc/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to review KYC");
    }
    return result;
  },

  async getMyPortfolioImages(
    token: string,
    category?: PortfolioCategoryName,
  ): Promise<ApiResponse<PortfolioImage[]>> {
    const search = category ? `?category=${category.toLowerCase()}` : "";

    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images${search}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error("API Parse Error:", e);
      throw new Error(
        `Server returned non-JSON response (Status: ${response.status})`,
      );
    }

    if (!response.ok) {
      console.warn(`API Error [${response.status}]:`, result);
      throw new Error(
        result.message ||
          result.error ||
          `Error ${response.status}: Failed to fetch portfolio images`,
      );
    }
    return result;
  },

  async uploadPortfolioImage(
    payload: UploadPortfolioImagePayload,
    token: string,
  ): Promise<ApiResponse<PortfolioImage>> {
    const formData = new FormData();
    formData.append("title", payload.title);
    if (payload.description) {
      formData.append("description", payload.description);
    }
    formData.append("category", payload.category);
    formData.append("image", {
      uri: payload.file.uri,
      name: payload.file.name,
      type: payload.file.type,
    } as any);

    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Let fetch set the multipart boundary
        },
        body: formData,
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to upload portfolio image");
    }
    return result;
  },

  async deletePortfolioImage(
    imageId: number,
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to delete portfolio image");
    }
    return result;
  },

  async getAllPhotographers(): Promise<ApiResponse<any[]>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/allPhotographer`,
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch photographers");
    }
    return result;
  },

  async getDashboardFeed(): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${API_BASE_URL}/photographer/feed`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch dashboard feed");
    }
    return result;
  },

  async incrementImageView(imageId: number): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}/view`,
      {
        method: "PATCH",
      },
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to increment view count");
    }
    return result;
  },
  async getTopPhotographers(): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${API_BASE_URL}/photographer/top`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch top photographers");
    }
    return result;
  },

  async likePortfolioImage(imageId: number): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}/like`,
      {
        method: "PATCH",
      },
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to like image");
    }
    return result;
  },

  async getMe(token: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch user profile");
    }
    return result;
  },

  async getMyBookings(token: string): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${API_BASE_URL}/bookings/my`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch bookings");
    }
    return result;
  },

  async createBooking(
    payload: CreateBookingPayload,
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/bookings/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to create booking");
    }
    return result;
  },

  async updatePortfolioImage(
    imageId: number,
    payload: { category?: string; title?: string; description?: string },
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to update portfolio image");
    }
    return result;
  },

  async submitReview(
    payload: { booking_id: string; rating: number; review?: string },
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/photographer/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to submit review");
    }
    return result;
  },

  async getPhotographerReviews(token: string): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${API_BASE_URL}/photographer/reviews`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch reviews");
    }
    return result;
  },

  async replyToReview(
    reviewId: number,
    replyText: string,
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/reviews/${reviewId}/reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply_text: replyText }),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to submit reply");
    }
    return result;
  },

  // Chat APIs
  async getConversations(token: string): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error("Server returned non-JSON:", text);
      throw new Error("Server error: Invalid response format.");
    }

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch conversations");
    }
    return result;
  },

  async getMessages(
    otherUserId: string,
    token: string,
  ): Promise<ApiResponse<any[]>> {
    const response = await fetch(
      `${API_BASE_URL}/chat/history/${otherUserId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error("Server returned non-JSON:", text);
      throw new Error("Server error: Invalid response format.");
    }

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch messages");
    }
    return result;
  },

  async sendMessage(
    receiverId: string,
    message: string,
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receiverId, message }),
    });

    const bodyText = await response.text();
    let result;
    try {
      result = JSON.parse(bodyText);
    } catch (e) {
      console.error("Server returned non-JSON:", bodyText);
      throw new Error("Server error: Invalid response format.");
    }

    if (!response.ok) {
      throw new Error(result.message || "Failed to send message");
    }
    return result;
  },

  async updateBookingStatus(
    bookingId: number,
    status: "ACCEPTED" | "REJECTED" | "COMPLETED" | "CANCELLED",
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/bookings/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ booking_id: bookingId, status }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to update booking status");
    }
    return result;
  },

  async getDashboardStats(token: string): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/dashboard/stats`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch dashboard stats");
    }
    return result;
  },

  async getNotifications(token: string): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${API_BASE_URL}/photographer/notifications`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    return result;
  },

  async getEarnings(token: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/photographer/earnings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch earnings");
    }
    return result;
  },

  async getAnalytics(token: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/photographer/analytics`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch analytics");
    }
    return result;
  },

  async addComment(
    imageId: number,
    commentText: string,
    token: string,
    parentId?: number,
  ): Promise<ApiResponse<Comment>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          comment_text: commentText,
          parent_id: parentId,
        }),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to add comment");
    }
    return result;
  },

  async getComments(imageId: number): Promise<ApiResponse<Comment[]>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}/comments`,
      {
        method: "GET",
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch comments");
    }
    return result;
  },

  async updateComment(
    imageId: number,
    commentId: number,
    commentText: string,
    token: string,
  ): Promise<ApiResponse<Comment>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}/comments/${commentId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment_text: commentText }),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to update comment");
    }
    return result;
  },

  async deleteComment(
    imageId: number,
    commentId: number,
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}/comments/${commentId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to delete comment");
    }
    return result;
  },
};
