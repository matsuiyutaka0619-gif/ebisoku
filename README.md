# えびそく！

EBiDAN関連ニュースをRSSから自動収集して表示する静的ニュースまとめサイトです。

## 対象グループ

- 超特急
- M!LK
- SUPER★DRAGON
- Sakurashimeji
- ONE N' ONLY
- 原因は自分にある。
- BUDDiiS
- ICEx
- Lienel

## 更新方法

`node scripts/update-feeds.mjs` を実行すると、`data/articles.json` と `data/last-fetch-report.json` を更新します。

## 設定

サイト名や色は `config/`、RSSは `data/rss-sources.json`、抽出キーワードは `data/keywords.json`、メンバー辞書は `data/members.json` で管理します。
