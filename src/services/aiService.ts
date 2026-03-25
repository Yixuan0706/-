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

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `请求失败: ${res.status}`);
  }

  return data as T;
}

export async function analyzeMatch(resume: string, jd: string): Promise<AnalysisResult> {
  return postJSON<AnalysisResult>("/api/analyze", { resume, jd });
}

export async function rewriteExperience(experience: string, jd: string): Promise<RewriteResult> {
  return postJSON<RewriteResult>("/api/rewrite", { experience, jd });
}

export async function predictInterview(resume: string, jd: string): Promise<InterviewResult> {
  return postJSON<InterviewResult>("/api/interview", { resume, jd });
}
