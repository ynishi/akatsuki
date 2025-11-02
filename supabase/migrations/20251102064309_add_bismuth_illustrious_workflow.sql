-- デフォルトワークフローを非デフォルトに変更
UPDATE comfyui_workflows
SET is_default = false
WHERE name = 'SDXL Basic Text-to-Image';

-- Bismuth Illustrious Workflowを追加
INSERT INTO comfyui_workflows (name, description, workflow_json, is_default, tags, is_active)
VALUES (
  'Bismuth Illustrious - Anime Style',
  'Bismuth Illustrious v3.0を使用したアニメスタイル画像生成。高品質な1girl, soloイラストに最適。',
  '{
    "3": {
      "inputs": {
        "seed": 0,
        "steps": 25,
        "cfg": 5.5,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler"
    },
    "4": {
      "inputs": {
        "ckpt_name": "bismuthIllustrious_v30.safetensors"
      },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": {
        "width": 1024,
        "height": 1024,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": {
        "text": "{{prompt}}",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": {
        "text": "worst quality, bad quality, simple background, (text, watermark, signature, username), monochrome",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": {
        "filename_prefix": "ComfyUI",
        "images": ["8", 0]
      },
      "class_type": "SaveImage"
    }
  }'::jsonb,
  true,
  ARRAY['anime', 'illustration', 'bismuth-illustrious', 'text-to-image'],
  true
)
ON CONFLICT DO NOTHING;
