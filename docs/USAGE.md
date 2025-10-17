# USAGE — 管理UIとワーカーの使い方（本番）
## 目的
- アーティスト公式サイトの URL を入力 → 公演情報を抽出
- 会場名はサイトの表記を **そのまま引用**
- URLマスター保存 → 次回は「再取得」ボタンでワンクリック更新
- 重複回避（artist|tour|place|date|performance のユニーク＋checksum）

## 主要CSV列
- tour / tour_start_date / tour_end_date
- place / place_start_date / place_end_date
- date / performance / artist / source_url

## 日次運用の流れ（管理UI）
1. 「URLマスター」で新規URL登録（任意でArtist Hint）
2. 「再取得」ボタン → 取得完了（失敗時は履歴で確認）
3. 「抽出→CSV」で目視確認し、不要行を外してCSV出力
4. 既存CMSへインポート（BOM付UTF-8）

## 禁止事項
- robots.txtの禁止パスをクロールしない
- 高頻度の自動巡回（規約違反/負荷の懸念）
- AI補助抽出に過度依存（必ず人間レビュー）