import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  Loader2, 
  RefreshCw, 
  ShoppingBag, 
  Zap,
  Palette, 
  Globe,
  Download,
  RotateCcw,
  X,
  Plus,
  Shirt,
  Smartphone,
  PlusSquare,
  Library,
  MessageSquarePlus,
  Layout,
  Clock,
  ToggleRight,
  ToggleLeft,
  Lightbulb
} from 'lucide-react';
// Explicitly import Part from @google/genai to avoid collision with browser's native Blob
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";

// --- Types & Config ---
type Platform = 'xiaohongshu' | 'instagram' | 'facebook';
type Language = 'zh' | 'en';
type AppTab = 'studio' | 'results' | 'archive' | 'inspiration';

interface GeneratedContent {
  title: string;
  body: string;
  hashtags: string[];
}

interface HistoryItem {
  id: string;
  images: string[];
  modelImage: string | null;
  inspirationImages: string[];
  desc: string;
  platform: Platform;
  content: GeneratedContent;
  timestamp: number;
}

interface AppState {
  originalImages: string[];
  modelImage: string | null;
  inspirationImages: string[];
  enhancedImages: string[];
  content: Record<Platform, GeneratedContent | null>;
  isGenerating: boolean;
  activePlatform: Platform;
  stylePreference: string;
  selectedVoiceStyles: Record<Platform, string>;
  isCustomizable: boolean;
  lang: Language;
  potentialHashtags: string[];
  isGeneratingHashtags: boolean;
  isAnalyzingImage: boolean;
  activeTab: AppTab;
  history: HistoryItem[];
  isFeedbackMode: boolean;
}

const VOICE_STYLES = {
  xiaohongshu: [
    { id: "exaggerated", name: { zh: "夸张吸睛", en: "Catchy" } },
    { id: "storytelling", name: { zh: "故事共鸣", en: "Story" }, default: true },
    { id: "tutorial", name: { zh: "干货教程", en: "Guide" } },
    { id: "soothing", name: { zh: "温柔治愈", en: "Soft" } }
  ],
  instagram: [
    { id: "minimalist", name: { zh: "极简美学", en: "Minimal" }, default: true },
    { id: "self_expression", name: { zh: "自我表达", en: "Vibe" } },
    { id: "light_story", name: { zh: "轻故事型", en: "Blog" } }
  ],
  facebook: [
    { id: "friendly_share", name: { zh: "亲切分享", en: "Friendly" }, default: true },
    { id: "practical_info", name: { zh: "实用资讯", en: "Info" } }
  ]
};

const PLATFORM_CONFIG = {
  xiaohongshu: { name: { zh: '小红书', en: 'RedNote' }, color: 'bg-[#FF2442]', icon: '✨' },
  instagram: { name: { zh: 'Instagram', en: 'Instagram' }, color: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]', icon: '📸' },
  facebook: { name: { zh: 'Facebook', en: 'Facebook' }, color: 'bg-[#1877F2]', icon: '👥' }
};

const TRANSLATIONS = {
  zh: {
    brand: 'CreatorPlus',
    studio: '创作室',
    results: '生成结果',
    archive: '历史',
    inspiration: '灵感库',
    uploadInspiration: '上传灵感图',
    inspirationDesc: '上传您喜欢的视觉风格参考图，AI将在生成时学习这些图片的色调、构图与氛围。',
    editorStudio: '产品编辑室',
    productPhotos: '产品照片 (1-3张)',
    modelPhoto: '模特参考 (可选)',
    uploadPrompt: '加图',
    uploadModelPrompt: '模特',
    autoModelHint: 'AI 将自动渲染模特效果',
    productDesc: '产品描述',
    productPlaceholder: '例如：毕加索串珠织片...',
    publishPlatform: '平台',
    voiceStyle: '创作语气',
    stylePref: '风格偏好',
    stylePlaceholder: '例如：极简工业风...',
    potentialHashtags: '可选标签',
    suggestTags: 'AI 联想',
    isCustom: '支持定制',
    generateBtn: '开启创作',
    generating: 'AI 渲染中...',
    outputTitle: '为您生成的灵感',
    outputSub: '生成结果将出现在这里',
    enhancedImg: 'AI 优化图',
    copyBtn: '复制',
    copyAll: '全部复制',
    suggestedTitle: '爆款标题',
    bodyText: '优化正文',
    notSatisfied: '不满意？告诉 AI 怎么改',
    submitFeedback: '重新生成',
    analyzingImage: '识别中...'
  },
  en: {
    brand: 'CreatorPlus',
    studio: 'Studio',
    results: 'Results',
    archive: 'Archive',
    inspiration: 'Inspiration',
    uploadInspiration: 'Upload Inspiration',
    inspirationDesc: 'Upload visual style references. AI will learn from their color palette, composition, and mood.',
    editorStudio: 'Editing',
    productPhotos: 'Products (1-3)',
    modelPhoto: 'Model (Optional)',
    uploadPrompt: 'Add',
    uploadModelPrompt: 'Model',
    autoModelHint: 'AI will auto-render model visuals',
    productDesc: 'Description',
    productPlaceholder: 'e.g. Handmade ceramic vase...',
    publishPlatform: 'Platform',
    voiceStyle: 'Tone',
    stylePref: 'Style Preference',
    stylePlaceholder: 'e.g. Minimalist, Warm...',
    potentialHashtags: 'HashTags',
    suggestTags: 'AI Suggest',
    isCustom: 'Customizable',
    generateBtn: 'Generate All',
    generating: 'AI Rendering...',
    outputTitle: 'Your Inspiration',
    outputSub: 'Results will appear here',
    enhancedImg: 'AI Enhanced',
    copyBtn: 'Copy',
    copyAll: 'Copy All',
    suggestedTitle: 'Viral Title',
    bodyText: 'Optimized Copy',
    notSatisfied: 'Not satisfied? Tell AI',
    submitFeedback: 'Regenerate',
    analyzingImage: 'Analyzing...'
  }
};

const App = () => {
  const [state, setState] = useState<AppState>({
    originalImages: [],
    modelImage: null,
    inspirationImages: [],
    enhancedImages: [],
    content: { xiaohongshu: null, instagram: null, facebook: null },
    isGenerating: false,
    activePlatform: 'xiaohongshu',
    stylePreference: '',
    selectedVoiceStyles: {
      xiaohongshu: 'storytelling',
      instagram: 'minimalist',
      facebook: 'friendly_share'
    },
    isCustomizable: false,
    lang: 'zh',
    potentialHashtags: [],
    isGeneratingHashtags: false,
    isAnalyzingImage: false,
    activeTab: 'studio',
    history: [],
    isFeedbackMode: false
  });
  const [productDesc, setProductDesc] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const inspirationInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[state.lang];

  const resizeImage = (file: File, maxWidth: number = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    const triggerAutoDescription = async () => {
      if (state.originalImages.length > 0 && !productDesc && !state.isAnalyzingImage) {
        setState(prev => ({ ...prev, isAnalyzingImage: true }));
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        try {
          const visionPrompt = state.lang === 'zh' 
            ? "识别图中展示的一组产品。请基于这些图片，用简短的关键词组合作为描述。不要写长句，只返回2-4个核心词。"
            : "Identify the product in these images. Provide a brief combination of keywords. Return ONLY 2-4 keywords.";
          
          // Use Part interface explicitly to avoid type mismatches
          const parts: Part[] = state.originalImages.map(img => ({
            inlineData: { data: img.split(',')[1] || '', mimeType: 'image/jpeg' }
          }));
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [...parts, { text: visionPrompt }] }
          });
          if (response.text) setProductDesc(response.text.trim());
        } catch (err) {
          console.error("Auto-description error:", err);
        } finally {
          setState(prev => ({ ...prev, isAnalyzingImage: false }));
        }
      }
    };
    triggerAutoDescription();
  }, [state.originalImages.length, state.isAnalyzingImage, state.lang, productDesc]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const remainingSlots = 3 - state.originalImages.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      const resizedImages = await Promise.all(filesToProcess.map(f => resizeImage(f)));
      
      setState(prev => ({ 
        ...prev, 
        originalImages: [...prev.originalImages, ...resizedImages].slice(0, 3)
      }));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const resizedImage = await resizeImage(file);
      setState(prev => ({ ...prev, modelImage: resizedImage }));
    }
    if (modelInputRef.current) modelInputRef.current.value = '';
  };

  const handleInspirationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const filesToProcess = Array.from(files);
      const resizedImages = await Promise.all(filesToProcess.map(f => resizeImage(f)));
      
      setState(prev => ({ 
        ...prev, 
        inspirationImages: [...prev.inspirationImages, ...resizedImages]
      }));
    }
    if (inspirationInputRef.current) inspirationInputRef.current.value = '';
  };

  const suggestHashtags = async () => {
    if (!productDesc) return;
    setState(prev => ({ ...prev, isGeneratingHashtags: true }));
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const prompt = `Based on: "${productDesc}", extract 3-5 highly relevant hashtags in ${state.lang === 'zh' ? 'Chinese' : 'English'}. Return ONLY a JSON array of strings.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const tags = JSON.parse(response.text || '[]');
      setState(prev => ({ ...prev, potentialHashtags: Array.isArray(tags) ? tags : [], isGeneratingHashtags: false }));
    } catch (err) {
      setState(prev => ({ ...prev, isGeneratingHashtags: false }));
    }
  };

  const generateAI = async (withFeedback: boolean = false) => {
    if (state.originalImages.length === 0 || !productDesc) return;
    setState(prev => ({ ...prev, isGenerating: true }));

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const styleContext = state.stylePreference ? `Style: ${state.stylePreference}.` : "High-end social media visuals.";
      const keywordContext = state.potentialHashtags.length > 0 ? `Tags: ${state.potentialHashtags.join(', ')}.` : "";
      const customContext = state.isCustomizable ? "STRESS that the product is CUSTOMIZABLE and bespoke." : "";
      const feedbackContext = withFeedback ? `User requested changes: "${feedbackText}".` : "";
      const noTextInstruction = "IMPORTANT: THE GENERATED IMAGE MUST NOT CONTAIN ANY TEXT, LOGOS, OR WATERMARKS. JUST A CLEAN PHOTO.";
      
      const primaryProductBase64 = state.originalImages[0].split(',')[1] || '';
      const modelBase64Raw = state.modelImage ? state.modelImage.split(',')[1] : null;
      
      // Limit inspiration images to 3 to avoid payload size issues with gemini-2.5-flash-image
      const inspirationParts: Part[] = state.inspirationImages.slice(0, 3).map(img => ({
        inlineData: { data: img.split(',')[1] || '', mimeType: 'image/jpeg' }
      }));
      const inspirationContext = inspirationParts.length > 0 ? "Use the provided inspiration image as a strong stylistic reference for color palette, composition, and mood." : "";

      const baseImagePrompt = `Clean professional lifestyle photo for ${PLATFORM_CONFIG[state.activePlatform].name.en}. ${styleContext} ${keywordContext} ${customContext} ${feedbackContext} ${inspirationContext} ${noTextInstruction}`;
      
      // Explicitly type using Part[] and ensure contents match SDK expectations
      let contentsForImageGen: { parts: Part[] }[] = [];
      if (modelBase64Raw) {
        contentsForImageGen = [
          {
            parts: [
              ...inspirationParts,
              { inlineData: { data: modelBase64Raw, mimeType: 'image/jpeg' } },
              { inlineData: { data: primaryProductBase64, mimeType: 'image/jpeg' } },
              { text: `VIRTUAL TRY-ON: Show this model wearing this product. ${baseImagePrompt}` }
            ]
          },
          {
            parts: [
              ...inspirationParts,
              { inlineData: { data: modelBase64Raw, mimeType: 'image/jpeg' } },
              { inlineData: { data: primaryProductBase64, mimeType: 'image/jpeg' } },
              { text: `A different elegant pose for the same model. ${baseImagePrompt}` }
            ]
          }
        ];
      } else {
        contentsForImageGen = [
          {
            parts: [
              ...inspirationParts,
              { inlineData: { data: primaryProductBase64, mimeType: 'image/jpeg' } },
              { text: `Modern model showcasing this product. ${baseImagePrompt}` }
            ]
          },
          {
            parts: [
              ...inspirationParts,
              { inlineData: { data: primaryProductBase64, mimeType: 'image/jpeg' } },
              { text: `A high-end product lifestyle shot. ${baseImagePrompt}` }
            ]
          }
        ];
      }

      const imagePromises: Promise<GenerateContentResponse>[] = contentsForImageGen.map(c => ai.models.generateContent({ 
        model: 'gemini-2.5-flash-image', 
        contents: c 
      }));

      const textPrompt = `
        Language: ${state.lang === 'zh' ? 'Chinese' : 'English'}
        Product: ${productDesc}
        Platform: ${PLATFORM_CONFIG[state.activePlatform].name.en}
        Tone: ${VOICE_STYLES[state.activePlatform].find(v => v.id === state.selectedVoiceStyles[state.activePlatform])?.name.en}
        ${customContext}
        ${feedbackContext}
        Return JSON ONLY: { "xiaohongshu": { "title": "...", "body": "...", "hashtags": [] }, "instagram": { ... }, "facebook": { ... } }
      `;

      // Use Part interface explicitly to avoid type mismatch on inlineData
      const textParts: Part[] = state.originalImages.map(img => ({ inlineData: { data: img.split(',')[1] || '', mimeType: 'image/jpeg' } }));
      const textPromise: Promise<GenerateContentResponse> = ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...textParts, { text: textPrompt }] },
        config: { responseMimeType: 'application/json' }
      });

      const results: GenerateContentResponse[] = await Promise.all([...imagePromises, textPromise]);
      
      const newImages: string[] = [];
      results.slice(0, 2).forEach((res) => {
        const parts = res.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (part.inlineData) {
              const base64Data = part.inlineData.data;
              newImages.push(`data:image/png;base64,${base64Data}`);
              break;
            }
          }
        }
      });

      // text is a property, not a method
      const textResponseStr = results[2]?.text || '{}';
      const content = JSON.parse(textResponseStr);
      const activeData = content[state.activePlatform] || { title: "", body: "", hashtags: [] };

      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        images: state.originalImages,
        modelImage: state.modelImage,
        inspirationImages: state.inspirationImages,
        desc: productDesc,
        platform: state.activePlatform,
        content: activeData,
        timestamp: Date.now()
      };

      setState(prev => ({ 
        ...prev, 
        enhancedImages: newImages, 
        content: { ...prev.content, ...content }, 
        isGenerating: false, 
        activeTab: 'results',
        history: [newHistoryItem, ...prev.history],
        isFeedbackMode: false 
      }));
      setFeedbackText('');
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const activeContent = state.content[state.activePlatform];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col w-full relative antialiased selection:bg-blue-100 selection:text-blue-900 md:flex-row">
      
      {/* APP HEADER - Full Responsive Sticky */}
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-slate-100 flex-shrink-0 transition-all md:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-blue-500/20 shadow-lg">
            <ShoppingBag size={18} className="text-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900">{t.brand}</span>
        </div>
        <button 
          onClick={() => setState(prev => ({ ...prev, lang: prev.lang === 'zh' ? 'en' : 'zh' }))} 
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase text-slate-600 flex items-center gap-2 active:bg-slate-50 transition-all shadow-sm"
        >
          <Globe size={14} className="text-blue-500" />
          {state.lang === 'zh' ? 'EN' : 'CN'}
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex-shrink-0">
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-blue-500/20 shadow-lg">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">{t.brand}</span>
          </div>
          <button 
            onClick={() => setState(prev => ({ ...prev, lang: prev.lang === 'zh' ? 'en' : 'zh' }))} 
            className="p-2 bg-slate-50 border border-slate-200 rounded-full text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
            title={state.lang === 'zh' ? 'Switch to English' : '切换至中文'}
          >
            <Globe size={16} className="text-blue-500" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setState(p => ({ ...p, activeTab: 'studio' }))} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${state.activeTab === 'studio' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
            <PlusSquare size={20} strokeWidth={state.activeTab === 'studio' ? 2.5 : 2} />
            <span className="text-sm">{t.studio}</span>
          </button>
          <button onClick={() => setState(p => ({ ...p, activeTab: 'inspiration' }))} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${state.activeTab === 'inspiration' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
            <Lightbulb size={20} strokeWidth={state.activeTab === 'inspiration' ? 2.5 : 2} />
            <span className="text-sm">{t.inspiration}</span>
          </button>
          <button onClick={() => setState(p => ({ ...p, activeTab: 'results' }))} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${state.activeTab === 'results' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
            <Sparkles size={20} strokeWidth={state.activeTab === 'results' ? 2.5 : 2} />
            <span className="text-sm">{t.results}</span>
          </button>
          <button onClick={() => setState(p => ({ ...p, activeTab: 'archive' }))} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${state.activeTab === 'archive' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
            <Library size={20} strokeWidth={state.activeTab === 'archive' ? 2.5 : 2} />
            <span className="text-sm">{t.archive}</span>
          </button>
        </nav>
      </aside>

      {/* APP SCROLL CONTENT */}
      <main className="flex-1 overflow-y-auto scroll-smooth w-full md:max-w-4xl mx-auto px-4 md:px-8">
        <div className="py-6 md:py-10">
          {state.activeTab === 'studio' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-7 md:space-y-10 border border-slate-100/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Smartphone size={16} className="text-blue-500 md:w-5 md:h-5" />{t.editorStudio}
                  </h2>
                  <div className="h-1.5 w-12 bg-slate-100 rounded-full" />
                </div>
                
                <div className="space-y-5 md:space-y-8 md:grid md:grid-cols-2 md:gap-8 md:items-start">
                  <div className="space-y-3 md:space-y-4 md:col-span-2">
                    <label className="text-[11px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      {t.productPhotos}
                      <span className="text-[9px] md:text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">1-3</span>
                    </label>
                    <div className="flex flex-wrap gap-3 md:gap-4">
                      {state.originalImages.map((img, i) => (
                        <div key={i} className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border border-slate-100 shadow-sm transition-all hover:scale-[1.02]">
                          <img src={img} className="w-full h-full object-cover" />
                          <button onClick={() => setState(p => ({ ...p, originalImages: p.originalImages.filter((_, idx) => idx !== i) }))} className="absolute top-1 right-1 md:top-2 md:right-2 p-1 md:p-1.5 bg-black/50 backdrop-blur-md text-white rounded-full transition-transform hover:bg-red-500 active:scale-75 shadow-lg"><X size={12} className="md:w-4 md:h-4" /></button>
                        </div>
                      ))}
                      {state.originalImages.length < 3 && (
                        <button onClick={() => fileInputRef.current?.click()} className="w-24 h-24 md:w-32 md:h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-white hover:border-blue-300 hover:text-blue-500 active:scale-95 transition-all">
                          <Plus size={28} strokeWidth={1.5} className="md:w-8 md:h-8" /><span className="text-[9px] md:text-[11px] font-black mt-1 uppercase">{t.uploadPrompt}</span>
                        </button>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept="image/*" />
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-50 md:pt-0 md:border-t-0 md:col-span-2">
                    <label className="text-[11px] md:text-xs font-bold text-slate-500 uppercase">{t.modelPhoto}</label>
                    <div className="flex items-center gap-4 md:gap-6">
                      {state.modelImage ? (
                        <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-sm transition-all hover:scale-[1.02]">
                          <img src={state.modelImage} className="w-full h-full object-cover" />
                          <button onClick={() => setState(p => ({ ...p, modelImage: null }))} className="absolute top-1 right-1 md:top-2 md:right-2 p-1 md:p-1.5 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-red-500 active:scale-75"><X size={12} className="md:w-4 md:h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => modelInputRef.current?.click()} className="flex-1 md:flex-none md:w-48 h-14 md:h-16 border border-slate-200 bg-slate-50 rounded-2xl flex items-center justify-center gap-2 text-slate-600 text-[11px] md:text-xs font-black uppercase hover:bg-white hover:border-emerald-300 hover:text-emerald-600 active:scale-[0.98] transition-all">
                          <Shirt size={18} className="text-emerald-500 md:w-5 md:h-5" />{t.uploadModelPrompt}
                        </button>
                      )}
                      <input type="file" ref={modelInputRef} onChange={handleModelUpload} className="hidden" accept="image/*" />
                      {!state.modelImage && <p className="flex-1 text-[10px] md:text-xs italic text-slate-400 leading-tight uppercase font-medium">{t.autoModelHint}</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] md:text-xs font-bold text-slate-500 uppercase">{t.productDesc}</label>
                      {state.isAnalyzingImage && <span className="text-[10px] md:text-[11px] text-blue-600 font-black animate-pulse uppercase tracking-widest">{t.analyzingImage}</span>}
                    </div>
                    <textarea 
                      value={productDesc} 
                      onChange={(e) => setProductDesc(e.target.value)} 
                      rows={3} 
                      placeholder={t.productPlaceholder} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-[1.75rem] p-5 md:p-6 text-[15px] md:text-base font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-100/50 focus:bg-white transition-all shadow-inner resize-none" 
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] md:text-xs font-bold text-slate-500 uppercase">{t.potentialHashtags}</label>
                      <button 
                        onClick={suggestHashtags} 
                        disabled={!productDesc || state.isGeneratingHashtags} 
                        className="text-[10px] md:text-[11px] font-black text-blue-600 uppercase flex items-center gap-2 hover:text-blue-700 active:scale-95 transition-transform disabled:opacity-30"
                      >
                        {state.isGeneratingHashtags ? <Loader2 size={12} className="animate-spin md:w-3.5 md:h-3.5" /> : <RotateCcw size={12} className="md:w-3.5 md:h-3.5" />}{t.suggestTags}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 md:p-5 bg-slate-50 rounded-[1.75rem] min-h-[56px] shadow-inner items-center">
                      {state.potentialHashtags.length > 0 ? state.potentialHashtags.map((tag, i) => (
                        <span key={i} className="px-3.5 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 text-[10px] md:text-[11px] font-black text-slate-600 rounded-xl shadow-sm transition-all hover:border-blue-200 hover:text-blue-500 cursor-default">#{tag}</span>
                      )) : <span className="text-[10px] md:text-[11px] text-slate-300 italic p-1 uppercase tracking-tight">AI will find core tags...</span>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] md:text-xs font-bold text-slate-500 uppercase">{t.publishPlatform}</label>
                    <div className="grid grid-cols-3 gap-2 md:gap-4 bg-slate-100/50 p-2 md:p-3 rounded-2xl shadow-inner">
                      {(['xiaohongshu', 'instagram', 'facebook'] as Platform[]).map(p => (
                        <button 
                          key={p} 
                          onClick={() => setState(prev => ({ ...prev, activePlatform: p }))} 
                          className={`py-2.5 md:py-3 rounded-xl text-[11px] md:text-xs font-black transition-all flex items-center justify-center gap-2 ${state.activePlatform === p ? 'bg-white shadow-md text-blue-600 scale-[1.02]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 active:bg-slate-200'}`}
                        >
                          {PLATFORM_CONFIG[p].name[state.lang]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 md:py-5 border-y border-slate-50">
                    <div className="flex items-center gap-3">
                      <Palette size={20} className="text-purple-400 md:w-6 md:h-6" />
                      <label className="text-[11px] md:text-xs font-bold text-slate-500 uppercase">{t.isCustom}</label>
                    </div>
                    <button onClick={() => setState(p => ({ ...p, isCustomizable: !p.isCustomizable }))} className="transition-transform hover:scale-105 active:scale-95">
                      {state.isCustomizable ? <ToggleRight className="text-blue-500" size={36} /> : <ToggleLeft className="text-slate-200" size={36} />}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] md:text-xs font-bold text-slate-500 uppercase">{t.voiceStyle}</label>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      {VOICE_STYLES[state.activePlatform].map(s => (
                        <button 
                          key={s.id} 
                          onClick={() => setState(p => ({ ...p, selectedVoiceStyles: { ...p.selectedVoiceStyles, [p.activePlatform]: s.id } }))} 
                          className={`px-4 py-2.5 md:px-5 md:py-3 rounded-xl text-[11px] md:text-xs font-black border transition-all ${state.selectedVoiceStyles[state.activePlatform] === s.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'}`}
                        >
                          {s.name[state.lang]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => generateAI()} 
                  disabled={state.isGenerating || state.originalImages.length === 0 || !productDesc} 
                  className={`w-full py-5 md:py-6 rounded-[1.75rem] font-black text-base md:text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 active:shadow-sm ${state.isGenerating ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700'}`}
                >
                  {state.isGenerating ? <><Loader2 className="animate-spin md:w-6 md:h-6" size={20} />{t.generating}</> : <><Sparkles size={20} className="md:w-6 md:h-6" />{t.generateBtn}</>}
                </button>
              </div>
            </div>
          )}

          {state.activeTab === 'inspiration' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-7 md:space-y-10 border border-slate-100/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Lightbulb size={16} className="text-blue-500 md:w-5 md:h-5" />{t.inspiration}
                  </h2>
                  <div className="h-1.5 w-12 bg-slate-100 rounded-full" />
                </div>
                
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {t.inspirationDesc}
                </p>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {state.inspirationImages.map((img, i) => (
                      <div key={i} className="relative w-32 h-40 md:w-40 md:h-52 rounded-2xl overflow-hidden border border-slate-100 shadow-sm transition-all hover:scale-[1.02]">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => setState(p => ({ ...p, inspirationImages: p.inspirationImages.filter((_, idx) => idx !== i) }))} className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md text-white rounded-full transition-transform hover:bg-red-500 active:scale-75 shadow-lg"><X size={14} /></button>
                      </div>
                    ))}
                    <button onClick={() => inspirationInputRef.current?.click()} className="w-32 h-40 md:w-40 md:h-52 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-white hover:border-blue-300 hover:text-blue-500 active:scale-95 transition-all">
                      <Plus size={32} strokeWidth={1.5} className="mb-2" />
                      <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{t.uploadInspiration}</span>
                    </button>
                  </div>
                  <input type="file" ref={inspirationInputRef} onChange={handleInspirationUpload} className="hidden" multiple accept="image/*" />
                </div>
              </div>
            </div>
          )}

          {state.activeTab === 'results' && (
            <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
              {!activeContent && !state.isGenerating ? (
                <div className="flex flex-col items-center justify-center py-32 md:py-48 text-slate-300 space-y-6">
                  <div className="bg-white p-10 md:p-12 rounded-full shadow-inner"><Layout size={48} className="md:w-16 md:h-16" strokeWidth={1} /></div>
                  <p className="text-[11px] md:text-xs font-black uppercase tracking-[0.2em]">{t.outputSub}</p>
                </div>
              ) : state.isGenerating ? (
                <div className="flex flex-col items-center justify-center py-40 md:py-56 space-y-8">
                  <div className="relative">
                    <div className="w-24 h-24 md:w-32 md:h-32 border-b-4 border-blue-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center"><RefreshCw className="text-blue-500 animate-pulse md:w-10 md:h-10" size={28} /></div>
                  </div>
                  <div className="text-center">
                    <h3 className="font-black text-slate-900 text-xl md:text-2xl tracking-tight">{t.generating}</h3>
                    <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase mt-2 tracking-[0.3em]">AI Synthesis Pipeline</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4 md:space-y-6">
                    <h3 className="text-[11px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><ImageIcon size={16} className="md:w-5 md:h-5" />{t.enhancedImg}</h3>
                    <div className="flex overflow-x-auto gap-5 md:gap-8 pb-6 snap-x hide-scrollbar px-1">
                      {state.enhancedImages.map((img, i) => (
                        <div key={i} className="min-w-[280px] md:min-w-[340px] h-[400px] md:h-[480px] rounded-[3rem] overflow-hidden shadow-2xl snap-center relative group">
                          <img src={img} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <button 
                            onClick={() => { const l = document.createElement('a'); l.href = img; l.download = `CreatorPlus-${i}.png`; l.click(); }} 
                            className="absolute bottom-6 right-6 p-4 bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all text-blue-600"
                          >
                            <Download size={24} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-sm border border-slate-100 space-y-8 md:space-y-10 relative overflow-hidden transition-all">
                    <div className={`absolute top-0 left-0 w-full h-2 md:h-3 ${PLATFORM_CONFIG[state.activePlatform].color}`} />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 md:w-16 md:h-16 ${PLATFORM_CONFIG[state.activePlatform].color} rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-black/5`}>
                          <Zap size={24} className="text-white md:w-7 md:h-7" />
                        </div>
                        <div>
                          <h4 className="font-black text-base md:text-lg text-slate-900">{PLATFORM_CONFIG[state.activePlatform].name[state.lang]}</h4>
                          <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Optimized Assets</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const tStr = `【${activeContent?.title || ''}】\n\n${activeContent?.body || ''}\n\n${(activeContent?.hashtags || []).join(' ')}`;
                          copyToClipboard(tStr, 'all');
                        }} 
                        className="px-5 py-2.5 md:px-6 md:py-3 bg-blue-600 text-white rounded-2xl text-[11px] md:text-xs font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 shadow-2xl shadow-blue-500/20 transition-all"
                      >
                        {copied === 'all' ? <Check size={16} className="md:w-5 md:h-5" /> : <><Copy size={16} className="inline mr-2 md:w-4 md:h-4" />{t.copyAll}</>}
                      </button>
                    </div>

                    <div className="space-y-7 md:space-y-9">
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center"><label className="text-[11px] md:text-xs font-black text-slate-300 uppercase tracking-widest">{t.suggestedTitle}</label><button onClick={() => copyToClipboard(activeContent?.title || '', 't')} className="text-slate-300 hover:text-blue-600 transition-colors"><Copy size={16} className="md:w-5 md:h-5"/></button></div>
                        <div className="p-6 md:p-8 bg-slate-50 rounded-[2rem] text-[17px] md:text-xl font-black text-slate-900 shadow-inner leading-relaxed">{activeContent?.title}</div>
                      </div>
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center"><label className="text-[11px] md:text-xs font-black text-slate-300 uppercase tracking-widest">{t.bodyText}</label><button onClick={() => copyToClipboard(activeContent?.body || '', 'b')} className="text-slate-300 hover:text-blue-600 transition-colors"><Copy size={16} className="md:w-5 md:h-5"/></button></div>
                        <div className="p-6 md:p-8 bg-slate-50 rounded-[2rem] text-[14px] md:text-base font-bold leading-loose text-slate-700 whitespace-pre-wrap shadow-inner">{activeContent?.body}</div>
                      </div>
                      <div className="flex flex-wrap gap-2.5 md:gap-3 pt-2">
                        {(activeContent?.hashtags || []).map((tag, i) => <span key={i} className="px-4 py-2 md:px-5 md:py-2.5 bg-blue-50 border border-blue-100 rounded-2xl text-[11px] md:text-xs font-black text-blue-600 uppercase transition-all hover:bg-blue-600 hover:text-white cursor-default">#{tag}</span>)}
                      </div>
                    </div>

                    <div className="pt-10 md:pt-12 border-t border-slate-50">
                      {!state.isFeedbackMode ? (
                        <button onClick={() => setState(p => ({ ...p, isFeedbackMode: true }))} className="flex items-center gap-3 text-[11px] md:text-xs font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors transition-transform active:scale-[0.98]">
                          <MessageSquarePlus size={18} className="md:w-5 md:h-5" />{t.notSatisfied}
                        </button>
                      ) : (
                        <div className="space-y-5 md:space-y-6 animate-in fade-in slide-in-from-top-4">
                          <textarea 
                            value={feedbackText} 
                            onChange={(e) => setFeedbackText(e.target.value)} 
                            placeholder="Tell AI how to adjust (e.g., 'more professional', 'shorter', 'add emojis')" 
                            className="w-full bg-slate-50 rounded-[2rem] p-6 md:p-8 text-sm md:text-base font-bold text-slate-800 shadow-inner focus:outline-none focus:ring-4 focus:ring-blue-100/50 resize-none" 
                            rows={3}
                          />
                          <div className="flex gap-4">
                            <button onClick={() => generateAI(true)} className="flex-1 py-4.5 md:py-5 bg-blue-600 text-white rounded-[1.5rem] text-[12px] md:text-sm font-black uppercase shadow-2xl hover:bg-blue-700 active:scale-95 transition-all">{t.submitFeedback}</button>
                            <button onClick={() => setState(p => ({ ...p, isFeedbackMode: false }))} className="px-8 md:px-10 py-4.5 md:py-5 bg-slate-100 text-slate-500 rounded-[1.5rem] text-[12px] md:text-sm font-black uppercase hover:bg-slate-200 transition-all active:scale-95">{state.lang === 'zh' ? '取消' : 'Back'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {state.activeTab === 'archive' && (
            <div className="space-y-5 md:space-y-6 animate-in slide-in-from-left-4 duration-500">
               <h2 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 mb-6 md:mb-8"><Library size={16} className="text-blue-500 md:w-5 md:h-5" />{t.archive}</h2>
               {state.history.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-40 md:py-56 text-slate-300 opacity-40"><Clock size={56} className="md:w-20 md:h-20" strokeWidth={1} /><p className="text-[11px] md:text-xs font-black uppercase tracking-[0.3em] mt-8 text-center">Your creative journey<br/>begins here</p></div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                   {state.history.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => setState(p => ({ ...p, originalImages: item.images, activeTab: 'results', content: { ...p.content, [item.platform]: item.content }, activePlatform: item.platform }))} 
                        className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex gap-5 hover:border-blue-200 hover:shadow-md active:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer group"
                      >
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] overflow-hidden shadow-md flex-shrink-0 group-hover:scale-105 transition-transform"><img src={item.images[0]} className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex justify-between items-center mb-2 md:mb-3">
                            <span className={`text-[8px] md:text-[9px] font-black px-2.5 py-1 rounded-lg text-white ${PLATFORM_CONFIG[item.platform].color} shadow-sm`}>{PLATFORM_CONFIG[item.platform].name[state.lang]}</span>
                            <span className="text-[10px] md:text-[11px] text-slate-300 font-bold">{new Date(item.timestamp).toLocaleDateString()}</span>
                          </div>
                          <h5 className="text-[15px] md:text-base font-black text-slate-800 truncate">{item.content.title}</h5>
                          <p className="text-[12px] md:text-sm text-slate-400 font-bold truncate italic mt-0.5 tracking-tight">{item.desc}</p>
                        </div>
                      </div>
                   ))}
                 </div>
               )}
            </div>
          )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION - Responsive Sticky */}
      <nav className="sticky bottom-0 z-[100] bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 flex items-center justify-around px-2 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] flex-shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] transition-all md:hidden">
        <button onClick={() => setState(p => ({ ...p, activeTab: 'studio' }))} className={`flex flex-col items-center gap-1.5 transition-all ${state.activeTab === 'studio' ? 'text-blue-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <div className={`p-1.5 rounded-2xl transition-all ${state.activeTab === 'studio' ? 'bg-blue-50 shadow-sm' : ''}`}><PlusSquare size={20} strokeWidth={state.activeTab === 'studio' ? 2.5 : 2} /></div>
          <span className="text-[8px] font-black uppercase tracking-widest scale-90">{t.studio}</span>
        </button>
        <button onClick={() => setState(p => ({ ...p, activeTab: 'inspiration' }))} className={`flex flex-col items-center gap-1.5 transition-all ${state.activeTab === 'inspiration' ? 'text-blue-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <div className={`p-1.5 rounded-2xl transition-all ${state.activeTab === 'inspiration' ? 'bg-blue-50 shadow-sm' : ''}`}><Lightbulb size={20} strokeWidth={state.activeTab === 'inspiration' ? 2.5 : 2} /></div>
          <span className="text-[8px] font-black uppercase tracking-widest scale-90">{t.inspiration}</span>
        </button>
        <button onClick={() => setState(p => ({ ...p, activeTab: 'results' }))} className={`flex flex-col items-center gap-1.5 transition-all ${state.activeTab === 'results' ? 'text-blue-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <div className={`p-1.5 rounded-2xl transition-all ${state.activeTab === 'results' ? 'bg-blue-50 shadow-sm' : ''}`}><Sparkles size={20} strokeWidth={state.activeTab === 'results' ? 2.5 : 2} /></div>
          <span className="text-[8px] font-black uppercase tracking-widest scale-90">{t.results}</span>
        </button>
        <button onClick={() => setState(p => ({ ...p, activeTab: 'archive' }))} className={`flex flex-col items-center gap-1.5 transition-all ${state.activeTab === 'archive' ? 'text-blue-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <div className={`p-1.5 rounded-2xl transition-all ${state.activeTab === 'archive' ? 'bg-blue-50 shadow-sm' : ''}`}><Library size={20} strokeWidth={state.activeTab === 'archive' ? 2.5 : 2} /></div>
          <span className="text-[8px] font-black uppercase tracking-widest scale-90">{t.archive}</span>
        </button>
      </nav>

      {/* GLOBAL LOADING OVERLAYS */}
      {state.isGenerating && (
        <div className="fixed inset-0 z-[200] bg-slate-900/10 backdrop-blur-md flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
           <div className="bg-white p-12 md:p-16 rounded-[3.5rem] shadow-2xl flex flex-col items-center space-y-8 border border-white/50 animate-in zoom-in-95 duration-300">
              <div className="relative">
                <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-blue-50 border-b-blue-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                   <Sparkles size={20} className="animate-pulse md:w-6 md:h-6" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-[13px] md:text-[15px] font-black text-blue-600 uppercase tracking-[0.4em] ml-[0.4em]">{t.generating}</p>
                <p className="text-[9px] md:text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Optimizing visual identity</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  if (!(container as any)._reactRoot) {
    (container as any)._reactRoot = createRoot(container);
  }
  (container as any)._reactRoot.render(<App />);
}
