// 시설자 모드 화면이 "어느 데이터베이스"를 쓰고 "어느 주소"를 기준으로 움직일지 정해 주는 Context
// - 평소(/biz):        Supabase (진짜),                    base = '/biz'
// - 체험판(/biz/demo): demoDb (내 브라우저에만 저장),       base = '/biz/demo'
import { createContext, useContext } from 'react'
import { supabase } from './supabase.js'

export const DbContext = createContext({ db: supabase, isDemo: false, base: '/biz' })

export function useDb() {
  return useContext(DbContext)
}
