export const API_HOST =
  process.env.EXPO_PUBLIC_API_HOST ||
  "https://abishekh-joshi-clickseekers.onrender.com";
// process.env.EXPO_PUBLIC_API_HOST || "http://192.168.42.11:8000";

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
  profile_image?:
    | string
    | {
        file_name?: string;
        mime_type?: string;
        encoding?: "base64";
        data?: string;
        base64?: string;
        url?: string;
        image_url?: string;
        uri?: string;
      }
    | null;
  bio?: string;
  specialization?: string;
  location?: string;
}

export interface CreateBookingPayload {
  photographer_id: string;
  package_id: number;
  date: string;
  end_date?: string;
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
  | "PORTRAIT"
  | "LANDSCAPE"
  | "WILDLIFE"
  | "STREET"
  | "FASHION"
  | "EVENT"
  | "SPORTS"
  | "PRODUCT"
  | "FOOD"
  | "TRAVEL"
  | "FINE_ART"
  | "CONCEPTUAL"
  | "ABSTRACT"
  | "BLACK_AND_WHITE"
  | "SILHOUETTE"
  | "MACRO"
  | "ASTROPHOTOGRAPHY"
  | "LONG_EXPOSURE"
  | "AERIAL_DRONE"
  | "ARCHITECTURAL"
  | "REAL_ESTATE"
  | "COMMERCIAL"
  | "EDITORIAL"
  | "DOCUMENTARY"
  | "PHOTOJOURNALISM"
  | "LIFESTYLE"
  | "INFLUENCER_INSTAGRAM"
  | "CINEMATIC"
  | "MINIMALIST"
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
  location: string | null;
  image_url: string;
  likes_count?: number;
  views_count?: number;
  comments_count?: number;
  portfolio?: Portfolio;
  created_at: string;
  updated_at: string;
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
  location?: string | null;
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
    location?: string;
    specialization?: string;
    role?: "PHOTOGRAPHER" | "CLIENT";
  }): Promise<ApiResponse<RegisterResponse>> {
    try {
      console.log("[Register] Starting registration for:", data.email);

      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      console.log("[Register] Response status:", response.status);

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("[Register] JSON parse error:", parseError);
        throw new Error(
          "Server returned an invalid response. Please try again.",
        );
      }

      console.log("[Register] Response data:", result);

      if (!response.ok) {
        const errorMsg = result.message || "Registration failed";
        console.error("[Register] Error:", errorMsg);
        throw new Error(errorMsg);
      }

      console.log("[Register] Success!");
      return result;
    } catch (error: any) {
      console.error("[Register] Exception:", error);
      throw new Error(
        error.message || "Registration failed. Please try again.",
      );
    }
  },

  // Verify OTP
  async verifyOTP(data: {
    email: string;
    otp_code: string;
  }): Promise<ApiResponse<VerifyOTPResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error(
          "Server returned an invalid response. Please try again.",
        );
      }

      if (!response.ok) {
        throw new Error(result.message || "OTP verification failed");
      }
      return result;
    } catch (error: any) {
      throw new Error(
        error.message || "OTP verification failed. Please try again.",
      );
    }
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
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error(
          "Server returned an invalid response. Please try again.",
        );
      }

      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }
      return result;
    } catch (error: any) {
      throw new Error(error.message || "Login failed. Please try again.");
    }
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

  // Verify Password Reset OTP
  async verifyPasswordResetOTP(data: {
    email: string;
    otp_code: string;
  }): Promise<ApiResponse<void>> {
    const response = await fetch(
      `${API_BASE_URL}/users/verify-password-reset-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "OTP verification failed");
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
    const response = await fetch(`${API_BASE_URL}/admin/kyc/review`, {
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
    if (payload.location) {
      formData.append("location", payload.location);
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
      `${API_BASE_URL}/photographer/allPhotographer?t=${Date.now()}`,
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
  async getTopPhotographers(
    period: string = "weekly",
  ): Promise<ApiResponse<any[]>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/top?period=${period}`,
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch top photographers");
    }
    return result;
  },

  async toggleImageSave(
    imageId: number,
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}/save`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to save image");
    }
    return result;
  },

  async getUserSaves(
    token: string,
  ): Promise<
    ApiResponse<{ savedPosts: PortfolioImage[]; savedImageIds: number[] }>
  > {
    const response = await fetch(`${API_BASE_URL}/photographer/my-saves`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch saved images");
    }
    return result;
  },

  async likePortfolioImage(
    imageId: number,
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}/like`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to like image");
    }
    return result;
  },

  async getUserLikes(
    token: string,
  ): Promise<ApiResponse<{ likedImageIds: number[] }>> {
    const response = await fetch(`${API_BASE_URL}/photographer/my-likes`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch liked images");
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

  async getAdminStats(token: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch admin stats");
    }
    return result;
  },

  async getAdminUsers(
    token: string,
    params: {
      role?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponse<any>> {
    const cleanParams: Record<string, string> = {};
    if (params.role) cleanParams.role = params.role;
    if (params.status) cleanParams.status = params.status;
    if (params.search) cleanParams.search = params.search;
    if (params.page) cleanParams.page = String(params.page);
    if (params.limit) cleanParams.limit = String(params.limit);

    const query = new URLSearchParams(cleanParams).toString();
    const response = await fetch(`${API_BASE_URL}/admin/users?${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  },

  async updateUserStatus(
    token: string,
    userId: string,
    status: "ACTIVE" | "WARNING" | "BLOCKED",
    reason?: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/admin/users/${userId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reason }),
      },
    );
    return response.json();
  },

  async getPendingKyc(token: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/admin/kyc/pending`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  },

  async submitReport(
    payload: { target_user_id: string; reason: string },
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/users/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to submit report");
    }
    return result;
  },

  async getAdminReports(token: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/admin/reports`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  },

  async getAdminBookings(
    token: string,
    params: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponse<any>> {
    const cleanParams: Record<string, string> = {};
    if (params.status) cleanParams.status = params.status;
    if (params.page) cleanParams.page = String(params.page);
    if (params.limit) cleanParams.limit = String(params.limit);

    const query = new URLSearchParams(cleanParams).toString();
    const response = await fetch(`${API_BASE_URL}/admin/bookings?${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  },

  async updateReportStatus(
    token: string,
    reportId: number,
    status_name: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/admin/reports/${reportId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status_name }),
      },
    );
    return response.json();
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
    payload: {
      category?: string;
      title?: string;
      description?: string;
      location?: string;
    },
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
    reason?: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/bookings/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ booking_id: bookingId, status, reason }),
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

  async markNotificationAsRead(
    notificationId: number,
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/photographer/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

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

  async getImageLikes(
    imageId: number,
    token: string,
  ): Promise<
    ApiResponse<
      Array<{
        user_id: string;
        full_name: string;
        profile_image: string | null;
        email?: string;
        bio?: string;
        role?: string;
      }>
    >
  > {
    const response = await fetch(
      `${API_BASE_URL}/photographer/portfolio/images/${imageId}/likes`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    // If the endpoint doesn't exist yet (returns HTML), gracefully return empty
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return { success: true, message: "OK", data: [] };
    }

    const result = await response.json();
    if (!response.ok) {
      // 404 just means endpoint not implemented — return empty silently
      if (response.status === 404) {
        return { success: true, message: "OK", data: [] };
      }
      throw new Error(result.message || "Failed to fetch likes");
    }
    return result;
  },

  async getUserById(userId: string, token: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Gracefully handle non-JSON responses (e.g. HTML 404 pages)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return { success: false, message: "Endpoint not available", data: null };
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch user details");
    }
    return result;
  },

  // Rewards APIs
  async getMyRewards(token: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/rewards/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch rewards");
    }
    return result;
  },

  async getLeaderboard(limit: number = 50): Promise<ApiResponse<any[]>> {
    const response = await fetch(
      `${API_BASE_URL}/rewards/leaderboard?limit=${limit}`,
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch leaderboard");
    }
    return result;
  },

  // Availability APIs
  async getPhotographerAvailability(
    photographerId: string,
  ): Promise<ApiResponse<Array<{ id: number; date: string; reason: string }>>> {
    const response = await fetch(
      `${API_BASE_URL}/availability/${photographerId}`,
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch availability");
    }
    return result;
  },

  async savePhotographerAvailability(
    dates: Array<{ date: string; reason?: string }>,
    token: string,
  ): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/availability`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ dates }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to save availability");
    }
    return result;
  },

  async deletePhotographerAvailability(
    dates: string[],
    token: string,
  ): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/availability`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ dates }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to delete availability");
    }
    return result;
  },

  async initiatePayment(
    payload: {
      booking_id: number;
      amount: number;
      return_url: string;
      website_url: string;
    },
    token: string,
  ) {
    const response = await fetch(`${API_BASE_URL}/payment/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  async verifyPayment(pidx: string, token: string, booking_id?: number) {
    const response = await fetch(`${API_BASE_URL}/payment/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pidx, booking_id }),
    });
    return response.json();
  },

  async getPaymentDetails(
    bookingId: number,
    token: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/payment/details/${bookingId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch payment details");
    }
    return result;
  },

  // Favorite Photographers APIs
  async toggleFavoritePhotographer(
    photographerId: string,
    token: string,
  ): Promise<ApiResponse<{ isFavorited: boolean }>> {
    const response = await fetch(
      `${API_BASE_URL}/client/favorites/${photographerId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        "This feature is not yet available on the backend. Please contact the administrator.",
      );
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to toggle favorite");
    }
    return result;
  },

  async getFavoritePhotographers(token: string): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${API_BASE_URL}/client/favorites`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        "This feature is not yet available on the backend. Please contact the administrator.",
      );
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch favorites");
    }
    return result;
  },

  async getFavoritePhotographerIds(
    token: string,
  ): Promise<ApiResponse<{ favoriteIds: string[] }>> {
    const response = await fetch(`${API_BASE_URL}/client/favorites/ids`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // Return empty array if endpoint doesn't exist yet
      return { success: true, message: "OK", data: { favoriteIds: [] } };
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch favorite IDs");
    }
    return result;
  },
};
