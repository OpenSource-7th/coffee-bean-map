"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

interface Cafe {
  id: string;
  name: string;
}

interface Menu {
  id: string;
  menu_name: string;
}

function LoginForm({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else if (data.session) {
      onLogin(data.session);
    }
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>Admin 로그인</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: "10px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14 }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "10px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14 }}
        />
        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px",
            background: loading ? "#ccc" : "#ac3509",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: loading ? "default" : "pointer",
            fontSize: 14,
          }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string>("");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [newMenuName, setNewMenuName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("cafes")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCafes(data ?? []));
  }, [session]);

  useEffect(() => {
    if (!selectedCafeId) {
      setMenus([]);
      return;
    }
    supabase
      .from("menus")
      .select("id, menu_name")
      .eq("cafe_id", selectedCafeId)
      .order("menu_name")
      .then(({ data }) => setMenus(data ?? []));
  }, [selectedCafeId]);

  async function handleAdd() {
    const name = newMenuName.trim();
    if (!selectedCafeId || !name) return;
    setLoading(true);
    setStatus(null);
    const { error } = await supabase
      .from("menus")
      .insert({ cafe_id: selectedCafeId, menu_name: name });
    if (error) {
      setStatus(`오류: ${error.message}`);
    } else {
      setNewMenuName("");
      setStatus(`"${name}" 추가 완료`);
      const { data } = await supabase
        .from("menus")
        .select("id, menu_name")
        .eq("cafe_id", selectedCafeId)
        .order("menu_name");
      setMenus(data ?? []);
    }
    setLoading(false);
  }

  async function handleDelete(menuId: string, menuName: string) {
    if (!confirm(`"${menuName}" 메뉴를 삭제할까요?`)) return;
    const { error } = await supabase.from("menus").delete().eq("id", menuId);
    if (error) {
      setStatus(`삭제 오류: ${error.message}`);
    } else {
      setStatus(`"${menuName}" 삭제 완료`);
      setMenus((prev) => prev.filter((m) => m.id !== menuId));
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setCafes([]);
    setSelectedCafeId("");
    setMenus([]);
  }

  if (!session) {
    return <LoginForm onLogin={setSession} />;
  }

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>메뉴 관리 (Admin)</h1>
        <button
          onClick={handleLogout}
          style={{ background: "none", border: "1px solid #ccc", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
        >
          로그아웃
        </button>
      </div>

      <section style={{ marginBottom: 32 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>카페 선택</label>
        <select
          value={selectedCafeId}
          onChange={(e) => { setSelectedCafeId(e.target.value); setStatus(null); }}
          style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14 }}
        >
          <option value="">-- 카페를 선택하세요 --</option>
          {cafes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </section>

      {selectedCafeId && (
        <>
          <section style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
              현재 메뉴 ({menus.length}개)
            </label>
            {menus.length === 0 ? (
              <p style={{ color: "#888", fontSize: 14 }}>등록된 메뉴가 없습니다.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {menus.map((m) => (
                  <li
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      marginBottom: 6,
                      border: "1px solid #eee",
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{m.menu_name}</span>
                    <button
                      onClick={() => handleDelete(m.id, m.menu_name)}
                      style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 13 }}
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>메뉴 추가</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="메뉴 이름 입력 (예: 말차라떼)"
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14 }}
              />
              <button
                onClick={handleAdd}
                disabled={loading || !newMenuName.trim()}
                style={{
                  padding: "10px 20px",
                  background: loading || !newMenuName.trim() ? "#ccc" : "#ac3509",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: loading || !newMenuName.trim() ? "default" : "pointer",
                  fontSize: 14,
                }}
              >
                추가
              </button>
            </div>
            {status && (
              <p style={{ marginTop: 10, fontSize: 13, color: status.startsWith("오류") || status.startsWith("삭제 오류") ? "#c0392b" : "#27ae60" }}>
                {status}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
