import { z } from "zod";

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY?.trim());
}

export function getAiModelName(): string {
  return process.env.AI_MODEL?.trim() || "gpt-4o-mini";
}

export type AiCallResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; notConfigured?: boolean };

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

export async function callAiJson<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
}): Promise<AiCallResult<T>> {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      notConfigured: true,
      error: "هوش مصنوعی پیکربندی نشده است (کلید AI_API_KEY در تنظیمات سرور وجود ندارد).",
    };
  }

  const baseUrl = (process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/+$/,
    ""
  );
  const model = getAiModelName();
  const timeoutMs = params.timeoutMs ?? 20000;

  let lastValidationError = "";

  // Up to 2 attempts (1 initial + 1 retry on invalid JSON/schema)
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = [
      { role: "system", content: params.systemPrompt },
      {
        role: "user",
        content:
          attempt === 0
            ? params.userPrompt
            : `${params.userPrompt}\n\nتوجه: خروجی قبلی JSON معتبر یا مطابق ساختار درخواستی نبود (${lastValidationError}). لطفاً فقط یک آبجکت JSON خالص و معتبر برگردانید.`,
      },
    ];

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return {
            ok: false,
            error: "کلید دسترسی هوش مصنوعی نامعتبر است یا مجوز استفاده ندارد.",
          };
        }
        if (response.status === 429) {
          return {
            ok: false,
            error: "محدودیت تعداد درخواست سرویس هوش مصنوعی پر شده است. لطفاً کمی بعد تلاش کنید.",
          };
        }
        return {
          ok: false,
          error: `خطای سرویس هوش مصنوعی (کد ${response.status}).`,
        };
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        lastValidationError = "پاسخ خالی از مدل";
        continue;
      }

      const jsonText = extractJsonText(content);
      const parsedJson: unknown = JSON.parse(jsonText);
      const validated = params.schema.safeParse(parsedJson);

      if (validated.success) {
        return { ok: true, data: validated.data };
      }

      lastValidationError = validated.error.errors[0]?.message || "ساختار نامعتبر";
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        return {
          ok: false,
          error: "زمان پاسخ‌گویی سرویس هوش مصنوعی به پایان رسید. لطفاً مجدداً تلاش کنید.",
        };
      }
      if (err instanceof SyntaxError) {
        lastValidationError = "JSON نامعتبر";
        continue;
      }
      return {
        ok: false,
        error: "خطا در برقراری ارتباط با سرویس هوش مصنوعی.",
      };
    }
  }

  return {
    ok: false,
    error: "پاسخ دریافتی از هوش مصنوعی با فرمت مورد انتظار سازگار نبود.",
  };
}
