import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Check,
  Search,
  AlertCircle,
  X,
  Plus,
  Minus,
  RefreshCw,
  LocateFixed,
} from 'lucide-react';
import {
  UZBEKISTAN_REGIONS,
  UzbekistanRegionOption,
  matchUzbekistanRegionAndDistrictFromGeocode,
} from '../../utils/uzbekistanLocations';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { Button } from '../ui/Button';

export interface ConfirmedMapLocationPayload {
  coords: { lat: number; lng: number };
  reverseGeocodedAddress: string;
  matchedRegion: UzbekistanRegionOption | null;
  matchedDistrict: string | null;
}

interface DeliveryMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords: { lat: number; lng: number };
  initialAddress: string;
  onConfirmLocation: (payload: ConfirmedMapLocationPayload) => void;
}

interface LeafletMapInstance {
  setView: (center: [number, number], zoom?: number) => void;
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  zoomIn: () => void;
  zoomOut: () => void;
  on: (
    event: string,
    handler: (e?: { latlng?: { lat: number; lng: number } }) => void
  ) => void;
  invalidateSize: () => void;
  remove: () => void;
}

interface LeafletMarkerInstance {
  remove: () => void;
}

declare global {
  interface Window {
    L?: {
      map: (
        el: HTMLElement,
        opts: Record<string, unknown>
      ) => LeafletMapInstance;
      tileLayer: (
        url: string,
        opts: Record<string, unknown>
      ) => { addTo: (map: LeafletMapInstance) => void };
      divIcon: (opts: Record<string, unknown>) => unknown;
      marker: (
        coords: [number, number],
        opts?: Record<string, unknown>
      ) => { addTo: (map: LeafletMapInstance) => LeafletMarkerInstance };
    };
  }
}

const GPS_MESSAGES = {
  uz: {
    btnIdle: 'Turgan joyimni aniqlash',
    btnLoading: 'Joylashuv aniqlanmoqda…',
    insecure: 'Joylashuvni aniqlash uchun sayt HTTPS ulanishda ochilishi kerak. Manzilni xaritadan qo‘lda tanlashingiz mumkin.',
    unsupported: 'Brauzer joylashuvni aniqlashni qo‘llab-quvvatlamaydi. Xaritadan nuqtani qo‘lda tanlang.',
    denied: 'Joylashuvga ruxsat berilmadi. Brauzer manzillar panelidagi qulf belgisidan sayt sozlamalarini ochib, Location ruxsatini yoqing. Qo‘lda xaritadan tanlashingiz ham mumkin.',
    unavailable: 'Kompyuter joylashuvni aniqlay olmadi. Tizim sozlamalarida Location Services va Wi-Fi yoqilganini tekshiring yoki nuqtani xaritadan qo‘lda tanlang.',
    timeout: 'Joylashuvni aniqlash uzoq davom etdi. Qayta urinib ko‘ring yoki xaritadan nuqtani qo‘lda tanlang.',
    found: 'Turgan joyingiz aniqlandi. Kerak bo‘lsa xaritani surib nuqtani to‘g‘rilang.',
  },
  ru: {
    btnIdle: 'Определить моё местоположение',
    btnLoading: 'Определяем местоположение…',
    insecure: 'Геолокация требует защищённого HTTPS-соединения. Выберите точку на карте вручную.',
    unsupported: 'Браузер не поддерживает геолокацию. Выберите точку на карте вручную.',
    denied: 'Доступ к геолокации запрещён. Откройте настройки сайта через значок замка в адресной строке и разрешите Location. Можно выбрать точку на карте вручную.',
    unavailable: 'Компьютер не смог определить местоположение. Проверьте системные службы геолокации и Wi-Fi либо выберите точку на карте вручную.',
    timeout: 'Истекло время ожидания геолокации. Попробуйте ещё раз или выберите точку на карте вручную.',
    found: 'Местоположение определено. При необходимости передвиньте карту, чтобы уточнить точку.',
  },
  en: {
    btnIdle: 'Find my location',
    btnLoading: 'Locating…',
    insecure: 'Geolocation requires a secure HTTPS connection. Select a point on the map manually.',
    unsupported: 'This browser does not support geolocation. Select a point on the map manually.',
    denied: 'Location access was denied. Open this site’s settings from the lock icon in the address bar and allow Location, or select a point on the map manually.',
    unavailable: 'Your computer could not determine its location. Check system Location Services and Wi-Fi, or select a point on the map manually.',
    timeout: 'The location request timed out. Try again or select a point on the map manually.',
    found: 'Your location was found. Move the map to fine-tune the selected point if needed.',
  },
} as const;

/**
 * Full-screen mobile-first Touch Map Picker inspired by the reference screenshot:
 * - Fills ~92dvh on phones with a floating search header, touch-draggable / pinch-zoomable
 *   Leaflet map canvas, visible +/- zoom buttons, a fixed center ZAVEN pin, and a bottom
 *   "Tanlangan manzil" sheet with an editable street/house/apartment input and full-width
 *   "Manzilni tasdiqlash" button.
 * - Reverse-geocodes the exact chosen point and matches the detected region & district
 *   against `UZBEKISTAN_REGIONS`.
 * - Never requests device GPS automatically and includes zero "Joylashuvimni aniqlash" button.
 */
export const DeliveryMapModal: React.FC<DeliveryMapModalProps> = ({
  isOpen,
  onClose,
  initialCoords,
  initialAddress,
  onConfirmLocation,
}) => {
  const { t, language } = useThemeLanguage();
  const gpsText = GPS_MESSAGES[language];

  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>(
    initialCoords
  );
  const [hasSelectedPoint, setHasSelectedPoint] = useState<boolean>(true);
  const [detectedPlaceSummary, setDetectedPlaceSummary] = useState<string>(
    initialAddress || ''
  );
  const [editableAddress, setEditableAddress] =
    useState<string>(initialAddress);

  const [matchedRegion, setMatchedRegion] =
    useState<UzbekistanRegionOption | null>(null);
  const [matchedDistrict, setMatchedDistrict] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<
    Array<{ display_name: string; lat: number; lon: number }>
  >([]);

  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [isSearchingPlace, setIsSearchingPlace] = useState<boolean>(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'info' | 'warning';
    text: string;
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMapInstance | null>(null);
  const reverseGeocodeTimerRef = useRef<number | null>(null);
  const reverseGeocodeRequestIdRef = useRef(0);
  const isProgrammaticMoveRef = useRef<boolean>(false);
  const userGpsMarkerRef = useRef<LeafletMarkerInstance | null>(null);
  const locateRequestIdRef = useRef(0);
  const userMovedManuallyDuringLocateRef = useRef(false);

  const getRegionName = useCallback(
    (reg: UzbekistanRegionOption) => {
      if (language === 'ru') return reg.nameRu;
      if (language === 'en') return reg.nameEn;
      return reg.nameUz;
    },
    [language]
  );

  // Reverse-geocode the exact pin coordinates and match against real Uzbekistan region/district data
  const runReverseGeocode = useCallback(
    async (lat: number, lng: number, preserveStatusMessage = false) => {
      const requestId = ++reverseGeocodeRequestIdRef.current;
      setIsReverseGeocoding(true);
      if (!preserveStatusMessage) setStatusMessage(null);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=uz,ru`,
          {
            headers: { Accept: 'application/json' },
          }
        );

        if (!res.ok) {
          throw new Error('Reverse geocode HTTP error');
        }

        const data = await res.json();
        if (requestId !== reverseGeocodeRequestIdRef.current) return;
        const addressObj = (data?.address || {}) as Record<
          string,
          string | undefined
        >;
        const rawDisplayName =
          typeof data?.display_name === 'string' ? data.display_name : '';

        // Match against project's real Uzbekistan regions and districts
        const geoMatch = matchUzbekistanRegionAndDistrictFromGeocode(
          addressObj,
          rawDisplayName,
          lat,
          lng
        );
        setMatchedRegion(geoMatch.matchedRegion);
        setMatchedDistrict(geoMatch.matchedDistrict);

        const streetParts = [
          addressObj.suburb ||
            addressObj.neighbourhood ||
            addressObj.quarter ||
            addressObj.residential,
          addressObj.road || addressObj.pedestrian || addressObj.street,
          addressObj.house_number
            ? `${addressObj.house_number}-uy`
            : undefined,
          addressObj.amenity || addressObj.shop || addressObj.building,
        ].filter(Boolean);

        const conciseAddress =
          streetParts.length > 0
            ? streetParts.join(', ')
            : rawDisplayName
            ? rawDisplayName
                .split(',')
                .map((s: string) => s.trim())
                .filter(
                  (s: string) =>
                    !s.toLowerCase().includes('oʻzbekiston') &&
                    !s.toLowerCase().includes('uzbekistan') &&
                    !s.toLowerCase().includes('узбекистан') &&
                    !/^\d{5,6}$/.test(s)
                )
                .slice(0, 3)
                .join(', ')
            : '';

        if (conciseAddress) {
          setDetectedPlaceSummary(conciseAddress);
          setEditableAddress(conciseAddress);
          setHasSelectedPoint(true);
        } else {
          setDetectedPlaceSummary(`${lat}, ${lng}`);
          setHasSelectedPoint(true);
          setStatusMessage({
            type: 'warning',
            text: t('cart.mapAddressNotFound'),
          });
        }
      } catch {
        if (requestId !== reverseGeocodeRequestIdRef.current) return;
        const fallbackMatch = matchUzbekistanRegionAndDistrictFromGeocode(
          undefined,
          undefined,
          lat,
          lng
        );
        setMatchedRegion(fallbackMatch.matchedRegion);
        setMatchedDistrict(fallbackMatch.matchedDistrict);
        setDetectedPlaceSummary(`${lat}, ${lng}`);
        setHasSelectedPoint(true);
        if (!preserveStatusMessage) {
          setStatusMessage({
            type: 'warning',
            text: t('cart.mapNetworkError'),
          });
        }
      } finally {
        if (requestId === reverseGeocodeRequestIdRef.current) {
          setIsReverseGeocoding(false);
        }
      }
    },
    [t]
  );

  // Lock page scroll & hide mobile bottom nav while map sheet is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const savedScrollY = window.scrollY;
    const previousBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('zaven-modal-open');
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      locateRequestIdRef.current += 1;
      setIsLocatingUser(false);
      Object.assign(document.body.style, previousBodyStyles);
      document.body.classList.remove('zaven-modal-open');
      window.removeEventListener('keydown', handleKeyDown);
      window.scrollTo(0, savedScrollY);
    };
  }, [isOpen, onClose]);

  // Load Leaflet touch map when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const startLat = Number(initialCoords.lat.toFixed(5));
    const startLng = Number(initialCoords.lng.toFixed(5));
    setPinCoords({ lat: startLat, lng: startLng });
    setEditableAddress(initialAddress);
    setDetectedPlaceSummary(initialAddress || `${startLat}, ${startLng}`);
    setSearchResults([]);
    setStatusMessage(null);
    setHasSelectedPoint(true);

    // Run initial reverse-geocode so the preview card immediately shows the current point
    runReverseGeocode(startLat, startLng);

    let isCancelled = false;

    const ensureLeafletAssets = (): Promise<void> => {
      return new Promise((resolve) => {
        if (window.L) {
          resolve();
          return;
        }

        if (!document.getElementById('zaven-leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'zaven-leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        const existingScript = document.getElementById(
          'zaven-leaflet-js'
        ) as HTMLScriptElement | null;
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          return;
        }

        const script = document.createElement('script');
        script.id = 'zaven-leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
      });
    };

    ensureLeafletAssets().then(() => {
      if (isCancelled || !window.L || !mapContainerRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const map = window.L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Tap anywhere on the map to move the center pin to that exact point
      map.on('click', (e) => {
        if (!e?.latlng) return;
        userMovedManuallyDuringLocateRef.current = true;
        const nextLat = Number(e.latlng.lat.toFixed(5));
        const nextLng = Number(e.latlng.lng.toFixed(5));
        isProgrammaticMoveRef.current = true;
        map.setView([nextLat, nextLng], map.getZoom());
        setPinCoords({ lat: nextLat, lng: nextLng });
        runReverseGeocode(nextLat, nextLng);
        setTimeout(() => {
          isProgrammaticMoveRef.current = false;
        }, 180);
      });

      // Drag the map under the fixed center pin and reverse-geocode on release
      map.on('moveend', () => {
        if (isProgrammaticMoveRef.current) return;
        userMovedManuallyDuringLocateRef.current = true;
        const center = map.getCenter();
        const nextLat = Number(center.lat.toFixed(5));
        const nextLng = Number(center.lng.toFixed(5));
        setPinCoords({ lat: nextLat, lng: nextLng });

        if (reverseGeocodeTimerRef.current) {
          window.clearTimeout(reverseGeocodeTimerRef.current);
        }
        reverseGeocodeTimerRef.current = window.setTimeout(() => {
          runReverseGeocode(nextLat, nextLng);
        }, 320);
      });

      leafletMapRef.current = map;
      setTimeout(() => {
        map.invalidateSize();
      }, 120);
    });

    return () => {
      isCancelled = true;
      reverseGeocodeRequestIdRef.current += 1;
      if (reverseGeocodeTimerRef.current) {
        window.clearTimeout(reverseGeocodeTimerRef.current);
      }
      if (userGpsMarkerRef.current) {
        userGpsMarkerRef.current.remove();
        userGpsMarkerRef.current = null;
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isOpen]);

  const moveMapToCoords = (
    nextLat: number,
    nextLng: number,
    zoom = 15,
    preserveStatusMessage = false,
    isGpsSelection = false
  ) => {
    if (!isGpsSelection) userMovedManuallyDuringLocateRef.current = true;
    const roundedLat = Number(nextLat.toFixed(5));
    const roundedLng = Number(nextLng.toFixed(5));
    setPinCoords({ lat: roundedLat, lng: roundedLng });
    setSearchResults([]);

    if (leafletMapRef.current) {
      isProgrammaticMoveRef.current = true;
      leafletMapRef.current.setView([roundedLat, roundedLng], zoom);
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 220);
    }

    runReverseGeocode(roundedLat, roundedLng, preserveStatusMessage);
  };

  const drawUserLocation = (lat: number, lng: number, heading: number | null) => {
    if (!window.L || !leafletMapRef.current) return;
    userGpsMarkerRef.current?.remove();
    const rotation = heading === null ? 0 : heading;
    const icon = window.L.divIcon({
      className: 'zaven-user-location-marker',
      html: `<div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center"><div style="position:absolute;inset:2px;border-radius:50%;background:rgba(37,99,235,.18)"></div><svg width="42" height="42" viewBox="0 0 42 42" style="position:absolute;transform:rotate(${rotation}deg)"><path d="M21 2 L29 18 L21 14 L13 18 Z" fill="#2563eb" opacity=".9"/></svg><div style="position:relative;width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 1px 8px #2563eb99"></div></div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
    userGpsMarkerRef.current = window.L.marker([lat, lng], {
      icon,
      interactive: false,
    }).addTo(leafletMapRef.current);
  };

  const handleLocateMe = async () => {
    if (isLocatingUser) return;
    setStatusMessage(null);
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatusMessage({
        type: 'warning',
        text: gpsText.insecure,
      });
      return;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatusMessage({ type: 'warning', text: gpsText.unsupported });
      return;
    }

    const requestId = ++locateRequestIdRef.current;
    userMovedManuallyDuringLocateRef.current = false;
    setIsLocatingUser(true);
    const requestPosition = (
      highAccuracy: boolean,
      timeout: number,
      maximumAge: number
    ) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge,
        });
      });

    try {
      try {
        if (navigator.permissions?.query) {
          const permission = await navigator.permissions.query({
            name: 'geolocation' as PermissionName,
          });
          if (permission.state === 'denied') {
            const deniedError = new Error('Location permission denied') as Error & { code: number };
            deniedError.code = 1;
            throw deniedError;
          }
        }
      } catch (error) {
        if ((error as { code?: number }).code === 1) throw error;
        // Some browsers do not expose the Permissions API; getCurrentPosition remains authoritative.
      }

      let position: GeolocationPosition;
      try {
        position = await requestPosition(true, 7000, 0);
      } catch (error) {
        if ((error as { code?: number }).code === 1) throw error;
        position = await requestPosition(false, 12000, 60000);
      }
      if (requestId !== locateRequestIdRef.current) return;

      const { latitude, longitude, heading } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw { code: 2 };
      }
      const lat = Number(latitude.toFixed(5));
      const lng = Number(longitude.toFixed(5));
      drawUserLocation(lat, lng, Number.isFinite(heading) ? heading : null);
      if (!userMovedManuallyDuringLocateRef.current) {
        setStatusMessage({ type: 'info', text: gpsText.found });
        moveMapToCoords(lat, lng, 16, true, true);
      }
    } catch (error) {
      if (requestId !== locateRequestIdRef.current) return;
      const code = (error as { code?: number }).code;
      setStatusMessage({
        type: 'warning',
        text: code === 1 ? gpsText.denied : code === 3 ? gpsText.timeout : gpsText.unavailable,
      });
    } finally {
      if (requestId === locateRequestIdRef.current) setIsLocatingUser(false);
    }
  };

  const handlePlaceSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearchingPlace(true);
    setStatusMessage(null);
    setSearchResults([]);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=uz&limit=5&addressdetails=1&q=${encodeURIComponent(
          q
        )}&accept-language=uz,ru`,
        {
          headers: { Accept: 'application/json' },
        }
      );

      if (!res.ok) throw new Error('Search HTTP error');
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const parsed = data.map(
          (item: { display_name: string; lat: string; lon: string }) => ({
            display_name: item.display_name,
            lat: Number(parseFloat(item.lat).toFixed(5)),
            lon: Number(parseFloat(item.lon).toFixed(5)),
          })
        );

        if (parsed.length === 1) {
          moveMapToCoords(parsed[0].lat, parsed[0].lon, 16);
        } else {
          setSearchResults(parsed);
          moveMapToCoords(parsed[0].lat, parsed[0].lon, 15);
        }
      } else {
        setStatusMessage({
          type: 'warning',
          text: t('cart.mapSearchNoResult'),
        });
      }
    } catch {
      setStatusMessage({
        type: 'warning',
        text: t('cart.mapNetworkError'),
      });
    } finally {
      setIsSearchingPlace(false);
    }
  };

  if (!isOpen) return null;

  const isConfirmDisabled =
    !hasSelectedPoint ||
    isReverseGeocoding ||
    Number.isNaN(pinCoords.lat) ||
    Number.isNaN(pinCoords.lng);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('cart.mapModalTitle')}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-950/80 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Full-Height Mobile Map Sheet (`h-[92dvh] sm:h-[85vh]`) */}
      <div className="relative z-10 w-full sm:max-w-2xl h-[92dvh] sm:h-[85vh] bg-white dark:bg-[#12211C] rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-[#2F5246] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar: Title + Search Input + Quick Region Chips */}
        <div className="bg-[#0F3D2E] text-white px-3.5 pt-3 pb-2.5 sm:px-5 sm:py-3.5 space-y-2.5 shrink-0 border-b border-[#09261C]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#C89D54] text-[#09261C] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-base font-extrabold text-white truncate">
                {t('cart.mapModalTitle')}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('product.close')}
              className="w-8 h-8 rounded-xl bg-[#09261C]/80 hover:bg-[#16533F] text-emerald-100 hover:text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input Row */}
          <form onSubmit={handlePlaceSearch} className="relative flex gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('cart.mapSearchPlaceholder')}
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-white dark:bg-[#0D1915] text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs sm:text-sm border border-transparent focus:border-[#C89D54] focus:outline-none shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearchingPlace}
              className="h-10 px-3.5 rounded-xl bg-[#C89D54] hover:bg-[#B5893E] text-[#09261C] font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm transition-colors"
            >
              {isSearchingPlace ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                t('header.searchShortBtn')
              )}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 1 && (
            <ul className="bg-white dark:bg-[#12211C] text-gray-900 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-[#2F5246] divide-y divide-gray-100 dark:divide-[#28453B] max-h-36 overflow-y-auto shadow-lg text-xs">
              {searchResults.map((res, idx) => (
                <li key={`${res.lat}-${res.lon}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => moveMapToCoords(res.lat, res.lon, 16)}
                    className="w-full px-3 py-2 text-left hover:bg-brand-green-light/50 dark:hover:bg-[#162923] flex items-center gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-brand-green shrink-0" />
                    <span className="truncate">{res.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Quick Uzbekistan City Jump Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
            {UZBEKISTAN_REGIONS.map((reg) => {
              const isCurrentReg = matchedRegion?.id === reg.id;
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() =>
                    moveMapToCoords(
                      reg.approxCenter.lat,
                      reg.approxCenter.lng,
                      13
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors border ${
                    isCurrentReg
                      ? 'bg-[#C89D54] text-[#09261C] border-[#F3D79B]'
                      : 'bg-[#09261C]/75 text-emerald-100 border-emerald-700/70 hover:bg-[#16533F]'
                  }`}
                >
                  {reg.nameUz
                    .replace(' viloyati', '')
                    .replace(' Respublikasi', '')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Interactive Touch Map Viewport (Fills available height) */}
        <div className="relative flex-1 min-h-[220px] w-full bg-gray-100 dark:bg-[#0B1512] overflow-hidden">
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0"
            aria-label="Interactive delivery map"
          />

          {/* Floating Instruction Pill at Top of Map */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3 py-1 rounded-full bg-[#09261C]/90 text-emerald-50 border border-[#C89D54]/50 shadow-md text-[11px] font-semibold whitespace-nowrap">
            {t('cart.mapDragHint')}
          </div>

          {/* Fixed Center Pin (Matches Reference Screenshot Usability) */}
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
            <div className="-mt-9 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#0F3D2E] border-2 border-[#C89D54] text-[#C89D54] flex items-center justify-center shadow-xl">
                {isReverseGeocoding ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-5 h-5 fill-[#C89D54]/25" />
                )}
              </div>
              <div className="w-1 h-3 bg-[#09261C] rounded-b-full -mt-0.5" />
              <div className="w-3 h-1.5 rounded-full bg-black/35 blur-[1px]" />
            </div>
          </div>

          {/* Visible, Touch-Friendly Zoom Controls (+ / -) */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => leafletMapRef.current?.zoomIn()}
              aria-label="Kattalashtirish / Zoom in"
              className="w-11 h-11 rounded-2xl bg-white/95 dark:bg-[#12211C]/95 hover:bg-[#0F3D2E] text-gray-900 dark:text-gray-100 hover:text-white border border-gray-200 dark:border-[#2F5246] shadow-lg flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => leafletMapRef.current?.zoomOut()}
              aria-label="Kichiklashtirish / Zoom out"
              className="w-11 h-11 rounded-2xl bg-white/95 dark:bg-[#12211C]/95 hover:bg-[#0F3D2E] text-gray-900 dark:text-gray-100 hover:text-white border border-gray-200 dark:border-[#2F5246] shadow-lg flex items-center justify-center transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocatingUser}
            aria-label={isLocatingUser ? gpsText.btnLoading : gpsText.btnIdle}
            title={isLocatingUser ? gpsText.btnLoading : gpsText.btnIdle}
            className="absolute bottom-3 right-3 z-20 w-11 h-11 rounded-2xl bg-white/95 dark:bg-[#12211C]/95 text-blue-600 border border-gray-200 dark:border-[#2F5246] shadow-lg flex items-center justify-center disabled:opacity-60"
          >
            {isLocatingUser ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
          </button>
        </div>

        {/* Bottom Sheet: "Tanlangan manzil" Preview + Editable Street Input + Confirm CTA */}
        <div className="bg-white dark:bg-[#12211C] border-t border-gray-200 dark:border-[#28453B] p-3.5 sm:p-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] space-y-3 shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          {/* Detected Address & Matched Region/District Preview */}
          <div className="p-3 rounded-2xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                {t('cart.mapSelectedAddressLabel')}
              </span>
              {matchedRegion && (
                <span className="text-[11px] font-extrabold text-brand-green bg-brand-green-light dark:bg-[#0F3D2E] px-2 py-0.5 rounded-md">
                  {getRegionName(matchedRegion)}
                  {matchedDistrict ? ` • ${matchedDistrict}` : ''}
                </span>
              )}
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-gray-100 leading-snug break-words">
                {isReverseGeocoding
                  ? t('cart.mapLoadingAddress')
                  : detectedPlaceSummary || t('cart.mapAddressNotFound')}
              </p>
            </div>
          </div>

          {statusMessage && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Editable Street, House & Apartment Input */}
          <div>
            <label className="block text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              {t('cart.mapAddressEditLabel')}
            </label>
            <input
              type="text"
              value={editableAddress}
              onChange={(e) => setEditableAddress(e.target.value)}
              placeholder={t('cart.addressPlaceholder')}
              className="w-full h-10 px-3.5 rounded-xl border border-gray-300 dark:border-[#2F5246] bg-white dark:bg-[#0D1915] text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-brand-green focus:outline-none"
            />
          </div>

          {/* Primary Confirm CTA (Matches Reference Screenshot) */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isConfirmDisabled}
            isLoading={isReverseGeocoding}
            leftIcon={<Check className="w-5 h-5 text-[#C89D54]" />}
            onClick={() => {
              onConfirmLocation({
                coords: pinCoords,
                reverseGeocodedAddress:
                  editableAddress.trim() || detectedPlaceSummary.trim(),
                matchedRegion,
                matchedDistrict,
              });
              onClose();
            }}
          >
            {t('cart.mapConfirmBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
};
