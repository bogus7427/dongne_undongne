// 로그인 상태를 앱 전체에서 쓸 수 있게 해 주는 Provider
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { AuthContext } from './authContext.js'

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(!supabase) // Supabase 설정이 없으면 바로 준비 완료

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    async function loadProfile(nextSession) {
      if (!nextSession) {
        if (!cancelled) { setProfile(null); setReady(true) }
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', nextSession.user.id).maybeSingle()
      if (!cancelled) { setProfile(data); setReady(true) }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      loadProfile(data.session)
    })
    // 로그인·로그아웃할 때마다 자동으로 알려 줘요.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      // 콜백 안에서 바로 DB를 부르면 멈출 수 있어서 한 박자 뒤에 불러요 (Supabase 권장 방식)
      setTimeout(() => loadProfile(nextSession), 0)
    })
    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = {
    ready,
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isOwner: profile?.role === 'owner' || profile?.role === 'admin',
    isAdmin: profile?.role === 'admin',
    signOut: () => supabase?.auth.signOut(),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
