import { type ServerLoggingConfig } from "./config";

export const REDACTED_LOG_VALUE = "[REDACTED]";
export const UNSERIALIZABLE_LOG_VALUE = "[Unserializable]";

export type SafeLogScalar = string | number | boolean | null;
export type SafeLogValue = SafeLogScalar | SafeLogObject | SafeLogValue[];
export type SafeLogObject = { readonly [key: string]: SafeLogValue | undefined };

export type TextPreview = Readonly<{
  preview: string;
  truncated: boolean;
  originalLength: number;
  maxChars: number;
  omittedChars: number;
}>;

export type SafeErrorMetadata = Readonly<{
  name: string;
  message: string;
  code?: SafeLogScalar;
  cause?: SafeLogValue;
  details?: SafeLogValue;
}>;

export type AiPayloadLoggingConfig = Pick<
  ServerLoggingConfig,
  "aiPayloadLoggingEnabled" | "aiPayloadLogMaxChars"
>;

export type SafeAiPayloadPreview =
  | Readonly<{ enabled: false }>
  | Readonly<{ enabled: true; payload: SafeLogValue }>;

const SENSITIVE_KEY_PATTERNS = [
  "authorization",
  "apikey",
  "clientsecret",
  "cookie",
  "credential",
  "password",
  "secret",
  "token",
];

export function redactLogMetadata(input: unknown): SafeLogValue {
  return sanitizeValue(input, {
    visitedObjects: new WeakSet<object>(),
    textMaxChars: null,
  });
}

export function truncateTextForLog(text: string, maxChars: number): TextPreview {
  const safeMaxChars = Number.isInteger(maxChars) && maxChars > 0 ? maxChars : 1;
  const truncated = text.length > safeMaxChars;
  const preview = truncated ? text.slice(0, safeMaxChars) : text;

  return {
    preview,
    truncated,
    originalLength: text.length,
    maxChars: safeMaxChars,
    omittedChars: truncated ? text.length - safeMaxChars : 0,
  };
}

export function serializeErrorForLog(error: unknown): SafeErrorMetadata {
  if (error instanceof Error) {
    return serializeErrorInstance(error);
  }

  return {
    name: "NonErrorThrownValue",
    message: "A non-Error value was thrown.",
    details: redactLogMetadata(error),
  };
}

export function serializeAiPayloadForLog(
  payload: unknown,
  config: AiPayloadLoggingConfig,
): SafeAiPayloadPreview {
  if (!config.aiPayloadLoggingEnabled) {
    return { enabled: false };
  }

  return {
    enabled: true,
    payload: sanitizeValue(payload, {
      visitedObjects: new WeakSet<object>(),
      textMaxChars: config.aiPayloadLogMaxChars,
    }),
  };
}

type SanitizeOptions = Readonly<{
  visitedObjects: WeakSet<object>;
  textMaxChars: number | null;
}>;

function serializeErrorInstance(error: Error): SafeErrorMetadata {
  const sanitizedEntries = sanitizeEnumerableObject(error, {
    visitedObjects: new WeakSet<object>(),
    textMaxChars: null,
  });
  const code = getSafeErrorCode(error);
  const cause = getErrorCause(error);

  return {
    name: error.name || "Error",
    message: error.message,
    ...(code !== undefined ? { code } : {}),
    ...(cause !== undefined ? { cause } : {}),
    ...(hasSafeDetails(sanitizedEntries) ? { details: sanitizedEntries } : {}),
  };
}

function getSafeErrorCode(error: Error): SafeLogScalar | undefined {
  const code = (error as { readonly code?: unknown }).code;

  return isSafeScalar(code) ? code : undefined;
}

function getErrorCause(error: Error): SafeLogValue | undefined {
  const cause = (error as { readonly cause?: unknown }).cause;

  if (cause === undefined) {
    return undefined;
  }

  if (cause instanceof Error) {
    return { name: cause.name || "Error" };
  }

  if (typeof cause === "string") {
    return cause;
  }

  if (isPlainObject(cause)) {
    const category = cause.category;
    return typeof category === "string" ? { category } : { type: "object" };
  }

  return { type: typeof cause };
}

function hasSafeDetails(value: SafeLogValue): boolean {
  return isSafeLogObject(value) && Object.keys(value).length > 0;
}

function sanitizeValue(input: unknown, options: SanitizeOptions): SafeLogValue {
  if (isSafeScalar(input)) {
    return typeof input === "string" && options.textMaxChars !== null
      ? truncateTextForLog(input, options.textMaxChars)
      : input;
  }

  if (typeof input === "bigint") {
    return input.toString();
  }

  if (input === undefined || typeof input === "function" || typeof input === "symbol") {
    return UNSERIALIZABLE_LOG_VALUE;
  }

  if (input instanceof Date) {
    return input.toISOString();
  }

  if (input instanceof Error) {
    return serializeErrorForLog(input);
  }

  if (Array.isArray(input)) {
    if (options.visitedObjects.has(input)) {
      return "[Circular]";
    }

    options.visitedObjects.add(input);
    return input.map((value) => sanitizeValue(value, options));
  }

  if (isPlainObject(input)) {
    return sanitizeEnumerableObject(input, options);
  }

  return UNSERIALIZABLE_LOG_VALUE;
}

function sanitizeEnumerableObject(
  input: object,
  options: SanitizeOptions,
): SafeLogObject {
  if (options.visitedObjects.has(input)) {
    return { circular: "[Circular]" };
  }

  options.visitedObjects.add(input);

  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => !isBuiltInErrorKey(key))
      .map(([key, value]) => [
        key,
        isSensitiveKey(key) ? REDACTED_LOG_VALUE : sanitizeValue(value, options),
      ]),
  ) as SafeLogObject;
}

function isBuiltInErrorKey(key: string): boolean {
  return ["name", "message", "stack", "cause"].includes(key);
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalizedKey.includes(pattern));
}

function isSafeScalar(value: unknown): value is SafeLogScalar {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function isSafeLogObject(value: SafeLogValue): value is SafeLogObject {
  return value !== null && !Array.isArray(value) && typeof value === "object";
}

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
