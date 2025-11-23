# Sample WASM Module

Sample WebAssembly module for testing the WASM Edge Function integration.

## Features

- **rgb_to_grayscale**: Convert RGB pixel data to grayscale
- **sum_array**: Sum an array of integers
- **multiply_array**: Multiply each element by a factor
- **process_json**: Process JSON array and return statistics
- **memory_test**: Allocate specified memory size

## Build

```bash
# Install wasm32-unknown-unknown target
rustup target add wasm32-unknown-unknown

# Build for WASM
cargo build --target wasm32-unknown-unknown --release

# Output: target/wasm32-unknown-unknown/release/sample_module.wasm
```

## Test in Admin UI

1. Build the module:
   ```bash
   cargo build --target wasm32-unknown-unknown --release
   ```

2. Navigate to `/admin/wasm` in the Akatsuki app

3. Upload `target/wasm32-unknown-unknown/release/sample_module.wasm`

4. Configure:
   - Module Name: `sample-module`
   - Version: `1.0.0`
   - Owner Type: `system` or `admin`
   - Description: "Sample WASM module for testing"

5. Test functions:
   - Function: `sum_array`, Args: `[[1, 2, 3, 4, 5]]`
   - Function: `multiply_array`, Args: `[[1, 2, 3], 10]`
   - Function: `process_json`, Args: `["[10, 20, 30, 40, 50]"]`

## Expected Results

### sum_array([1, 2, 3, 4, 5])
- Result: `15`

### multiply_array([1, 2, 3], 10)
- Result: `[10, 20, 30]`

### process_json("[10, 20, 30, 40, 50]")
- Result: `{"sum": 150, "avg": 30.0, "min": 10, "max": 50}`
