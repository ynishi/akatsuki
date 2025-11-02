-- Bismuth Illustrious Workflowを動的パラメータ対応に更新
UPDATE comfyui_workflows
SET workflow_json = '{
  "3": {
    "inputs": {
      "seed": "{{seed}}",
      "steps": "{{steps}}",
      "cfg": "{{cfg}}",
      "sampler_name": "{{sampler_name}}",
      "scheduler": "{{scheduler}}",
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
      "width": "{{width}}",
      "height": "{{height}}",
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
description = 'Bismuth Illustrious v3.0 - 動的パラメータ対応（steps, cfg, width, height, sampler_name, schedulerをカスタマイズ可能）'
WHERE name = 'Bismuth Illustrious - Anime Style';
