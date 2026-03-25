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

  // 把中文/弯引号替换成标准英文双引号
  cleaned = cleaned
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, '"');

  // 去掉尾随逗号
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
      return res.status(400).json({
        error: "resume 和 jd 不能为空",
        debug: {
          hasResume: !!resume,
          hasJd: !!jd,
        },
      });
    }

    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "KIMI_API_KEY 未配置" });
    }

    const prompt = `
任务：分析简历与 JD 的匹配度。
简历：${resume}
JD：${jd}
规则：${KNOWLEDGE_BASE.join("\n")}

输出 JSON 格式：
{
  "highlights": ["匹配亮点，需引用简历内容"],
  "gaps": ["根据 JD 要求的缺口"],
  "summary": "整体匹配度总结",
  "evidence": ["支持分析的具体简历/JD 引用"]
}

请使用中文回答。
只返回合法 JSON，不要返回 markdown，不要返回代码块，不要附加解释文字。
`;

    const upstream = await fetch("https://api.moonshot.cn/v1/chat/completions", {
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
            content: "你是一个严格遵循事实、不编造内容的 AI 求职助手。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const text = await upstream.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return res.status(500).json({
        error: "上游返回的不是合法 JSON",
        upstreamStatus: upstream.status,
        raw: text,
      });
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || "Kimi request failed",
        upstreamStatus: upstream.status,
        raw: data,
      });
    }

    const content = data?.choices?.[0]?.message?.content ?? "";

    try {
      const parsed = extractJson(content);
      return res.status(200).json(parsed);
    } catch (parseError: any) {
      return res.status(500).json({
        error: "模型返回内容无法解析为 JSON",
        detail: parseError?.message || "unknown parse error",
        modelContent: content,
      });
    }
  } catch (error: any) {
    console.error("analyze handler error:", error);

    return res.status(500).json({
      error: error?.message || "Internal server error",
      stack:
        process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
  }
}
