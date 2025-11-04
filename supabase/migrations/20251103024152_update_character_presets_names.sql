-- Add name_en and name_ja columns to character_presets
-- Split the existing 'name' column into separate English and Japanese columns

-- Add new columns
ALTER TABLE character_presets ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE character_presets ADD COLUMN IF NOT EXISTS name_ja text;

-- Copy existing 'name' to both columns as fallback
UPDATE character_presets SET name_en = name WHERE name_en IS NULL;
UPDATE character_presets SET name_ja = name WHERE name_ja IS NULL;

-- Update Japanese names for existing presets
UPDATE character_presets SET name_ja =
  CASE name
    -- Hairstyle
    WHEN 'Short Hair' THEN 'ショートヘア'
    WHEN 'Long Hair' THEN 'ロングヘア'
    WHEN 'Twin Tails' THEN 'ツインテール'
    WHEN 'Ponytail' THEN 'ポニーテール'
    WHEN 'Bob Cut' THEN 'ボブカット'
    WHEN 'Wavy Hair' THEN 'ウェーブヘア'
    WHEN 'Braided Hair' THEN '三つ編み'
    -- Body Type
    WHEN 'Slim' THEN 'スリム'
    WHEN 'Average' THEN '標準'
    WHEN 'Curvy' THEN 'グラマー'
    WHEN 'Athletic' THEN 'アスリート'
    WHEN 'Petite' THEN '小柄'
    -- Costume
    WHEN 'Casual Clothes' THEN 'カジュアル'
    WHEN 'School Uniform' THEN '制服'
    WHEN 'Fantasy Armor' THEN 'ファンタジー鎧'
    WHEN 'Maid Outfit' THEN 'メイド服'
    WHEN 'Kimono' THEN '着物'
    WHEN 'Modern Fashion' THEN 'モダンファッション'
    WHEN 'Business Suit' THEN 'スーツ'
    WHEN 'Summer Dress' THEN 'サマードレス'
    WHEN 'Gothic Lolita' THEN 'ゴシックロリータ'
    -- Expression
    WHEN 'Smiling' THEN '笑顔'
    WHEN 'Serious' THEN '真剣'
    WHEN 'Shy' THEN '恥ずかしがり'
    WHEN 'Confident' THEN '自信満々'
    WHEN 'Surprised' THEN '驚き'
    WHEN 'Cheerful' THEN '元気'
    WHEN 'Mysterious' THEN 'ミステリアス'
    -- Hair Color
    WHEN 'Black' THEN '黒髪'
    WHEN 'Brown' THEN '茶髪'
    WHEN 'Blonde' THEN '金髪'
    WHEN 'Red' THEN '赤髪'
    WHEN 'Blue' THEN '青髪'
    WHEN 'Purple' THEN '紫髪'
    WHEN 'Pink' THEN 'ピンク髪'
    WHEN 'White' THEN '白髪'
    WHEN 'Silver' THEN '銀髪'
    -- Eye Color
    WHEN 'Blue Eyes' THEN '青い瞳'
    WHEN 'Green Eyes' THEN '緑の瞳'
    WHEN 'Brown Eyes' THEN '茶色の瞳'
    WHEN 'Red Eyes' THEN '赤い瞳'
    WHEN 'Purple Eyes' THEN '紫の瞳'
    WHEN 'Golden Eyes' THEN '金色の瞳'
    WHEN 'Heterochromia' THEN 'オッドアイ'
    -- Accessory
    WHEN 'None' THEN 'なし'
    WHEN 'Glasses' THEN 'メガネ'
    WHEN 'Hair Ribbon' THEN 'リボン'
    WHEN 'Headband' THEN 'ヘアバンド'
    WHEN 'Earrings' THEN 'イヤリング'
    WHEN 'Necklace' THEN 'ネックレス'
    WHEN 'Hair Clips' THEN 'ヘアクリップ'
    WHEN 'Hat' THEN '帽子'
    -- Background
    WHEN 'Simple White' THEN 'シンプル白背景'
    WHEN 'School Classroom' THEN '教室'
    WHEN 'Outdoor Park' THEN '公園'
    WHEN 'Fantasy Forest' THEN 'ファンタジー森'
    WHEN 'Modern City' THEN '都市'
    WHEN 'Beach Sunset' THEN 'ビーチの夕日'
    WHEN 'Night Sky' THEN '夜空'
    WHEN 'Cafe Interior' THEN 'カフェ店内'
    -- Pose
    WHEN 'Standing' THEN '立ち姿'
    WHEN 'Sitting' THEN '座り'
    WHEN 'Dynamic Action' THEN 'ダイナミックアクション'
    WHEN 'Relaxed Pose' THEN 'リラックスポーズ'
    WHEN 'Portrait Shot' THEN 'ポートレート'
    WHEN 'Full Body' THEN '全身'
    WHEN 'Close-up Face' THEN 'クローズアップ'
    -- Composition
    WHEN 'Center Focused' THEN '中央配置'
    WHEN 'Rule of Thirds' THEN '三分割法'
    WHEN 'Low Angle' THEN 'ローアングル'
    WHEN 'High Angle' THEN 'ハイアングル'
    WHEN 'Dynamic Diagonal' THEN 'ダイナミック斜め'
    WHEN 'Symmetrical' THEN '左右対称'
    -- Lighting
    WHEN 'Natural Daylight' THEN '自然光'
    WHEN 'Soft Studio Light' THEN 'ソフトスタジオライト'
    WHEN 'Dramatic Rim Light' THEN 'ドラマチックリムライト'
    WHEN 'Golden Hour' THEN 'ゴールデンアワー'
    WHEN 'Neon Lights' THEN 'ネオンライト'
    WHEN 'Backlit Silhouette' THEN '逆光シルエット'
    WHEN 'Volumetric Rays' THEN 'ボリュメトリックレイ'
    -- Special
    WHEN 'Random' THEN 'ランダム'
    WHEN 'No Preference' THEN '指定なし'
    ELSE name
  END;

-- Now we can make name_en and name_ja NOT NULL
ALTER TABLE character_presets ALTER COLUMN name_en SET NOT NULL;
ALTER TABLE character_presets ALTER COLUMN name_ja SET NOT NULL;

-- We can keep the old 'name' column for now for backward compatibility
-- Or drop it if we're confident everything is migrated:
-- ALTER TABLE character_presets DROP COLUMN name;
