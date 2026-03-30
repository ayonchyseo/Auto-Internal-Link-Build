import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  LogOut, 
  Link as LinkIcon, 
  Key, 
  Loader2, 
  FileText, 
  Globe, 
  Copy, 
  Check, 
  Sparkles, 
  Zap, 
  ShieldCheck,
  History,
  Download,
  Trash2,
  Plus,
  FileCode,
  Table,
  Layout,
  Network,
  Type,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Info,
  ChevronRight,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

// --- Types ---

interface PageData {
  id: string;
  url: string;
  title: string;
  keyword: string;
  secondaryKeywords?: string;
  content?: string;
}

interface Suggestion {
  source_url: string;
  source_title: string;
  links: {
    target_url: string;
    target_title: string;
    anchor_text: string;
    anchor_variations: string[];
    relevance_score: number;
    reason: string;
    placement: string;
    link_type: string;
  }[];
}

interface OrphanPage {
  url: string;
  title: string;
  severity: 'critical' | 'high' | 'medium';
  suggested_linkers: string[];
  reason: string;
}

interface AnchorAnalysis {
  page_url: string;
  page_title: string;
  primary_anchor: string;
  variations: string[];
  avoid: string[];
  notes: string;
}

interface LinkJuice {
  from: string;
  to: string;
  score: number;
}

interface AnalysisResult {
  summary: {
    total_pages: number;
    total_links_suggested: number;
    orphan_pages: number;
    avg_score: number;
  };
  suggestions: Suggestion[];
  orphan_pages: OrphanPage[];
  anchor_analysis: AnchorAnalysis[];
  link_juice_flow: LinkJuice[];
}

// --- Main Component ---

export default function Tool() {
  const navigate = useNavigate();
  
  // App State
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [activeInputTab, setActiveInputTab] = useState('url-list');
  const [activeResultTab, setActiveResultTab] = useState('suggestions');
  
  // Input Data
  const [pages, setPages] = useState<PageData[]>([]);
  const [urlListText, setUrlListText] = useState('');
  const [sitemapText, setSitemapText] = useState('');
  const [csvText, setCsvText] = useState('');
  
  // Settings
  const [maxLinks, setMaxLinks] = useState(5);
  const [minRelevance, setMinRelevance] = useState(40);
  const [strategy, setStrategy] = useState('Balanced');
  const [industry, setIndustry] = useState('');
  
  // Results
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Canvas Ref for Link Map
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<number | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsApiKeySaved(true);
    }
  }, []);

  // --- Handlers ---

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      toast.error('Please enter a Gemini API key');
      return;
    }
    localStorage.setItem('gemini_api_key', apiKey);
    setIsApiKeySaved(true);
    toast.success('API Key saved successfully');
  };

  const handleLogout = () => {
    localStorage.removeItem('licenseKey');
    navigate('/');
  };

  const loadSampleData = () => {
    const sample = [
      { id: '1', url: 'https://example.com/personal-injury-lawyer', title: 'Personal Injury Lawyer', keyword: 'personal injury attorney' },
      { id: '2', url: 'https://example.com/car-accident-lawyer', title: 'Car Accident Lawyer', keyword: 'car accident claim' },
      { id: '3', url: 'https://example.com/slip-and-fall', title: 'Slip and Fall Attorney', keyword: 'slip and fall injury' },
      { id: '4', url: 'https://example.com/medical-malpractice', title: 'Medical Malpractice Lawyer', keyword: 'medical negligence' },
      { id: '5', url: 'https://example.com/workers-compensation', title: 'Workers Compensation Attorney', keyword: 'work injury claim' },
      { id: '6', url: 'https://example.com/wrongful-death', title: 'Wrongful Death Lawyer', keyword: 'wrongful death lawsuit' },
      { id: '7', url: 'https://example.com/truck-accident', title: 'Truck Accident Attorney', keyword: 'semi truck crash' },
      { id: '8', url: 'https://example.com/motorcycle-accident', title: 'Motorcycle Accident Lawyer', keyword: 'bike injury attorney' },
      { id: '9', url: 'https://example.com/dog-bite', title: 'Dog Bite Lawyer', keyword: 'dog attack injury' },
      { id: '10', url: 'https://example.com/free-consultation', title: 'Free Case Evaluation', keyword: 'free consultation attorney' },
    ];
    setPages(sample);
    setUrlListText(sample.map(p => `${p.url} | ${p.title} | ${p.keyword}`).join('\n'));
    toast.success('Sample law firm data loaded');
  };

  const parseUrlList = () => {
    const lines = urlListText.split('\n').filter(l => l.trim());
    const newPages = lines.map((line) => {
      const parts = line.split('|').map(s => s.trim());
      return {
        id: Math.random().toString(36).substr(2, 9),
        url: parts[0] || '',
        title: parts[1] || '',
        keyword: parts[2] || ''
      };
    });
    setPages(newPages);
    toast.success(`${newPages.length} pages parsed from list`);
  };

  const parseSitemap = async () => {
    let xml = sitemapText;

    // Detect if it's a URL
    if (sitemapText.trim().startsWith('http')) {
      setIsLoading(true);
      setLoadingMessage('Fetching sitemap from URL...');
      try {
        const response = await fetch('/api/fetch-sitemap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sitemapText.trim() })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to fetch sitemap');
        }
        xml = await response.text();
      } catch (error: any) {
        toast.error(`Fetch Error: ${error.message}`);
        setIsLoading(false);
        return;
      } finally {
        setIsLoading(false);
      }
    }

    const locs = xml.match(/<loc>(.*?)<\/loc>/g);
    if (!locs) {
      toast.error('No <loc> tags found in XML. If you pasted a URL, make sure it is a valid sitemap.');
      return;
    }
    const newPages = locs.map(loc => {
      const url = loc.replace('<loc>', '').replace('</loc>', '');
      return {
        id: Math.random().toString(36).substr(2, 9),
        url,
        title: url.split('/').pop()?.replace(/-/g, ' ') || 'Untitled',
        keyword: url.split('/').pop()?.replace(/-/g, ' ') || ''
      };
    });
    setPages(newPages);
    toast.success(`${newPages.length} pages parsed from sitemap`);
  };

  const addManualPage = () => {
    setPages([...pages, { id: Math.random().toString(36).substr(2, 9), url: '', title: '', keyword: '' }]);
  };

  const updateManualPage = (id: string, field: keyof PageData, value: string) => {
    setPages(pages.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
  };

  const handleAnalyze = async () => {
    if (!apiKey) {
      toast.error('Please enter your Gemini API key');
      return;
    }
    if (pages.length < 2) {
      toast.error('Please add at least 2 pages to analyze');
      return;
    }

    setIsLoading(true);
    const messages = [
      "Analyzing semantic relevance...",
      "Building topic clusters...",
      "Detecting orphan pages...",
      "Generating anchor variations...",
      "Calculating link equity flow..."
    ];
    let msgIndex = 0;
    const interval = setInterval(() => {
      setLoadingMessage(messages[msgIndex]);
      msgIndex = (msgIndex + 1) % messages.length;
    }, 2000);
    setLoadingMessage(messages[0]);

    try {
      const prompt = `
        Analyze these website pages for internal linking optimization.
        Industry/Niche: ${industry || 'General'}
        Strategy: ${strategy}
        Max links per page: ${maxLinks}
        Min relevance score: ${minRelevance}%

        PAGES DATA:
        ${JSON.stringify(pages.map(p => ({ url: p.url, title: p.title, keyword: p.keyword, secondary: p.secondaryKeywords, content: p.content })))}

        Return ONLY valid JSON (no markdown, no backticks) with this structure:
        {
          "summary": { "total_pages": number, "total_links_suggested": number, "orphan_pages": number, "avg_score": number },
          "suggestions": [
            {
              "source_url": "url",
              "source_title": "title",
              "links": [
                { "target_url": "url", "target_title": "title", "anchor_text": "text", "anchor_variations": ["v1","v2"], "relevance_score": 85, "reason": "why", "placement": "intro|body|conclusion|CTA", "link_type": "contextual|navigation|CTA|pillar" }
              ]
            }
          ],
          "orphan_pages": [
            { "url": "url", "title": "title", "severity": "critical|high|medium", "suggested_linkers": ["url1"], "reason": "why" }
          ],
          "anchor_analysis": [
            { "page_url": "url", "page_title": "title", "primary_anchor": "text", "variations": ["v1","v2"], "avoid": ["bad"], "notes": "notes" }
          ],
          "link_juice_flow": [
            { "from": "url", "to": "url", "score": 85 }
          ]
        }
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error?.message?.includes('not found')) {
          throw new Error('The requested model was not found. Please ensure your API key has access to gemini-3-flash-preview or try a different model.');
        }
        throw new Error(data.error?.message || 'API call failed');
      }

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error('The response was blocked by safety filters. Please try a different prompt or content.');
        }
        throw new Error('No content generated. Please try again.');
      }

      let text = data.candidates[0].content.parts[0].text;
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedResult = JSON.parse(text);
      setResult(parsedResult);
      setActiveResultTab('suggestions');
      toast.success('Analysis complete!');
    } catch (error: any) {
      console.error(error);
      toast.error(`Error: ${error.message}`);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = (type: 'links' | 'orphans') => {
    if (!result) return;
    let csv = '';
    let filename = '';

    if (type === 'links') {
      csv = '"Source URL","Source Title","Target URL","Target Title","Anchor Text","Anchor Variations","Relevance Score","Placement","Link Type","Reason"\n';
      result.suggestions.forEach(s => {
        s.links.forEach(l => {
          csv += `"${s.source_url}","${s.source_title}","${l.target_url}","${l.target_title}","${l.anchor_text}","${l.anchor_variations.join(', ')}","${l.relevance_score}","${l.placement}","${l.link_type}","${l.reason}"\n`;
        });
      });
      filename = 'internal_links_suggestions.csv';
    } else {
      csv = '"URL","Title","Severity","Reason","Suggested Linkers"\n';
      result.orphan_pages.forEach(o => {
        csv += `"${o.url}","${o.title}","${o.severity}","${o.reason}","${o.suggested_linkers.join(', ')}"\n`;
      });
      filename = 'orphan_pages_report.csv';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Link Map Logic ---

  useEffect(() => {
    if (activeResultTab === 'map' && result && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const nodes = result.suggestions.map((s) => ({
        id: s.source_url,
        label: s.source_title,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 0,
        links: s.links.length
      }));

      const links = result.link_juice_flow.map(l => ({
        source: l.from,
        target: l.to,
        score: l.score
      }));

      let ticks = 0;
      const runSimulation = () => {
        if (ticks > 200) return;
        
        // Forces
        nodes.forEach((n1, i) => {
          // Center gravity
          n1.vx += (canvas.width / 2 - n1.x) * 0.01;
          n1.vy += (canvas.height / 2 - n1.y) * 0.01;

          nodes.forEach((n2, j) => {
            if (i === j) return;
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 500 / (dist * dist);
            n1.vx -= (dx / dist) * force;
            n1.vy -= (dy / dist) * force;
          });
        });

        links.forEach(l => {
          const s = nodes.find(n => n.id === l.source);
          const t = nodes.find(n => n.id === l.target);
          if (s && t) {
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 150) * 0.05;
            s.vx += (dx / dist) * force;
            s.vy += (dy / dist) * force;
            t.vx -= (dx / dist) * force;
            t.vy -= (dy / dist) * force;
          }
        });

        // Update positions
        nodes.forEach(n => {
          n.x += n.vx;
          n.y += n.vy;
          n.vx *= 0.9;
          n.vy *= 0.9;
          
          // Boundary clamping
          n.x = Math.max(50, Math.min(canvas.width - 50, n.x));
          n.y = Math.max(50, Math.min(canvas.height - 50, n.y));
        });

        // Draw
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw links
        links.forEach(l => {
          const s = nodes.find(n => n.id === l.source);
          const t = nodes.find(n => n.id === l.target);
          if (s && t) {
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(t.x, t.y);
            ctx.strokeStyle = l.score >= 70 ? '#4ade80' : l.score >= 50 ? '#60a5fa' : '#fbbf24';
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            
            // Arrow
            const angle = Math.atan2(t.y - s.y, t.x - s.x);
            ctx.beginPath();
            ctx.moveTo(t.x - 15 * Math.cos(angle - Math.PI / 6), t.y - 15 * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(t.x, t.y);
            ctx.lineTo(t.x - 15 * Math.cos(angle + Math.PI / 6), t.y - 15 * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        });

        // Draw nodes
        nodes.forEach(n => {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 10 + n.links * 2, 0, Math.PI * 2);
          ctx.fillStyle = '#1e1e35';
          ctx.fill();
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.fillStyle = '#fff';
          ctx.font = '10px Inter';
          ctx.textAlign = 'center';
          const label = n.label.length > 16 ? n.label.substring(0, 13) + '...' : n.label;
          ctx.fillText(label, n.x, n.y + 25 + n.links * 2);
        });

        ticks++;
        simulationRef.current = requestAnimationFrame(runSimulation);
      };

      runSimulation();
      return () => {
        if (simulationRef.current) cancelAnimationFrame(simulationRef.current);
      };
    }
  }, [activeResultTab, result]);

  // --- Render Helpers ---

  const renderInputTab = () => {
    switch (activeInputTab) {
      case 'url-list':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paste URL List</label>
              <span className="text-[10px] text-slate-500 italic">Format: URL | Title | Focus Keyword</span>
            </div>
            <textarea 
              className="w-full h-64 bg-[#1a1a2e] border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              placeholder="https://example.com/page1 | Page Title | target keyword"
              value={urlListText}
              onChange={(e) => setUrlListText(e.target.value)}
            />
            <button onClick={parseUrlList} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 mr-2" /> Parse URL List
            </button>
          </div>
        );
      case 'sitemap':
        return (
          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paste Sitemap XML</label>
            <textarea 
              className="w-full h-64 bg-[#1a1a2e] border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              placeholder="<urlset>...</urlset>"
              value={sitemapText}
              onChange={(e) => setSitemapText(e.target.value)}
            />
            <button onClick={parseSitemap} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center">
              <FileCode className="w-4 h-4 mr-2" /> Parse Sitemap
            </button>
          </div>
        );
      case 'manual':
        return (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {pages.map((page) => (
              <div key={page.id} className="bg-[#1a1a2e] border border-slate-800 rounded-xl p-4 space-y-3 relative group">
                <button onClick={() => removePage(page.id)} className="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#0f0f1a] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-blue-500 outline-none"
                      value={page.url}
                      onChange={(e) => updateManualPage(page.id, 'url', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Title</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#0f0f1a] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-blue-500 outline-none"
                      value={page.title}
                      onChange={(e) => updateManualPage(page.id, 'title', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Focus Keyword</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#0f0f1a] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-blue-500 outline-none"
                      value={page.keyword}
                      onChange={(e) => updateManualPage(page.id, 'keyword', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Secondary Keywords</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#0f0f1a] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-blue-500 outline-none"
                      value={page.secondaryKeywords || ''}
                      onChange={(e) => updateManualPage(page.id, 'secondaryKeywords', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addManualPage} className="w-full py-3 border-dashed border-slate-700 border rounded-xl text-slate-500 hover:text-blue-400 hover:border-blue-500/50 flex items-center justify-center transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Page
            </button>
          </div>
        );
      default:
        return <div className="text-slate-500 text-center py-20 italic">CSV Upload feature coming soon...</div>;
    }
  };

  const renderResultTab = () => {
    if (!result) return null;

    switch (activeResultTab) {
      case 'suggestions':
        return (
          <div className="space-y-8">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pages Analyzed', value: result.summary.total_pages, icon: FileText, color: 'text-blue-400' },
                { label: 'Links Suggested', value: result.summary.total_links_suggested, icon: LinkIcon, color: 'text-green-400' },
                { label: 'Avg Score', value: `${result.summary.avg_score}%`, icon: Zap, color: 'text-amber-400' },
                { label: 'Orphan Pages', value: result.summary.orphan_pages, icon: AlertTriangle, color: 'text-red-400' },
              ].map((m, i) => (
                <div key={i} className="bg-[#1e1e35] p-5 rounded-2xl border border-slate-800 shadow-xl">
                  <div className="flex justify-between items-start mb-2">
                    <m.icon className={`w-5 h-5 ${m.color}`} />
                    <span className="text-2xl font-black text-white">{m.value}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Suggestions List */}
            <div className="space-y-6">
              {result.suggestions.map((s, idx) => (
                <div key={idx} className="bg-[#1e1e35] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="bg-[#252545] px-8 py-4 border-b border-slate-800 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-white">{s.source_title}</h3>
                      <p className="text-xs text-blue-400 font-mono">{s.source_url}</p>
                    </div>
                    <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">
                      {s.links.length} Suggestions
                    </span>
                  </div>
                  <div className="p-8 space-y-6">
                    {s.links.map((l, lIdx) => (
                      <div key={lIdx} className="bg-[#1a1a2e] rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target:</span>
                              <span className="text-sm font-bold text-white">{l.target_title}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono">{l.target_url}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-black ${l.relevance_score >= 70 ? 'text-green-400' : l.relevance_score >= 50 ? 'text-blue-400' : 'text-amber-400'}`}>
                                {l.relevance_score}%
                              </span>
                              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${l.relevance_score >= 70 ? 'bg-green-400' : l.relevance_score >= 50 ? 'bg-blue-400' : 'bg-amber-400'}`}
                                  style={{ width: `${l.relevance_score}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <span className="bg-slate-800 text-slate-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">{l.link_type}</span>
                              <span className="bg-slate-800 text-slate-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">{l.placement}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Primary Anchor</span>
                              <button 
                                className="flex items-center text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                                onClick={() => copyToClipboard(`<a href="${l.target_url}">${l.anchor_text}</a>`, `${idx}-${lIdx}`)}
                              >
                                {copiedId === `${idx}-${lIdx}` ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                Copy HTML
                              </button>
                            </div>
                            <div className="bg-[#0f0f1a] p-3 rounded-xl border border-slate-800 text-blue-400 font-bold text-sm">
                              {l.anchor_text}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {l.anchor_variations.map((v, vIdx) => (
                                <button 
                                  key={vIdx} 
                                  onClick={() => copyToClipboard(v, `${idx}-${lIdx}-${vIdx}`)}
                                  className="bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] px-2.5 py-1 rounded-full border border-slate-700 transition-colors"
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">AI Reasoning</span>
                            <p className="text-xs text-slate-400 leading-relaxed italic">"{l.reason}"</p>
                            <div className="bg-[#0f0f1a] p-3 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-500 overflow-x-auto">
                              {`<a href="${l.target_url}">${l.anchor_text}</a>`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'orphans':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Orphan Page Analysis</h3>
              <button onClick={() => exportCSV('orphans')} className="flex items-center px-4 py-2 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-bold">
                <Download className="w-4 h-4 mr-2" /> Export Orphans CSV
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {result.orphan_pages.map((o, i) => (
                <div key={i} className="bg-[#1e1e35] p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6 items-start">
                  <div className={`p-3 rounded-xl ${o.severity === 'critical' ? 'bg-red-500/10 text-red-400' : o.severity === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-bold">{o.title}</h4>
                        <p className="text-xs text-slate-500 font-mono">{o.url}</p>
                      </div>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${o.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : o.severity === 'high' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                        {o.severity}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{o.reason}</p>
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Suggested Linkers:</span>
                      <div className="flex flex-wrap gap-2">
                        {o.suggested_linkers.map((l, li) => (
                          <span key={li} className="bg-slate-800 text-slate-400 text-[10px] px-2.5 py-1 rounded-md border border-slate-700">{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'map':
        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Visual Link Map</h3>
              <div className="flex flex-wrap gap-4 items-center justify-center">
                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 text-green-400"><div className="w-2 h-2 rounded-full bg-green-400" /> High (70+)</span>
                  <span className="flex items-center gap-1.5 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-400" /> Medium (50+)</span>
                  <span className="flex items-center gap-1.5 text-amber-400"><div className="w-2 h-2 rounded-full bg-amber-400" /> Low (&lt;50)</span>
                </div>
                <button className="flex items-center px-3 py-1.5 border border-slate-700 rounded-lg text-slate-400 hover:text-white text-xs font-bold" onClick={() => setActiveResultTab('map')}>
                  <RefreshCw className="w-3 h-3 mr-2" /> Reset Layout
                </button>
              </div>
            </div>
            <div className="bg-[#0f0f1a] rounded-3xl border border-slate-800 overflow-hidden relative group">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={600} 
                className="w-full h-[600px] cursor-move"
              />
              <div className="absolute bottom-6 left-6 bg-[#1e1e35]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 text-[10px] text-slate-400 space-y-2">
                <p className="font-bold text-white uppercase mb-1">Map Legend</p>
                <p>• Circles = Pages</p>
                <p>• Circle Size = Outbound Links</p>
                <p>• Lines = AI Suggestions</p>
                <p>• Arrows = Direction of Flow</p>
              </div>
            </div>
          </div>
        );
      case 'anchors':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white tracking-tight uppercase mb-6">Anchor Text Strategy</h3>
            <div className="grid grid-cols-1 gap-6">
              {result.anchor_analysis.map((a, i) => (
                <div key={i} className="bg-[#1e1e35] p-8 rounded-3xl border border-slate-800 shadow-2xl">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-xl font-bold text-white">{a.page_title}</h4>
                      <p className="text-xs text-blue-400 font-mono">{a.page_url}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Primary Anchor</span>
                      <div className="bg-blue-500/10 text-blue-400 p-4 rounded-2xl border border-blue-500/20 font-bold text-center relative group">
                        {a.primary_anchor}
                        <button onClick={() => copyToClipboard(a.primary_anchor, `anchor-${i}`)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Variations</span>
                      <div className="flex flex-wrap gap-2">
                        {a.variations.map((v, vi) => (
                          <button key={vi} onClick={() => copyToClipboard(v, `var-${i}-${vi}`)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Avoid (Negative SEO)</span>
                      <div className="flex flex-wrap gap-2">
                        {a.avoid.map((v, vi) => (
                          <span key={vi} className="bg-red-500/5 text-red-400/50 text-[10px] px-3 py-1.5 rounded-lg border border-red-500/10 line-through">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Strategy Notes</span>
                    <p className="text-sm text-slate-400 italic leading-relaxed">"{a.notes}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'export':
        return (
          <div className="max-w-2xl mx-auto py-20 space-y-12">
            <div className="text-center space-y-4">
              <div className="bg-blue-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                <Download className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight uppercase">Export Center</h3>
              <p className="text-slate-500">Download your optimized internal linking architecture in various formats.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => exportCSV('links')} className="bg-[#1e1e35] hover:bg-[#252545] border border-slate-800 h-20 rounded-2xl flex justify-between items-center px-8 text-white group transition-all">
                <div className="flex items-center gap-4">
                  <Table className="w-6 h-6 text-green-400" />
                  <div className="text-left">
                    <p className="font-bold">Export Links CSV</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Full suggestion list with reasoning</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
              </button>

              <button onClick={() => exportCSV('orphans')} className="bg-[#1e1e35] hover:bg-[#252545] border border-slate-800 h-20 rounded-2xl flex justify-between items-center px-8 text-white group transition-all">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                  <div className="text-left">
                    <p className="font-bold">Export Orphans CSV</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Critical SEO vulnerability report</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
              </button>

              <button onClick={() => {
                const allHtml = result.suggestions.flatMap(s => s.links.map(l => `<a href="${l.target_url}">${l.anchor_text}</a>`)).join('\n');
                copyToClipboard(allHtml, 'all-html');
              }} className="bg-[#1e1e35] hover:bg-[#252545] border border-slate-800 h-20 rounded-2xl flex justify-between items-center px-8 text-white group transition-all">
                <div className="flex items-center gap-4">
                  <FileCode className="w-6 h-6 text-blue-400" />
                  <div className="text-left">
                    <p className="font-bold">Copy All HTML Links</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Bulk copy all {"<a>"} tags for easy pasting</p>
                  </div>
                </div>
                <Copy className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-300 font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-[300px] bg-[#1a1a2e] border-r border-slate-800 z-50 flex flex-col hidden lg:flex">
        <div className="p-8 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/40">
            <LinkIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-xl text-white tracking-tighter leading-none">AUTO LINKER</h1>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 mt-1">SEO Intelligence</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* API Key Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gemini API Key</label>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 font-bold hover:underline">Get Key</a>
            </div>
            <div className="relative">
              <input 
                type="password" 
                className="w-full bg-[#0f0f1a] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all pr-10"
                placeholder="••••••••••••••••"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button onClick={handleSaveKey} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-blue-500">
                <Check className={`w-4 h-4 ${isApiKeySaved ? 'text-green-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max Links / Page</label>
                <span className="text-xs font-bold text-blue-400">{maxLinks}</span>
              </div>
              <input 
                type="range" min="1" max="20" 
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                value={maxLinks}
                onChange={(e) => setMaxLinks(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Min Relevance Score</label>
                <span className="text-xs font-bold text-blue-400">{minRelevance}%</span>
              </div>
              <input 
                type="range" min="10" max="90" 
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                value={minRelevance}
                onChange={(e) => setMinRelevance(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Linking Strategy</label>
              <select 
                className="w-full bg-[#0f0f1a] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none appearance-none cursor-pointer"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <option>Balanced</option>
                <option>Hub & Spoke</option>
                <option>Topic Clusters</option>
                <option>Pillar + Supporting</option>
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Industry / Niche</label>
              <input 
                type="text" 
                className="w-full bg-[#0f0f1a] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                placeholder="e.g. Personal Injury Law"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-10 space-y-4">
            <button 
              onClick={handleAnalyze} 
              disabled={isLoading || pages.length < 2}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center transition-all"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 mr-2 group-hover:animate-pulse" /> Analyze Pages</>}
            </button>
            <button 
              onClick={loadSampleData} 
              className="w-full text-slate-500 hover:text-blue-400 text-[10px] font-black uppercase tracking-widest transition-colors py-2"
            >
              Load Sample Data
            </button>
          </div>
        </div>

        <div className="p-8 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-3 text-slate-500 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-[300px] p-6 lg:p-12 min-h-screen relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f1a]/80 backdrop-blur-sm z-40"
            >
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-blue-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase mb-2">{loadingMessage}</h2>
              <p className="text-slate-500 text-sm animate-pulse">Gemini AI is processing your architecture...</p>
            </motion.div>
          ) : !result ? (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-10"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-white tracking-tight leading-none">BUILD YOUR ARCHITECTURE</h2>
                <p className="text-slate-500 text-lg">Add your pages using one of the methods below to start the AI analysis.</p>
              </div>

              <div className="bg-[#1a1a2e] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                <div className="flex flex-wrap border-b border-slate-800 bg-[#252545]/30">
                  {[
                    { id: 'url-list', label: 'URL List', icon: LinkIcon },
                    { id: 'sitemap', label: 'Sitemap XML', icon: Globe },
                    { id: 'csv', label: 'CSV Upload', icon: Table },
                    { id: 'manual', label: 'Manual Entry', icon: Plus },
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveInputTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[120px] ${activeInputTab === tab.id ? 'bg-[#1a1a2e] text-blue-400 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                      <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                  ))}
                </div>
                <div className="p-6 lg:p-10">
                  {renderInputTab()}
                </div>
              </div>

              {pages.length > 0 && (
                <div className="flex items-center gap-4 bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl">
                  <div className="bg-blue-500/10 p-3 rounded-xl">
                    <Info className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{pages.length} Pages Ready</p>
                    <p className="text-xs text-slate-500">You can now click "Analyze Pages" in the sidebar to generate suggestions.</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="max-w-6xl mx-auto space-y-10 pb-20"
            >
              <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                    <Zap className="w-3 h-3 fill-blue-500" /> Analysis Complete
                  </div>
                  <h2 className="text-4xl font-black text-white tracking-tight leading-none">OPTIMIZATION RESULTS</h2>
                </div>
                <button onClick={() => setResult(null)} className="flex items-center text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
                  <RefreshCw className="w-4 h-4 mr-2" /> Start New Analysis
                </button>
              </div>

              <div className="flex flex-wrap gap-2 bg-[#1a1a2e] p-1.5 rounded-2xl border border-slate-800 sticky top-4 z-30 shadow-2xl backdrop-blur-md bg-opacity-90 overflow-x-auto custom-scrollbar">
                {[
                  { id: 'suggestions', label: 'Link Suggestions', icon: Layout },
                  { id: 'orphans', label: 'Orphan Pages', icon: AlertTriangle },
                  { id: 'map', label: 'Link Map', icon: Network },
                  { id: 'anchors', label: 'Anchor Text', icon: Type },
                  { id: 'export', label: 'Export', icon: Download },
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveResultTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeResultTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                  >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="pt-4">
                {renderResultTab()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
          cursor: pointer;
        }
      `}} />
    </div>
  );
}
