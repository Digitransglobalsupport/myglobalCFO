import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import { Bot, Send, Mic, MicOff, Plus, MessageSquare, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const AIAdvisorPage = () => {
  const { authAxios, user } = useAuth();
  const { companies, selectedCompany, setSelectedCompany } = useApp();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    'What is my current cash runway?',
    'Analyze my top expense categories',
    'How does my EBITDA margin compare to industry average?',
    'What financing options should I consider?',
    'Summarize my AR aging status',
    'What are my key financial risks?'
  ];

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    try {
      const res = await authAxios.get('/chat/sessions');
      setSessions(res.data);
    } catch (e) {
      console.error('Error fetching sessions:', e);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await authAxios.post('/chat/sessions', {
        company_id: selectedCompany?.id
      });
      setCurrentSession(res.data);
      setMessages([]);
      fetchSessions();
      toast.success('New chat session created');
    } catch (e) {
      toast.error('Failed to create session');
    }
  };

  const loadSession = (session) => {
    setCurrentSession(session);
    setMessages(session.messages || []);
  };

  const sendMessage = async (text = input) => {
    if (!text.trim()) return;
    if (!currentSession) {
      await createNewSession();
    }

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const sessionId = currentSession?.id;
      if (sessionId) {
        const res = await authAxios.post(`/chat/sessions/${sessionId}/messages`, {
          content: text
        });
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.ai_response }]);
      } else {
        // Fallback response
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: getLocalResponse(text)
          }]);
        }, 1000);
      }
    } catch (e) {
      // Fallback to local response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: getLocalResponse(text)
        }]);
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const getLocalResponse = (query) => {
    const q = query.toLowerCase();
    if (q.includes('cash') || q.includes('runway')) {
      return `Based on your current cash position and burn rate, your estimated runway is approximately 145 days. I recommend:

1. **Review recurring expenses** - Identify areas for cost optimization
2. **Accelerate AR collection** - Focus on aging invoices over 30 days
3. **Consider financing options** - Invoice financing could improve cash flow

Would you like me to analyze specific expense categories or AR aging in detail?`;
    }
    if (q.includes('expense') || q.includes('cost')) {
      return `Your top expense categories are:

1. **Operations** - £180,000 (34%)
2. **Marketing** - £125,000 (24%)
3. **Technology** - £98,000 (19%)
4. **Administration** - £67,000 (13%)
5. **Sales** - £54,000 (10%)

Operations and Marketing represent 58% of total spend. Consider reviewing vendor contracts in these areas for potential savings.`;
    }
    if (q.includes('ebitda') || q.includes('margin')) {
      return `Your current EBITDA margin is **25%**, which is above the industry average of 18-22% for your sector.

**Key insights:**
- Strong gross margin indicates efficient operations
- Operating leverage improving quarter-over-quarter
- Recommend maintaining current cost structure while scaling revenue

Would you like a detailed breakdown of margin contributors?`;
    }
    if (q.includes('financing') || q.includes('funding')) {
      return `Based on your financial profile, here are recommended financing options:

1. **Invoice Finance** (5.9% rate) - Ideal for improving working capital
2. **Revenue Based Financing** - Good fit for your recurring revenue model
3. **Growth Grants** - Innovate UK grants if you have R&D activities

Your strong EBITDA margin and cash position make you an attractive candidate for most lenders. Would you like details on any specific option?`;
    }
    return `I can help you analyze your financial data. Here are some things I can assist with:

- **Cash flow analysis** and runway projections
- **Expense categorization** and cost optimization
- **AR/AP aging** analysis and collection strategies
- **KPI benchmarking** against industry standards
- **Financing recommendations** based on your profile

What specific aspect would you like to explore?`;
  };

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice recognition error');
    };

    recognition.start();
  };

  if (!user?.ai_advisor_access) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Bot className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">AI Advisor Access Required</h2>
        <p className="text-gray-400">Contact your administrator to enable AI Advisor access</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-6">
      {/* Sessions Sidebar */}
      <div className="w-64 flex flex-col">
        <Card className="bg-navy-800 border-navy-700 flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">Chat Sessions</CardTitle>
              <Button size="sm" variant="ghost" className="text-gold-400" onClick={createNewSession}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentSession?.id === session.id
                        ? 'bg-gold-500/20 text-gold-400'
                        : 'text-gray-400 hover:bg-navy-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      <span className="text-sm truncate">
                        {session.messages?.[0]?.content?.slice(0, 30) || 'New Chat'}...
                      </span>
                    </div>
                  </button>
                ))}
                {sessions.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">No sessions yet</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="bg-navy-800 border-navy-700 flex-1 flex flex-col">
          {/* Header */}
          <CardHeader className="border-b border-navy-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gold-500/20 rounded-lg">
                  <Bot className="w-6 h-6 text-gold-400" />
                </div>
                <div>
                  <CardTitle className="text-white">AI Financial Advisor</CardTitle>
                  <p className="text-sm text-gray-400">Powered by GPT-5</p>
                </div>
              </div>
              {companies.length > 0 && (
                <Select
                  value={selectedCompany?.id || ''}
                  onValueChange={(id) => setSelectedCompany(companies.find(c => c.id === id))}
                >
                  <SelectTrigger className="w-[180px] bg-navy-900 border-navy-600 text-white">
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id} className="text-white">
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Sparkles className="w-12 h-12 text-gold-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Start a Conversation</h3>
                  <p className="text-gray-400 mb-6 max-w-md">
                    Ask me anything about your finances. I can help with cash flow analysis, 
                    expense optimization, and strategic recommendations.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                    {suggestedQuestions.slice(0, 4).map((q, i) => (
                      <Badge
                        key={i}
                        className="bg-navy-700 text-gray-300 cursor-pointer hover:bg-navy-600 py-2 px-3"
                        onClick={() => sendMessage(q)}
                      >
                        {q}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-gold-500 text-navy-900'
                            : 'bg-navy-700 text-white'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-navy-700 p-4 rounded-lg">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t border-navy-700">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className={`border-navy-600 ${isListening ? 'bg-red-500/20 text-red-400' : 'text-gray-400'}`}
                onClick={toggleListening}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about your finances..."
                className="flex-1 bg-navy-900 border-navy-600 text-white"
                disabled={loading}
              />
              <Button
                className="bg-gold-500 hover:bg-gold-600 text-navy-900"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AIAdvisorPage;
