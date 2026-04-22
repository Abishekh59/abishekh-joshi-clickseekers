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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { UniversalCalendar } from "../../components/UniversalCalendar";
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
  const Text = ThemedText;
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

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerField, setDatePickerField] = useState<
    "dob" | "issue" | "expiry" | null
  >(null);
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
    if (currentStep === 1) {
      if (!isStep1Valid) {
        Alert.alert(
          "Incomplete details",
          "Please complete your personal information.",
        );
        return;
      }
      if (dateOfBirth) {
        const selectedDate = new Date(dateOfBirth);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
          Alert.alert(
            "Invalid Date",
            "Date of Birth cannot be in the future. Please select a valid date.",
          );
          return;
        }
      } else {
        Alert.alert("Required Field", "Please select your Date of Birth.");
        return;
      }
    }

    if (currentStep === 2) {
      if (!isStep2Valid) {
        Alert.alert(
          "Incomplete document details",
          "Please complete your document information.",
        );
        return;
      }
      if (!isStep2DocsValid) {
        Alert.alert(
          "Missing Document Image",
          "Front image of the document is required.",
        );
        return;
      }
    }

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
      Alert.alert(
        "KYC Submitted",
        "The KYC form is filled. Your KYC will be under review.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/Photographer/PhotographerProfile"),
          },
        ],
      );
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
        ? isStep2Valid
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
            onPress={() => {
              Alert.alert(
                "Registration Completed",
                "You can complete KYC verification later.",
                [
                  {
                    text: "OK",
                    onPress: () =>
                      router.replace("/Photographer/PhotographerProfile"),
                  },
                ],
              );
            }}
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

  const applyPickedDate = (dateStr: string) => {
    if (datePickerField === "dob") setDateOfBirth(dateStr);
    if (datePickerField === "issue") setIssueDate(dateStr);
    if (datePickerField === "expiry") setExpiryDate(dateStr);
    setDatePickerOpen(false);
  };

  const openDatePicker = (field: "dob" | "issue" | "expiry") => {
    setDatePickerField(field);
    setDatePickerOpen(true);
  };

  const renderDatePickerModal = () => {
    const today = new Date().toISOString().split("T")[0];
    const currentValue =
      datePickerField === "dob"
        ? dateOfBirth
        : datePickerField === "issue"
          ? issueDate
          : expiryDate;

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

            <View style={{ padding: 16 }}>
              <UniversalCalendar
                mode="single"
                selectedDates={currentValue ? [currentValue] : []}
                onSelectDates={(dates) => applyPickedDate(dates[0])}
                initialDate={currentValue || today}
                maxDate={datePickerField === "dob" ? today : undefined}
                showLegend={false}
              />
            </View>

            <View style={styles.dateModalActions}>
              <TouchableOpacity
                style={[styles.backBtn, { flex: 1 }]}
                onPress={() => setDatePickerOpen(false)}
              >
                <Text style={styles.backBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
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

  const renderActionButtons = () => (
    <View style={styles.scrollFooter}>
      <TouchableOpacity
        testID="kyc-back-button"
        style={styles.backBtn}
        onPress={handleBack}
      >
        <Text style={styles.backBtnText}>
          {currentStep === 1 ? "Cancel" : "Back"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="kyc-next-button"
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
          currentStep === 3
            ? submitButtonDisabled
            : isSubmitting || isLoadingStatus
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
  );

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
              testID="kyc-full-name"
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
              testID="kyc-dob-picker"
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
              testID="kyc-gender-picker"
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
              testID="kyc-contact-number"
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
              testID="kyc-email"
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
              testID="kyc-province-picker"
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
              testID="kyc-district-picker"
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
              testID="kyc-city"
              style={styles.input}
              placeholder="e.g., Thamel"
              placeholderTextColor="#9ca3af"
              value={city}
              onChangeText={setCity}
            />
          </View>
        </View>

        {/* Action Buttons inside scroll */}
        {renderActionButtons()}
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
              testID="kyc-doc-type-picker"
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
              testID="kyc-doc-number"
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
              testID="kyc-issued-by"
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
              testID="kyc-issue-date-picker"
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
            {/* Hidden button for E2E testing to "mock" image selection */}
            <TouchableOpacity
              testID="test-set-front-image"
              style={{ height: 1, opacity: 0 }}
              onPress={() => {
                setFrontImageAsset({
                  uri: "file:///dummy.jpg",
                  width: 100,
                  height: 100,
                  mimeType: "image/jpeg",
                  assetId: "test-id",
                  base64: "dummybase64",
                  duration: 0,
                  exif: {},
                  fileName: "dummy.jpg",
                  fileSize: 1024,
                  type: "image",
                } as any);
                setDocumentFrontUrl("file:///dummy.jpg");
              }}
            />
            <TouchableOpacity
              testID="kyc-front-image-picker"
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

        {/* Action Buttons inside scroll */}
        {renderActionButtons()}
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

        {/* Action Buttons inside scroll */}
        {renderActionButtons()}
      </View>
    </ScrollView>
  );

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
  scrollFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
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
  dateModalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
});
