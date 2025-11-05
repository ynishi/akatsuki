-- Add Echo and Hello World Functions
-- Simple sync functions for testing Function Call System

-- Function: echo
INSERT INTO function_call_definitions (
  user_id,
  name,
  description,
  parameters_schema,
  target_event_type,
  is_enabled,
  is_global
) VALUES (
  NULL,
  'echo',
  'Simple echo function that returns the input message',
  '{
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "The message to echo back"
      }
    },
    "required": ["message"]
  }'::jsonb,
  'sync:echo',
  true,
  true
);

-- Function: hello_world
INSERT INTO function_call_definitions (
  user_id,
  name,
  description,
  parameters_schema,
  target_event_type,
  is_enabled,
  is_global
) VALUES (
  NULL,
  'hello_world',
  'Simple hello world function that greets a user',
  '{
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Name to greet (optional)"
      }
    },
    "required": []
  }'::jsonb,
  'sync:hello_world',
  true,
  true
);
