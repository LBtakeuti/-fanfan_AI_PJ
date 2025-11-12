#!/usr/bin/env tsx
import 'dotenv/config'
import fs from 'fs'
import path from 'path'

console.log('🔍 === ローカル環境診断 ===\n')

// 診断結果を格納
const results: { item: string; status: 'OK' | 'NG'; message?: string }[] = []

// 1. Node.jsバージョンチェック
const nodeVersion = process.version
const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0])
if (nodeMajor >= 18) {
  results.push({ item: 'Node.js', status: 'OK', message: `v${nodeVersion} (18以上)` })
} else {
  results.push({ item: 'Node.js', status: 'NG', message: `v${nodeVersion} (18以上が必要)` })
}

// 2. 環境変数チェック
console.log('📝 環境変数チェック:')
const envPath = path.join(process.cwd(), '.env')
const envExists = fs.existsSync(envPath)

if (!envExists) {
  console.log('  ⚠️  .envファイルが見つかりません')
  console.log('  対処: cp .env.example .env を実行して設定してください\n')
  results.push({ item: '.envファイル', status: 'NG', message: '存在しない' })
} else {
  console.log('  ✅ .envファイルが存在します')

  // 必須環境変数のチェック
  const requiredEnvs = {
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'USER_AGENT': process.env.USER_AGENT
  }

  for (const [key, value] of Object.entries(requiredEnvs)) {
    if (!value || value.trim() === '') {
      console.log(`  ⚠️  ${key} が未設定です`)
      results.push({ item: key, status: 'NG', message: '未設定' })
    } else {
      console.log(`  ✅ ${key}: ${value.slice(0, 20)}...`)
      results.push({ item: key, status: 'OK' })
    }
  }
}

// 3. Playwrightテスト
console.log('\n🎭 Playwright動作テスト:')
async function testPlaywright() {
  try {
    // Playwrightモジュールの存在チェック
    const playwrightPath = path.join(process.cwd(), 'apps/worker/node_modules/playwright')
    if (!fs.existsSync(playwrightPath)) {
      console.log('  ⚠️  Playwrightがインストールされていません')
      results.push({ item: 'Playwright', status: 'NG', message: '未インストール' })
      return false
    }

    // 動的インポート
    const { chromium } = await import(playwrightPath)

    console.log('  ブラウザを起動中...')
    const browser = await chromium.launch({ headless: true })

    console.log('  ページを作成中...')
    const page = await browser.newPage()

    console.log('  example.comへアクセス中...')
    await page.goto('https://example.com', { timeout: 30000 })

    const title = await page.title()
    console.log(`  ✅ ページタイトル: "${title}"`)

    await browser.close()
    results.push({ item: 'Playwright', status: 'OK', message: 'headlessモードで正常動作' })
    return true
  } catch (error: any) {
    console.log(`  ❌ エラー: ${error.message}`)
    results.push({ item: 'Playwright', status: 'NG', message: error.message })
    return false
  }
}

// 診断実行
async function runDiagnostics() {
  await testPlaywright()

  // 結果サマリー
  console.log('\n📊 === 診断結果サマリー ===')
  console.log('┌─────────────────────────┬────────┬─────────────────────────────┐')
  console.log('│ 項目                    │ 状態   │ 詳細                        │')
  console.log('├─────────────────────────┼────────┼─────────────────────────────┤')

  for (const result of results) {
    const item = result.item.padEnd(23)
    const status = result.status === 'OK' ? '✅ OK ' : '❌ NG '
    const message = (result.message || '').slice(0, 27).padEnd(27)
    console.log(`│ ${item} │ ${status} │ ${message} │`)
  }
  console.log('└─────────────────────────┴────────┴─────────────────────────────┘')

  const hasError = results.some(r => r.status === 'NG')

  if (hasError) {
    console.log('\n⚠️  === 対処方法 ===')

    if (results.find(r => r.item === 'Node.js' && r.status === 'NG')) {
      console.log('• Node.js 18以上をインストール: https://nodejs.org/')
    }

    if (results.find(r => r.item === '.envファイル' && r.status === 'NG')) {
      console.log('• .envファイルを作成: cp .env.example .env')
    }

    if (results.find(r => r.item === 'SUPABASE_URL' && r.status === 'NG')) {
      console.log('• Supabaseプロジェクトを作成してURLを取得')
    }

    if (results.find(r => r.item === 'SUPABASE_SERVICE_ROLE_KEY' && r.status === 'NG')) {
      console.log('• SupabaseダッシュボードからService Role Keyを取得')
    }

    if (results.find(r => r.item === 'USER_AGENT' && r.status === 'NG')) {
      console.log('• .envにUSER_AGENT="YourBot/1.0"を設定')
    }

    if (results.find(r => r.item === 'Playwright' && r.status === 'NG')) {
      console.log('• Playwrightのブラウザをインストール: pnpm --filter @osikatsu-pro/worker exec playwright install chromium')
    }

    console.log('\n詳細はドキュメントを参照: docs/RUNBOOK.md')
    process.exit(1)
  } else {
    console.log('\n✅ すべての項目が正常です！')
    console.log('次のステップ:')
    console.log('  1. pnpm install-deps で依存関係をインストール')
    console.log('  2. pnpm admin:dev で管理UIを起動')
    console.log('  3. pnpm worker:server でワーカーを起動')
  }
}

runDiagnostics().catch(error => {
  console.error('診断中にエラーが発生しました:', error)
  process.exit(1)
})