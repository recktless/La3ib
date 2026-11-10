import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  SportType, 
  SkillLevel, 
  GenderPreference, 
  GameVisibility, 
  KuwaitArea,
  CostSharingMethod,
  getCostSharingMethods,
  isValidKuwaitMobile,
  formatKuwaitMobile,
  getTodayLocalDate,
  getKuwaitAreaLabel,
  ExtractedBookingData,
  formatTime12Hour
} from '../types';
import { 
  X, 
  Sparkles, 
  Calculator, 
  Users, 
  Check, 
  Plus, 
  ShieldCheck, 
  ShieldAlert,
  Calendar,
  Clock,
  MapPin,
  Lock,
  Unlock,
  DollarSign,
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  File,
  AlertCircle,
  Loader2,
  Info,
  ChevronDown
} from 'lucide-react';
import { MapLocationPicker, MapLocationValue } from './MapLocationPicker';
import { resolveGameLocation, getNearestKuwaitLocation } from '../lib/location';
import { uploadBookingConfirmation, deleteBookingConfirmation } from '../lib/firebase';
import { isLocationInKuwait } from '../lib/kuwaitGeo';

import { WheelTimePickerModal, WheelTimePickerModalProps } from './WheelTimePickerModal';

// Apple-inspired Wheel Time Picker (Hours 1-12, Exact: 00-59, AM/PM)
export const ManualTimePickerModal = WheelTimePickerModal;
export type ManualTimePickerModalProps = WheelTimePickerModalProps;

export const CreateGameModal: React.FC = () => {
  const { 
    createGameModalOpen, 
    setCreateGameModalOpen, 
    createGamePrefill, 
    setCreateGamePrefill,
    createGame, 
    updateGame,
    players, 
    currentUser,
    firebaseUser,
    authStatus,
    setAuthModalOpen,
    setAuthModalMode,
    language,
    t 
  } = useApp();

  const isRestricted = currentUser?.canOrganize === false;
  const isPrivilegeLoading = authStatus === 'loading';

  const [title, setTitle] = useState(() => createGamePrefill?.title || '');
  const [sport, setSport] = useState<SportType>(() => createGamePrefill?.sport || 'Football');
  const [date, setDate] = useState<string>(() => createGamePrefill?.date || getTodayLocalDate());
  const [startTime, setStartTime] = useState(() => createGamePrefill?.startTime || '20:00');
  const [endTime, setEndTime] = useState(() => createGamePrefill?.endTime || '21:30');
  const [courtName, setCourtName] = useState(() => createGamePrefill?.courtName || 'Mishref Youth Center Stadium');
  const [area, setArea] = useState<KuwaitArea>(() => (createGamePrefill?.area as KuwaitArea) || 'Mishref');
  const [address, setAddress] = useState(() => createGamePrefill?.address || '');

  // Collapsible Accordion sections state (Only Booking and Cost Sharing start collapsed)
  type SectionKey = 'basics' | 'datetime' | 'location' | 'players' | 'booking' | 'costSharing';
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    basics: true,
    datetime: true,
    location: true,
    players: true,
    booking: false,
    costSharing: false,
  });

  const toggleSection = (key: SectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const [mapLocation, setMapLocation] = useState<MapLocationValue>(() => {
    const res = resolveGameLocation(createGamePrefill || { coordinates: { x: 55, y: 52 } });
    return {
      coordinates: res.coordinates,
      latitude: res.latitude,
      longitude: res.longitude,
      locationLabel: res.locationLabel,
      area: createGamePrefill?.area || 'Mishref'
    };
  });
  const [isIndoor, setIsIndoor] = useState(() => createGamePrefill?.isIndoor ?? false);
  const [maxPlayers, setMaxPlayers] = useState(() => createGamePrefill?.maxPlayers || 10);
  const [totalCourtCostKWD, setTotalCourtCostKWD] = useState(() => createGamePrefill?.totalCourtCostKWD ?? 15.000);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(() => createGamePrefill?.skillLevel || 'Intermediate');
  const [gender, setGender] = useState<GenderPreference>(() => createGamePrefill?.gender || 'Everyone');
  const [visibility, setVisibility] = useState<GameVisibility>(() => createGamePrefill?.visibility || 'Public');
  const [description, setDescription] = useState(() => createGamePrefill?.description || '');
  const [costSharingEnabled, setCostSharingEnabled] = useState(() => Boolean(createGamePrefill?.costSharing?.enabled));
  const [selectedCostSharingMethods, setSelectedCostSharingMethods] = useState<CostSharingMethod[]>(() => {
    const methods = getCostSharingMethods(createGamePrefill?.costSharing);
    return methods.length > 0 ? methods : ['cash'];
  });
  const [wamdPhoneNumber, setWamdPhoneNumber] = useState<string>(() => createGamePrefill?.costSharing?.wamdPhoneNumber || '');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isLinkedLi3ibBooking, setIsLinkedLi3ibBooking] = useState(() => Boolean(createGamePrefill?.linkedBookingId));
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Universal Booking Confirmation Upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => (createGamePrefill as any)?.bookingConfirmationUrl || null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedBookingData | null>(null);
  const [confirmedBookingData, setConfirmedBookingData] = useState<ExtractedBookingData | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState<boolean>(false);
  const [reviewFormData, setReviewFormData] = useState<ExtractedBookingData | null>(null);
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({});
  const [activeTimePicker, setActiveTimePicker] = useState<'start' | 'end' | null>(null);
  const [showUploadInfoModal, setShowUploadInfoModal] = useState<boolean>(false);
  const [attachedBookingRemoved, setAttachedBookingRemoved] = useState<boolean>(false);

  // Centralized confirmed booking lock: strictly and permanently locks Date, Start Time, and End Time
  const hasAttachedConfirmedBooking = !attachedBookingRemoved && Boolean(
    isLinkedLi3ibBooking || 
    confirmedBookingData || 
    (createGamePrefill && (createGamePrefill.linkedBookingId || (createGamePrefill as any).bookingConfirmationUrl))
  );
  const isDateTimeLocked = hasAttachedConfirmedBooking;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const endTimeInputRef = useRef<HTMLInputElement>(null);

  // Initialize or prefill from Li3ib booking or existing game whenever the modal opens
  useEffect(() => {
    if (!createGameModalOpen) {
      return;
    }

    if (createGamePrefill) {
      setAttachedBookingRemoved(false);
      if (createGamePrefill.title) setTitle(createGamePrefill.title);
      if (createGamePrefill.sport) setSport(createGamePrefill.sport);
      setDate(createGamePrefill.date || getTodayLocalDate());
      if (createGamePrefill.startTime) setStartTime(createGamePrefill.startTime);
      if (createGamePrefill.endTime) setEndTime(createGamePrefill.endTime);
      if (createGamePrefill.courtName) setCourtName(createGamePrefill.courtName);
      if (createGamePrefill.area) setArea(createGamePrefill.area as KuwaitArea);
      if (createGamePrefill.address) setAddress(createGamePrefill.address);
      if (createGamePrefill.isIndoor !== undefined) setIsIndoor(createGamePrefill.isIndoor);
      if (createGamePrefill.maxPlayers) setMaxPlayers(createGamePrefill.maxPlayers);
      if (createGamePrefill.totalCourtCostKWD) setTotalCourtCostKWD(createGamePrefill.totalCourtCostKWD);
      if (createGamePrefill.skillLevel) setSkillLevel(createGamePrefill.skillLevel);
      if (createGamePrefill.description) setDescription(createGamePrefill.description);
      if (createGamePrefill.gender) setGender(createGamePrefill.gender);
      if (createGamePrefill.visibility) setVisibility(createGamePrefill.visibility);
      setIsLinkedLi3ibBooking(!!createGamePrefill.linkedBookingId);

      if ((createGamePrefill as any).bookingConfirmationUrl) {
        setPreviewUrl((createGamePrefill as any).bookingConfirmationUrl);
      }

      const resolved = resolveGameLocation(createGamePrefill);
      setMapLocation({
        coordinates: resolved.coordinates,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        locationLabel: resolved.locationLabel,
        area: createGamePrefill.area || getNearestKuwaitLocation(resolved.coordinates).area
      });

      // Preserve existing game cost-sharing settings if editing/prefilling, otherwise default OFF
      if (createGamePrefill.costSharing !== undefined) {
        setCostSharingEnabled(Boolean(createGamePrefill.costSharing.enabled));
        const methods = getCostSharingMethods(createGamePrefill.costSharing);
        setSelectedCostSharingMethods(methods.length > 0 ? methods : ['cash']);
        setWamdPhoneNumber(createGamePrefill.costSharing.wamdPhoneNumber || '');
      } else {
        // Default OFF
        setCostSharingEnabled(false);
        setSelectedCostSharingMethods(['cash']);
        setWamdPhoneNumber('');
      }
    } else {
      setTitle('');
      setSport('Football');
      setDate(getTodayLocalDate());
      setStartTime('20:00');
      setEndTime('21:30');
      setCourtName('Mishref Youth Center Stadium');
      setArea('Mishref');
      setAddress('');
      const defaultResolved = resolveGameLocation({ coordinates: { x: 55, y: 52 }, courtName: 'Mishref Youth Center Stadium', area: 'Mishref' });
      setMapLocation({
        coordinates: defaultResolved.coordinates,
        latitude: defaultResolved.latitude,
        longitude: defaultResolved.longitude,
        locationLabel: defaultResolved.locationLabel,
        area: 'Mishref'
      });
      setIsIndoor(false);
      setMaxPlayers(10);
      setTotalCourtCostKWD(15.000);
      setSkillLevel('Intermediate');
      setGender('Everyone');
      setVisibility('Public');
      setDescription('');
      // Default OFF for newly created games
      setCostSharingEnabled(false);
      setSelectedCostSharingMethods(['cash']);
      setWamdPhoneNumber('');
      setIsLinkedLi3ibBooking(false);

      // Reset booking confirmation states
      setUploadedFile(null);
      setPreviewUrl(null);
      setIsExtracting(false);
      setExtractionError(null);
      setExtractedData(null);
      setConfirmedBookingData(null);
      setShowReviewDialog(false);
      setReviewFormData(null);
      setLockedFields({});
      setAttachedBookingRemoved(false);
    }

    // Always reset accordion states to defaults: Booking & Cost Sharing collapsed, others expanded
    setExpandedSections({
      basics: true,
      datetime: true,
      location: true,
      players: true,
      booking: false,
      costSharing: false,
    });
  }, [createGamePrefill, createGameModalOpen]);

  if (!createGameModalOpen) return null;

  // Real-time automatic split calculation: Total court cost ÷ number of players = player's share
  const pricePerPlayer = maxPlayers > 0 
    ? parseFloat((totalCourtCostKWD / maxPlayers).toFixed(3))
    : 0;

  const toggleFriend = (id: string) => {
    setSelectedFriendIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleCostSharingMethod = (method: CostSharingMethod) => {
    setSelectedCostSharingMethods(prev => {
      const willBeSelected = !prev.includes(method);
      if (method === 'wamd' && !willBeSelected) {
        // If WAMD is deselected, hide the input and clear the saved WAMD number
        setWamdPhoneNumber('');
      }
      return willBeSelected ? [...prev, method] : prev.filter(item => item !== method);
    });
  };

  // Convert File to Base64 string for multimodal extraction
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Handle booking file selection and call AI extraction endpoint
  const handleFileSelect = async (file: File) => {
    if (!file) return;
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validMimes.includes(file.type)) {
      setExtractionError(t('Unsupported format. Please upload JPG, PNG, WebP, or PDF.', 'صيغة غير مدعومة. يرجى رفع ملف JPG أو PNG أو WebP أو PDF.'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setExtractionError(t('File size exceeds 10MB limit.', 'حجم الملف يتجاوز الحد الأقصى 10 ميجابايت.'));
      return;
    }

    if (!firebaseUser) {
      setExtractionError(t('Please sign in to your account to upload and verify booking documents.', 'يرجى تسجيل الدخول إلى حسابك لرفع مستندات الحجز والتحقق منها.'));
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }

    setUploadedFile(file);
    const objectUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPreviewUrl(objectUrl);
    setExtractionError(null);
    setIsExtracting(true);

    try {
      const idToken = await firebaseUser.getIdToken();
      const base64 = await fileToBase64(file);
      const res = await fetch('/api/extract-booking', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ fileBase64: base64, mimeType: file.type, fileName: file.name })
      });
      
      if (!res.ok) {
        const errorResult = await res.json().catch(() => null);
        throw new Error(errorResult?.error || `Extraction failed: ${res.statusText}`);
      }
      const result = await res.json();
      const extracted = result.extraction || result.data;
      if (result?.success && extracted) {
        setExtractedData(extracted);
        setReviewFormData({ ...extracted });
        setShowReviewDialog(true);
      } else {
        setExtractionError(result?.error || t('Could not extract details automatically. You can enter them manually.', 'تعذر استخراج التفاصيل تلقائياً. يمكنك إدخالها يدوياً.'));
      }
    } catch (err: any) {
      console.error('Booking extraction error:', err);
      setExtractionError(err?.message || t('Automatic extraction was unable to read this document. You can still create your game manually.', 'تعذر قراءة المستند تلقائياً. لا يزال بإمكانك إنشاء المباراة يدوياً.'));
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Apply reviewed booking details into the form
  const handleApplyReviewedBooking = () => {
    if (!reviewFormData) return;
    const d = reviewFormData;
    if (d.courtName || d.venueName) {
      setCourtName(d.courtName || d.venueName || '');
    }
    if (d.sport) {
      setSport(d.sport as SportType);
    }
    if (d.date) {
      setDate(d.date);
    }
    if (d.startTime) {
      setStartTime(d.startTime);
    }
    if (d.endTime) {
      setEndTime(d.endTime);
    }
    if (typeof d.totalPriceKWD === 'number' && !isNaN(d.totalPriceKWD) && d.totalPriceKWD >= 0) {
      setTotalCourtCostKWD(d.totalPriceKWD);
    }
    if (d.address) {
      setAddress(d.address);
    }
    if (d.area) {
      setArea(d.area as KuwaitArea);
    }

    const resolved = resolveGameLocation({
      courtName: d.courtName || d.venueName || courtName,
      area: (d.area as KuwaitArea) || area,
      address: d.address || address
    });
    let validLat = resolved.latitude;
    let validLng = resolved.longitude;
    if (!isLocationInKuwait(validLat, validLng)) {
      validLat = 29.3759;
      validLng = 47.9774;
    }
    setMapLocation({
      coordinates: resolved.coordinates,
      latitude: validLat,
      longitude: validLng,
      locationLabel: resolved.locationLabel,
      area: (d.area as KuwaitArea) || area
    });

    setConfirmedBookingData(d);
    setAttachedBookingRemoved(false);

    // Apply subtle locks to non-date-time extracted fields (sport, court, price)
    const newLocks: Record<string, boolean> = {};
    if (d.courtName || d.venueName) newLocks.courtName = true;
    if (d.sport) newLocks.sport = true;
    if (d.totalPriceKWD !== undefined && d.totalPriceKWD !== null) newLocks.totalCourtCostKWD = true;
    setLockedFields(newLocks);

    setShowReviewDialog(false);
  };

  // Remove uploaded booking confirmation and unlock fields
  const handleRemoveBooking = async () => {
    if (confirmedBookingData?.storagePath) {
      try {
        await deleteBookingConfirmation(confirmedBookingData.storagePath);
      } catch (e) {
        console.warn('Storage delete warning:', e);
      }
    }
    setAttachedBookingRemoved(true);
    setUploadedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setConfirmedBookingData(null);
    setReviewFormData(null);
    setLockedFields({});
    setIsLinkedLi3ibBooking(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (createGamePrefill) {
      (createGamePrefill as any).bookingConfirmationUrl = undefined;
      (createGamePrefill as any).bookingStoragePath = undefined;
      createGamePrefill.linkedBookingId = undefined;
      createGamePrefill.bookingRef = undefined;
    }
  };

  // Replace booking confirmation
  const handleReplaceBooking = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRestricted || isPrivilegeLoading) {
      if (isRestricted) {
        setErrorMessage(t(
          'Your account is currently not allowed to organize games or book pitches. Please contact an administrator for assistance.',
          'حسابك غير مصرح له حالياً بإنشاء مباريات أو حجز الملاعب. يرجى التواصل مع الإدارة للمساعدة.'
        ));
      }
      return;
    }
    if (!title.trim()) {
      setErrorMessage(t('Please enter a game title.', 'يرجى إدخال اسم المباراة.'));
      return;
    }
    if (!date) {
      setErrorMessage(t('Please select a game date.', 'يرجى تحديد تاريخ المباراة.'));
      return;
    }
    if (!startTime) {
      setErrorMessage(t('Please select a start time.', 'يرجى تحديد وقت البدء.'));
      return;
    }
    if (!courtName.trim()) {
      setErrorMessage(t('Please provide a venue or court name.', 'يرجى إدخال اسم الملعب.'));
      return;
    }
    if (!maxPlayers || maxPlayers < 2) {
      setErrorMessage(t('Max players must be at least 2.', 'الحد الأدنى لعدد اللاعبين هو 2.'));
      return;
    }

    if (!currentUser || (!firebaseUser && authStatus === 'unauthenticated')) {
      setErrorMessage(t('Please sign in to your account to publish a game.', 'يرجى تسجيل الدخول لنشر المباراة.'));
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }

    if (
      !mapLocation || 
      typeof mapLocation.latitude !== 'number' || 
      typeof mapLocation.longitude !== 'number' || 
      isNaN(mapLocation.latitude) || 
      isNaN(mapLocation.longitude) ||
      !isLocationInKuwait(mapLocation.latitude, mapLocation.longitude)
    ) {
      setErrorMessage(t(
        'Selected location must be within Kuwait. Please choose a venue or location inside Kuwait.',
        'يجب أن يكون الموقع المختار داخل دولة الكويت. يرجى اختيار ملعب أو موقع داخل الكويت.'
      ));
      return;
    }

    if (costSharingEnabled && selectedCostSharingMethods.length === 0) {
      setErrorMessage(t(
        'Please select at least one cost-sharing method (Cash, WAMD, or Request Link).',
        'يرجى اختيار طريقة واحدة على الأقل لتقاسم التكلفة (نقداً، ومض، أو طلب رابط).'
      ));
      return;
    }

    // WAMD Phone Number Validation
    if (costSharingEnabled && selectedCostSharingMethods.includes('wamd')) {
      if (!wamdPhoneNumber.trim()) {
        setErrorMessage(t(
          'Please enter a valid Kuwait mobile number for WAMD payments.',
          'يرجى إدخال رقم هاتف كويتي صالح لمدفوعات ومض.'
        ));
        return;
      }
      if (!isValidKuwaitMobile(wamdPhoneNumber)) {
        setErrorMessage(t(
          'Invalid Kuwait mobile number. Please enter a valid 8-digit Kuwait mobile number (+965 prefix supported).',
          'رقم الهاتف غير صالح. يرجى إدخال رقم هاتف كويتي صالح مكون من 8 أرقام (يدعم بادئة +965).'
        ));
        return;
      }
    }

    const formattedWamd = (costSharingEnabled && selectedCostSharingMethods.includes('wamd'))
      ? formatKuwaitMobile(wamdPhoneNumber)
      : undefined;

    // Verification: If a confirmed booking is attached, ensure submitted date/time match authoritative booking values
    if (hasAttachedConfirmedBooking) {
      if (confirmedBookingData) {
        if (confirmedBookingData.date && date !== confirmedBookingData.date) {
          setErrorMessage(t(
            'Submission rejected: Game date does not match the confirmed booking date.',
            'تم رفض الحفظ: تاريخ المباراة لا يتطابق مع تاريخ الحجز المؤكد.'
          ));
          return;
        }
        if (confirmedBookingData.startTime && startTime !== confirmedBookingData.startTime) {
          setErrorMessage(t(
            'Submission rejected: Start time does not match the confirmed booking start time.',
            'تم رفض الحفظ: وقت البداية لا يتطابق مع وقت بداية الحجز المؤكد.'
          ));
          return;
        }
        if (confirmedBookingData.endTime && endTime !== confirmedBookingData.endTime) {
          setErrorMessage(t(
            'Submission rejected: End time does not match the confirmed booking end time.',
            'تم رفض الحفظ: وقت النهاية لا يتطابق مع وقت نهاية الحجز المؤكد.'
          ));
          return;
        }
      } else if (createGamePrefill && (createGamePrefill.linkedBookingId || (createGamePrefill as any).bookingConfirmationUrl)) {
        if (createGamePrefill.date && date !== createGamePrefill.date) {
          setErrorMessage(t(
            'Submission rejected: Game date does not match the attached booking date.',
            'تم رفض الحفظ: تاريخ المباراة لا يتطابق مع تاريخ الحجز.'
          ));
          return;
        }
        if (createGamePrefill.startTime && startTime !== createGamePrefill.startTime) {
          setErrorMessage(t(
            'Submission rejected: Start time does not match the attached booking start time.',
            'تم رفض الحفظ: وقت البداية لا يتطابق مع وقت بداية الحجز.'
          ));
          return;
        }
        if (createGamePrefill.endTime && endTime !== createGamePrefill.endTime) {
          setErrorMessage(t(
            'Submission rejected: End time does not match the attached booking end time.',
            'تم رفض الحفظ: وقت النهاية لا يتطابق مع وقت نهاية الحجز.'
          ));
          return;
        }
      }
    }

    setErrorMessage(null);
    setSubmitting(true);
    console.log('[CreateGame Diagnostic] Starting game submission, submitting set to true');

    try {
      // Upload booking confirmation file if present and user has an identity
      let finalBookingUrl = (createGamePrefill as any)?.bookingConfirmationUrl || (confirmedBookingData?.storagePath ? previewUrl : undefined);
      let finalStoragePath = (createGamePrefill as any)?.bookingStoragePath || confirmedBookingData?.storagePath;

      if (uploadedFile) {
        const targetUid = firebaseUser?.uid || currentUser?.id;
        if (targetUid && targetUid !== 'guest') {
          try {
            const uploadRes = await uploadBookingConfirmation(uploadedFile, targetUid);
            finalBookingUrl = uploadRes.downloadUrl;
            finalStoragePath = uploadRes.storagePath;
          } catch (uploadErr) {
            console.warn('Booking file storage upload warning:', uploadErr);
          }
        }
      }

      if (createGamePrefill?.id) {
        await updateGame(createGamePrefill.id, {
          title: title.trim(),
          sport,
          date,
          startTime,
          endTime,
          courtName: courtName.trim(),
          area: (mapLocation.area as KuwaitArea) || area,
          address: address.trim(),
          coordinates: mapLocation.coordinates,
          latitude: mapLocation.latitude,
          longitude: mapLocation.longitude,
          locationLabel: mapLocation.locationLabel,
          isIndoor,
          maxPlayers: Number(maxPlayers),
          totalCourtCostKWD: Number(totalCourtCostKWD),
          pricePerPlayerKWD: pricePerPlayer,
          skillLevel,
          gender,
          visibility,
          description: description.trim() || undefined,
          bookingConfirmationUrl: finalBookingUrl,
          bookingStoragePath: finalStoragePath,
          costSharing: {
            enabled: costSharingEnabled,
            methods: costSharingEnabled ? selectedCostSharingMethods : undefined,
            method: costSharingEnabled && selectedCostSharingMethods.length > 0 ? selectedCostSharingMethods[0] : undefined,
            estimatedShare: costSharingEnabled ? pricePerPlayer : undefined,
            wamdPhoneNumber: formattedWamd
          }
        });
        console.log('[CreateGame Diagnostic] updateGame operation succeeded');
      } else {
        await createGame({
          title: title.trim(),
          sport,
          date,
          startTime,
          endTime,
          courtName: courtName.trim(),
          area: (mapLocation.area as KuwaitArea) || area,
          address: address.trim(),
          coordinates: mapLocation.coordinates,
          latitude: mapLocation.latitude,
          longitude: mapLocation.longitude,
          locationLabel: mapLocation.locationLabel,
          isIndoor,
          maxPlayers: Number(maxPlayers),
          totalCourtCostKWD: Number(totalCourtCostKWD),
          pricePerPlayerKWD: pricePerPlayer,
          skillLevel,
          gender,
          visibility,
          status: 'Open',
          description: description.trim() || undefined,
          linkedBookingId: createGamePrefill?.linkedBookingId,
          bookingRef: createGamePrefill?.bookingRef,
          bookingConfirmationUrl: finalBookingUrl,
          bookingStoragePath: finalStoragePath,
          cancellationPolicy: 'Free cancellation up to 4 hours before kickoff.',
          costSharing: {
            enabled: costSharingEnabled,
            methods: costSharingEnabled ? selectedCostSharingMethods : undefined,
            method: costSharingEnabled && selectedCostSharingMethods.length > 0 ? selectedCostSharingMethods[0] : undefined,
            estimatedShare: costSharingEnabled ? pricePerPlayer : undefined,
            wamdPhoneNumber: formattedWamd
          }
        });
        console.log('[CreateGame Diagnostic] createGame operation succeeded');
      }

      setCreateGamePrefill(null);
      setCreateGameModalOpen(false);
    } catch (err: any) {
      console.error('[CreateGame Diagnostic] Failed to create game:', {
        code: err?.code,
        message: err?.message || String(err)
      });
      let friendlyMsg = t('Failed to save match. Please check your connection and try again.', 'فشل حفظ المباراة. يرجى التحقق من الاتصال والمحاولة مجدداً.');
      if (err?.message?.includes('timed out') || err?.message?.includes('TIMEOUT')) {
        friendlyMsg = t('Operation timed out. Please check your connection and try again.', 'انتهت مهلة العملية. يرجى التحقق من الاتصال والمحاولة مجدداً.');
      } else if (err?.message?.includes('permission-denied') || err?.message?.includes('PERMISSION_DENIED')) {
        friendlyMsg = t('Permission denied: You must be signed in with a valid account to publish a game.', 'تم رفض الصلاحية: يجب تسجيل الدخول بحساب صالح لنشر المباراة.');
      } else if (err?.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) friendlyMsg = parsed.error;
        } catch {
          friendlyMsg = err.message;
        }
      }
      setErrorMessage(friendlyMsg);
    } finally {
      setSubmitting(false);
      console.log('[CreateGame Diagnostic] Loading state reset (submitting=false)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-[#22304E] bg-slate-50 dark:bg-[#0B1120]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1246DF]/10 dark:bg-[#05BCD1]/15 text-[#1246DF] dark:text-[#05BCD1] flex items-center justify-center font-bold text-base">
              +
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t('Create a Game in Kuwait', 'إنشاء مباراة جديدة في الكويت')}
              </h2>
              {isLinkedLi3ibBooking && (
                <p className="text-[11px] text-[#05BCD1] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {t('Imported seamlessly from your Li3ib booking', 'تم استيراد بيانات الحجز من Li3ib بنجاح')}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={() => {
              setCreateGameModalOpen(false);
              setCreateGamePrefill(null);
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {/* Prominent Restriction Warning Banner */}
          {isRestricted && (
            <div 
              data-testid="booking-restricted-banner"
              role="alert"
              className="p-4 sm:p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 flex items-start gap-3.5"
            >
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 space-y-1 text-left rtl:text-right">
                <h3 className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-200">
                  {t('Booking Restricted', 'الحجز مقيد')}
                </h3>
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300/90 leading-relaxed font-medium">
                  {t(
                    'Your account is currently not allowed to organize games or book pitches. Please contact an administrator for assistance.',
                    'حسابك غير مصرح له حالياً بإنشاء مباريات أو حجز الملاعب. يرجى التواصل مع الإدارة للمساعدة.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Game Basics */}
          <div className="rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('basics')}
              aria-expanded={expandedSections.basics}
              aria-controls="section-basics-content"
              className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left rtl:text-right hover:bg-slate-50/70 dark:hover:bg-[#131C31]/40 transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A60AA]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-[#3A60AA]/10 dark:bg-[#B9C9E0]/15 text-[#3A60AA] dark:text-[#B9C9E0] text-[11px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                  {t('Game Basics', 'البيانات الأساسية')}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ChevronDown 
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ease-in-out ${
                    expandedSections.basics ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            <div
              id="section-basics-content"
              role="region"
              aria-label={t('Game Basics', 'البيانات الأساسية')}
              className={`transition-all duration-200 ease-in-out ${
                expandedSections.basics 
                  ? 'max-h-[3000px] opacity-100 px-3.5 sm:px-4 pb-3.5 sm:pb-4 space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-3.5' 
                  : 'max-h-0 opacity-0 px-3.5 sm:px-4 pb-0 overflow-hidden pointer-events-none'
              }`}
            >
              {/* Game Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('Game Name', 'اسم المباراة')} *
                </label>
                <input 
                  id="game-form-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('e.g. Friday Football Match', 'مثال: مباراة كرة قدم الجمعة')}
                  className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E] focus:border-[#3A60AA] dark:focus:border-[#B9C9E0] rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Sport & Skill Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t('Sport', 'الرياضة')}
                    </label>
                    {lockedFields.sport && !isLinkedLi3ibBooking && (
                      <button
                        type="button"
                        onClick={() => setLockedFields(prev => ({ ...prev, sport: !prev.sport }))}
                        className="text-[11px] text-[#3A60AA] dark:text-[#B9C9E0] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>{t('Unlock', 'تعديل')}</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={sport}
                    disabled={isLinkedLi3ibBooking || lockedFields.sport}
                    onChange={(e) => setSport(e.target.value as SportType)}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors ${
                      isLinkedLi3ibBooking || lockedFields.sport
                        ? 'bg-slate-100 dark:bg-[#1B253D] border-slate-200 dark:border-[#22304E] text-slate-500 cursor-not-allowed select-none'
                        : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-[#22304E] focus:border-[#3A60AA] dark:focus:border-[#B9C9E0] text-slate-900 dark:text-white'
                    }`}
                  >
                    <option value="Football">{t('Football', 'كرة القدم')}</option>
                    <option value="Padel">{t('Padel', 'بادل')}</option>
                    <option value="Basketball">{t('Basketball', 'كرة السلة')}</option>
                    <option value="Volleyball">{t('Volleyball', 'كرة الطائرة')}</option>
                    <option value="Tennis">{t('Tennis', 'تنس')}</option>
                    <option value="Badminton">{t('Badminton', 'ريشة طائرة')}</option>
                    <option value="Other">{t('Other', 'أخرى')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('Skill Level', 'المستوى الرياضي')}
                  </label>
                  <select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                    className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E] focus:border-[#3A60AA] dark:focus:border-[#B9C9E0] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none transition-colors"
                  >
                    <option value="Beginner">{t('Beginner', 'مبتدئ')}</option>
                    <option value="Casual">{t('Casual', 'ودي / ترويحي')}</option>
                    <option value="Intermediate">{t('Intermediate', 'متوسط')}</option>
                    <option value="Advanced">{t('Advanced', 'متقدم')}</option>
                    <option value="Competitive">{t('Competitive', 'تنافسي عالي')}</option>
                    <option value="Any level">{t('Any level', 'جميع المستويات')}</option>
                  </select>
                </div>
              </div>

              {/* Game Bio / Description (Moved into Game Basics) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('Game Bio / Description', 'نبذة عن المباراة / رسالة المنظم')}
                  <span className="sr-only">Description / Organizer Notes</span>
                </label>
                <textarea 
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('Add notes for players, pitch rules, or directions...', 'أضف ملاحظات للاعبين أو إرشادات الوصول للملعب...')}
                  className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E] focus:border-[#3A60AA] dark:focus:border-[#B9C9E0] rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Date & Time */}
          <div className="rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('datetime')}
              aria-expanded={expandedSections.datetime}
              aria-controls="section-datetime-content"
              className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left rtl:text-right hover:bg-slate-50/70 dark:hover:bg-[#131C31]/40 transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A60AA]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-[#3A60AA]/10 dark:bg-[#B9C9E0]/15 text-[#3A60AA] dark:text-[#B9C9E0] text-[11px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                  {t('Date & Time', 'التاريخ والتوقيت')}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ChevronDown 
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ease-in-out ${
                    expandedSections.datetime ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            <div
              id="section-datetime-content"
              role="region"
              aria-label={t('Date & Time', 'التاريخ والتوقيت')}
              className={`transition-all duration-200 ease-in-out ${
                expandedSections.datetime 
                  ? 'max-h-[3000px] opacity-100 px-3.5 sm:px-4 pb-3.5 sm:pb-4 space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-3.5' 
                  : 'max-h-0 opacity-0 px-3.5 sm:px-4 pb-0 overflow-hidden pointer-events-none'
              }`}
            >
              {/* Compact Date & Time Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Date Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t('Date', 'التاريخ')} *
                    </label>
                  </div>

                  <div 
                    onClick={() => {
                      if (!isDateTimeLocked) {
                        try { dateInputRef.current?.showPicker(); } catch { dateInputRef.current?.focus(); }
                      }
                    }}
                    className={`h-11 flex items-center justify-between gap-2 px-3 rounded-xl border transition-colors ${
                      isDateTimeLocked
                        ? 'bg-slate-100 dark:bg-[#1B253D] border-slate-200 dark:border-[#22304E] text-slate-500 cursor-not-allowed select-none'
                        : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-[#22304E] hover:border-[#3A60AA] focus-within:border-[#3A60AA] cursor-pointer'
                    }`}
                  >
                    <input 
                      id="game-form-date"
                      ref={dateInputRef}
                      type="date"
                      required
                      value={date}
                      disabled={isDateTimeLocked}
                      onChange={(e) => {
                        if (isDateTimeLocked) return;
                        setDate(e.target.value);
                      }}
                      className={`flex-1 bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden ${
                        isDateTimeLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    />
                    <button
                      type="button"
                      disabled={isDateTimeLocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDateTimeLocked) {
                          try { dateInputRef.current?.showPicker(); } catch { dateInputRef.current?.focus(); }
                        }
                      }}
                      className={`w-11 h-11 -mr-2 rtl:-mr-0 rtl:-ml-2 flex items-center justify-center rounded-lg bg-white dark:bg-[#131C31] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] shrink-0 transition-colors ${
                        isDateTimeLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#EEF3F9] dark:hover:bg-[#142578] cursor-pointer'
                      }`}
                      aria-label={t('Open date picker', 'فتح روزنامة التاريخ')}
                    >
                      <Calendar className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
                    </button>
                  </div>
                </div>

                {/* Side-by-side Start & End Times */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Start Time */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t('Start Time', 'البداية')} *
                      </label>
                    </div>

                    <div 
                      onClick={() => {
                        if (!isDateTimeLocked) {
                          setActiveTimePicker('start');
                        }
                      }}
                      className={`h-11 flex items-center justify-between gap-1.5 px-3 rounded-xl border transition-colors ${
                        isDateTimeLocked
                          ? 'bg-slate-100 dark:bg-[#1B253D] border-slate-200 dark:border-[#22304E] text-slate-500 cursor-not-allowed select-none'
                          : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-[#22304E] hover:border-[#3A60AA] focus-within:border-[#3A60AA] cursor-pointer'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {formatTime12Hour(startTime, language)}
                        </span>
                        {!isDateTimeLocked && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                            {t('Tap to change time', 'انقر لتغيير الوقت')}
                          </span>
                        )}
                        <input 
                          ref={startTimeInputRef}
                          type="time"
                          required
                          value={startTime}
                          readOnly
                          disabled={isDateTimeLocked}
                          tabIndex={-1}
                          className="sr-only pointer-events-none [&::-webkit-calendar-picker-indicator]:hidden"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isDateTimeLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDateTimeLocked) {
                            setActiveTimePicker('start');
                          }
                        }}
                        className={`w-11 h-11 -mr-2 rtl:-mr-0 rtl:-ml-2 flex items-center justify-center rounded-lg bg-white dark:bg-[#131C31] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] shrink-0 transition-colors ${
                          isDateTimeLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#EEF3F9] dark:hover:bg-[#142578] cursor-pointer'
                        }`}
                        aria-label={t('Open start time picker', 'فتح وقت البداية')}
                      >
                        <Clock className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
                      </button>
                    </div>
                  </div>

                  {/* End Time */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t('End Time', 'النهاية')} *
                      </label>
                    </div>

                    <div 
                      onClick={() => {
                        if (!isDateTimeLocked) {
                          setActiveTimePicker('end');
                        }
                      }}
                      className={`h-11 flex items-center justify-between gap-1.5 px-3 rounded-xl border transition-colors ${
                        isDateTimeLocked
                          ? 'bg-slate-100 dark:bg-[#1B253D] border-slate-200 dark:border-[#22304E] text-slate-500 cursor-not-allowed select-none'
                          : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-[#22304E] hover:border-[#3A60AA] focus-within:border-[#3A60AA] cursor-pointer'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {formatTime12Hour(endTime, language)}
                        </span>
                        {!isDateTimeLocked && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                            {t('Tap to change time', 'انقر لتغيير الوقت')}
                          </span>
                        )}
                        <input 
                          ref={endTimeInputRef}
                          type="time"
                          required
                          value={endTime}
                          readOnly
                          disabled={isDateTimeLocked}
                          tabIndex={-1}
                          className="sr-only pointer-events-none [&::-webkit-calendar-picker-indicator]:hidden"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isDateTimeLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDateTimeLocked) {
                            setActiveTimePicker('end');
                          }
                        }}
                        className={`w-11 h-11 -mr-2 rtl:-mr-0 rtl:-ml-2 flex items-center justify-center rounded-lg bg-white dark:bg-[#131C31] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] shrink-0 transition-colors ${
                          isDateTimeLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#EEF3F9] dark:hover:bg-[#142578] cursor-pointer'
                        }`}
                        aria-label={t('Open end time picker', 'فتح وقت النهاية')}
                      >
                        <Clock className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Location */}
          <div className="rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('location')}
              aria-expanded={expandedSections.location}
              aria-controls="section-location-content"
              className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left rtl:text-right hover:bg-slate-50/70 dark:hover:bg-[#131C31]/40 transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A60AA]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-[#3A60AA]/10 dark:bg-[#B9C9E0]/15 text-[#3A60AA] dark:text-[#B9C9E0] text-[11px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                  {t('Location & Area', 'الموقع والمنطقة')}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ChevronDown 
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ease-in-out ${
                    expandedSections.location ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            <div
              id="section-location-content"
              role="region"
              aria-label={t('Location & Area', 'الموقع والمنطقة')}
              className={`transition-all duration-200 ease-in-out ${
                expandedSections.location 
                  ? 'max-h-[3000px] opacity-100 px-3.5 sm:px-4 pb-3.5 sm:pb-4 space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-3.5' 
                  : 'max-h-0 opacity-0 px-3.5 sm:px-4 pb-0 overflow-hidden pointer-events-none'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {t('Court / Venue', 'اسم الملعب / المرفق')} *
                  </label>
                  {lockedFields.courtName && !isLinkedLi3ibBooking && (
                    <button
                      type="button"
                      onClick={() => setLockedFields(prev => ({ ...prev, courtName: !prev.courtName }))}
                      className="text-[11px] text-[#3A60AA] dark:text-[#B9C9E0] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>{t('Unlock', 'تعديل')}</span>
                    </button>
                  )}
                </div>
                <input 
                  id="game-form-court-name"
                  type="text"
                  required
                  disabled={isLinkedLi3ibBooking || lockedFields.courtName}
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  placeholder={t('e.g. Mishref Youth Center Stadium', 'مثال: مركز شباب مشرف')}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                    isLinkedLi3ibBooking || lockedFields.courtName
                      ? 'bg-slate-100 dark:bg-[#1B253D] border-slate-200 dark:border-[#22304E] text-slate-500 cursor-not-allowed select-none'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-[#22304E] text-slate-900 dark:text-white focus:border-[#3A60AA] dark:focus:border-[#B9C9E0]'
                  }`}
                />
              </div>

              {/* Interactive Google Map Location Picker */}
              <MapLocationPicker
                value={{
                  coordinates: mapLocation.coordinates,
                  latitude: mapLocation.latitude,
                  longitude: mapLocation.longitude,
                  area: mapLocation.area,
                  address: address,
                  locationLabel: mapLocation.locationLabel
                }}
                onChange={(newLoc) => {
                  if (!isLinkedLi3ibBooking) {
                    setMapLocation(newLoc);
                    setArea(newLoc.area as KuwaitArea);
                  }
                }}
                isLocked={isLinkedLi3ibBooking}
                venueName={courtName}
              />

              {/* Street Address / Landmark (Optional, starts empty for new games) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('Address / Landmark', 'العنوان والمعلم')}
                </label>
                <input 
                  id="game-form-address"
                  type="text"
                  disabled={isLinkedLi3ibBooking}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('e.g. Block 6, Oasis Road (Optional)', 'مثال: قطعة 6، شارع الواحة (اختياري)')}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                    isLinkedLi3ibBooking
                      ? 'bg-slate-100 dark:bg-[#1B253D] border-slate-200 dark:border-[#22304E] text-slate-400 cursor-not-allowed select-none'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-[#22304E] text-slate-900 dark:text-white focus:border-[#3A60AA] dark:focus:border-[#B9C9E0]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Players & Preferences */}
          <div className="rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('players')}
              aria-expanded={expandedSections.players}
              aria-controls="section-players-content"
              className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left rtl:text-right hover:bg-slate-50/70 dark:hover:bg-[#131C31]/40 transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A60AA]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-[#3A60AA]/10 dark:bg-[#B9C9E0]/15 text-[#3A60AA] dark:text-[#B9C9E0] text-[11px] font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                  {t('Players & Preferences', 'اللاعبون والتفضيلات')}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ChevronDown 
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ease-in-out ${
                    expandedSections.players ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            <div
              id="section-players-content"
              role="region"
              aria-label={t('Players & Preferences', 'اللاعبون والتفضيلات')}
              className={`transition-all duration-200 ease-in-out ${
                expandedSections.players 
                  ? 'max-h-[3000px] opacity-100 px-3.5 sm:px-4 pb-3.5 sm:pb-4 space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-3.5' 
                  : 'max-h-0 opacity-0 px-3.5 sm:px-4 pb-0 overflow-hidden pointer-events-none'
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Max Players */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('Max Players', 'العدد الأقصى للاعبين')}
                  </label>
                  <input 
                    id="game-form-max-players"
                    type="number"
                    min="2"
                    max="30"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 2)}
                    className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E] rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA] dark:focus:border-[#B9C9E0]"
                  />
                </div>

                {/* Gender Preference */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('Gender Preference', 'الجنس')}
                  </label>
                  <div className="flex rounded-xl bg-slate-100 dark:bg-[#0B1120] p-1 border border-slate-200 dark:border-[#22304E]">
                    {(['Everyone', 'Men', 'Women'] as GenderPreference[]).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          gender === g ? 'bg-[#3A60AA] text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {g === 'Everyone' ? t('Everyone', 'الجميع') : g === 'Men' ? t('Men', 'رجال') : t('Women', 'نساء')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Game Visibility */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('Game Visibility', 'نوع النشر')}
                  </label>
                  <div className="flex rounded-xl bg-slate-100 dark:bg-[#0B1120] p-1 border border-slate-200 dark:border-[#22304E]">
                    {(['Public', 'Private', 'Invite only'] as GameVisibility[]).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVisibility(v)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          visibility === v ? 'bg-[#3A60AA] text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {v === 'Public' ? t('Public', 'عام') : v === 'Private' ? t('Private', 'خاص') : t('Invite', 'دعوات')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Invite Friends Checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  {t('Quick Invite Friends (Optional)', 'دعوة سريعة للأصدقاء (اختياري)')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {players.filter(p => p.id !== currentUser.id).slice(0, 6).map(friend => {
                    const isSelected = selectedFriendIds.includes(friend.id);
                    return (
                      <div
                        key={friend.id}
                        onClick={() => toggleFriend(friend.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-[#EEF3F9] dark:bg-[#142578]/60 border-[#3A60AA] dark:border-[#B9C9E0] text-slate-900 dark:text-white' 
                            : 'bg-white dark:bg-[#131C31] border-slate-200 dark:border-[#22304E] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <img 
                          src={friend.avatar} 
                          alt={friend.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{friend.name.split(' ')[0]}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{getKuwaitAreaLabel(friend.area as any, language)}</p>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Booking Confirmation (Collapsed by Default) */}
          <div className="rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('booking')}
              aria-expanded={expandedSections.booking}
              aria-controls="section-booking-content"
              className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left rtl:text-right hover:bg-slate-50/70 dark:hover:bg-[#131C31]/40 transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A60AA]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-[#3A60AA]/10 dark:bg-[#B9C9E0]/15 text-[#3A60AA] dark:text-[#B9C9E0] text-[11px] font-bold flex items-center justify-center shrink-0">
                  5
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                  {t('Booking Confirmation', 'تأكيد الحجز')}
                  <span className="sr-only">Booking &amp; Cost Sharing (Optional)</span>
                </h3>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                  hasAttachedConfirmedBooking
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700'
                }`}>
                  {hasAttachedConfirmedBooking ? t('Added', 'مُضاف') : t('Not added', 'لم يُضف')}
                </span>
                <ChevronDown 
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ease-in-out ${
                    expandedSections.booking ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            <div
              id="section-booking-content"
              role="region"
              aria-label={t('Booking Confirmation', 'تأكيد الحجز')}
              className={`transition-all duration-200 ease-in-out ${
                expandedSections.booking 
                  ? 'max-h-[3000px] opacity-100 px-3.5 sm:px-4 pb-3.5 sm:pb-4 space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-3.5' 
                  : 'max-h-0 opacity-0 px-3.5 sm:px-4 pb-0 overflow-hidden pointer-events-none'
              }`}
            >
              {/* Universal Booking Upload Box */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-[#B9C9E0] dark:border-[#1F3590] bg-[#EEF3F9]/60 dark:bg-[#06135B]/40 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
                    <h4 className="text-xs sm:text-sm font-bold text-[#06135B] dark:text-white">
                      {t('Upload Your Booking', 'ارفع تأكيد حجزك')}
                    </h4>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-[#B9C9E0]/80 bg-white/70 dark:bg-[#06135B]/70 px-1.5 py-0.5 rounded border border-[#B9C9E0]/40 dark:border-[#1F3590]/60">
                      {t('Optional', 'اختياري')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUploadInfoModal(true)}
                      aria-label={t('How booking upload works', 'كيف يعمل رفع الحجز')}
                      title={t('How booking upload works', 'كيف يعمل رفع الحجز')}
                      className="p-1 rounded-full text-slate-400 hover:text-[#3A60AA] dark:hover:text-[#B9C9E0] transition-colors focus:outline-none cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-[#B9C9E0]/80 mb-3 leading-relaxed">
                  {t(
                    'Upload a booking receipt or confirmation from Li3ib, Playtomic, or any venue to automatically fill match details.',
                    'ارفع إيصال أو لقطة شاشة لحجزك من Li3ib أو Playtomic أو أي ملعب لتعبئة تفاصيل المباراة تلقائياً.'
                  )}
                </p>

                {/* Hidden file input supporting JPG, JPEG, PNG, WebP, PDF */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  data-testid="booking-file-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />

                {/* Upload Zone / Button */}
                {!uploadedFile && !previewUrl && !isExtracting && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                    }}
                    className="border-2 border-dashed border-[#B9C9E0] dark:border-[#1F3590] hover:border-[#3A60AA] dark:hover:border-[#B9C9E0] rounded-xl p-3.5 sm:p-4 text-center cursor-pointer bg-white/60 dark:bg-[#06135B]/60 transition-colors"
                  >
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-[#3A60AA] dark:text-[#B9C9E0] mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-[#06135B] dark:text-white mb-0.5">
                      {t('Click or drag booking confirmation here', 'انقر أو اسحب تأكيد الحجز هنا')}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-[#B9C9E0]/70">
                      {t('JPG, PNG, WebP or PDF (Max 10MB)', 'JPG, PNG, WebP أو PDF (الحد الأقصى 10 ميجابايت)')}
                    </p>
                  </div>
                )}

                {/* Extraction Progress State */}
                {isExtracting && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/90 dark:bg-[#06135B]/90 border border-[#B9C9E0] dark:border-[#1F3590]">
                    <Loader2 className="w-5 h-5 text-[#3A60AA] dark:text-[#B9C9E0] animate-spin shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#06135B] dark:text-white truncate">
                        {t('Extracting booking details with AI...', 'جارٍ استخراج تفاصيل الحجز بالذكاء الاصطناعي...')}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80 truncate">
                        {uploadedFile?.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Uploaded Confirmation Preview & Controls */}
                {(uploadedFile || previewUrl) && !isExtracting && (
                  <div className="p-3 rounded-xl bg-white dark:bg-[#06135B] border border-[#B9C9E0] dark:border-[#1F3590] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Booking Confirmation Preview"
                          className="w-10 h-10 object-cover rounded-lg border border-[#B9C9E0] dark:border-[#1F3590] shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#EEF3F9] dark:bg-[#142578] text-[#3A60AA] dark:text-[#B9C9E0] flex items-center justify-center shrink-0">
                          <File className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#06135B] dark:text-white truncate">
                          {uploadedFile?.name || t('Booking Confirmation', 'مستند الحجز')}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80">
                          {confirmedBookingData 
                            ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                {t('Details verified and applied', 'تم التحقق والتطبيق')}
                              </span>
                            )
                            : t('Ready to review', 'جاهز للمراجعة')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {extractedData && (
                        <button
                          type="button"
                          onClick={() => setShowReviewDialog(true)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#3A60AA] text-white hover:bg-[#2E4D8A] transition-colors cursor-pointer"
                        >
                          {t('Review', 'مراجعة')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleReplaceBooking}
                        title={t('Replace Booking', 'استبدال الحجز')}
                        className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-[#EEF3F9] dark:hover:bg-[#142578] border border-transparent hover:border-[#B9C9E0] transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveBooking}
                        title={t('Remove Booking', 'إزالة الحجز')}
                        className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Message if extraction failed */}
                {extractionError && (
                  <div className="mt-2.5 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span className="flex-1">{extractionError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 6: Cost Sharing (Collapsed by Default) */}
          <div className="rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('costSharing')}
              aria-expanded={expandedSections.costSharing}
              aria-controls="section-cost-sharing-content"
              className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left rtl:text-right hover:bg-slate-50/70 dark:hover:bg-[#131C31]/40 transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A60AA]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-[#3A60AA]/10 dark:bg-[#B9C9E0]/15 text-[#3A60AA] dark:text-[#B9C9E0] text-[11px] font-bold flex items-center justify-center shrink-0">
                  6
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                  {t('Cost Sharing', 'تقاسم التكلفة')}
                </h3>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                  costSharingEnabled
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700'
                }`}>
                  {costSharingEnabled ? t('On', 'مفعّل') : t('Off', 'معطل')}
                </span>
                <ChevronDown 
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ease-in-out ${
                    expandedSections.costSharing ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            <div
              id="section-cost-sharing-content"
              role="region"
              aria-label={t('Cost Sharing', 'تقاسم التكلفة')}
              className={`transition-all duration-200 ease-in-out ${
                expandedSections.costSharing 
                  ? 'max-h-[3000px] opacity-100 px-3.5 sm:px-4 pb-3.5 sm:pb-4 space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-3.5' 
                  : 'max-h-0 opacity-0 px-3.5 sm:px-4 pb-0 overflow-hidden pointer-events-none'
              }`}
            >
              {/* Court Cost & Cost Sharing Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {t('Court Cost & Estimates', 'تكلفة الملعب والتقديرات')}
                    </h4>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {t('Total Court Cost (KWD)', 'إجمالي تكلفة الملعب (د.ك)')}
                    </label>
                    {lockedFields.totalCourtCostKWD && !isLinkedLi3ibBooking && (
                      <button
                        type="button"
                        onClick={() => setLockedFields(prev => ({ ...prev, totalCourtCostKWD: !prev.totalCourtCostKWD }))}
                        className="text-[11px] text-[#3A60AA] dark:text-[#B9C9E0] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>{t('Unlock', 'تعديل')}</span>
                      </button>
                    )}
                  </div>
                  <input 
                    type="number"
                    step="0.500"
                    min="0"
                    disabled={isLinkedLi3ibBooking || lockedFields.totalCourtCostKWD}
                    value={totalCourtCostKWD}
                    onChange={(e) => setTotalCourtCostKWD(parseFloat(e.target.value) || 0)}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-bold focus:outline-none ${
                      isLinkedLi3ibBooking || lockedFields.totalCourtCostKWD
                        ? 'bg-slate-100 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] text-slate-500 cursor-not-allowed select-none'
                        : 'bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA] dark:focus:border-[#B9C9E0]'
                    }`}
                  />
                </div>

                {/* Split the cost with players Toggle */}
                <div className="pt-3 border-t border-slate-200 dark:border-[#22304E]">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {t('Split the cost with players', 'تقاسم التكلفة مع اللاعبين')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t(
                          'When OFF, no payment method is required or shown. When ON, select how players pay.',
                          'عند الإيقاف، لا تطلب طريقة دفع من اللاعبين. عند التفعيل، اختر طريقة الدفع للمنظم.'
                        )}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={costSharingEnabled}
                        onChange={(e) => setCostSharingEnabled(e.target.checked)}
                        className="sr-only peer"
                        aria-label="Split the cost with players"
                      />
                      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:left-auto rtl:after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3A60AA]"></div>
                    </label>
                  </div>

                  {/* When ON: Require host to select one or more methods */}
                  {costSharingEnabled && (
                    <div className="space-y-3 pt-3 mt-3 border-t border-slate-200 dark:border-[#22304E]">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          {t('Select Cost-Sharing Method (Required)', 'اختر طريقة تقاسم التكلفة (مطلوبة)')}
                        </label>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {t('Choose any combination', 'اختر طريقة أو أكثر')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Cash */}
                        <div
                          onClick={() => toggleCostSharingMethod('cash')}
                          className={`p-3 rounded-xl border text-start transition-colors cursor-pointer select-none flex flex-col justify-between ${
                            selectedCostSharingMethods.includes('cash')
                              ? 'bg-[#EEF3F9] dark:bg-[#0D1C68] border-[#3A60AA] dark:border-[#B9C9E0] text-[#06135B] dark:text-white'
                              : 'bg-white dark:bg-[#131C31] border-slate-200 dark:border-[#22304E] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              {t('Cash', 'نقداً')}
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedCostSharingMethods.includes('cash')}
                              onChange={() => {}}
                              aria-label="Cash"
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[#3A60AA] pointer-events-none"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                            {t('Players pay the host outside La3ib.', 'يدفع اللاعبون للمنظم نقداً خارج تطبيق لعيب.')}
                          </p>
                        </div>

                        {/* WAMD */}
                        <div
                          onClick={() => toggleCostSharingMethod('wamd')}
                          className={`p-3 rounded-xl border text-start transition-colors cursor-pointer select-none flex flex-col justify-between ${
                            selectedCostSharingMethods.includes('wamd')
                              ? 'bg-[#EEF3F9] dark:bg-[#0D1C68] border-[#3A60AA] dark:border-[#B9C9E0] text-[#06135B] dark:text-white'
                              : 'bg-white dark:bg-[#131C31] border-slate-200 dark:border-[#22304E] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              {t('WAMD', 'ومض')}
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedCostSharingMethods.includes('wamd')}
                              onChange={() => {}}
                              aria-label="WAMD"
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[#3A60AA] pointer-events-none"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                            {t('Players pay the host using WAMD outside La3ib.', 'يدفع اللاعبون للمنظم عبر ومض خارج تطبيق لعيب.')}
                          </p>
                        </div>

                        {/* Request Link */}
                        <div
                          onClick={() => toggleCostSharingMethod('request_link')}
                          className={`p-3 rounded-xl border text-start transition-colors cursor-pointer select-none flex flex-col justify-between ${
                            selectedCostSharingMethods.includes('request_link')
                              ? 'bg-[#EEF3F9] dark:bg-[#0D1C68] border-[#3A60AA] dark:border-[#B9C9E0] text-[#06135B] dark:text-white'
                              : 'bg-white dark:bg-[#131C31] border-slate-200 dark:border-[#22304E] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              {t('Request Link', 'طلب رابط دفع')}
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedCostSharingMethods.includes('request_link')}
                              onChange={() => {}}
                              aria-label="Request Link"
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[#3A60AA] pointer-events-none"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                            {t('Participants can request a payment link from the host.', 'يمكن للمشاركين طلب رابط دفع من المنظم.')}
                          </p>
                        </div>
                      </div>

                      {/* WAMD Phone Number Input: Shown when WAMD is selected */}
                      {selectedCostSharingMethods.includes('wamd') && (
                        <div className="p-3 bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label 
                              htmlFor="wamd-phone-number-input"
                              className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                            >
                              {t('WAMD Phone Number', 'رقم هاتف ومض')}
                              <span className="text-rose-500 font-bold">*</span>
                            </label>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              {t('Kuwait mobile (8 digits)', 'رقم كويتي (8 أرقام)')}
                            </span>
                          </div>
                          <input
                            id="game-form-wamd-phone"
                            type="tel"
                            value={wamdPhoneNumber}
                            onChange={(e) => setWamdPhoneNumber(e.target.value)}
                            placeholder={t('+965 XXXXXXXX or 8-digit mobile', '+965 XXXXXXXX أو رقم من 8 خانات')}
                            className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E] rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#3A60AA] dark:focus:border-[#B9C9E0]"
                          />
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                            {t(
                              'Enter the Kuwait mobile number linked to your bank account for receiving WAMD transfers. Visible only to joined participants.',
                              'أدخل رقم الهاتف الكويتي المرتبط بحسابك البنكي لاستلام تحويلات ومض. يظهر فقط للاعبين المنضمين للمباراة.'
                            )}
                          </p>
                        </div>
                      )}

                      {selectedCostSharingMethods.length === 0 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {t('Please select at least one method.', 'يرجى اختيار طريقة دفع واحدة على الأقل.')}
                        </p>
                      )}

                      {/* Estimated Share per player clearly labelled as estimate */}
                      <div className="bg-slate-100 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#3A60AA] dark:text-[#B9C9E0] block">
                            {t('Estimated Share per Player (Estimate)', 'الحصة التقديرية لكل لاعب (تقديري)')}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {t('Formula:', 'المعادلة:')} {totalCourtCostKWD.toFixed(3)} {t('KWD', 'د.ك')} ÷ {maxPlayers} {t('players', 'لاعبين')}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1 text-end">
                          <span className="text-lg font-bold text-slate-900 dark:text-white">{pricePerPlayer.toFixed(3)}</span>
                          <span className="text-xs font-bold text-[#3A60AA] dark:text-[#B9C9E0]">{t('KWD', 'د.ك')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
              <span className="leading-relaxed font-medium">{errorMessage}</span>
              <button 
                type="button" 
                onClick={() => setErrorMessage(null)} 
                className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#22304E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center sm:block justify-between w-full sm:w-auto">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                {costSharingEnabled ? t('Estimated Share (Estimate):', 'الحصة التقديرية (تقديري):') : t('Cost Sharing:', 'تقاسم التكلفة:')}
              </span>
              <span className="text-base sm:text-lg font-bold text-[#3A60AA] dark:text-[#B9C9E0]">
                {costSharingEnabled ? `${pricePerPlayer.toFixed(3)} KWD` : t('Disabled (Free to Join)', 'غير مفعل (مجانياً)')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setCreateGameModalOpen(false);
                  setCreateGamePrefill(null);
                  setErrorMessage(null);
                }}
                disabled={submitting}
                className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] disabled:opacity-50 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                {t('Cancel', 'إلغاء')}
              </button>

              <div className="flex-1 sm:flex-none flex flex-col items-stretch sm:items-end gap-1">
                <button
                  type="submit"
                  disabled={isRestricted || isPrivilegeLoading || submitting}
                  aria-label="Post Booking"
                  onKeyDown={(e) => {
                    if (isRestricted || isPrivilegeLoading) {
                      e.preventDefault();
                    }
                  }}
                  className={`w-full sm:w-auto justify-center px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors ${
                    isRestricted || isPrivilegeLoading
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-[#3A60AA] hover:bg-[#2E4D8A] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs'
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('Saving...', 'جارٍ الحفظ...')}</span>
                    </>
                  ) : createGamePrefill?.id ? (
                    t('Save Match Settings', 'حفظ تعديلات المباراة')
                  ) : (
                    t('Post Game & Open Spots', 'نشر المباراة وفتح الحجز')
                  )}
                </button>
                {isRestricted && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold text-center sm:text-right rtl:sm:text-left">
                    {t('Account restricted from organizing games', 'حسابك مقيد من تنظيم المباريات')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Extraction Review Dialog */}
      {showReviewDialog && reviewFormData && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-[#06135B] border border-[#B9C9E0] dark:border-[#1F3590] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#B9C9E0] dark:border-[#1F3590] bg-[#EEF3F9] dark:bg-[#0D1C68] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
                <h3 className="text-sm font-bold text-[#06135B] dark:text-white">
                  {t('Review Extracted Booking Details', 'مراجعة تفاصيل الحجز المستخرجة')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewDialog(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <p className="text-slate-600 dark:text-[#B9C9E0]/80">
                {t(
                  'Please confirm or correct the extracted values before applying them to your game.',
                  'يرجى تأكيد أو تعديل البيانات المستخرجة قبل تطبيقها على المباراة.'
                )}
              </p>

              {/* Court / Venue */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('Venue / Court Name', 'اسم الملعب أو المرفق')}
                </label>
                <input
                  type="text"
                  value={reviewFormData.courtName || reviewFormData.venueName || ''}
                  onChange={(e) => setReviewFormData({ ...reviewFormData, courtName: e.target.value, venueName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#B9C9E0] dark:border-[#1F3590] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Sport */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('Sport', 'الرياضة')}
                </label>
                <select
                  value={reviewFormData.sport || 'Football'}
                  onChange={(e) => setReviewFormData({ ...reviewFormData, sport: e.target.value as SportType })}
                  className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#B9C9E0] dark:border-[#1F3590] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Football">{t('Football', 'كرة القدم')}</option>
                  <option value="Padel">{t('Padel', 'بادل')}</option>
                  <option value="Basketball">{t('Basketball', 'كرة السلة')}</option>
                  <option value="Volleyball">{t('Volleyball', 'كرة الطائرة')}</option>
                  <option value="Tennis">{t('Tennis', 'تنس')}</option>
                  <option value="Badminton">{t('Badminton', 'ريشة طائرة')}</option>
                  <option value="Other">{t('Other', 'أخرى')}</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('Booking Date', 'تاريخ الحجز')}
                </label>
                <input
                  type="date"
                  value={reviewFormData.date || ''}
                  onChange={(e) => setReviewFormData({ ...reviewFormData, date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#B9C9E0] dark:border-[#1F3590] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Start Time', 'وقت البداية')}
                  </label>
                  <input
                    type="time"
                    value={reviewFormData.startTime || ''}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, startTime: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#B9C9E0] dark:border-[#1F3590] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                  {reviewFormData.startTime && (
                    <span className="text-[10px] text-[#3A60AA] dark:text-[#B9C9E0] font-semibold mt-0.5 block">
                      {formatTime12Hour(reviewFormData.startTime, language)}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('End Time', 'وقت النهاية')}
                  </label>
                  <input
                    type="time"
                    value={reviewFormData.endTime || ''}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, endTime: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#B9C9E0] dark:border-[#1F3590] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                  {reviewFormData.endTime && (
                    <span className="text-[10px] text-[#3A60AA] dark:text-[#B9C9E0] font-semibold mt-0.5 block">
                      {formatTime12Hour(reviewFormData.endTime, language)}
                    </span>
                  )}
                </div>
              </div>

              {/* Address / Area & Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Area', 'المنطقة')}
                  </label>
                  <input
                    type="text"
                    value={reviewFormData.area || ''}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, area: e.target.value })}
                    placeholder="e.g. Mishref"
                    className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#B9C9E0] dark:border-[#1F3590] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Court Cost (KWD)', 'التكلفة (د.ك)')}
                  </label>
                  <input
                    type="number"
                    step="0.500"
                    min="0"
                    value={reviewFormData.totalPriceKWD ?? ''}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, totalPriceKWD: parseFloat(e.target.value) || 0 })}
                    placeholder="15.000"
                    className="w-full bg-slate-50 dark:bg-[#0B1120] border border-[#B9C9E0] dark:border-[#1F3590] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#B9C9E0] dark:border-[#1F3590] bg-[#EEF3F9] dark:bg-[#0D1C68] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReviewDialog(false)}
                className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={handleApplyReviewedBooking}
                className="px-4 py-1.5 rounded-lg bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t('Apply to Game', 'تطبيق على المباراة')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Time Selection Dialog for Start Time */}
      <ManualTimePickerModal
        isOpen={!isDateTimeLocked && activeTimePicker === 'start'}
        onClose={() => setActiveTimePicker(null)}
        value={startTime}
        onChange={(val) => {
          if (isDateTimeLocked) return;
          setStartTime(val);
        }}
        title={t('Select Start Time', 'تحديد وقت البداية')}
        language={language}
        t={t}
      />

      {/* Manual Time Selection Dialog for End Time */}
      <ManualTimePickerModal
        isOpen={!isDateTimeLocked && activeTimePicker === 'end'}
        onClose={() => setActiveTimePicker(null)}
        value={endTime}
        onChange={(val) => {
          if (isDateTimeLocked) return;
          setEndTime(val);
        }}
        title={t('Select End Time', 'تحديد وقت النهاية')}
        language={language}
        t={t}
      />

      {/* Upload Your Booking Info Modal */}
      {showUploadInfoModal && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs"
          onClick={() => setShowUploadInfoModal(false)}
        >
          <div 
            className="relative w-full max-w-md bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#22304E] bg-slate-50 dark:bg-[#0B1120]">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('How Booking Upload Works', 'كيف يعمل رفع تأكيد الحجز')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadInfoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1B253D] transition-colors cursor-pointer"
                aria-label={t('Close', 'إغلاق')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* 3 Steps */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E]">
                  <div className="w-6 h-6 rounded-full bg-[#3A60AA] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      {t('1. Upload', '١. ارفع الحجز')}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {t(
                        'Select a screenshot, image, or PDF of your court booking confirmation from Li3ib, Playtomic, or any venue.',
                        'ارفع لقطة شاشة أو صورة أو ملف PDF لتأكيد حجزك من Li3ib أو Playtomic أو أي ملعب.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E]">
                  <div className="w-6 h-6 rounded-full bg-[#3A60AA] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      {t('2. Review', '٢. راجع التفاصيل')}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {t(
                        'La3ib automatically extracts the booking details, including the venue, date, time, and cost.',
                        'يستخرج لعيب تلقائياً تفاصيل الحجز بدقة بما فيها اسم المرفق، التاريخ، الوقت، والتكلفة.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E]">
                  <div className="w-6 h-6 rounded-full bg-[#3A60AA] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      {t('3. Create', '٣. انشر مباراتك')}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {t(
                        'Check the extracted information, make corrections if needed, and continue creating your game.',
                        'تحقق من البيانات المستخرجة، عدل أي تفاصيل إن لزم الأمر، ثم انشر مباراتك لتبدأ الدعوات.'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Example Image */}
              <div className="space-y-1.5 pt-1">
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#22304E] bg-slate-100 dark:bg-[#0B1120] flex items-center justify-center p-2">
                  <img
                    src="/assets/aistudio/Confirmed_Booking_App_Screen_df7a9ec3.png"
                    alt="Example Booking Confirmation"
                    className="w-full max-h-64 object-contain rounded-lg"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-medium">
                  {t('Example of a booking confirmation you can upload.', 'مثال على تأكيد الحجز الذي يمكنك رفعه.')}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-[#22304E] bg-slate-50 dark:bg-[#0B1120] flex justify-end">
              <button
                type="button"
                onClick={() => setShowUploadInfoModal(false)}
                className="px-4 py-2 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {t('Got It', 'فهمت')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
