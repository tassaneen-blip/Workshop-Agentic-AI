const GEMINI_TYPES: Record<string, string> = {
  object: 'OBJECT', string: 'STRING', number: 'NUMBER', integer: 'INTEGER',
  boolean: 'BOOLEAN', array: 'ARRAY', null: 'NULL',
};

export function toGeminiSchema(schema: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...schema };
  if (typeof schema.type === 'string') result.type = GEMINI_TYPES[schema.type.toLowerCase()] ?? schema.type.toUpperCase();
  if (schema.properties && typeof schema.properties === 'object') {
    result.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, toGeminiSchema(value as Record<string, any>)]));
  }
  if (schema.items && typeof schema.items === 'object') result.items = toGeminiSchema(schema.items);
  return result;
}