# SECURITY / COMPLIANCE
- robots.txt / 利用規約の順守（本番は RESPECT_ROBOTS_TXT=true）
- 会場名はサイト表記をそのまま保存（変換しない）
- RLS有効。書き込みは admin/editor のみ
- WorkerエンドポイントはIP制限または署名付きリクエスト
- 秘密情報はすべて環境変数。リポジトリにコミットしない
- ログには個人情報を出さない