/**
 * Base62 Encoding/Decoding Utility (Frontend)
 *
 * UUIDを短縮URL向けにBase62エンコード/デコードする
 * 36文字のUUID → 22文字のBase62文字列
 *
 * @example
 * const uuid = '550e8400-e29b-41d4-a716-446655440000'
 * const base62 = uuidToBase62(uuid) // '2qjb5Xk9lMz7w8PqRaE'
 * const decoded = base62ToUuid(base62) // '550e8400-e29b-41d4-a716-446655440000'
 */

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * UUIDをBase62にエンコード
 * @param {string} uuid - UUID文字列 (ハイフン付き/なし両対応)
 * @returns {string} Base62エンコードされた文字列（22文字）
 */
export function uuidToBase62(uuid) {
  // ハイフンを削除
  const hex = uuid.replace(/-/g, '')

  // 16進数 → BigInt
  const num = BigInt('0x' + hex)

  // Base62エンコード
  return encodeBase62(num)
}

/**
 * Base62をUUIDにデコード
 * @param {string} base62 - Base62文字列
 * @returns {string} UUID文字列（ハイフン付き標準形式）
 */
export function base62ToUuid(base62) {
  // Base62デコード
  const num = decodeBase62(base62)

  // BigInt → 16進数（32文字にパディング）
  let hex = num.toString(16).padStart(32, '0')

  // UUIDフォーマット (8-4-4-4-12)
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

/**
 * BigIntをBase62エンコード
 * @private
 */
function encodeBase62(num) {
  if (num === 0n) return BASE62_ALPHABET[0]

  let result = ''
  const base = BigInt(BASE62_ALPHABET.length)

  while (num > 0n) {
    const remainder = Number(num % base)
    result = BASE62_ALPHABET[remainder] + result
    num = num / base
  }

  return result
}

/**
 * Base62文字列をBigIntにデコード
 * @private
 */
function decodeBase62(str) {
  let result = 0n
  const base = BigInt(BASE62_ALPHABET.length)

  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    const value = BigInt(BASE62_ALPHABET.indexOf(char))

    if (value === -1n) {
      throw new Error(`Invalid Base62 character: ${char}`)
    }

    result = result * base + value
  }

  return result
}

/**
 * 文字列がBase62形式かどうかを検証
 * @param {string} str - 検証する文字列
 * @returns {boolean} 有効なBase62形式かどうか
 */
export function isValidBase62(str) {
  if (!str || str.length === 0) return false

  for (let i = 0; i < str.length; i++) {
    if (BASE62_ALPHABET.indexOf(str[i]) === -1) {
      return false
    }
  }

  return true
}
