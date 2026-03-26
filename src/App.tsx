/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  RotateCcw,
  Edit3,
  Search,
  MessageSquare,
  Quote,
  FileUp,
  Sparkles,
  Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-expect-error - Vite specific import for worker URL
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import {
  analyzeMatch,
  rewriteExperience,
  predictInterview,
} from './services/aiService';

// Set up PDF.js worker using Vite's URL import to avoid CDN/CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type Step = 'upload' | 'parse' | 'task' | 'result';
type TaskType = 'analysis' | 'rewrite' | 'interview';

export default function App() {
  const [step, setStep] = useState<Step>('upload');
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskType | null>(null);
  const [result, setResult] = useState<any>(null);
  const [selectedText, setSelectedText] = useState('');
  const [resumeBlocks, setResumeBlocks] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle PDF upload and parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('请上传 PDF 格式的简历');
      return;
    }

    setLoading(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      setResume(fullText);
    } catch (error) {
      console.error('PDF 解析失败:', error);
      alert('PDF 解析失败，请尝试复制文本或上传其他文件');
      setFileName('');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle resume text selection for rewrite
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  const handleUpload = () => {
    if (resume.trim() && jd.trim()) {
      const blocks = resume.split(/\n\s*\n|\. \n/).filter((b) => b.trim().length > 5);
      setResumeBlocks(blocks);
      setStep('parse');
    }
  };

  const runTask = async (task: TaskType) => {
    setLoading(true);
    setCurrentTask(task);

    try {
      let data;

      if (task === 'analysis') {
        data = await analyzeMatch(resume, jd);
      } else if (task === 'rewrite') {
        if (!selectedText) {
          alert('请先在简历内容中选中一段文字进行改写。');
          setLoading(false);
          return;
        }
        data = await rewriteExperience(selectedText, jd);
      } else if (task === 'interview') {
        data = await predictInterview(resume, jd);
      }

      setResult(data);
      setStep('result');
    } catch (error) {
      console.error(error);
      alert('任务执行失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setResult(null);
    setCurrentTask(null);
    setSelectedText('');
    setFileName('');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] font-sans selection:bg-indigo-100 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <header className="border-b border-slate-200/50 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Briefcase size={16} />
            </div>
            <h1 className="font-semibold text-[17px] tracking-tight text-slate-900">
              AI Job Assistant
            </h1>
          </div>

          <div className="flex items-center gap-4 text-[13px] font-medium text-slate-400">
            <span className={step === 'upload' ? 'text-slate-800' : ''}>输入资料</span>
            <ChevronRight size={14} className="opacity-50" />
            <span className={step === 'parse' ? 'text-slate-800' : ''}>确认内容</span>
            <ChevronRight size={14} className="opacity-50" />
            <span className={step === 'result' ? 'text-slate-800' : ''}>生成结果</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-12"
            >
              <div className="max-w-2xl relative z-10">
                <h2 className="text-[40px] leading-[1.1] font-semibold tracking-tight text-slate-900 mb-4">
                  AI Job Assistant
                </h2>
                <p className="text-slate-500 text-[16px] leading-relaxed">
                  输入简历文本或上传 PDF，并提供目标职位描述（JD），系统将为您提供结构化的专业建议。
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 relative z-10">
                <div className="flex flex-col h-[520px] bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-slate-900 transition-all">
                  <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <label className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-slate-500">
                      <FileText size={15} /> 简历内容
                    </label>

                    <div className="flex items-center gap-3">
                      {fileName && (
                        <span className="text-[12px] text-emerald-600 flex items-center gap-1 font-medium">
                          <CheckCircle2 size={14} /> 已提取
                        </span>
                      )}

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[12px] flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium shadow-sm"
                      >
                        <FileUp size={14} />
                        上传 PDF
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf"
                        className="hidden"
                      />
                    </div>
                  </div>

                  <textarea
                    className="flex-1 w-full p-6 bg-transparent outline-none resize-none font-sans text-[15px] leading-[1.8] text-slate-700 placeholder:text-slate-400 custom-scrollbar"
                    placeholder="在此粘贴简历文本，或点击右上角上传 PDF 自动提取..."
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                  />
                </div>

                <div className="flex flex-col h-[520px] bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-slate-900 transition-all">
                  <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <label className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-slate-500">
                      <Search size={15} /> 职位描述 (JD)
                    </label>
                  </div>

                  <textarea
                    className="flex-1 w-full p-6 bg-transparent outline-none resize-none font-sans text-[15px] leading-[1.8] text-slate-700 placeholder:text-slate-400 custom-scrollbar"
                    placeholder="在此粘贴目标职位的职责要求 (JD)..."
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 relative z-10">
                <button
                  onClick={handleUpload}
                  disabled={!resume.trim() || !jd.trim()}
                  className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full text-[15px] font-medium hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-[0_8px_20px_rgb(15,23,42,0.15)] hover:shadow-[0_8px_25px_rgb(15,23,42,0.2)] active:scale-[0.98]"
                >
                  解析文档内容 <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'parse' && (
            <motion.div
              key="parse"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[32px] font-semibold tracking-tight text-slate-900">
                    内容确认
                  </h2>
                  <p className="text-slate-500 mt-2 font-light">
                    请确认解析出的简历内容，并选择一个分析维度。
                  </p>
                </div>

                <button
                  onClick={reset}
                  className="text-slate-400 hover:text-slate-800 transition-colors flex items-center gap-1.5 text-[14px] font-medium bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm"
                >
                  <RotateCcw size={14} /> 返回修改
                </button>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-[32px] border border-slate-200/60 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h3 className="text-[13px] font-medium uppercase tracking-widest text-slate-400 mb-8">
                      简历内容块 (选中文字可进行针对性改写)
                    </h3>

                    <div
                      className="space-y-4 max-h-[600px] overflow-y-auto pr-6 custom-scrollbar"
                      onMouseUp={handleTextSelection}
                    >
                      {resumeBlocks.length > 0 ? (
                        resumeBlocks.map((block, i) => (
                          <div
                            key={i}
                            className="p-6 rounded-[20px] bg-slate-50/50 border border-slate-100 text-slate-700 leading-[1.8] text-[15px] hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-text"
                          >
                            {block}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20 text-slate-400 font-light">
                          未解析到有效内容，请返回重新输入。
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 text-white rounded-[32px] p-10 shadow-[0_20px_40px_rgb(15,23,42,0.2)] sticky top-24">
                    <h3 className="text-[13px] font-medium uppercase tracking-widest text-slate-400 mb-8">
                      选择分析维度
                    </h3>

                    <div className="space-y-4">
                      <button
                        onClick={() => runTask('analysis')}
                        className="w-full flex items-center justify-between p-5 rounded-[20px] bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                            <Search size={20} />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-[15px]">匹配度分析</div>
                            <div className="text-[13px] text-slate-400 mt-0.5">
                              亮点挖掘与能力缺口
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-slate-500 group-hover:translate-x-1 transition-transform"
                        />
                      </button>

                      <button
                        onClick={() => runTask('rewrite')}
                        className={`w-full flex items-center justify-between p-5 rounded-[20px] transition-all group ${
                          selectedText
                            ? 'bg-white/5 hover:bg-white/10 border border-white/5'
                            : 'opacity-40 cursor-not-allowed border border-dashed border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                            <Edit3 size={20} />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-[15px]">简历改写建议</div>
                            <div className="text-[13px] text-slate-400 mt-0.5">
                              {selectedText ? '已选中片段' : '请先在左侧选中文字'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-slate-500 group-hover:translate-x-1 transition-transform"
                        />
                      </button>

                      <button
                        onClick={() => runTask('interview')}
                        className="w-full flex items-center justify-between p-5 rounded-[20px] bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center">
                            <MessageSquare size={20} />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-[15px]">面试问题预测</div>
                            <div className="text-[13px] text-slate-400 mt-0.5">
                              问题预测与意图解析
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-slate-500 group-hover:translate-x-1 transition-transform"
                        />
                      </button>
                    </div>

                    {selectedText && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-8 pt-8 border-t border-white/10"
                      >
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-3">
                          已选中待改写片段
                        </div>
                        <div className="text-[13px] leading-relaxed text-slate-300 line-clamp-4 bg-white/5 p-4 rounded-[16px] border border-white/5 font-light">
                          "{selectedText}"
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-10"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => setStep('parse')}
                    className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm text-slate-600"
                  >
                    <ArrowRight size={20} className="rotate-180" />
                  </button>

                  <div>
                    <h2 className="text-[32px] font-semibold tracking-tight text-slate-900">
                      {currentTask === 'analysis' && '匹配度分析结果'}
                      {currentTask === 'rewrite' && '简历改写建议'}
                      {currentTask === 'interview' && '面试预测结果'}
                    </h2>
                    <p className="text-slate-500 mt-1 font-light">
                      基于您的简历与 JD 深度生成的结构化建议。
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => runTask(currentTask!)}
                    className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-full text-[14px] font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <RotateCcw size={16} /> 重新生成
                  </button>

                  <button
                    onClick={reset}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-[14px] font-medium hover:bg-slate-800 transition-all shadow-md"
                  >
                    开始新分析
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {currentTask === 'analysis' && result && (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[32px] border border-slate-200/60 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8">
                      <div>
                        <h3 className="flex items-center gap-2.5 text-emerald-600 font-medium text-[17px] mb-6">
                          <CheckCircle2 size={22} /> 匹配亮点
                        </h3>
                        <ul className="space-y-4">
                          {result.highlights.map((h: string, i: number) => (
                            <li
                              key={i}
                              className="flex gap-4 text-[15px] text-slate-700 leading-[1.7] font-light"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2.5 shrink-0" />
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-8 border-t border-slate-100">
                        <h3 className="flex items-center gap-2.5 text-amber-600 font-medium text-[17px] mb-6">
                          <AlertCircle size={22} /> 能力缺口
                        </h3>
                        <ul className="space-y-4">
                          {result.gaps.map((g: string, i: number) => (
                            <li
                              key={i}
                              className="flex gap-4 text-[15px] text-slate-700 leading-[1.7] font-light"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5 shrink-0" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="bg-slate-50 rounded-[32px] p-10 border border-slate-100">
                        <h3 className="font-medium text-[17px] text-slate-900 mb-5">整体总结</h3>
                        <p className="text-slate-600 leading-[1.8] text-[15px] font-light">
                          "{result.summary}"
                        </p>
                      </div>

                      <div className="bg-white rounded-[32px] border border-slate-200/60 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <h3 className="text-[13px] font-medium uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                          <Quote size={14} /> 依据来源
                        </h3>
                        <div className="space-y-3">
                          {result.evidence.map((e: string, i: number) => (
                            <div
                              key={i}
                              className="text-[13px] text-slate-500 bg-slate-50/50 p-4 rounded-[16px] border border-slate-100 font-light leading-relaxed"
                            >
                              {e}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentTask === 'rewrite' && result && (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-[20px] font-semibold text-slate-900">
                          简历改写建议
                        </h3>
                        <p className="text-slate-500 text-[14px] mt-1">
                          已根据目标 JD 优化表达，可直接用于简历。
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => runTask('rewrite')}
                          className="text-[13px] px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                        >
                          重新生成
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(result.optimized || '')}
                          className="text-[13px] px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                        >
                          复制结果
                        </button>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                      <div className="bg-white rounded-[28px] border border-slate-200/60 p-8 shadow-sm">
                        <h4 className="text-[12px] uppercase tracking-widest text-slate-400 mb-4">
                          原始内容
                        </h4>
                        <div className="bg-slate-50 rounded-[16px] p-5 text-[15px] text-slate-600 leading-[1.8] whitespace-pre-wrap break-words">
                          {result.original}
                        </div>
                      </div>

                      <div className="bg-slate-900 text-white rounded-[28px] p-8 shadow-lg">
                        <h4 className="text-[12px] uppercase tracking-widest text-slate-400 mb-4">
                          优化后内容
                        </h4>
                        <div className="text-[16px] leading-[1.9] whitespace-pre-wrap break-words text-slate-100">
                          {result.optimized}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[28px] border border-slate-200/60 p-8 shadow-sm">
                      <h4 className="text-[12px] uppercase tracking-widest text-slate-400 mb-4">
                        改写说明
                      </h4>
                      <div className="text-[15px] text-slate-700 leading-[1.8] whitespace-pre-wrap break-words">
                        {result.explanation}
                      </div>
                    </div>
                  </div>
                )}

                {currentTask === 'interview' && result && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {result.questions.map((q: any, i: number) => (
                      <div
                        key={i}
                        className="bg-white rounded-[32px] border border-slate-200/60 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full"
                      >
                        <div className="mb-6">
                          <span className="text-[11px] font-medium uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                            问题 {i + 1}
                          </span>
                        </div>

                        <h3 className="font-medium text-[17px] text-slate-900 mb-6 leading-[1.6]">
                          {q.question}
                        </h3>

                        <div className="mt-auto space-y-5">
                          <div className="pt-6 border-t border-slate-100">
                            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-2">
                              面试官意图
                            </div>
                            <p className="text-[13px] text-slate-600 leading-relaxed font-light">
                              {q.intent}
                            </p>
                          </div>

                          <div className="p-4 rounded-[16px] bg-slate-50/50 border border-slate-100">
                            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-2">
                              追问路径
                            </div>
                            <p className="text-[13px] text-slate-700 leading-relaxed font-light">
                              "{q.followUp}"
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-50 flex flex-col items-center justify-center">
          <motion.div
            animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl mb-6"
          >
            <Sparkles size={28} className="text-white" />
          </motion.div>
          <p className="font-medium text-[17px] text-slate-900 tracking-tight">
            系统正在深度解析您的数据...
          </p>
          <p className="text-[14px] text-slate-500 mt-2 font-light">
            正在构建任务驱动的上下文
          </p>
        </div>
      )}

      <footer className="border-t border-slate-200/60 py-12 bg-white mt-12 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[13px] text-slate-400 font-light">
            © 2026 AI Job Assistant. 任务驱动型架构.
          </div>
          <div className="flex gap-8 text-[11px] font-medium uppercase tracking-widest text-slate-400">
            <span>结构化分析</span>
            <span>杜绝幻觉</span>
            <span>依据原文</span>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>
    </div>
  );
}
