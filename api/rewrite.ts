import type { VercelRequest, VercelResponse } from "@vercel/node";

const KNOWLEDGE_BASE = [
  "使用更有力、更专业的动词表达经历。",
  "优先突出与 JD 直接相关的能力和职责。",
  "可以优化表述，但不能新增原文没有提供的事实。",
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
你是一个 AI 求职简历优化助手。

任务：
根据用户提供的“原始经历”和“目标 JD”，输出更适合该岗位投递的经历改写版本。

你必须先判断当前改写属于以下哪种模式之一：

【模式A：强改写】
适用条件：
- 原经历对应岗位与目标岗位名称不完全一致
- 但业务场景、职责逻辑、能力结构、协作方式、分析方法、交付结果存在可迁移性
处理要求：
- 可以显著调整表述方式、句式结构、信息顺序和专业术语
- 可以把原经历重新组织成更贴近目标岗位的话语体系
- 可以突出原经历中对目标 JD 有帮助的“可迁移能力”
- 可以对原文中已体现但表达较弱的职责做专业化展开
- 可以由原岗位工作内容扩展到JD目标岗位
- 尽量不要新增原文没有依据的事实、结果、数据、项目、职责、工具、团队范围，如果需要新增也请基于事实依据

【模式B：轻改写】
适用条件：
- 原经历与目标岗位基本一致
- 只是目标 JD 的关键词、侧重点、业务表述不同
处理要求：
- 尽量保留原句事实
- 主要优化措辞、突出重点、补齐更贴近 JD 的关键词表达
- 改动幅度应小于强改写

【统一硬性规则】
1. 不允许新增原文未体现的职责、项目、结果、指标、工具、方法、行业经验
2. 可以做“能力迁移”和“业务语义对齐”，但前提是原文中必须有依据
3. 改写后的内容必须更专业、更像真实候选人会写进简历的表述
4. 若原经历和 JD 相关性很弱，不能强行硬贴，必须保守处理
5. explanation 必须说明属于哪种改写模式，以及为什么这样改
6. evidence 必须引用原始经历和 JD 中的关键原文依据
7. 只返回合法 JSON，不要 markdown，不要代码块，不要额外说明

【原始经历】
${experience}

【目标 JD】
${jd}

请返回以下 JSON：
{
  "original": "原始经历",
  "optimized": [
    "优化后的简历条目1",
    "优化后的简历条目2"
  ],
  "explanation": "说明本次属于强改写还是轻改写，并解释如何在不新增事实的前提下，使内容更贴近 JD"
}
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
      const parsed = JSON.parse(content);

      return res.status(200).json({
        original: typeof parsed?.original === "string" ? parsed.original : "",
        optimized: typeof parsed?.optimized === "string" ? parsed.optimized : "",
        explanation: typeof parsed?.explanation === "string" ? parsed.explanation : "",
        evidence: typeof parsed?.evidence === "string" ? parsed.evidence : "",
});
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
