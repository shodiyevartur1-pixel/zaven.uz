import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Check,
  Search,
  AlertCircle,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { UZBEKISTAN_REGIONS } from '../../utils/uzbekistanLocations';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface DeliveryMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords: { lat: number; lng: number };
  initialAddress: string;
  onConfirmLocation: (payload: {
    coords: { lat: number; lng: number };
    reverseGeocodedAddress: string;
  }) => void;
}

declare global {
  interface Window {
    ymaps?: {
      ready: (cb: () => void) => void;
      Map: new (
        el: HTMLElement,
        state: { center: [number, number]; zoom: number; controls: string[] }
      ) => {
        events: {
          add: (
            event: string,
            cb: (e: { get: (k: string) => [number, number] }) => void
          ) => void;
        };
        geoObjects: { add: (obj: unknown) => void };
        setCenter: (center: [number, number], zoom?: number) => void;
        destroy: () => void;
      };
      Placemark: new (
        coords: [number, number],
        props: Record<string, unknown>,
        opts: Record<string, unknown>
      ) => {
        geometry: {
          setCoordinates: (coords: [number, number]) => void;
          getCoordinates: () => [number, number];
        };
        events: { add: (event: string, cb: () => void) => void };
      };
    };
  }
}

const UZ_LAT_MIN = 37.0;
const UZ_LAT_MAX = 45.6;
const UZ_LNG_MIN = 55.8;
const UZ_LNG_MAX = 73.2;

/**
 * Requirement #12: Redesigned ZAVEN-styled Map Picker Modal.
 * - Removed "Joylashuvimni aniqlash" / "Find my location" GPS button completely.
 * - Never requests device GPS automatically and never overwrites the customer's
 *   selected region or district.
 * - Supports place search, tapping the map or nudging the pin, automatic reverse
 *   geocoding into the editable street/house/apartment field, and a clear Uzbek
 *   fallback message if reverse geocoding cannot find a street name.
 */
export const DeliveryMapModal: React.FC<DeliveryMapModalProps> = ({
  isOpen,
  onClose,
  initialCoords,
  initialAddress,
  onConfirmLocation,
}) => {
  const { t } = useThemeLanguage();

  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>(
    initialCoords
  );
  const [detectedPlaceLabel, setDetectedPlaceLabel] = useState<string>('');
  const [editableAddress, setEditableAddress] =
    useState<string>(initialAddress);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [isSearchingPlace, setIsSearchingPlace] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<{
    type: 'info' | 'warning';
    text: string;
  } | null>(null);

  const yandexContainerRef = useRef<HTMLDivElement>(null);
  const yandexMapInstanceRef = useRef<{
    setCenter: (center: [number, number], zoom?: number) => void;
    destroy: () => void;
  } | null>(null);
  const yandexPlacemarkRef = useRef<{
    geometry: { setCoordinates: (coords: [number, number]) => void };
  } | null>(null);

  const yandexApiKey =
    (
      import.meta as unknown as {
        env?: Record<string, string | undefined>;
      }
    ).env?.VITE_YANDEX_MAPS_API_KEY?.trim() || '';

  useEffect(() => {
    if (isOpen) {
      const startLat = Number(initialCoords.lat.toFixed(5));
      const startLng = Number(initialCoords.lng.toFixed(5));
      setPinCoords({ lat: startLat, lng: startLng });
      setEditableAddress(initialAddress);
      setDetectedPlaceLabel(initialAddress || '');
      setStatusNotice(null);
    }
  }, [isOpen, initialCoords.lat, initialCoords.lng, initialAddress]);

  const fetchReverseGeocode = async (lat: number, lng: number) => {
    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < 36.5 ||
      lat > 46.0 ||
      lng < 55.5 ||
      lng > 74.0
    ) {
      setStatusNotice({
        type: 'warning',
        text: 'Tanlangan nuqta Oʻzbekiston hududidan tashqarida koʻrinmoqda. Manzilni quyidagi maydonga qoʻlda kiriting.',
      });
      return;
    }

    setIsReverseGeocoding(true);
    setStatusNotice(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=uz,ru`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding HTTP error');
      }

      const data = await response.json();
      if (data && data.address) {
        const parts = [
          data.address.Suburb ||
            data.address.suburb ||
            data.address.neighbourhood ||
            data.address.quarter ||
            data.address.city_district,
          data.address.road || data.address.pedestrian || data.address.street,
          data.address.house_number
            ? `${data.address.house_number}-uy`
            : undefined,
          data.address.amenity || data.address.shop || data.address.building,
        ].filter(Boolean);

        const formatted =
          parts.length > 0
            ? parts.join(', ')
            : typeof data.display_name === 'string'
            ? data.display_name.split(',').slice(0, 3).join(', ').trim()
            : '';

        if (formatted) {
          setDetectedPlaceLabel(formatted);
          setEditableAddress(formatted);
          return;
        }
      }

      setStatusNotice({
        type: 'warning',
        text: 'Ushbu nuqta uchun koʻcha nomi avtomatik topilmadi. Iltimos, koʻcha, uy va xonadonni quyida qoʻlda yozing.',
      });
    } catch {
      setStatusNotice({
        type: 'warning',
        text: 'Manzilni avtomatik aniqlash imkoni boʻlmadi. Nuqta saqlandi — koʻcha va uy raqamini quyida qoʻlda kiriting.',
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !yandexApiKey) return;

    let isCancelled = false;
    const scriptId = 'zaven-yandex-maps-sdk';

    const initMap = () => {
      if (isCancelled || !window.ymaps || !yandexContainerRef.current) return;
      window.ymaps.ready(() => {
        if (isCancelled || !yandexContainerRef.current || !window.ymaps) return;

        if (yandexMapInstanceRef.current) {
          yandexMapInstanceRef.current.destroy();
        }

        const map = new window.ymaps.Map(yandexContainerRef.current, {
          center: [pinCoords.lat, pinCoords.lng],
          zoom: 15,
          controls: ['zoomControl'],
        });

        const placemark = new window.ymaps.Placemark(
          [pinCoords.lat, pinCoords.lng],
          {},
          {
            draggable: true,
            preset: 'islands#darkGreenDotIcon',
          }
        );

        placemark.events.add('dragend', () => {
          const coords = placemark.geometry.getCoordinates();
          const nextLat = Number(coords[0].toFixed(5));
          const nextLng = Number(coords[1].toFixed(5));
          setPinCoords({ lat: nextLat, lng: nextLng });
          fetchReverseGeocode(nextLat, nextLng);
        });

        map.events.add('click', (e) => {
          const coords = e.get('coords');
          const nextLat = Number(coords[0].toFixed(5));
          const nextLng = Number(coords[1].toFixed(5));
          placemark.geometry.setCoordinates([nextLat, nextLng]);
          setPinCoords({ lat: nextLat, lng: nextLng });
          fetchReverseGeocode(nextLat, nextLng);
        });

        map.geoObjects.add(placemark);
        yandexMapInstanceRef.current = map;
        yandexPlacemarkRef.current = placemark;
      });
    };

    if (window.ymaps) {
      initMap();
    } else {
      const existingScript = document.getElementById(
        scriptId
      ) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', initMap);
      } else {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(
          yandexApiKey
        )}&lang=uz_UZ`;
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
      }
    }

    return () => {
      isCancelled = true;
      if (yandexMapInstanceRef.current) {
        yandexMapInstanceRef.current.destroy();
        yandexMapInstanceRef.current = null;
      }
    };
  }, [isOpen, yandexApiKey]);

  const updatePinPosition = (nextLat: number, nextLng: number) => {
    const clampedLat = Math.max(UZ_LAT_MIN, Math.min(UZ_LAT_MAX, nextLat));
    const clampedLng = Math.max(UZ_LNG_MIN, Math.min(UZ_LNG_MAX, nextLng));
    const roundedLat = Number(clampedLat.toFixed(5));
    const roundedLng = Number(clampedLng.toFixed(5));
    setPinCoords({ lat: roundedLat, lng: roundedLng });

    if (yandexMapInstanceRef.current && yandexPlacemarkRef.current) {
      yandexMapInstanceRef.current.setCenter([roundedLat, roundedLng], 16);
      yandexPlacemarkRef.current.geometry.setCoordinates([
        roundedLat,
        roundedLng,
      ]);
    }

    fetchReverseGeocode(roundedLat, roundedLng);
  };

  // Interactive tap-to-place overlay handler for the OpenStreetMap viewport
  const handleInteractiveMapOverlayTap = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = (e.clientX - rect.left) / rect.width - 0.5;
    const offsetY = 0.5 - (e.clientY - rect.top) / rect.height;

    const nextLng = pinCoords.lng + offsetX * 0.016;
    const nextLat = pinCoords.lat + offsetY * 0.01;
    updatePinPosition(nextLat, nextLng);
  };

  const handlePlaceSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearchingPlace(true);
    setStatusNotice(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=uz&limit=1&q=${encodeURIComponent(
          q
        )}&accept-language=uz,ru`
      );
      if (!res.ok) throw new Error('Search failed');
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const first = results[0];
        const foundLat = Number(parseFloat(first.lat).toFixed(5));
        const foundLng = Number(parseFloat(first.lon).toFixed(5));
        updatePinPosition(foundLat, foundLng);
      } else {
        setStatusNotice({
          type: 'warning',
          text: 'Ushbu soʻrov boʻyicha joy topilmadi. Boshqa moʻljal yozib koʻring yoki xaritadan nuqtani tanlang.',
        });
      }
    } catch {
      setStatusNotice({
        type: 'warning',
        text: 'Qidiruv xizmati javob bermadi. Xaritadan nuqtani tanlang yoki manzilni qoʻlda yozing.',
      });
    } finally {
      setIsSearchingPlace(false);
    }
  };

  const osmBbox = `${(pinCoords.lng - 0.008).toFixed(5)}%2C${(
    pinCoords.lat - 0.005
  ).toFixed(5)}%2C${(pinCoords.lng + 0.008).toFixed(5)}%2C${(
    pinCoords.lat + 0.005
  ).toFixed(5)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('cart.mapModalTitle')}
      maxWidth="xl"
      footer={
        <div className="w-full grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            fullWidth
            onClick={onClose}
          >
            {t('footer.cancelBtn')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            leftIcon={<Check className="w-4 h-4 text-[#C89D54]" />}
            onClick={() => {
              onConfirmLocation({
                coords: pinCoords,
                reverseGeocodedAddress: editableAddress.trim(),
              });
              onClose();
            }}
          >
            {t('cart.mapConfirmBtn')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs sm:text-sm">
        {/* Place Search Bar (No automatic or button GPS trigger) */}
        <form onSubmit={handlePlaceSearch} className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('cart.mapSearchPlaceholder')}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-300 dark:border-[#2F5246] text-xs sm:text-sm bg-white dark:bg-[#0D1915] text-gray-900 dark:text-gray-100 focus:border-[#C89D54] focus:outline-none"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            isLoading={isSearchingPlace}
          >
            {t('header.searchShortBtn')}
          </Button>
        </form>

        {/* Quick City Center Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {UZBEKISTAN_REGIONS.map((reg) => (
            <button
              key={reg.id}
              type="button"
              onClick={() =>
                updatePinPosition(reg.approxCenter.lat, reg.approxCenter.lng)
              }
              className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] dark:bg-[#162923] hover:bg-brand-green-light border border-gray-200 dark:border-[#28453B] text-[11px] font-semibold text-gray-700 dark:text-gray-200 shrink-0 transition-colors"
            >
              {reg.nameUz.replace(' viloyati', '').replace(' Respublikasi', '')}
            </button>
          ))}
        </div>

        {/* Map Canvas + Center Pin & Tap-to-Place Overlay */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-[#0F3D2E] dark:border-[#2F5246] bg-gray-100 dark:bg-[#0D1915]">
          {yandexApiKey ? (
            <div
              ref={yandexContainerRef}
              className="w-full h-56 sm:h-64"
              aria-label="Yandex Map Picker"
            />
          ) : (
            <div className="relative w-full h-56 sm:h-64 select-none">
              <iframe
                title="ZAVEN Delivery Map"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${osmBbox}&layer=mapnik&marker=${pinCoords.lat}%2C${pinCoords.lng}`}
                className="w-full h-full border-0 pointer-events-none"
                loading="lazy"
              />
              {/* Interactive click/tap layer so tapping anywhere on the map moves the pin */}
              <div
                onClick={handleInteractiveMapOverlayTap}
                role="button"
                tabIndex={0}
                aria-label="Xaritadan nuqta tanlash uchun bosing"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp')
                    updatePinPosition(pinCoords.lat + 0.002, pinCoords.lng);
                  if (e.key === 'ArrowDown')
                    updatePinPosition(pinCoords.lat - 0.002, pinCoords.lng);
                  if (e.key === 'ArrowLeft')
                    updatePinPosition(pinCoords.lat, pinCoords.lng - 0.002);
                  if (e.key === 'ArrowRight')
                    updatePinPosition(pinCoords.lat, pinCoords.lng + 0.002);
                }}
                className="absolute inset-0 cursor-crosshair flex items-center justify-center focus:outline-none"
              >
                <div className="pointer-events-none -mt-6 flex flex-col items-center">
                  <div className="px-2 py-0.5 rounded-md bg-[#09261C]/90 text-[#F3D79B] text-[10px] font-bold shadow-md mb-1 whitespace-nowrap">
                    Xaritaga bosing
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#0F3D2E] border-2 border-[#C89D54] text-[#C89D54] flex items-center justify-center shadow-lg">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fine-Tune Pin Nudge Bar */}
          <div className="px-3 py-2 bg-[#09261C] text-emerald-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
              <span className="font-mono text-[#C89D54] font-bold">
                {pinCoords.lat}, {pinCoords.lng}
              </span>
              {isReverseGeocoding && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300 ml-1" />
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  updatePinPosition(pinCoords.lat + 0.002, pinCoords.lng)
                }
                className="w-7 h-7 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] font-bold flex items-center justify-center"
                aria-label="Shimolga / North"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePinPosition(pinCoords.lat - 0.002, pinCoords.lng)
                }
                className="w-7 h-7 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] font-bold flex items-center justify-center"
                aria-label="Janubga / South"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePinPosition(pinCoords.lat, pinCoords.lng - 0.002)
                }
                className="w-7 h-7 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] font-bold flex items-center justify-center"
                aria-label="Gʻarbga / West"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePinPosition(pinCoords.lat, pinCoords.lng + 0.002)
                }
                className="w-7 h-7 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] font-bold flex items-center justify-center"
                aria-label="Sharqqa / East"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Selected Address Review Card + Editable Street/House/Apartment Input */}
        <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-3">
          {detectedPlaceLabel && (
            <div className="flex items-start gap-2 text-xs">
              <MapPin className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block">
                  Xaritadan aniqlangan manzil:
                </span>
                <p className="font-bold text-gray-900 dark:text-gray-100 break-words">
                  {detectedPlaceLabel}
                </p>
              </div>
            </div>
          )}

          {statusNotice && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusNotice.text}</span>
            </div>
          )}

          <Input
            label={t('cart.mapSelectedAddressLabel')}
            value={editableAddress}
            onChange={(e) => setEditableAddress(e.target.value)}
            placeholder={t('cart.addressPlaceholder')}
            leftIcon={<MapPin className="w-4 h-4" />}
          />
        </div>
      </div>
    </Modal>
  );
};
