import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { resume, jd } = req.body;

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

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Kimi request failed",
        raw: data,
      });
    }

    const content = data?.choices?.[0]?.message?.content || "{}";
    return res.status(200).json(JSON.parse(content));
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Internal server error",
    });
  }
}
