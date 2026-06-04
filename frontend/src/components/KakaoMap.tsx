"use client";

import { useEffect, useRef } from "react";
import { Cafe } from "@/lib/types";

interface Props {
  cafes: Cafe[];
  onPinClick: (cafe: Cafe) => void;
  onCenterChanged: (lat: number, lng: number) => void;
  recommendedCafeIds?: Set<string>;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap({ cafes, onPinClick, onCenterChanged, recommendedCafeIds }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    cafes.forEach((cafe) => {
      const position = new window.kakao.maps.LatLng(cafe.lat, cafe.lng);
      const isRecommended = recommendedCafeIds?.has(cafe.id) ?? false;

      // 추천 카페는 강조 마커 (크기 키우고 빨간 계열 이미지)
      const markerOptions: any = { position };
      if (isRecommended) {
        const imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png";
        const imageSize = new window.kakao.maps.Size(24, 35);
        markerOptions.image = new window.kakao.maps.MarkerImage(imageSrc, imageSize);
      }

      const marker = new window.kakao.maps.Marker(markerOptions);
      marker.setMap(mapInstanceRef.current);

      window.kakao.maps.event.addListener(marker, "click", () => {
        onPinClick(cafe);
      });

      markersRef.current.push(marker);
    });
  }, [cafes, recommendedCafeIds]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}