'use client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react'

export default function Login() {
  const supabase = createClientComponentClient()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')

  return (
    <div style={{ maxWidth: 420, margin: '80px auto' }}>
      <h1>管理ログイン</h1>
      <input
        placeholder="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="password"
        value={pw}
        onChange={e => setPw(e.target.value)}
      />
      <button onClick={async () => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: pw
        })
        setMsg(error ? error.message : 'OK')
        if (!error) location.href = '/dashboard'
      }}>
        Sign in
      </button>
      <div>{msg}</div>
    </div>
  )
}