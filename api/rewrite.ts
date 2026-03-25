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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { experience, jd } = req.body;

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

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Kimi request failed",
        raw: data,
      });
    }

    const content = data?.choices?.[0]?.message?.content || "{}";

const content = data?.choices?.[0]?.message?.content || "";

// 1. 去 markdown
let cleaned = content
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

// 2. 截取第一个 JSON 对象（关键修复）
const start = cleaned.indexOf("{");
const end = cleaned.lastIndexOf("}");

if (start !== -1 && end !== -1) {
  cleaned = cleaned.slice(start, end + 1);
}

let parsed;

try {
  parsed = JSON.parse(cleaned);
} catch (e) {
  return res.status(500).json({
    error: "JSON parse failed",
    cleaned,
    raw: content,
  });
}

return res.status(200).json(parsed);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Internal server error",
    });
  }
}
