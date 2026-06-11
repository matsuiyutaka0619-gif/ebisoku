# えびそく！運用メモ

このフォルダは「速報サイトテンプレート」から作った EBiDAN まとめ速報サイトです。

## 編集する主なファイル

- config/site.json: サイト名、説明、公開URL
- config/categories.json: グループカテゴリと色
- config/theme.json: 海老っぽいブランドカラー
- config/ads.json: AdSense設定
- config/operator.json: 運営者情報
- data/rss-sources.json: RSSソース
- data/keywords.json: EBiDAN関連キーワード
- data/members.json: メンバー辞書

## RSS更新

`node scripts/update-feeds.mjs` を実行すると、`data/articles.json` が更新されます。

## 注意

短い芸名や英字ステージ名は誤判定しやすいため、RSS分類ではグループ名が一緒に出ている場合を優先して拾います。
