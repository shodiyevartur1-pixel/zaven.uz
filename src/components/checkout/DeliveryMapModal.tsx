import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  LocateFixed,
  Check,
  Search,
  AlertCircle,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { UZBEKISTAN_REGIONS } from '../../utils/uzbekistanLocations';
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

/**
 * PART 3 FIX: Customer-initiated Map Picker Modal
 * - Supports Yandex Maps JS API v2.1 if `VITE_YANDEX_MAPS_API_KEY` is provided in .env,
 *   and falls back seamlessly to an interactive OpenStreetMap frame + coordinate pin
 *   mover + Nominatim reverse geocoding when no API key is configured.
 * - Never requests geolocation automatically on open; only runs geolocation if the
 *   customer explicitly taps "Mening joylashuvim".
 * - Populates the editable address field via reverse geocoding when available.
 */
export const DeliveryMapModal: React.FC<DeliveryMapModalProps> = ({
  isOpen,
  onClose,
  initialCoords,
  initialAddress,
  onConfirmLocation,
}) => {
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>(
    initialCoords
  );
  const [editableAddress, setEditableAddress] =
    useState<string>(initialAddress);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [isSearchingPlace, setIsSearchingPlace] = useState<boolean>(false);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<{
    type: 'info' | 'warning' | 'error';
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

  const [isYandexReady, setIsYandexReady] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPinCoords({
        lat: Number(initialCoords.lat.toFixed(5)),
        lng: Number(initialCoords.lng.toFixed(5)),
      });
      setEditableAddress(initialAddress);
      setStatusNotice(null);
    }
  }, [isOpen, initialCoords.lat, initialCoords.lng, initialAddress]);

  // Reverse geocode coordinates into a readable Uzbek street/district address
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
        text: 'Tanlangan koordinatalar Oʻzbekiston hududidan tashqarida koʻrinmoqda. Manzilni qoʻlda tekshirib kiriting.',
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
            data.address.quarter,
          data.address.road || data.address.pedestrian,
          data.address.house_number
            ? `${data.address.house_number}-uy`
            : undefined,
          data.address.amenity || data.address.shop,
        ].filter(Boolean);

        const formatted =
          parts.length > 0
            ? parts.join(', ')
            : typeof data.display_name === 'string'
            ? data.display_name.split(',').slice(0, 3).join(', ').trim()
            : '';

        if (formatted) {
          setEditableAddress(formatted);
          setStatusNotice({
            type: 'info',
            text: 'Xaritadagi nuqta boʻyicha manzil aniqlandi. Uy va xonadon raqamini tahrirlashingiz mumkin.',
          });
          return;
        }
      }

      setStatusNotice({
        type: 'warning',
        text: 'Koordinata saqlandi, ammo koʻcha nomi avtomatik aniqlanmadi. Iltimos, manzilni quyidagi maydonga yozing.',
      });
    } catch {
      setStatusNotice({
        type: 'warning',
        text: 'Manzilni avtomatik aniqlash xizmati javob bermadi. Koordinata saqlandi — koʻcha va uy raqamini qoʻlda kiriting.',
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Optional Yandex Maps JS API v2.1 loader when VITE_YANDEX_MAPS_API_KEY is configured
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
        setIsYandexReady(true);
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
        script.onerror = () => {
          setIsYandexReady(false);
        };
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
    const roundedLat = Number(nextLat.toFixed(5));
    const roundedLng = Number(nextLng.toFixed(5));
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

  // Search street/place in Uzbekistan using Nominatim
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
          text: 'Ushbu soʻrov boʻyicha joy topilmadi. Viloyat tugmalaridan birini tanlang yoki manzilni qoʻlda yozing.',
        });
      }
    } catch {
      setStatusNotice({
        type: 'warning',
        text: 'Qidiruv xizmati vaqtincha ishlamadi. Pinni tugmalar yordamida suring yoki manzilni qoʻlda kiriting.',
      });
    } finally {
      setIsSearchingPlace(false);
    }
  };

  // Customer-initiated optional GPS button inside the map modal
  const handleLocateMeOnMap = () => {
    setStatusNotice(null);
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatusNotice({
        type: 'error',
        text: 'Brauzeringiz geolokatsiyani qoʻllab-quvvatlamaydi. Joylashuvni xaritadan tanlang yoki qoʻlda kiriting.',
      });
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        updatePinPosition(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setIsLocatingGps(false);
        setStatusNotice({
          type: 'warning',
          text: 'Joylashuv ruxsati berilmadi. Xaritadagi hududlardan birini tanlab pinni surishingiz yoki manzilni qoʻlda yozishingiz mumkin.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
      title="Yetkazib berish nuqtasini xaritadan belgilash"
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
            Bekor qilish
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
            Nuqtani tasdiqlash
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs sm:text-sm">
        {/* Search Bar + Optional "Mening joylashuvim" Trigger */}
        <div className="flex flex-col sm:flex-row gap-2">
          <form onSubmit={handlePlaceSearch} className="flex-1 flex gap-1.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Koʻcha, tuman yoki moʻljalni qidiring (masalan: Yunusobod)..."
              className="flex-1 h-10 rounded-xl border border-gray-300 dark:border-[#2F5246] px-3 text-xs bg-white dark:bg-[#0D1915] text-gray-900 dark:text-gray-100"
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              isLoading={isSearchingPlace}
              leftIcon={<Search className="w-3.5 h-3.5" />}
            >
              Izlash
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={isLocatingGps}
            leftIcon={<LocateFixed className="w-3.5 h-3.5 text-brand-green" />}
            onClick={handleLocateMeOnMap}
          >
            Mening joylashuvim
          </Button>
        </div>

        {/* Quick City/Region Jump Chips */}
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

        {/* Interactive Map Viewport (Yandex JS SDK when key configured, or live OpenStreetMap interactive pin frame) */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-[#0F3D2E] dark:border-[#2F5246] bg-gray-100 dark:bg-[#0D1915]">
          {yandexApiKey ? (
            <div
              ref={yandexContainerRef}
              className="w-full h-56 sm:h-64"
              aria-label="Yandex Map Picker"
            />
          ) : (
            <div className="relative w-full h-56 sm:h-64">
              <iframe
                title="ZAVEN Delivery Map"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${osmBbox}&layer=mapnik&marker=${pinCoords.lat}%2C${pinCoords.lng}`}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          )}

          {/* Precision Pin Nudge & Reverse-Geocode Bar */}
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
              <span className="text-[10px] text-emerald-200/80 mr-1 hidden sm:inline">
                Pinni surish:
              </span>
              <button
                type="button"
                onClick={() =>
                  updatePinPosition(pinCoords.lat + 0.0025, pinCoords.lng)
                }
                className="w-7 h-7 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] font-bold flex items-center justify-center"
                aria-label="Shimolga / North"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePinPosition(pinCoords.lat - 0.0025, pinCoords.lng)
                }
                className="w-7 h-7 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] font-bold flex items-center justify-center"
                aria-label="Janubga / South"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePinPosition(pinCoords.lat, pinCoords.lng - 0.0025)
                }
                className="w-7 h-7 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] font-bold flex items-center justify-center"
                aria-label="Gʻarbga / West"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePinPosition(pinCoords.lat, pinCoords.lng + 0.0025)
                }
                className="w-7 h-7 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] font-bold flex items-center justify-center"
                aria-label="Sharqqa / East"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {statusNotice && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              statusNotice.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : statusNotice.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{statusNotice.text}</span>
          </div>
        )}

        {/* Editable Reverse-Geocoded Street Address */}
        <Input
          label="Tanlangan nuqta boʻyicha manzil (tahrirlash mumkin)"
          value={editableAddress}
          onChange={(e) => setEditableAddress(e.target.value)}
          placeholder="Koʻcha, uy va xonadon raqamini kiriting..."
          leftIcon={<MapPin className="w-4 h-4" />}
          helperText={
            !isYandexReady && !yandexApiKey
              ? 'Xarita nuqtasi tanlanganda koʻcha nomi avtomatik toʻldiriladi.'
              : undefined
          }
        />
      </div>
    </Modal>
  );
};
