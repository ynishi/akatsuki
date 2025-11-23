// WASM Module Loader with LRU Cache
// Loads WASM binaries from Supabase Storage and caches compiled modules

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

// ============================================================================
// Types
// ============================================================================

export interface LoadResult {
  instance: WebAssembly.Instance
  cacheHit: boolean
}

// ============================================================================
// LRU Cache Implementation
// ============================================================================

class WasmModuleLRUCache {
  private cache = new Map<string, WebAssembly.Instance>()
  private readonly maxSize: number

  constructor(maxSize = 20) {
    this.maxSize = maxSize
  }

  /**
   * Get cached instance (LRU: moves to end)
   */
  get(key: string): WebAssembly.Instance | undefined {
    const value = this.cache.get(key)
    if (value) {
      // LRU: delete and re-insert to move to end
      this.cache.delete(key)
      this.cache.set(key, value)
      console.log(`[WasmLoader] Cache HIT: ${key}`)
    }
    return value
  }

  /**
   * Set cache entry (evicts oldest if at capacity)
   */
  set(key: string, value: WebAssembly.Instance): void {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      // Evict oldest (first key)
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        console.log(`[WasmLoader] Cache EVICT: ${firstKey}`)
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, value)
    console.log(`[WasmLoader] Cache SET: ${key} (size: ${this.cache.size}/${this.maxSize})`)
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`[WasmLoader] Cache CLEARED (${size} entries removed)`)
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size
  }
}

// ============================================================================
// WASM Loader
// ============================================================================

export class WasmLoader {
  private static cache = new WasmModuleLRUCache(20) // Max 20 modules cached

  /**
   * Load WASM module from Storage (with caching)
   *
   * @param moduleId - WASM module UUID
   * @param fileId - File UUID in files table
   * @param supabase - Supabase client (adminClient for storage access)
   * @returns LoadResult with instance and cache hit status
   */
  static async load(
    moduleId: string,
    fileId: string,
    supabase: SupabaseClient
  ): Promise<LoadResult> {
    // Check cache first
    const cachedInstance = this.cache.get(moduleId)
    if (cachedInstance) {
      return {
        instance: cachedInstance,
        cacheHit: true,
      }
    }

    console.log(`[WasmLoader] Cache MISS: ${moduleId}, loading from storage...`)

    try {
      // 1. Get file metadata from files table
      const { data: file, error: fileError } = await supabase
        .from('files')
        .select('storage_path, bucket_name')
        .eq('id', fileId)
        .single()

      if (fileError || !file) {
        throw new Error(`File metadata not found for file_id: ${fileId} (${fileError?.message})`)
      }

      console.log(`[WasmLoader] File metadata found: bucket=${file.bucket_name}, path=${file.storage_path}`)

      // 2. Download WASM binary from Storage
      const bucketName = file.bucket_name || 'private_uploads'
      const { data: binaryBlob, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(file.storage_path)

      if (downloadError || !binaryBlob) {
        throw new Error(`Failed to download WASM binary: ${downloadError?.message}`)
      }

      console.log(`[WasmLoader] WASM binary downloaded (${binaryBlob.size} bytes)`)

      // 3. Convert Blob to ArrayBuffer
      const arrayBuffer = await binaryBlob.arrayBuffer()

      // 4. Compile WASM module
      console.log(`[WasmLoader] Compiling WASM module...`)
      const compileStartTime = performance.now()
      const module = await WebAssembly.compile(arrayBuffer)
      const compileTime = Math.round(performance.now() - compileStartTime)
      console.log(`[WasmLoader] Module compiled in ${compileTime}ms`)

      // 5. Instantiate WASM module
      // Note: Import object can be extended in the future for host functions
      const instance = await WebAssembly.instantiate(module, {
        env: {
          // Host function: abort (called by AssemblyScript/Rust panic)
          abort: (messagePtr?: number, fileNamePtr?: number, line?: number, column?: number) => {
            console.error('[WASM abort] Called from WASM module', {
              messagePtr,
              fileNamePtr,
              line,
              column,
            })
            throw new Error('WASM module aborted execution')
          },
          // Additional host functions can be added here
          // log: (ptr: number, len: number) => { ... },
          // fetch: async (url: string) => { ... },
        },
      })

      console.log(`[WasmLoader] Module instantiated successfully`)

      // 6. Cache the instance
      this.cache.set(moduleId, instance)

      return {
        instance,
        cacheHit: false,
      }
    } catch (error) {
      console.error(`[WasmLoader] Failed to load module ${moduleId}:`, error)
      throw new Error(`WASM module loading failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Clear cache for specific module or entire cache
   *
   * @param moduleId - Optional module ID to clear (if omitted, clears all)
   */
  static clearCache(moduleId?: string): void {
    if (moduleId) {
      // Clear specific module (not supported by Map, would need custom implementation)
      console.warn('[WasmLoader] Clearing specific module cache is not implemented')
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 20,
    }
  }
}
