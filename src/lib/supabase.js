// Supabase 연결 (로그인 + 데이터베이스)
// URL과 anon 키는 브라우저에 공개돼도 되는 값이에요. 실제 보안은 schema.sql의 RLS 규칙이 지켜요.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 키가 없으면 null → 화면에서 "설정이 필요해요" 안내를 보여 줘요.
export const supabase = url && anonKey ? createClient(url, anonKey) : null

export const SUPABASE_MISSING_MESSAGE =
  '회원 기능을 쓰려면 .env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 넣고 npm run dev를 다시 실행하세요.'

// Supabase 오류 메시지를 쉬운 한국어로
export function toKoreanError(error) {
  const msg = error?.message || String(error || '')
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.'
  if (msg.includes('Email not confirmed')) return '이메일 인증이 필요해요. 받은 메일함에서 인증 링크를 눌러 주세요.'
  if (msg.includes('User already registered')) return '이미 가입된 이메일이에요.'
  if (msg.includes('Password should be')) return '비밀번호는 6자 이상이어야 해요.'
  if (msg.includes('row-level security')) return '권한이 없어요. 로그인 상태와 회원 종류를 확인해 주세요.'
  if (msg.includes('rate limit')) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
  return msg || '문제가 생겼어요. 잠시 후 다시 시도해 주세요.'
}
