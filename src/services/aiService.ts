import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Knowledge base rules (20-50 rules simplified)
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

export interface AnalysisResult {
  highlights: string[];
  gaps: string[];
  summary: string;
  evidence: string[];
}

export interface RewriteResult {
  original: string;
  optimized: string;
  explanation: string;
  evidence: string;
}

export interface InterviewResult {
  questions: {
    question: string;
    followUp: string;
    intent: string;
  }[];
}

export async function analyzeMatch(resume: string, jd: string): Promise<AnalysisResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      任务：分析简历与 JD 的匹配度。
      简历：${resume}
      JD：${jd}
      规则：${KNOWLEDGE_BASE.join("\n")}
      
      输出 JSON 格式：
      {
        "highlights": ["匹配亮点，需引用简历内容", ...],
        "gaps": ["根据 JD 要求的缺口", ...],
        "summary": "整体匹配度总结",
        "evidence": ["支持分析的具体简历/JD 引用"]
      }
      请使用中文回答。
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING },
          evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["highlights", "gaps", "summary", "evidence"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function rewriteExperience(experience: string, jd: string): Promise<RewriteResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
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
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          optimized: { type: Type.STRING },
          explanation: { type: Type.STRING },
          evidence: { type: Type.STRING },
        },
        required: ["original", "optimized", "explanation", "evidence"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function predictInterview(resume: string, jd: string): Promise<InterviewResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
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
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                followUp: { type: Type.STRING },
                intent: { type: Type.STRING },
              },
              required: ["question", "followUp", "intent"],
            },
          },
        },
        required: ["questions"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
