# GitHub App インストールガイド

## 概要

このドキュメントでは、AutoTrackerプロジェクトでGitHub Appをインストールする手順を説明します。

**重要**: AutoTrackerはsafe-replayとは別のプロジェクトです。AutoTracker専用のGitHubリポジトリにインストールしてください。

## 前提条件

- GitHubアカウントを持っていること
- AutoTrackerリポジトリへのアクセス権限があること
- 組織アカウントの場合は、適切な権限があること

## インストール手順

### 1. GitHubアカウント設定にアクセス

1. GitHubの任意のページで、右上のプロフィール画像をクリック
2. アカウント設定に移動：
   - **個人アカウントの場合**: 「Settings」を選択
   - **組織アカウントの場合**:
     - 「Your organizations」をクリック
     - 対象の組織の右側にある「Settings」をクリック

### 2. Developer Settingsに移動

1. 左サイドバーで「Developer settings」をクリック
2. 「GitHub Apps」をクリック

### 3. GitHub Appのインストール

1. インストールしたいGitHub Appを見つけて「Edit」をクリック
2. 「Install App」をクリック
3. アプリをインストールするアカウントまたは組織を選択
4. リポジトリアクセス権限を設定：
   - **All repositories**: すべてのリポジトリにアクセス
   - **Only select repositories**: 選択したリポジトリのみにアクセス
5. 「Only select repositories」を選択した場合、**AutoTrackerリポジトリ**を選択してください
   - ⚠️ **safe-replayリポジトリは選択しないでください**（別プロジェクトのため）
6. 「Install」をクリックしてインストールを完了

## インストール後の確認

### インストール状態の確認

1. 「Settings」→「Developer settings」→「GitHub Apps」に戻る
2. インストールしたアプリを選択
3. 「Installations」タブで、インストール状態を確認
4. **AutoTrackerリポジトリ**がインストール対象として表示されていることを確認

### 権限の確認

1. インストールしたアプリの「Permissions & events」タブを確認
2. 必要な権限が付与されているか確認：
   - Repository permissions
   - Organization permissions（組織アカウントの場合）
   - Subscribe to events

## トラブルシューティング

### インストールできない場合

- **権限不足**: リポジトリまたは組織の管理者権限が必要です
- **アプリが存在しない**: アプリが削除されているか、アクセス権限がない可能性があります
- **リポジトリが見つからない**: AutoTrackerリポジトリが作成されているか確認してください

### 権限エラーが発生する場合

1. アプリの「Permissions & events」を確認
2. 必要な権限が付与されているか確認
3. 組織アカウントの場合、組織の設定でアプリのインストールが許可されているか確認

### 間違ってsafe-replayにインストールしてしまった場合

1. GitHub Appの「Installations」タブで、safe-replayリポジトリのインストールを削除
2. 再度インストール手順を実行し、AutoTrackerリポジトリのみを選択

## 参考リンク

- [GitHub公式ドキュメント: Installing your own GitHub App](https://docs.github.com/enterprise-cloud@latest/apps/using-github-apps/installing-your-own-github-app)
- [GitHub Apps の認証](https://docs.github.com/ja/apps/creating-github-apps/authenticating-with-a-github-app)

## 注意事項

- GitHub Appは、インストールされたリポジトリに対してのみ動作します
- AutoTrackerとsafe-replayは別プロジェクトのため、リポジトリも分離してください
- 組織アカウントの場合、組織の設定でアプリのインストールが制限されている場合があります
- アプリの権限を変更した場合、再インストールが必要な場合があります
