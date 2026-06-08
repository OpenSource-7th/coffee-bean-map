"use client";

import { useEffect, useRef } from "react";
import { Cafe, MapCenter, RecommendationType } from "@/lib/types";

interface Props {
  cafes: Cafe[];
  center: MapCenter;
  onPinClick: (cafe: Cafe) => void;
  onCenterChanged: (lat: number, lng: number) => void;
  onVisibleCafeIdsChanged?: (ids: string[]) => void;
  recommendationTypes?: Map<string, RecommendationType>;
}

declare global {
  interface Window {
    kakao: any;
  }
}

function markerImageFor(type: RecommendationType) {
  const color =
    type === "bothMenu" ? "#d97706" :
      type === "bothCafe" ? "#7c3aed" :
        type === "personalized" ? "#2563eb" : "#ac3509";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path fill="${color}" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0Z"/>
      <circle cx="16" cy="16" r="7" fill="white"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function KakaoMap({
  cafes,
  center,
  onPinClick,
  onCenterChanged,
  onVisibleCafeIdsChanged,
  recommendationTypes,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const cafesRef = useRef<Cafe[]>(cafes);
  const onVisibleCafeIdsChangedRef = useRef(onVisibleCafeIdsChanged);

  useEffect(() => {
    cafesRef.current = cafes;
  }, [cafes]);

  useEffect(() => {
    onVisibleCafeIdsChangedRef.current = onVisibleCafeIdsChanged;
  }, [onVisibleCafeIdsChanged]);

  function emitVisibleCafeIds(map: any) {
    const callback = onVisibleCafeIdsChangedRef.current;
    if (!callback || !window.kakao?.maps) return;

    const bounds = map.getBounds();
    const ids = cafesRef.current
      .filter((cafe) => bounds.contain(new window.kakao.maps.LatLng(cafe.lat, cafe.lng)))
      .map((cafe) => cafe.id);
    callback(ids);
  }

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780),
        level: 4,
      };
      const map = new window.kakao.maps.Map(mapRef.current, options);
      mapInstanceRef.current = map;

      window.kakao.maps.event.addListener(map, "dragend", () => {
        const center = map.getCenter();
        onCenterChanged(center.getLat(), center.getLng());
      });

      window.kakao.maps.event.addListener(map, "idle", () => {
        emitVisibleCafeIds(map);
      });

      emitVisibleCafeIds(map);
    };

    const checkKakao = () => {
      if (window.kakao && window.kakao.maps) {
        initMap();
      } else {
        setTimeout(checkKakao, 100);
      }
    };

    checkKakao();
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return;

    mapInstanceRef.current.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng));
    emitVisibleCafeIds(mapInstanceRef.current);
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    cafes.forEach((cafe) => {
      const position = new window.kakao.maps.LatLng(cafe.lat, cafe.lng);
      const recommendationType = recommendationTypes?.get(cafe.id);

      const markerOptions: any = { position };
      if (recommendationType) {
        const imageSrc = markerImageFor(recommendationType);
        const imageSize = new window.kakao.maps.Size(32, 42);
        markerOptions.image = new window.kakao.maps.MarkerImage(imageSrc, imageSize);
      }

      const marker = new window.kakao.maps.Marker(markerOptions);
      marker.setMap(mapInstanceRef.current);

      window.kakao.maps.event.addListener(marker, "click", () => {
        onPinClick(cafe);
      });

      markersRef.current.push(marker);
    });

    emitVisibleCafeIds(mapInstanceRef.current);
  }, [cafes, recommendationTypes]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
