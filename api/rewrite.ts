import type { VercelRequest, VercelResponse } from "@vercel/node";

const KNOWLEDGE_BASE = [
  "使用动词（如：领导、开发、管理）。",
  "量化成就（如：销售额增长 20%）。",
  "将技能与 JD 关键词对齐。",
  "保持要点简洁有力。",
  "避免使用被动语态。",
  "关注结果，而不仅仅是职责。",
  "使用 STAR 方法描述经历。",
  "确保技术技能符合职位要求。",
  "在相关地方突出领导力和软技能。",
  "根据具体职位定制总结。"
];

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
    const { experience, jd } = req.body ?? {};

    if (!experience || !jd) {
      return res.status(400).json({ error: "experience 和 jd 不能为空" });
    }

    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "KIMI_API_KEY 未配置" });
    }

    const prompt = `
任务：改写以下经历片段，使其更好地与 JD 对齐。
经历：${experience}
JD：${jd}
规则：${KNOWLEDGE_BASE.join("\n")}

约束：
1. 不得虚构事实。
2. 优化表达和影响力。
3. 使用动词，并根据原件尽可能量化。

输出 JSON 格式：
{
  "original": "原始文本",
  "optimized": "优化后的改写版本",
  "explanation": "修改说明（为什么这样改）",
  "evidence": "作为依据的原始简历引用"
}

请使用中文回答。
只返回合法 JSON，不要返回 markdown，不要返回代码块。
所有 key 和字符串值都必须使用英文双引号 " 包裹。
禁止使用中文引号（如 “ ” 和 ‘ ’）。
必须完整返回 original、optimized、explanation、evidence 这 4 个字段。
`;

    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "你是严格不编造事实的简历改写助手。",
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
