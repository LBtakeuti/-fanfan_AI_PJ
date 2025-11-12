# データベースセットアップ手順

## 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com)にアクセス
2. 新規プロジェクトを作成
3. プロジェクト設定から以下を取得:
   - Project URL → `SUPABASE_URL`
   - Anon public key → `SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY`

## 2. スキーマの作成

1. Supabase DashboardのSQL Editorを開く
2. `infra/schema.sql`の内容を全てコピー
3. SQL Editorに貼り付けて実行

## 3. 管理者ユーザーの設定

1. Authentication → Usersで管理者用ユーザーを作成
2. SQL Editorで以下を実行（USER_IDは作成したユーザーのIDに置換）:

```sql
INSERT INTO public.user_profiles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'admin');
```

## 4. 環境変数の設定

1. `.env.example`を`.env.local`（開発用）または`.env.production`（本番用）にコピー
2. Supabaseの接続情報を記入:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...
```

## テーブル構成

- **url_sources**: クロール対象URLの管理
- **events**: 抽出されたイベント情報
- **extractions**: クロール実行履歴
- **event_changes**: イベント変更履歴
- **user_profiles**: ユーザー権限管理

## RLS（行レベルセキュリティ）

- 読み取り: 全ユーザー可能
- 書き込み: admin/editorロールのみ可能
- extractionsテーブルの書き込み: adminのみ可能