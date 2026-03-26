import type { VercelRequest, VercelResponse } from "@vercel/node";

const KNOWLEDGE_BASE = [
  "使用更有力、更专业的动词表达经历。",
  "优先突出与 JD 直接相关的能力和职责。",
  "可以优化表述，但不能新增原文没有提供的事实。",
  "不能伪造结果、数据、项目规模或职责。",
  "改写必须保持真实性和可解释性。",
  "evidence 必须引用原始经历或 JD 中的原文。"
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { experience, jd } = req.body ?? {};

    if (
      typeof experience !== "string" ||
      typeof jd !== "string" ||
      !experience.trim() ||
      !jd.trim()
    ) {
      return res.status(400).json({
        error: "experience 和 jd 不能为空",
        debug: {
          hasExperience: !!experience,
          hasJd: !!jd,
        },
      });
    }

    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "KIMI_API_KEY 未配置" });
    }

    const prompt = `
任务：根据用户提供的一段经历和目标 JD，对该段经历进行优化改写。

原始经历：
${experience}

目标 JD：
${jd}

规则：
${KNOWLEDGE_BASE.join("\n")}

输出 JSON 格式：
{
  "original": "用户原始经历",
  "optimized": "优化后的经历表述",
  "explanation": "说明为什么这样改写，强调与 JD 的对应关系，并说明没有新增事实",
  "evidence": "引用原始经历和 JD 中的关键依据"
}

要求：
1. 请使用中文回答。
2. 只返回合法 JSON。
3. 所有 key 和字符串值都必须使用英文双引号 " 包裹。
4. 必须完整返回 original、optimized、explanation、evidence 这 4 个字段。
5. 不能新增原始经历中没有出现的事实。
6. 不要返回 markdown，不要返回代码块，不要附加解释文字。
`.trim();

    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "你是一个严格遵循事实、不编造内容的 AI 简历改写助手。",
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

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "模型未返回 content",
        raw: data,
      });
    }

    try {
      return res.status(200).json(JSON.parse(content));
    } catch {
      return res.status(500).json({
        error: "模型返回的 content 不是合法 JSON",
        modelContent: content,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Internal server error",
    });
  }
}
