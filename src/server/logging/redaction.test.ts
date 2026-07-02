import { describe, expect, it } from "vitest";

import {
  REDACTED_LOG_VALUE,
  redactLogMetadata,
  serializeAiPayloadForLog,
  serializeErrorForLog,
  truncateTextForLog,
} from "./redaction";

describe("redactLogMetadata", () => {
  it("recursively redacts nested sensitive object keys case-insensitively", () => {
    const redacted = redactLogMetadata({
      userId: "user-1",
      Authorization: "Bearer secret",
      nested: {
        apiKey: "provider-key",
        client_secret: "client-secret",
        safe: "visible",
      },
    });

    expect(redacted).toEqual({
      userId: "user-1",
      Authorization: REDACTED_LOG_VALUE,
      nested: {
        apiKey: REDACTED_LOG_VALUE,
        client_secret: REDACTED_LOG_VALUE,
        safe: "visible",
      },
    });
  });

  it("redacts sensitive keys inside arrays while preserving safe scalar values", () => {
    const redacted = redactLogMetadata({
      attempts: [
        { refresh_token: "refresh", count: 1, ok: true },
        { cookie: "session=secret", note: null },
      ],
    });

    expect(redacted).toEqual({
      attempts: [
        { refresh_token: REDACTED_LOG_VALUE, count: 1, ok: true },
        { cookie: REDACTED_LOG_VALUE, note: null },
      ],
    });
  });
});

describe("truncateTextForLog", () => {
  it("truncates long text and reports truncation metadata", () => {
    expect(truncateTextForLog("abcdef", 3)).toEqual({
      preview: "abc",
      truncated: true,
      originalLength: 6,
      maxChars: 3,
      omittedChars: 3,
    });
  });

  it("keeps short text untruncated", () => {
    expect(truncateTextForLog("abc", 10)).toEqual({
      preview: "abc",
      truncated: false,
      originalLength: 3,
      maxChars: 10,
      omittedChars: 0,
    });
  });
});

describe("serializeErrorForLog", () => {
  it("serializes Error instances to safe metadata without stack traces", () => {
    const error = new Error("Provider failed");
    error.name = "ProviderError";

    const serialized = serializeErrorForLog(error);

    expect(serialized).toEqual({
      name: "ProviderError",
      message: "Provider failed",
    });
    expect(serialized).not.toHaveProperty("stack");
  });

  it("includes safe code and redacts sensitive enumerable error metadata", () => {
    const error = Object.assign(new Error("Request failed"), {
      code: "rate_limited",
      apiKey: "secret-key",
      response: { status: 429, authorization: "Bearer secret" },
    });

    expect(serializeErrorForLog(error)).toEqual({
      name: "Error",
      message: "Request failed",
      code: "rate_limited",
      details: {
        code: "rate_limited",
        apiKey: REDACTED_LOG_VALUE,
        response: { status: 429, authorization: REDACTED_LOG_VALUE },
      },
    });
  });

  it("serializes non-Error thrown values as safe details", () => {
    expect(serializeErrorForLog({ password: "secret", reason: "bad input" })).toEqual({
      name: "NonErrorThrownValue",
      message: "A non-Error value was thrown.",
      details: { password: REDACTED_LOG_VALUE, reason: "bad input" },
    });
  });
});

describe("serializeAiPayloadForLog", () => {
  it("returns no payload details when AI payload logging is disabled", () => {
    expect(
      serializeAiPayloadForLog(
        { prompt: "private user text", apiKey: "secret" },
        { aiPayloadLoggingEnabled: false, aiPayloadLogMaxChars: 5 },
      ),
    ).toEqual({ enabled: false });
  });

  it("redacts sensitive keys and truncates text when AI payload logging is enabled", () => {
    expect(
      serializeAiPayloadForLog(
        {
          prompt: "Generate a very long adventure",
          messages: [{ role: "user", content: "hello world" }],
          provider: { apiKey: "secret" },
        },
        { aiPayloadLoggingEnabled: true, aiPayloadLogMaxChars: 5 },
      ),
    ).toEqual({
      enabled: true,
      payload: {
        prompt: {
          preview: "Gener",
          truncated: true,
          originalLength: 30,
          maxChars: 5,
          omittedChars: 25,
        },
        messages: [
          {
            role: {
              preview: "user",
              truncated: false,
              originalLength: 4,
              maxChars: 5,
              omittedChars: 0,
            },
            content: {
              preview: "hello",
              truncated: true,
              originalLength: 11,
              maxChars: 5,
              omittedChars: 6,
            },
          },
        ],
        provider: { apiKey: REDACTED_LOG_VALUE },
      },
    });
  });
});
