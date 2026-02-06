import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";

import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiService, KycFormPayload, KycStatusData } from "../../services/api";
import { storage } from "../../utils/storage";

interface KYCVerificationProps {
  onBack?: () => void;
  onComplete?: () => void;
}

export default function KYCVerification({
  onBack,
  onComplete,
}: KYCVerificationProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatusData | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Step 1 - Personal Information
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");

  const [genderPickerVisible, setGenderPickerVisible] = useState(false);
  const [provincePickerVisible, setProvincePickerVisible] = useState(false);
  const [districtPickerVisible, setDistrictPickerVisible] = useState(false);

  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);

  // Step 2 - Document Verification
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [documentTypePickerVisible, setDocumentTypePickerVisible] =
    useState(false);
  const [documentFrontUrl, setDocumentFrontUrl] = useState("");
  const [documentBackUrl, setDocumentBackUrl] = useState("");

  const [frontImageAsset, setFrontImageAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [backImageAsset, setBackImageAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);

  // Step 3 - Review & Submit
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [authorizeVerify, setAuthorizeVerify] = useState(false);
  const [understandFalse, setUnderstandFalse] = useState(false);

  // Date picker state
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerField, setDatePickerField] = useState<
    "dob" | "issue" | "expiry" | null
  >(null);
  const [datePickerValue, setDatePickerValue] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date()); // first day of month

  // Add a fallback list so picker always works even if the package fails to load.
  const FALLBACK_NEPAL_DISTRICTS = useMemo(
    () => [
      "Achham",
      "Arghakhanchi",
      "Baglung",
      "Baitadi",
      "Bajhang",
      "Bajura",
      "Banke",
      "Bara",
      "Bardiya",
      "Bhaktapur",
      "Bhojpur",
      "Chitwan",
      "Dadeldhura",
      "Dailekh",
      "Dang",
      "Darchula",
      "Dhading",
      "Dhankuta",
      "Dhanusha",
      "Dolakha",
      "Dolpa",
      "Doti",
      "Eastern Rukum",
      "Gorkha",
      "Gulmi",
      "Humla",
      "Ilam",
      "Jajarkot",
      "Jhapa",
      "Jumla",
      "Kailali",
      "Kalikot",
      "Kanchanpur",
      "Kapilvastu",
      "Kaski",
      "Kathmandu",
      "Kavrepalanchok",
      "Khotang",
      "Lalitpur",
      "Lamjung",
      "Mahottari",
      "Makwanpur",
      "Manang",
      "Morang",
      "Mugu",
      "Mustang",
      "Myagdi",
      "Nawalparasi East",
      "Nawalparasi West",
      "Nuwakot",
      "Okhaldhunga",
      "Palpa",
      "Panchthar",
      "Parasi",
      "Parbat",
      "Parsa",
      "Pyuthan",
      "Ramechhap",
      "Rasuwa",
      "Rautahat",
      "Rolpa",
      "Rupandehi",
      "Salyan",
      "Sankhuwasabha",
      "Saptari",
      "Sarlahi",
      "Sindhuli",
      "Sindhupalchok",
      "Siraha",
      "Solukhumbu",
      "Sunsari",
      "Surkhet",
      "Syangja",
      "Tanahun",
      "Taplejung",
      "Terhathum",
      "Udayapur",
      "Western Rukum",
    ],
    [],
  );

  const loadDistrictOptions = async () => {
    // IMPORTANT: Do NOT import/require @nepalutils/nepal-geodata in React Native.
    // It depends on Node's `fs` and will crash Metro bundling (UnableToResolveError: fs).
    setIsLoadingDistricts(true);
    try {
      setDistrictOptions(FALLBACK_NEPAL_DISTRICTS);
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const documentTypeOptions = useMemo(
    () => ["CITIZENSHIP", "PASSPORT", "DRIVING_LICENSE"] as const,
    [],
  );

  const userRoleForKyc = "PHOTOGRAPHER";

  const fetchKycStatus = async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    try {
      const token = await storage.getToken();
      if (!token) {
        setStatusError("Please login again to continue.");
        setKycStatus(null);
        return;
      }

      // Fix: Ensure apiService.getKycStatus(token) returns a valid JSON object
      // If your apiService uses fetch, add .json() parsing and handle non-JSON responses
      let result;
      try {
        // Fix: Remove fetch Response handling, use as-is
        result = await apiService.getKycStatus(token);
        // No need to check for .json() method, result is already parsed
      } catch (e: any) {
        // If the error is a network error or a JSON parse error, show a helpful message
        if (
          e?.message?.includes("Unexpected token") ||
          e?.message?.includes("Unexpected character <")
        ) {
          setStatusError(
            "Server returned an invalid response. Please check your network or contact support.",
          );
          setKycStatus(null);
          return;
        }
        setStatusError(String(e?.message || "Failed to fetch KYC status"));
        setKycStatus(null);
        return;
      }

      // If result.data is HTML, show error
      if (
        typeof result?.data === "string" &&
        (result.data as string).trim().startsWith("<")
      ) {
        setStatusError(
          "Server returned HTML instead of JSON. Please check your API endpoint or authentication.",
        );
        setKycStatus(null);
        return;
      }

      setKycStatus(result.data ?? null);

      // Prefill what we can from existing submission (doc fields only).
      if (result.data) {
        setDocumentType(result.data.document_type || "");
        setDocumentNumber(result.data.document_number || "");
        setDocumentFrontUrl(result.data.document_front_url || "");
        setDocumentBackUrl(result.data.document_back_url || "");

        // Clear local picks when loading server state
        setFrontImageAsset(null);
        setBackImageAsset(null);
      }
    } catch (e: any) {
      const msg = String(e?.message || "Failed to fetch KYC status");
      if (msg.toLowerCase().includes("no kyc submission")) {
        setKycStatus(null);
      } else {
        setStatusError(msg);
      }
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    (async () => {
      // Load Nepal districts (robust + fallback)
      await loadDistrictOptions();

      // Prefill from saved user (best-effort)
      const user = await storage.getUser();
      if (user?.full_name && !fullName) setFullName(user.full_name);
      if (user?.email && !email) setEmail(user.email);
      if (user?.phone && !contactNumber) setContactNumber(user.phone);
      await fetchKycStatus();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      if (typeof onBack === "function") onBack();
    }
  };

  const canEditOrSubmit =
    kycStatus?.status !== "APPROVED" && kycStatus?.status !== "PENDING";

  const ensureMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to upload documents.",
      );
      return false;
    }
    return true;
  };

  const pickImage = async (side: "front" | "back") => {
    const ok = await ensureMediaPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    // Show loading indicator
    if (side === "front") setIsUploadingFront(true);
    else setIsUploadingBack(true);

    try {
      const token = await storage.getToken();
      if (!token) {
        Alert.alert("Error", "Session expired. Please login again.");
        return;
      }

      const uploadResult = await apiService.uploadKycDocument(
        {
          uri: asset.uri,
          name: asset.fileName || `kyc_${side}_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        },
        token,
      );

      if (uploadResult.success && uploadResult.data) {
        if (side === "front") {
          setDocumentFrontUrl(uploadResult.data.url);
          setFrontImageAsset(asset);
        } else {
          setDocumentBackUrl(uploadResult.data.url);
          setBackImageAsset(asset);
        }
      }
    } catch (error: any) {
      Alert.alert(
        "Upload Error",
        error.message || "Failed to upload document image.",
      );
    } finally {
      if (side === "front") setIsUploadingFront(false);
      else setIsUploadingBack(false);
    }
  };

  const submitKyc = async () => {
    if (!isStep1Valid) {
      Alert.alert(
        "Incomplete details",
        "Please complete your personal information.",
      );
      setCurrentStep(1);
      return;
    }
    if (!isStep2Valid) {
      Alert.alert(
        "Incomplete document details",
        "Please complete your document information.",
      );
      setCurrentStep(2);
      return;
    }
    if (!isStep3Valid) {
      Alert.alert(
        "Consents required",
        "Please accept all declarations and consents.",
      );
      return;
    }

    // Extra validation for backend requirements
    if (!documentNumber.trim()) {
      Alert.alert("Missing Document Number", "Document number is required.");
      setCurrentStep(2);
      return;
    }
    // Accept either a picked image or a URL
    if (!frontImageAsset && !documentFrontUrl.trim()) {
      Alert.alert(
        "Missing Document Image",
        "Front image of the document is required.",
      );
      setCurrentStep(2);
      return;
    }
    // Use the backend-provided URLs stored in documentFrontUrl and documentBackUrl
    let submitDocumentFrontUrl = documentFrontUrl.trim();
    let submitDocumentBackUrl = documentBackUrl.trim();

    if (kycStatus?.status === "PENDING") {
      Alert.alert(
        "Under review",
        "Your KYC is already submitted and awaiting admin review.",
      );
      return;
    }
    if (kycStatus?.status === "APPROVED") {
      Alert.alert("Verified", "Your KYC is already approved.");
      return;
    }

    const normalizedDocumentType = documentType.trim().toUpperCase();
    if (!documentTypeOptions.includes(normalizedDocumentType as any)) {
      Alert.alert(
        "Invalid document type",
        "Please select a valid document type.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await storage.getToken();
      if (!token) {
        Alert.alert("Unauthorized", "Please login again to submit KYC.");
        return;
      }

      // Only use form fields, do not upload images
      const payload: KycFormPayload = {
        full_name: fullName.trim(),
        date_of_birth: dateOfBirth.trim() ? dateOfBirth.trim() : undefined,
        gender: gender.trim() ? gender.trim() : undefined,
        contact_number: contactNumber.trim(),
        email: email.trim(),
        address_city: city.trim(),
        address_district: district.trim(),
        address_province: province.trim(),
        user_role: userRoleForKyc,
        document_type:
          normalizedDocumentType as KycFormPayload["document_type"],
        document_number: documentNumber.trim(),
        issued_by: issuedBy.trim() ? issuedBy.trim() : undefined,
        issue_date: issueDate.trim() ? issueDate.trim() : undefined,
        expiry_date: expiryDate.trim() ? expiryDate.trim() : undefined,
        document_front_url: submitDocumentFrontUrl,
        document_back_url: submitDocumentBackUrl || undefined,
        consent_confirmed: Boolean(confirmAccurate),
        consent_verify: Boolean(authorizeVerify),
        consent_false_info: Boolean(understandFalse),
      };

      let result;
      try {
        result = await apiService.submitKycForm(payload, token);
      } catch (e: any) {
        // Handle JSON parse errors or HTML response
        if (
          e?.message?.includes("Unexpected token") ||
          e?.message?.includes("Unexpected character <")
        ) {
          Alert.alert(
            "Submission failed",
            "Server returned an invalid response. Please check your network or contact support.",
          );
          return;
        }
        throw e;
      }

      // If result.data is HTML, show error
      if (
        typeof result?.data === "string" &&
        (result.data as string).trim().startsWith("<")
      ) {
        Alert.alert(
          "Submission failed",
          "Server returned HTML instead of JSON. Please check your API endpoint or authentication.",
        );
        return;
      }

      setKycStatus(result.data ?? null);
      Alert.alert("KYC submitted", "KYC submitted. Awaiting admin review.");
      if (typeof onComplete === "function") onComplete();
    } catch (e: any) {
      Alert.alert(
        "Submission failed",
        String(e?.message || "Failed to submit KYC"),
      );
    } finally {
      setIsUploadingFront(false);
      setIsUploadingBack(false);
      setIsSubmitting(false);
    }
  };

  const isStep1Valid =
    fullName.trim().length > 0 &&
    contactNumber.trim().length > 0 &&
    email.trim().length > 0 &&
    province.trim().length > 0 &&
    district.trim().length > 0 &&
    city.trim().length > 0;

  const isStep2Valid =
    documentType.trim().length > 0 && documentNumber.trim().length > 0;

  const isStep2DocsValid =
    documentFrontUrl.trim().length > 0 || Boolean(frontImageAsset);

  const isStep2AllValid = isStep2Valid && isStep2DocsValid;

  const isStep3Valid = confirmAccurate && authorizeVerify && understandFalse;

  const isCurrentStepValid =
    currentStep === 1
      ? isStep1Valid
      : currentStep === 2
        ? isStep2AllValid
        : isStep3Valid;

  const submitButtonDisabled =
    isSubmitting || isLoadingStatus || !isStep3Valid || !canEditOrSubmit;

  const submitButtonLabel = isSubmitting
    ? "Submitting..."
    : kycStatus?.status === "PENDING"
      ? "Under Review"
      : kycStatus?.status === "APPROVED"
        ? "Verified"
        : "Submit for Verification";

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(currentStep / 3) * 100}%` },
          ]}
        />
      </View>
    </View>
  );

  const renderScrollableHeader = () => (
    <View
      style={[
        styles.header,
        { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 16 },
      ]}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.headerIconButton, styles.headerLeftButton]}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>KYC Verification</Text>
          {currentStep < 3 && (
            <Text style={styles.skipHint}>Step {currentStep} of 3</Text>
          )}
        </View>

        {currentStep < 3 ? (
          <TouchableOpacity
            style={styles.headerRightButton}
            onPress={() => router.push("/Photographer/PhotographerDashboard")}
          >
            <Text style={styles.skipText}>Skip For Now</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRightSpacer} />
        )}
      </View>
    </View>
  );

  const footerBottomSpacing = 8;
  const tabBarHeight = 30;
  const footerHeightEstimate = 80; // Increased from 30 to 80 to ensure buttons are visible
  const scrollBottomPadding =
    footerBottomSpacing + tabBarHeight + footerHeightEstimate;

  const genderOptions = ["Male", "Female", "Other"];
  const provinceOptions = [
    "Koshi Province",
    "Madhesh Province",
    "Bagmati Province",
    "Gandaki Province",
    "Lumbini Province",
    "Karnali Province",
    "Sudurpashchim Province",
  ];

  const renderPickerModal = (
    visible: boolean,
    title: string,
    options: string[],
    onSelect: (value: string) => void,
    onClose: () => void,
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
          >
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.modalOption}
                onPress={() => {
                  onSelect(opt);
                  onClose();
                }}
              >
                <Text style={styles.modalOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const formatDocTypeLabel = (value: string) => {
    const v = value.replace(/_/g, " ").toLowerCase();
    return v.replace(/\b\w/g, (m) => m.toUpperCase());
  };

  const renderStatusBanner = () => {
    if (isLoadingStatus) {
      return (
        <View style={styles.statusBanner}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.statusBannerText}>Checking your KYC status…</Text>
        </View>
      );
    }

    if (statusError) {
      // Don't show error banner for "No KYC submission found" as it's expected for new users
      if (statusError.toLowerCase().includes("no kyc submission")) {
        return null;
      }

      return (
        <View style={[styles.statusBanner, styles.statusBannerError]}>
          <Ionicons name="alert-circle" size={18} color="#b91c1c" />
          <Text style={[styles.statusBannerText, styles.statusBannerTextError]}>
            {statusError}
          </Text>
          <TouchableOpacity
            onPress={fetchKycStatus}
            style={styles.statusBannerAction}
          >
            <Text style={styles.statusBannerActionText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!kycStatus) return null;

    const status = String(kycStatus.status || "").toUpperCase();
    const isPending = status === "PENDING";
    const isApproved = status === "APPROVED";
    const isRejected = status === "REJECTED";

    return (
      <View
        style={[
          styles.statusBanner,
          isPending && styles.statusBannerPending,
          isApproved && styles.statusBannerApproved,
          isRejected && styles.statusBannerRejected,
        ]}
      >
        <Ionicons
          name={
            isApproved
              ? "checkmark-circle"
              : isRejected
                ? "close-circle"
                : "time"
          }
          size={18}
          color={isApproved ? "#065f46" : isRejected ? "#b91c1c" : "#92400e"}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusBannerTitle}>KYC Status: {status}</Text>
          {isRejected && kycStatus.remarks ? (
            <Text style={styles.statusBannerSubtitle}>
              Remarks: {kycStatus.remarks}
            </Text>
          ) : (
            <Text style={styles.statusBannerSubtitle}>
              {isPending
                ? "Your KYC is submitted and under review."
                : isApproved
                  ? "Your KYC is verified."
                  : "You can resubmit your KYC."}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const monthLabel = (d: Date) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const addMonths = (d: Date, delta: number) =>
    new Date(d.getFullYear(), d.getMonth() + delta, 1);

  const openDatePicker = (field: "dob" | "issue" | "expiry") => {
    setDatePickerField(field);
    const current =
      field === "dob"
        ? parseYYYYMMDD(dateOfBirth)
        : field === "issue"
          ? parseYYYYMMDD(issueDate)
          : parseYYYYMMDD(expiryDate);

    const base = current ?? new Date();
    setDatePickerValue(base);
    setCalendarMonth(startOfMonth(base));
    setDatePickerOpen(true);
  };

  const applyPickedDate = (d: Date) => {
    const val = formatYYYYMMDD(d);
    if (datePickerField === "dob") setDateOfBirth(val);
    if (datePickerField === "issue") setIssueDate(val);
    if (datePickerField === "expiry") setExpiryDate(val);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Add year dropdown state
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [yearDropdownYears, setYearDropdownYears] = useState<number[]>([]);
  const [yearDropdownSelected, setYearDropdownSelected] = useState<number>(
    new Date().getFullYear(),
  );

  // Helper to get years for dropdown (1900 to current year)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= 1900; y--) years.push(y);
    return years;
  };

  // When calendarMonth changes, update year dropdown selected
  React.useEffect(() => {
    setYearDropdownSelected(calendarMonth.getFullYear());
    setYearDropdownYears(getYearOptions());
  }, [calendarMonth]);

  // Year dropdown modal
  const renderYearDropdown = () => (
    <Modal
      visible={yearDropdownOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setYearDropdownOpen(false)}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.modalOverlay}
        onPress={() => setYearDropdownOpen(false)}
      >
        <View style={styles.yearDropdownSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Year</Text>
            <TouchableOpacity
              onPress={() => setYearDropdownOpen(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={18} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 320 }}>
            {yearDropdownYears.map((y) => (
              <TouchableOpacity
                key={y}
                style={[
                  styles.yearDropdownItem,
                  y === yearDropdownSelected && styles.yearDropdownItemSelected,
                ]}
                onPress={() => {
                  setYearDropdownSelected(y);
                  setCalendarMonth(new Date(y, calendarMonth.getMonth(), 1));
                  setYearDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.yearDropdownText,
                    y === yearDropdownSelected &&
                      styles.yearDropdownTextSelected,
                  ]}
                >
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderDatePickerModal = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const maxDob = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    // Build cells: leading blanks + days
    const cells: Array<{ key: string; date?: Date }> = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ key: `b-${i}` });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ key: `d-${d}`, date: new Date(year, month, d) });

    const isDob = datePickerField === "dob";

    return (
      <Modal
        visible={datePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setDatePickerOpen(false)}
        >
          <View style={styles.dateModalSheet}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.modalTitle}>
                {datePickerField === "dob"
                  ? "Select Date of Birth"
                  : datePickerField === "issue"
                    ? "Select Issue Date"
                    : "Select Expiry Date"}
              </Text>
              <TouchableOpacity
                onPress={() => setDatePickerOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() => setCalendarMonth((m) => addMonths(m, -1))}
              >
                <Ionicons name="chevron-back" size={18} color="#111827" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.yearDropdownBtn}
                onPress={() => setYearDropdownOpen(true)}
              >
                <Text style={styles.calendarHeaderText}>
                  {monthLabel(calendarMonth)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color="#111827"
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() => setCalendarMonth((m) => addMonths(m, 1))}
              >
                <Ionicons name="chevron-forward" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((w, index) => (
                <Text key={`weekday-${index}`} style={styles.weekdayText}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {cells.map((c) => {
                if (!c.date)
                  return <View key={c.key} style={styles.dayCellEmpty} />;

                const disabled = isDob && c.date > maxDob;
                const selected = isSameDay(c.date, datePickerValue);

                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.dayCell,
                      selected && styles.dayCellSelected,
                      disabled && styles.dayCellDisabled,
                    ]}
                    disabled={disabled}
                    activeOpacity={0.85}
                    onPress={() => setDatePickerValue(c.date!)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.dayTextSelected,
                        disabled && styles.dayTextDisabled,
                      ]}
                    >
                      {c.date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.dateModalActions}>
              <TouchableOpacity
                style={[styles.backBtn, { flex: 1 }]}
                onPress={() => setDatePickerOpen(false)}
              >
                <Text style={styles.backBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 1 }]}
                onPress={() => {
                  applyPickedDate(datePickerValue);
                  setDatePickerOpen(false);
                }}
              >
                <Text style={styles.nextBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
          {renderYearDropdown()}
        </TouchableOpacity>
      </Modal>
    );
  };

  const submitButtonDisabledStep3 =
    isSubmitting || isLoadingStatus || !isStep3Valid || !canEditOrSubmit;

  const submitButtonLabelStep3 = isSubmitting
    ? "Submitting..."
    : kycStatus?.status === "PENDING"
      ? "Under Review"
      : kycStatus?.status === "APPROVED"
        ? "Verified"
        : "Submit for Verification";

  const renderStep1 = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={[
        styles.stepContent,
        { paddingBottom: scrollBottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {renderScrollableHeader()}

      <View style={styles.stepInner}>
        {renderProgressBar()}
        {renderStatusBanner()}
        <Text style={styles.stepTitle}>Personal Information</Text>
        <Text style={styles.stepSubtitle}>
          Please provide your accurate personal details
        </Text>

        {/* Basic Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#2563eb" />
            <Text style={styles.sectionTitle}>Basic Details</Text>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => openDatePicker("dob")}
            >
              <Text
                style={
                  dateOfBirth ? styles.dropdownText : styles.dropdownPlaceholder
                }
              >
                {dateOfBirth || "Select date"}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setGenderPickerVisible(true)}
            >
              <Text
                style={
                  gender ? styles.dropdownText : styles.dropdownPlaceholder
                }
              >
                {gender || "Select gender"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={18} color="#2563eb" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>
              Contact Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="98XXXXXXXX"
              placeholderTextColor="#9ca3af"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={18} color="#2563eb" />
            <Text style={styles.sectionTitle}>Address</Text>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>
              Province <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setProvincePickerVisible(true)}
            >
              <Text
                style={
                  province ? styles.dropdownText : styles.dropdownPlaceholder
                }
              >
                {province || "Select province"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>
              District <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                if (isLoadingDistricts) {
                  Alert.alert("Please wait", "Loading Nepal districts…");
                  return;
                }
                if (!districtOptions.length) {
                  Alert.alert(
                    "Unavailable",
                    "Could not load Nepal districts. Please try again.",
                  );
                  return;
                }
                setDistrictPickerVisible(true);
              }}
            >
              <Text
                style={
                  district ? styles.dropdownText : styles.dropdownPlaceholder
                }
              >
                {district ||
                  (isLoadingDistricts
                    ? "Loading districts…"
                    : "Select district")}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>
              City <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Thamel"
              placeholderTextColor="#9ca3af"
              value={city}
              onChangeText={setCity}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={[
        styles.stepContent,
        { paddingBottom: scrollBottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {renderScrollableHeader()}

      <View style={styles.stepInner}>
        {renderProgressBar()}
        {renderStatusBanner()}
        <Text style={styles.stepTitle}>Document Verification</Text>
        <Text style={styles.stepSubtitle}>
          Upload your identity document for verification
        </Text>

        {/* Document Type */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-outline" size={18} color="#2563eb" />
            <Text style={styles.sectionTitle}>Document Type</Text>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>
              Select Document Type <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setDocumentTypePickerVisible(true)}
            >
              <Text
                style={
                  documentType
                    ? styles.dropdownText
                    : styles.dropdownPlaceholder
                }
              >
                {documentType
                  ? formatDocTypeLabel(documentType)
                  : "Select document type"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>
              Document Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter document number"
              placeholderTextColor="#9ca3af"
              value={documentNumber}
              onChangeText={(text) => {
                setDocumentNumber(text);
                setDocumentNumberError("");
              }}
              keyboardType="number-pad"
              maxLength={20}
            />
            {!!documentNumberError && (
              <Text style={{ color: "red", fontSize: 12, marginTop: 2 }}>
                {documentNumberError}
              </Text>
            )}
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Issued By</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Govt. of Nepal"
              placeholderTextColor="#9ca3af"
              value={issuedBy}
              onChangeText={setIssuedBy}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Issue Date</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => openDatePicker("issue")}
            >
              <Text
                style={
                  issueDate ? styles.dropdownText : styles.dropdownPlaceholder
                }
              >
                {issueDate || "Select date"}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Only show Expiry Date for Passport and Driving License */}
          {(documentType === "PASSPORT" ||
            documentType === "DRIVING_LICENSE") && (
            <View style={styles.formField}>
              <Text style={styles.label}>Expiry Date</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => openDatePicker("expiry")}
              >
                <Text
                  style={
                    expiryDate
                      ? styles.dropdownText
                      : styles.dropdownPlaceholder
                  }
                >
                  {expiryDate || "Select date"}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Upload Documents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-upload-outline" size={18} color="#2563eb" />
            <Text style={styles.sectionTitle}>Upload Documents</Text>
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>
              Document Front Side <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage("front")}
            >
              {frontImageAsset?.uri ? (
                <Image
                  source={{ uri: frontImageAsset.uri }}
                  style={styles.docPreview}
                />
              ) : documentFrontUrl ? (
                <Image
                  source={{ uri: documentFrontUrl }}
                  style={styles.docPreview}
                />
              ) : (
                <>
                  <Ionicons name="image-outline" size={26} color="#6b7280" />
                  <Text style={styles.uploadText}>Choose Front Side Photo</Text>
                  <Text style={styles.uploadHint}>PNG, JPG (max 5MB)</Text>
                </>
              )}
            </TouchableOpacity>
            {(isUploadingFront || isSubmitting) && frontImageAsset ? (
              <Text style={styles.uploadingText}>Uploading front image…</Text>
            ) : null}
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Document Back Side (if applicable)</Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage("back")}
            >
              {backImageAsset?.uri ? (
                <Image
                  source={{ uri: backImageAsset.uri }}
                  style={styles.docPreview}
                />
              ) : documentBackUrl ? (
                <Image
                  source={{ uri: documentBackUrl }}
                  style={styles.docPreview}
                />
              ) : (
                <>
                  <Ionicons name="image-outline" size={26} color="#6b7280" />
                  <Text style={styles.uploadText}>Choose Back Side Photo</Text>
                  <Text style={styles.uploadHint}>Optional</Text>
                </>
              )}
            </TouchableOpacity>
            {(isUploadingBack || isSubmitting) && backImageAsset ? (
              <Text style={styles.uploadingText}>Uploading back image…</Text>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={[
        styles.stepContent,
        { paddingBottom: scrollBottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {renderScrollableHeader()}

      <View style={styles.stepInner}>
        {renderProgressBar()}
        {renderStatusBanner()}
        <Text style={styles.stepTitle}>Review & Submit</Text>
        <Text style={styles.stepSubtitle}>
          Review your information and accept the terms
        </Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#2563eb" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Please review your information before submitting
            </Text>
            <Text style={styles.infoText}>
              Your KYC will be reviewed by our admin team within 24-48 hours.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Declarations & Consent</Text>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setConfirmAccurate(!confirmAccurate)}
          >
            <View
              style={[
                styles.checkboxBox,
                confirmAccurate && styles.checkboxBoxChecked,
              ]}
            >
              {confirmAccurate && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm that all information provided is accurate and up-to-date
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAuthorizeVerify(!authorizeVerify)}
          >
            <View
              style={[
                styles.checkboxBox,
                authorizeVerify && styles.checkboxBoxChecked,
              ]}
            >
              {authorizeVerify && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I authorize ClickSeekers to verify my identity and documents
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setUnderstandFalse(!understandFalse)}
          >
            <View
              style={[
                styles.checkboxBox,
                understandFalse && styles.checkboxBoxChecked,
              ]}
            >
              {understandFalse && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I understand that providing false information may result in
              account suspension
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.privacyBox}>
          <Text style={styles.privacyText}>
            Your documents are encrypted and securely stored. We respect your
            privacy.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  // Fix: add missing date helpers (they were referenced but not defined)
  const formatYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseYYYYMMDD = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  // Document number validation state
  const [documentNumberError, setDocumentNumberError] = useState("");

  // Document number validation logic
  const validateDocumentNumber = () => {
    let valid = true;
    let error = "";
    if (!documentNumber.trim()) {
      error = "Document number is required.";
      valid = false;
    } else if (documentType === "CITIZENSHIP") {
      // Example: Nepali citizenship numbers are usually 6-12 digits, sometimes with dashes
      if (!/^\d{6,12}(-\d{1,4})?$/.test(documentNumber.trim())) {
        error = "Enter a valid citizenship number.";
        valid = false;
      }
    } else if (documentType === "PASSPORT") {
      // Example: Nepali passports are 2 letters + 7 digits (e.g., PA1234567)
      if (!/^[A-Z]{2}\d{7}$/.test(documentNumber.trim().toUpperCase())) {
        error = "Enter a valid passport number (e.g., PA1234567).";
        valid = false;
      }
    } else if (documentType === "DRIVING_LICENSE") {
      // Example: Nepali driving licenses are 8-16 digits, sometimes with dashes
      if (!/^\d{8,16}(-\d{1,4})?$/.test(documentNumber.trim())) {
        error = "Enter a valid driving license number.";
        valid = false;
      }
    }
    setDocumentNumberError(error);
    return valid;
  };

  return (
    <View style={styles.container}>
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {renderPickerModal(
        genderPickerVisible,
        "Select Gender",
        genderOptions,
        setGender,
        () => setGenderPickerVisible(false),
      )}

      {renderPickerModal(
        provincePickerVisible,
        "Select Province",
        provinceOptions,
        setProvince,
        () => setProvincePickerVisible(false),
      )}

      {renderPickerModal(
        districtPickerVisible,
        "Select District",
        districtOptions,
        setDistrict,
        () => setDistrictPickerVisible(false),
      )}

      {renderPickerModal(
        documentTypePickerVisible,
        "Select Document Type",
        documentTypeOptions as unknown as string[],
        setDocumentType,
        () => setDocumentTypePickerVisible(false),
      )}

      {renderDatePickerModal()}

      {/* Footer Buttons */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: footerBottomSpacing,
            marginBottom: tabBarHeight,
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>
            {currentStep === 1 ? "Cancel" : "Back"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            (!isCurrentStepValid ||
              (currentStep === 3
                ? submitButtonDisabled
                : isSubmitting || isLoadingStatus)) &&
              styles.nextBtnDisabled,
          ]}
          onPress={currentStep === 3 ? submitKyc : handleNext}
          disabled={
            !isCurrentStepValid ||
            (currentStep === 3
              ? submitButtonDisabled
              : isSubmitting || isLoadingStatus)
          }
        >
          <Text style={styles.nextBtnText}>
            {currentStep === 3
              ? submitButtonLabel
              : isLoadingStatus
                ? "Please wait…"
                : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  headerTop: {
    height: 44,
    justifyContent: "center",
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerLeftButton: {
    position: "absolute",
    left: 0,
    top: 4,
  },
  headerCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerRightButton: {
    position: "absolute",
    right: 0,
    top: 6,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerRightSpacer: {
    position: "absolute",
    right: 0,
    top: 4,
    width: 36,
    height: 36,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  skipHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  skipText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  progressContainer: {
    paddingHorizontal: 0,
    paddingVertical: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563eb",
  },
  stepContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  stepContent: {
    flexGrow: 1,
  },
  stepInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 16,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    marginBottom: 14,
  },
  statusBannerPending: {
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
  },
  statusBannerApproved: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  statusBannerRejected: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  statusBannerError: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  statusBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  statusBannerTextError: {
    color: "#b91c1c",
  },
  statusBannerTitle: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "800",
  },
  statusBannerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "600",
  },
  statusBannerAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(185,28,28,0.10)",
  },
  statusBannerActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#b91c1c",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#dc2626",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: "#111827",
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: "#9ca3af",
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  docPreview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  uploadHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "700",
  },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e40af",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#3b82f6",
  },
  checkbox: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  privacyBox: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  privacyText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    minHeight: 48,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    minHeight: 48,
  },
  nextBtnDisabled: {
    backgroundColor: "#93c5fd",
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: 420,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  modalList: {
    paddingVertical: 6,
  },
  modalOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalOptionText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  dateModalSheet: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: 520,
  },
  dateModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarHeaderText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellSelected: {
    backgroundColor: "#2563eb",
    borderRadius: 999,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  dayTextSelected: {
    color: "#fff",
  },
  dayTextDisabled: {
    color: "#6b7280",
  },
  dateModalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  yearDropdownSheet: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: 400,
    marginHorizontal: 32,
    marginTop: 120,
  },
  yearDropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  yearDropdownItemSelected: {
    backgroundColor: "#eff6ff",
  },
  yearDropdownText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
  },
  yearDropdownTextSelected: {
    color: "#2563eb",
  },
  yearDropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
});
