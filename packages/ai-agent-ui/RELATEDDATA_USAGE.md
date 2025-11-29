# relatedData によるユーザー入力の反映

## 概要

`ai-agent-ui` では、**`context.relatedData`** を使用することで、フォームの他のフィールドの値（ユーザー入力）をAI生成に反映させることができます。

これにより、例えば「記事の概要」を入力したフィールドの値を元に、AIが「本文」を生成するといった連携が可能になります。

---

## 基本的な使い方

### 例: ブログ記事フォーム

```tsx
import { useAIRegister } from '@akatsuki/ai-agent-ui';
import { useState } from 'react';

function BlogPostForm() {
  // フォームのState
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState(''); // ← ユーザーが概要を入力
  const [content, setContent] = useState(''); // ← AIが本文を生成

  // AI機能の登録（content フィールド用）
  const ai = useAIRegister({
    context: {
      scope: 'BlogPost.Content',
      type: 'long_text',
      maxLength: 2000,

      // ✅ relatedData に他のフィールドの値を渡す
      relatedData: {
        title: title,
        summary: summary,
      },
    },
    getValue: () => content,
    setValue: (newValue) => setContent(newValue),
  });

  return (
    <form>
      <div>
        <label>タイトル</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label>概要</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      <div>
        <label>本文</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {/* AI生成ボタン */}
        <button
          type="button"
          onClick={() => ai.actions.generate()}
        >
          💫 本文を生成
        </button>
      </div>
    </form>
  );
}
```

---

## AIに送られるプロンプト

上記のコードで「本文を生成」ボタンを押すと、以下のようなプロンプトがAIに送信されます:

```
あなたは優秀なコンテンツ生成アシスタントです。
与えられたコンテキストと関連情報に基づいて、適切な内容を生成してください。
必ずコンテキストの制約（文字数制限、タイプ、スコープ）を守ってください。
生成されたテキストのみを返し、説明や追加のコメントは一切含めないでください。

【コンテキスト】
- スコープ: BlogPost.Content
- タイプ: long_text

【関連情報】
- title: React Hooksの基礎
- summary: React Hooksを使った状態管理とライフサイクルの基本を解説

【重要な制約】
生成するテキストは必ず2000文字以内にしてください。
```

AIは、`title` と `summary` の値を参考にして、適切な本文を生成します。

---

## 高度な使用例

### 例: 商品説明生成フォーム

```tsx
function ProductForm() {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(0);
  const [targetAudience, setTargetAudience] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  const ai = useAIRegister({
    context: {
      scope: 'Product.Description',
      type: 'long_text',
      maxLength: 500,

      // ✅ 複数の関連情報を渡す
      relatedData: {
        productName,
        category,
        price,
        targetAudience,
        keywords, // 配列も渡せる
      },
    },
    getValue: () => description,
    setValue: (newValue) => setDescription(newValue),
  });

  return (
    <form>
      {/* フォームフィールド省略 */}
      <button onClick={() => ai.actions.generate()}>
        💫 商品説明を生成
      </button>
    </form>
  );
}
```

**送信されるプロンプト例:**

```
【関連情報】
- productName: ワイヤレスイヤホン XZ-100
- category: オーディオ機器
- price: 15980
- targetAudience: 30代〜40代のビジネスパーソン
- keywords: ["ノイズキャンセリング", "長時間バッテリー", "高音質"]
```

---

## relatedData でサポートされる型

`relatedData` には、以下の型の値を渡すことができます:

| 型               | 例                                      | プロンプトへの反映方法              |
|------------------|-----------------------------------------|-------------------------------------|
| `string`         | `"React Hooks入門"`                     | `- key: value` 形式で出力           |
| `number`         | `15980`                                 | `- key: value` 形式で出力           |
| `boolean`        | `true`                                  | `- key: value` 形式で出力           |
| `object`         | `{ foo: 'bar' }`                        | JSON.stringify で整形して出力       |
| `array`          | `["tag1", "tag2"]`                      | JSON.stringify で整形して出力       |

---

## ユースケース

### 1. **フォームの概要から本文を生成**
   - 概要フィールドの値を `relatedData` に渡す
   - AIが概要を元に詳細な本文を生成

### 2. **商品情報から説明文を生成**
   - 商品名、カテゴリ、価格、ターゲット層などを `relatedData` に渡す
   - AIがマーケティング向けの説明文を生成

### 3. **ユーザープロフィールから自己紹介文を生成**
   - 名前、職業、趣味、スキルなどを `relatedData` に渡す
   - AIがプロフェッショナルな自己紹介文を生成

### 4. **求人情報から応募文を生成**
   - 求人タイトル、企業名、必須スキルなどを `relatedData` に渡す
   - AIがカスタマイズされた応募文を生成

---

## 注意点

### 1. **relatedData は動的に更新される**

`relatedData` には、リアルタイムの State 値を渡してください。

```tsx
// ✅ 正しい（リアルタイム更新）
relatedData: {
  title: title,  // State値を直接参照
}

// ❌ 間違い（初期値で固定される）
const relatedData = { title: title };
// ...
relatedData: relatedData, // 初期値のまま
```

### 2. **大きすぎるデータは避ける**

`relatedData` に巨大なデータ（例: 数千行のテキスト）を渡すと、プロンプトが長くなりすぎてトークン制限に引っかかる可能性があります。

必要最小限の情報のみを渡すようにしてください。

### 3. **機密情報の扱い**

`relatedData` の内容はAIに送信されます。パスワードやAPIキーなどの機密情報を含めないでください。

---

## まとめ

- **`context.relatedData`** を使えば、フォームの他のフィールド値をAI生成に反映できる
- `string`, `number`, `boolean`, `object`, `array` など、様々な型をサポート
- AIは関連情報を元に、より適切なコンテンツを生成できる
- ブログ記事、商品説明、自己紹介文など、様々なユースケースに対応

