"use client";

import { useEffect, useRef } from "react";
import { Cafe } from "@/lib/types";

interface Props {
  cafes: Cafe[];
  onPinClick: (cafe: Cafe) => void;
  onCenterChanged: (lat: number, lng: number) => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap({ cafes, onPinClick, onCenterChanged }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      const options = {
        center: new window.kakao.maps.LatLng(37.3219, 127.1269),
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
      const marker = new window.kakao.maps.Marker({ position });
      marker.setMap(mapInstanceRef.current);

      window.kakao.maps.event.addListener(marker, "click", () => {
        onPinClick(cafe);
      });

      markersRef.current.push(marker);
    });
  }, [cafes]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}