import type { VercelRequest, VercelResponse } from "@vercel/node";

function extractJson(raw: string) {
  let cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`未找到有效 JSON 对象。raw=${raw}`);
  }

  cleaned = cleaned.slice(start, end + 1);

  cleaned = cleaned
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, '"');

  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(cleaned);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { resume, jd } = req.body ?? {};

    if (!resume || !jd) {
      return res.status(400).json({ error: "resume 和 jd 不能为空" });
    }

    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "KIMI_API_KEY 未配置" });
    }

    const prompt = `
任务：根据简历和 JD 预测面试问题。
简历：${resume}
JD：${jd}

输出 JSON 格式：
{
  "questions": [
    {
      "question": "面试问题",
      "followUp": "可能的追问路径",
      "intent": "面试意图"
    }
  ]
}

请使用中文回答。
只返回合法 JSON，不要返回 markdown，不要返回代码块，不要附加解释文字。
所有 key 和字符串值都必须使用英文双引号 " 包裹。
禁止使用中文引号（如 “ ” 和 ‘ ’）。
必须完整返回 questions 字段。
`;

    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "你是严格基于简历和 JD 生成问题的面试助手。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const text = await response.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return res.status(500).json({
        error: "上游返回的不是合法 JSON",
        upstreamStatus: response.status,
        raw: text,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Kimi request failed",
        raw: data,
      });
    }

    const content = data?.choices?.[0]?.message?.content ?? "";

    try {
      const parsed = extractJson(content);
      return res.status(200).json(parsed);
    } catch (e: any) {
      return res.status(500).json({
        error: "模型返回内容无法解析为 JSON",
        detail: e?.message || "unknown parse error",
        modelContent: content,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Internal server error",
    });
  }
}
