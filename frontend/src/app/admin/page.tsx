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

interface Report {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  review_id: string;
  reviews: {
    id: string;
    review_text: string;
  } | null;
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

type Tab = "menus" | "reports";

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("menus");

  // 메뉴 관리 상태
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string>("");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [newMenuName, setNewMenuName] = useState("");
  const [menuStatus, setMenuStatus] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 신고 관리 상태
  const [reports, setReports] = useState<Report[]>([]);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [confirmReport, setConfirmReport] = useState<{ id: string; action: "approve" | "reject" } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsAdmin(data.session?.user?.app_metadata?.role === "admin");
    });
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
    if (!selectedCafeId) { setMenus([]); return; }
    supabase
      .from("menus")
      .select("id, menu_name")
      .eq("cafe_id", selectedCafeId)
      .order("menu_name")
      .then(({ data }) => setMenus(data ?? []));
  }, [selectedCafeId]);

  async function loadReports() {
    setReportLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("id, reason, description, status, created_at, review_id, reviews(id, review_text)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (!error) setReports((data ?? []) as Report[]);
    setReportLoading(false);
  }

  useEffect(() => {
    if (session && isAdmin && activeTab === "reports") loadReports();
  }, [session, isAdmin, activeTab]);

  async function handleMenuAdd() {
    const name = newMenuName.trim();
    if (!selectedCafeId || !name) return;
    setMenuLoading(true);
    setMenuStatus(null);
    const { error } = await supabase.from("menus").insert({ cafe_id: selectedCafeId, menu_name: name });
    if (error) {
      setMenuStatus(`오류: ${error.message}`);
    } else {
      setNewMenuName("");
      setMenuStatus(`"${name}" 추가 완료`);
      const { data } = await supabase.from("menus").select("id, menu_name").eq("cafe_id", selectedCafeId).order("menu_name");
      setMenus(data ?? []);
    }
    setMenuLoading(false);
  }

  async function handleMenuDelete(menuId: string, menuName: string) {
    if (confirmDeleteId !== menuId) { setConfirmDeleteId(menuId); return; }
    setConfirmDeleteId(null);
    setMenuStatus(null);
    const { error } = await supabase.from("menus").delete().eq("id", menuId);
    if (error) {
      setMenuStatus(`삭제 오류: ${error.message}`);
    } else {
      setMenuStatus(`"${menuName}" 삭제 완료`);
      setMenus((prev) => prev.filter((m) => m.id !== menuId));
    }
  }

  async function handleReportApprove(report: Report) {
    setConfirmReport(null);
    setReportStatus(null);

    const now = new Date().toISOString();
    const { error: reviewError } = await supabase
      .from("reviews")
      .update({ is_deleted: true, deleted_at: now })
      .eq("id", report.review_id);

    if (reviewError) { setReportStatus(`오류: ${reviewError.message}`); return; }

    const { error: reportError } = await supabase
      .from("reports")
      .update({ status: "approved" })
      .eq("id", report.id);

    if (reportError) { setReportStatus(`신고 상태 업데이트 오류: ${reportError.message}`); return; }

    setReportStatus("신고 승인 및 리뷰 삭제 완료");
    setReports((prev) => prev.filter((r) => r.id !== report.id));
  }

  async function handleReportReject(reportId: string) {
    setConfirmReport(null);

    const { error } = await supabase.from("reports").update({ status: "rejected" }).eq("id", reportId);
    if (error) {
      setReportStatus(`오류: ${error.message}`);
    } else {
      setReportStatus("신고 기각 완료");
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setCafes([]);
    setSelectedCafeId("");
    setMenus([]);
    setReports([]);
  }

  if (!session) return <LoginForm onLogin={(s) => { setSession(s); setIsAdmin(s.user?.app_metadata?.role === "admin"); }} />;

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: "8px 20px",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid #ac3509" : "2px solid transparent",
    background: "none",
    color: activeTab === tab ? "#ac3509" : "#555",
    fontWeight: activeTab === tab ? "bold" : "normal",
    cursor: "pointer",
    fontSize: 14,
  });

  return (
    <main style={{ maxWidth: 680, margin: "40px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 22 }}>Admin</h1>
        <button
          onClick={handleLogout}
          style={{ background: "none", border: "1px solid #ccc", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
        >
          로그아웃
        </button>
      </div>

      {!isAdmin && (
        <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 16 }}>
          Admin 권한이 없습니다. 일부 기능이 제한됩니다.
        </p>
      )}

      <div style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: 28 }}>
        <button style={tabStyle("menus")} onClick={() => setActiveTab("menus")}>메뉴 관리</button>
        {isAdmin && (
          <button style={tabStyle("reports")} onClick={() => setActiveTab("reports")}>신고 처리</button>
        )}
      </div>

      {activeTab === "menus" && (
        <>
          <section style={{ marginBottom: 32 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>카페 선택</label>
            <select
              value={selectedCafeId}
              onChange={(e) => { setSelectedCafeId(e.target.value); setMenuStatus(null); }}
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
                        {confirmDeleteId === m.id ? (
                          <span style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => handleMenuDelete(m.id, m.menu_name)}
                              style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}
                            >
                              확인
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ background: "none", border: "1px solid #ccc", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}
                            >
                              취소
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMenuDelete(m.id, m.menu_name)}
                            style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 13 }}
                          >
                            삭제
                          </button>
                        )}
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
                    onKeyDown={(e) => e.key === "Enter" && handleMenuAdd()}
                    placeholder="메뉴 이름 입력 (예: 말차라떼)"
                    style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14 }}
                  />
                  <button
                    onClick={handleMenuAdd}
                    disabled={menuLoading || !newMenuName.trim()}
                    style={{
                      padding: "10px 20px",
                      background: menuLoading || !newMenuName.trim() ? "#ccc" : "#ac3509",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: menuLoading || !newMenuName.trim() ? "default" : "pointer",
                      fontSize: 14,
                    }}
                  >
                    추가
                  </button>
                </div>
                {menuStatus && (
                  <p style={{ marginTop: 10, fontSize: 13, color: menuStatus.startsWith("오류") ? "#c0392b" : "#27ae60" }}>
                    {menuStatus}
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}

      {activeTab === "reports" && isAdmin && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>대기 중인 신고 ({reports.length}건)</h2>
            <button
              onClick={loadReports}
              disabled={reportLoading}
              style={{ background: "none", border: "1px solid #ccc", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
            >
              {reportLoading ? "불러오는 중..." : "새로고침"}
            </button>
          </div>

          {reportStatus && (
            <p style={{ marginBottom: 12, fontSize: 13, color: reportStatus.startsWith("오류") ? "#c0392b" : "#27ae60" }}>
              {reportStatus}
            </p>
          )}

          {reports.length === 0 && !reportLoading && (
            <p style={{ color: "#888", fontSize: 14 }}>처리할 신고가 없습니다.</p>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {reports.map((r) => (
              <li
                key={r.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: "#fff",
                    background: r.reason === "spam" ? "#e67e22" : r.reason === "offensive" ? "#c0392b" : "#7f8c8d",
                    borderRadius: 4,
                    padding: "2px 8px",
                  }}>
                    {r.reason}
                  </span>
                  <span style={{ fontSize: 12, color: "#aaa" }}>
                    {new Date(r.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>

                <p style={{ fontSize: 13, color: "#333", margin: "6px 0", lineHeight: 1.5, background: "#f9f9f9", padding: "8px", borderRadius: 6 }}>
                  {r.reviews?.review_text ?? "(리뷰 내용 없음)"}
                </p>

                {r.description && (
                  <p style={{ fontSize: 12, color: "#666", margin: "4px 0 10px" }}>
                    신고 사유: {r.description}
                  </p>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  {confirmReport?.id === r.id ? (
                    <>
                      <span style={{ fontSize: 13, color: "#555", alignSelf: "center" }}>
                        {confirmReport.action === "approve" ? "리뷰를 삭제하고 신고를 승인할까요?" : "이 신고를 기각할까요?"}
                      </span>
                      <button
                        onClick={() => confirmReport.action === "approve" ? handleReportApprove(r) : handleReportReject(r.id)}
                        style={{ padding: "6px 14px", background: confirmReport.action === "approve" ? "#c0392b" : "#7f8c8d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                      >
                        확인
                      </button>
                      <button
                        onClick={() => setConfirmReport(null)}
                        style={{ padding: "6px 14px", background: "none", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setConfirmReport({ id: r.id, action: "approve" }); setReportStatus(null); }}
                        style={{ padding: "6px 14px", background: "#c0392b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                      >
                        신고 승인
                      </button>
                      <button
                        onClick={() => { setConfirmReport({ id: r.id, action: "reject" }); setReportStatus(null); }}
                        style={{ padding: "6px 14px", background: "#7f8c8d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                      >
                        신고 기각
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
