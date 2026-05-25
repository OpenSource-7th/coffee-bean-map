"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = "login" | "signup";

function mapAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (message.includes("Email not confirmed")) return "이메일 인증을 완료해주세요.";
  if (message.includes("User already registered")) return "이미 가입된 이메일입니다.";
  if (message.includes("Password should be at least")) return "비밀번호는 6자 이상이어야 합니다.";
  return "오류가 발생했습니다. 다시 시도해주세요.";
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return "이메일을 입력해주세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "올바른 이메일 형식이 아닙니다.";
  return null;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();

  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  function switchTab(next: AuthTab) {
    setTab(next);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccessMessage(null);
  }

  async function handleLogin() {
    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }
    if (!password) { setError("비밀번호를 입력해주세요."); return; }

    setIsSubmitting(true);
    setError(null);
    const authError = await signIn(email, password);
    setIsSubmitting(false);

    if (authError) {
      setError(mapAuthError(authError.message));
    } else {
      onClose();
    }
  }

  async function handleSignup() {
    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }
    if (!password) { setError("비밀번호를 입력해주세요."); return; }
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }
    if (password !== confirmPassword) { setError("비밀번호가 일치하지 않습니다."); return; }

    setIsSubmitting(true);
    setError(null);
    const authError = await signUp(email, password);
    setIsSubmitting(false);

    if (authError) {
      setError(mapAuthError(authError.message));
    } else {
      setSuccessMessage("가입이 완료되었습니다. 이메일을 확인한 후 로그인해주세요.");
      switchTab("login");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "login") handleLogin();
    else handleSignup();
  }

  return (
    <div
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 font-sans"
        style={{ boxShadow: "0px 8px 40px rgba(62,39,35,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div className="flex gap-0">
            <button
              onClick={() => switchTab("login")}
              className={`px-1 pb-2 mr-5 text-[15px] transition-colors border-b-2 ${
                tab === "login"
                  ? "border-[#ac3509] text-[#ac3509] font-semibold"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => switchTab("signup")}
              className={`px-1 pb-2 text-[15px] transition-colors border-b-2 ${
                tab === "signup"
                  ? "border-[#ac3509] text-[#ac3509] font-semibold"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              회원가입
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-full"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 바디 */}
        <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-4">
          {/* 브랜드 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#ac3509] text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_cafe
            </span>
            <span className="font-serif text-[18px] font-bold text-[#271310]">원두지도</span>
          </div>

          {/* 이메일 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-stone-600 tracking-wide uppercase" style={{ letterSpacing: "0.04em" }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              className="w-full border border-stone-200 rounded-lg px-4 py-3 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#ac3509] transition-colors"
            />
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-stone-600 tracking-wide uppercase" style={{ letterSpacing: "0.04em" }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "signup" ? "6자 이상 입력" : "비밀번호 입력"}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              className="w-full border border-stone-200 rounded-lg px-4 py-3 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#ac3509] transition-colors"
            />
          </div>

          {/* 비밀번호 확인 (회원가입 탭) */}
          {tab === "signup" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-stone-600 tracking-wide uppercase" style={{ letterSpacing: "0.04em" }}>
                비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
                autoComplete="new-password"
                className="w-full border border-stone-200 rounded-lg px-4 py-3 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#ac3509] transition-colors"
              />
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl">
              <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">error</span>
              <p className="text-[13px] text-red-800 leading-snug">{error}</p>
            </div>
          )}

          {/* 성공 메시지 */}
          {successMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-green-50 border border-green-100 rounded-xl">
              <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
              <p className="text-[13px] text-green-800 leading-snug">{successMessage}</p>
            </div>
          )}
        </form>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-semibold text-[14px] hover:bg-stone-100 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-5 py-2.5 rounded-lg text-white font-semibold text-[14px] transition-colors shadow-sm ${
              isSubmitting
                ? "bg-stone-400 cursor-not-allowed"
                : "bg-[#ac3509] hover:bg-[#92300a]"
            }`}
          >
            {isSubmitting ? "처리 중..." : tab === "login" ? "로그인" : "가입하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
