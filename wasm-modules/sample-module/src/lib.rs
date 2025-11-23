use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

/// Simple image processing: grayscale conversion
/// Input: RGB pixel data [r, g, b, r, g, b, ...]
/// Output: Grayscale pixel data [gray, gray, ...]
#[wasm_bindgen]
pub fn rgb_to_grayscale(input: &[u8]) -> Vec<u8> {
    let mut output = Vec::with_capacity(input.len() / 3);

    for chunk in input.chunks(3) {
        if chunk.len() == 3 {
            let r = chunk[0] as f32;
            let g = chunk[1] as f32;
            let b = chunk[2] as f32;

            // Standard grayscale formula: 0.299R + 0.587G + 0.114B
            let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
            output.push(gray);
        }
    }

    output
}

/// Array sum - simple demonstration function
#[wasm_bindgen]
pub fn sum_array(input: &[i32]) -> i32 {
    input.iter().sum()
}

/// Array multiply - multiply each element by factor
#[wasm_bindgen]
pub fn multiply_array(input: &[i32], factor: i32) -> Vec<i32> {
    input.iter().map(|&x| x * factor).collect()
}

/// JSON processing example
#[derive(Serialize, Deserialize)]
pub struct ProcessResult {
    pub sum: i32,
    pub avg: f64,
    pub min: i32,
    pub max: i32,
}

#[wasm_bindgen]
pub fn process_json(json_str: &str) -> String {
    // Parse input JSON as array of numbers
    let numbers: Vec<i32> = match serde_json::from_str(json_str) {
        Ok(nums) => nums,
        Err(_) => return r#"{"error": "Invalid JSON input"}"#.to_string(),
    };

    if numbers.is_empty() {
        return r#"{"error": "Empty array"}"#.to_string();
    }

    let sum: i32 = numbers.iter().sum();
    let avg = sum as f64 / numbers.len() as f64;
    let min = *numbers.iter().min().unwrap();
    let max = *numbers.iter().max().unwrap();

    let result = ProcessResult { sum, avg, min, max };

    serde_json::to_string(&result).unwrap_or_else(|_| r#"{"error": "Failed to serialize"}"#.to_string())
}

/// Memory test - allocate and return specified size
#[wasm_bindgen]
pub fn memory_test(size: usize) -> Vec<u8> {
    vec![0; size]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rgb_to_grayscale() {
        let rgb = vec![255, 0, 0, 0, 255, 0, 0, 0, 255];
        let gray = rgb_to_grayscale(&rgb);
        assert_eq!(gray.len(), 3);
    }

    #[test]
    fn test_sum_array() {
        assert_eq!(sum_array(&[1, 2, 3, 4, 5]), 15);
    }

    #[test]
    fn test_multiply_array() {
        let result = multiply_array(&[1, 2, 3], 10);
        assert_eq!(result, vec![10, 20, 30]);
    }

    #[test]
    fn test_process_json() {
        let result = process_json("[1, 2, 3, 4, 5]");
        assert!(result.contains("sum"));
        assert!(result.contains("avg"));
    }
}
