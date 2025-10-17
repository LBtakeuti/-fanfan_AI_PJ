# RUNBOOK — 本番運用手順
## 環境
- Admin（Next.js）：Vercel
- Worker（Node/Playwright）：Cloud Run
- DB：Supabase（RLS有効）

## 初期セットアップ
1. Supabaseでスキーマ適用・RLS有効化（schema.sql）
2. Admin/Workerの環境変数を設定
3. WorkerをCloud Runにデプロイ（Playwrightベースイメージ）
4. AdminからWORKER_BASE_URLを設定

## 監視
- extractions テーブルで失敗率を監視（3連続失敗→一時停止）
- ログ（workerのpino出力）をCloud Loggingで確認

## リリース/ロールバック
- AdminはVercelのデプロイ履歴でロールバック
- WorkerはCloud Runでリビジョン切替

## トラブル対応
- robots.txt違反→RESPECT_ROBOTS_TXT=trueで再デプロイ
- 取得ゼロ増加→サイト構造変更。抽出テンプレ/正規表現を更新
- 二重登録→ユニーク制約確認＆正規化ルール見直し