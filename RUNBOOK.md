# Runbook

## 環境

### 推奨デプロイ環境
- **Admin（Next.js）**：Vercel / Netlify 等
- **Worker（Node/Playwright）**：Cloud Run / Fly.io / Render 等（Linux/Chromeが動く環境）

### 必要なサービス
- **データベース**：Supabase
- **監視**：各デプロイ環境の標準ログ機能

## セットアップ手順

### 1. Supabase設定
```bash
# Supabaseプロジェクト作成後、以下を取得
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...
```

SQLエディタで`infra/schema.sql`を実行し、テーブルを作成。

### 2. Admin（管理UI）デプロイ

#### Vercelの場合
```bash
# 環境変数設定
NEXT_PUBLIC_SUPABASE_URL=<Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Anon Key>
SUPABASE_URL=<Supabase URL>
SUPABASE_ANON_KEY=<Anon Key>
SUPABASE_SERVICE_ROLE_KEY=<Service Role Key>
WORKER_BASE_URL=<Worker のデプロイ URL>
WORKER_EXTRACT_API=<Worker Extract API URL>
```

### 3. Worker（クローラー）デプロイ

#### Cloud Run / Fly.ioの場合
```bash
# Dockerfile作成（Playwright対応）
FROM mcr.microsoft.com/playwright:v1.40.0-focal
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @osikatsu-pro/core build
RUN pnpm --filter @osikatsu-pro/worker build
CMD ["pnpm", "--filter", "@osikatsu-pro/worker", "server"]
```

#### 環境変数設定
```bash
# 基本設定
SUPABASE_URL=<Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<Service Role Key>
PORT=8080

# クローラー設定
USER_AGENT="AndFanFanBot/1.0 (+https://example.com/contact)"
RESPECT_ROBOTS_TXT=true
REQUEST_TIMEOUT_MS=45000
HEADLESS=true

# レート制限
CRAWL_COOLDOWN_SECONDS=10
MAX_REQUESTS_PER_HOST_PER_MIN=6
```

## 運用手順

### 日常運用

#### 1. URL登録
1. 管理UI（`/dashboard`）にログイン
2. 「URLマスター」でクロール対象URLを登録
3. アーティストヒント（任意）を設定

#### 2. データ取得
1. 「再取得」ボタンでクロール実行
2. ステータスが「success」になるまで待機
3. 失敗時は`last_status`を確認

#### 3. データエクスポート
1. 「抽出ツール」（`/extract`）へ移動
2. URLを入力して「取得」
3. 不要な行のチェックを外す
4. 「CSV出力」でダウンロード
5. CMSやスプレッドシートにインポート

### トラブルシューティング

#### エラー確認
```sql
-- 失敗したジョブの確認
SELECT * FROM extractions
WHERE status = 'failed'
ORDER BY started_at DESC;

-- URL別のエラー状況
SELECT source_url, last_status, last_crawled_at
FROM url_sources
WHERE last_status = 'failed';
```

#### よくあるエラーと対処

| エラー | 原因 | 対処法 |
|-------|------|--------|
| `robots.txt disallow` | robots.txt拒否 | 該当URLを無効化または手動取得 |
| `Rate limit exceeded` | レート制限超過 | 時間を空けて再実行 |
| `Cooldown: wait Ns` | クールダウン中 | 指定秒数待機 |
| `Timeout` | ページ読み込み失敗 | タイムアウト値を増やす |

#### URL一時停止
```sql
-- 問題のあるURLを一時的に無効化
UPDATE url_sources
SET last_status = 'suspended'
WHERE source_url = 'https://problem-site.com';
```

## 運用ポリシー

### 実行頻度
- **重要アーティスト**：週1回自動実行（Cron/Cloud Scheduler）
- **通常アーティスト**：隔週または手動実行
- **新規登録**：初回は手動で動作確認

### スケジュール設定例（Cloud Scheduler）
```yaml
# 毎週月曜 AM3:00 に重要URLを実行
schedule: "0 3 * * 1"
target:
  uri: https://your-worker.run.app/run?url=https://important-artist.com
  httpMethod: GET
```

### AI補助利用（将来導入時）
- **利用条件**：例外的なレイアウトのサイトのみ
- **コスト制限**：月額上限 $50
- **監視項目**：API利用回数、成功率、コスト推移

## 監視・メトリクス

### 監視項目
- **成功率**：`success` / 全実行数
- **平均実行時間**：`finished_at - started_at`
- **エラー率**：エラー種別ごとの発生頻度
- **コスト**：
  - Playwright実行回数
  - データ転送量
  - Supabase使用量

### アラート設定例
```javascript
// Cloud Monitoringの例
if (errorRate > 0.3) {
  alert("クロール失敗率が30%を超えています")
}

if (avgExecutionTime > 60000) {
  alert("平均実行時間が60秒を超えています")
}
```

## バックアップとリカバリ

### データバックアップ
```bash
# Supabaseの自動バックアップを利用（Pro以上）
# または定期的にエクスポート
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### リカバリ手順
1. Supabaseダッシュボードからバックアップを復元
2. または`pg_restore`でローカルバックアップから復元
3. `url_sources`の`last_crawled_at`をリセット（必要に応じて）

## セキュリティ

### アクセス制御
- Admin：Supabase Auth + RLSで保護
- Worker：Service Role Keyで直接アクセス
- API：環境変数でエンドポイント秘匿

### 定期的な確認事項
- [ ] Supabaseのキーローテーション（3ヶ月ごと）
- [ ] 依存パッケージの更新（月1回）
- [ ] ログの定期確認（週1回）
- [ ] コスト確認（月末）

## 連絡先

- **開発チーム**：dev-team@example.com
- **緊急連絡**：oncall@example.com
- **Supabaseサポート**：https://supabase.com/support