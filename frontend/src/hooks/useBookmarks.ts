import { useState, useEffect, useCallback } from "react";
import { Cafe } from "@/lib/types";

const STORAGE_KEY = "coffee_bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Cafe[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {
      setBookmarks([]);
    }
  }, []);

  const isBookmarked = useCallback(
    (cafeId: string) => bookmarks.some((b) => b.id === cafeId),
    [bookmarks]
  );

  const toggleBookmark = useCallback((cafe: Cafe) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === cafe.id);
      const next = exists
        ? prev.filter((b) => b.id !== cafe.id)
        : [...prev, cafe];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { bookmarks, isBookmarked, toggleBookmark };
}