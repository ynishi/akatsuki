# RunPod ComfyUI 統合設計書

## 概要

RunPod上でホストされるComfyUIインスタンスをSupabase Edge Functionsから安全に利用するための設計ドキュメント。

## アーキテクチャ

```
Client
  ↓ (Supabase Auth)
Supabase Edge Function (generate-image)
  ↓ (Authorization: Bearer RUNPOD_API_KEY)
RunPod ComfyUI (ComfyUI-Login認証)
```

### コンポーネント

1. **Client**: フロントエンドアプリケーション（Supabase Authで認証）
2. **Edge Function**: Supabase上のServerless Function（Node/Deno）
3. **RunPod ComfyUI**: GPU搭載のComfyUIインスタンス

## 認証方式の調査結果

### RunPodの公開アクセス特性

RunPodは以下の2つの公開方法を提供：

1. **HTTP Proxy**: `https://[POD_ID]-[PORT].proxy.runpod.net`
   - 自動HTTPS化
   - 設定が簡単
   - **注意**: ポッドIDは隠蔽効果が限定的

2. **TCP Direct**: 公開IPとポートマッピング
   - 低レイテンシ
   - TLSは自分で実装が必要

**重要**: RunPod公式ドキュメントより
> Both HTTP proxy and TCP access make your services publicly accessible. Always implement proper authentication and authorization in your applications.

### 認証実装パターン

#### パターン1: Flask/FastAPI プロキシ（最もシンプル）

**構成:**
```
Client → Flask (Fly.io等) → RunPod ComfyUI
          ↑ 認証レイヤー
```

**メリット:**
- RunPod APIキーをクライアント側に露出させない
- レート制限やカスタム認証ロジックを実装可能
- RunPodにはまだスコープ付きAPIキーがないため、これが推奨される方法

**実装例（Flask + Basic Auth）:**

```python
from flask import Flask, request
from flask_httpauth import HTTPBasicAuth
import requests

app = Flask(__name__)
auth = HTTPBasicAuth()

RUNPOD_API_KEY = 'your-runpod-key'
RUNPOD_URL = 'https://your-pod-id.proxy.runpod.net'

@auth.verify_password
def verify_password(username, password):
    return username == 'admin' and password == 'secret'

@app.route('/<path:path>', methods=['GET', 'POST'])
@auth.login_required
def proxy(path):
    resp = requests.request(
        method=request.method,
        url=f'{RUNPOD_URL}/{path}',
        headers={'Authorization': f'Bearer {RUNPOD_API_KEY}'},
        data=request.get_data(),
        params=request.args
    )
    return resp.content, resp.status_code
```

**WebSocket対応が必要な場合:**
- Flask-SocketIOを使用
- または、nginx/Caddyでリバースプロキシ

#### パターン2: Nginx リバースプロキシ + Basic認証

**nginx.conf:**
```nginx
server {
    listen 80;

    location / {
        auth_basic "Restricted Access";
        auth_basic_user_file /etc/nginx/passwords;

        proxy_pass https://your-pod-id.proxy.runpod.net;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # WebSocket対応
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**パスワードファイル作成:**
```bash
htpasswd -c /etc/nginx/passwords username
```

#### パターン3: ComfyUI プラグイン（軽量）

**ComfyUI-Login:**
- 最もシンプルなパスワード保護
- 任意のパスワードで保護
- API呼び出しもトークン/ヘッダーで保護
- ただし「基本的な保護のみ」と公式で注記あり

**ComfyUI-Basic-Auth:**
- HTTP Basic認証を実装
- より標準的なアプローチ

#### パターン4: Docker with AI-Dock（既製品）

既に認証レイヤーを含むDockerイメージ:
- `fuelstudio19/comfyui-runpod_docker`
- AI-Dockベースで認証機能を含む
- RunPod/Vast.ai対応

### 採用方式

**Akatsukiでの採用: ComfyUI-Login（Authorization Bearer認証）**

理由：
1. **シンプル**: FlaskやNginxを追加せず、ComfyUIプラグインで完結
2. **柔軟**: Supabase Secretsでトークン管理
3. **統合**: Edge Functionから直接アクセス可能
4. **標準**: Authorization Bearerヘッダーは業界標準

実装：
- RunPod側: ComfyUI-Loginプラグインを使用
  - 起動時にコンソールに表示されるトークンを使用
  - 例: `token=$2b$12$iySehdsCxXYIhwqg3kEdxOIRUzxzv682hxu8aUYkVG.WWoDQrJfoG`
- Edge Function側: `Authorization: Bearer` ヘッダーにトークンを付与
- Secrets: `RUNPOD_ENDPOINT`, `RUNPOD_API_KEY` で管理

## ComfyUI API仕様

### エンドポイント

#### 1. ワークフロー実行

```http
POST /prompt
Content-Type: application/json
Authorization: Bearer $2b$12$iySehdsCxXYIhwqg3kEdxOIRUzxzv682hxu8aUYkVG.WWoDQrJfoG

{
  "prompt": {
    "3": {
      "inputs": {
        "seed": 123,
        "steps": 20,
        ...
      },
      "class_type": "KSampler"
    },
    ...
  }
}
```

**レスポンス:**
```json
{
  "prompt_id": "550e8400-e29b-41d4-a716-446655440000",
  "number": 1,
  "node_errors": {}
}
```

#### 2. 履歴取得（ポーリング）

```http
GET /history/<prompt_id>
Authorization: Bearer $2b$12$iySehdsCxXYIhwqg3kEdxOIRUzxzv682hxu8aUYkVG.WWoDQrJfoG
```

**レスポンス:**
```json
{
  "550e8400-e29b-41d4-a716-446655440000": {
    "prompt": [...],
    "outputs": {
      "9": {
        "images": [
          {
            "filename": "ComfyUI_00001_.png",
            "subfolder": "",
            "type": "output"
          }
        ]
      }
    },
    "status": {
      "status_str": "success",
      "completed": true,
      "messages": []
    }
  }
}
```

#### 3. 画像ダウンロード

```http
GET /view?filename=<filename>&subfolder=<subfolder>&type=<type>
Authorization: Bearer $2b$12$iySehdsCxXYIhwqg3kEdxOIRUzxzv682hxu8aUYkVG.WWoDQrJfoG
```

**レスポンス:** 画像バイナリ（PNG/JPEG）

### ワークフロー構造

ComfyUIのワークフローはノードベースのJSON構造：

```json
{
  "ノードID": {
    "inputs": {
      "パラメータ名": 値,
      "他ノード参照": ["ノードID", 出力インデックス]
    },
    "class_type": "ノードタイプ"
  }
}
```

**主要ノードタイプ:**
- `CheckpointLoaderSimple`: モデル読み込み
- `CLIPTextEncode`: プロンプトエンコード
- `KSampler`: サンプリング実行
- `VAEDecode`: Latentを画像に変換
- `SaveImage`: 画像保存

**プロンプト差し込み例:**
ノードID "6" の `CLIPTextEncode` にプロンプトを設定：
```json
{
  "6": {
    "inputs": {
      "text": "A beautiful sunset over the ocean",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode"
  }
}
```

## セキュリティベストプラクティス

1. **必須**: アプリケーション層での認証・認可実装
2. **推奨**: 入力検証とレート制限
3. **推奨**: 機密データにはTLS実装（TCP接続の場合）
4. **注意**: 100秒のタイムアウト制限あり

## Phase 1 vs Phase 2

### Phase 1: 埋め込みワークフロー（現在の実装）

**特徴:**
- ワークフローJSONをコードに直接埋め込み
- すぐに動作確認可能
- 柔軟性は低い

**実装箇所:**
- `supabase/functions/_shared/runpod_client.ts`
- `supabase/functions/generate-image/index.ts`

### Phase 2: DB管理ワークフロー（次ステップ）

**特徴:**
- ワークフローをDBで管理
- Admin権限で編集可能
- IDまたはJSONで柔軟に指定
- プロンプト差し込み機構の汎用化

**実装予定:**
- `comfyui_workflows` テーブル作成
- `ComfyUIWorkflowRepository` 実装
- 柔軟なプロンプト差し込み機構

## 参考リンク

- [RunPod Documentation - Expose Ports](https://docs.runpod.io/pods/configuration/expose-ports)
- [RunPod Blog - When to Use Proxy](https://blog.runpod.io/when-to-use-or-not-use-the-proxy-on-runpod/)
- [ComfyUI API Examples](https://github.com/comfyanonymous/ComfyUI/tree/master/script_examples)
- [ComfyUI-Login Plugin](https://github.com/liusida/ComfyUI-Login)
- [Flask Basic Auth + Nginx Example](https://github.com/ruanbekker/flask-basic-auth-nginx)

## 実装履歴

- **2025-11-02**: 調査完了、Phase 1実装、ドキュメント作成
- **2025-11-02**: ComfyUI-Login認証方式をAuthorization Bearerに修正
- **Phase 2予定**: DB管理ワークフロー、柔軟な差し込み機構
