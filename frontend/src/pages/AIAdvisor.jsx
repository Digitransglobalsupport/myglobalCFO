import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import axios from 'axios';
import { API } from '@/App';

const AIAdvisor = ({ user }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entities, setEntities] = useState([]);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            alert('Microphone access denied. Please grant permission in your browser settings.');
          } else if (event.error === 'no-speech') {
            alert('No speech detected. Please try again.');
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } catch (error) {
        console.error('Failed to initialize speech recognition:', error);
      }
    }
  }, []);

  // Fetch entities on mount
  useEffect(() => {
    fetchEntities();
    fetchSessions();
  }, []);
  
  // Auto-select first entity when entities are loaded
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      const firstEntityId = entities[0].id;
      setSelectedEntity(firstEntityId);
      fetchSuggestedQuestions(firstEntityId);
    }
  }, [entities, selectedEntity]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchEntities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntities(response.data);
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchSuggestedQuestions = async (entityId = null) => {
    try {
      const token = localStorage.getItem('token');
      const url = entityId 
        ? `${API}/chat/suggested-questions?entity_id=${entityId}`
        : `${API}/chat/suggested-questions`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestedQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Failed to fetch suggested questions:', error);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/chat/session/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages || []);
      setCurrentSession(response.data.session);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const sendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim()) return;

    setLoading(true);
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/chat/send`,
        {
          message: messageText,
          session_id: currentSession?.id,
          entity_id: selectedEntity
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      if (!currentSession) {
        setCurrentSession({ id: response.data.session_id });
        fetchSessions();
      }

      if (response.data.suggested_questions) {
        setSuggestedQuestions(response.data.suggested_questions);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      
      // Provide more specific error messages
      if (error.response) {
        if (error.response.status === 500) {
          errorContent = 'The AI service is temporarily unavailable. This is usually a temporary issue with the OpenAI API. Please try again in a few moments.';
        } else if (error.response.status === 401) {
          errorContent = 'Your session has expired. Please refresh the page and log in again.';
        } else if (error.response.data?.detail) {
          errorContent = `Error: ${error.response.data.detail}`;
        }
      } else if (error.request) {
        errorContent = 'Unable to reach the server. Please check your internet connection.';
      }
      
      const errorMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentSession(null);
    setMessages([]);
    fetchSuggestedQuestions(selectedEntity);
  };

  const deleteSession = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/chat/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSessions();
      if (currentSession?.id === sessionId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Voice input error:', error);
        alert('Unable to start voice input. Please ensure microphone permissions are granted.');
        setIsListening(false);
      }
    }
  };

  const handleEntityChange = (entityId) => {
    setSelectedEntity(entityId);
    fetchSuggestedQuestions(entityId);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="ai-advisor-page">
      <div className="ai-advisor-container">
        {/* Sidebar - Chat History */}
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <h3>💬 Chat History</h3>
            <Button onClick={startNewChat} className="new-chat-btn">
              + New Chat
            </Button>
          </div>
          
          <div className="chat-sessions-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
                onClick={() => loadSession(session.id)}
              >
                <div className="session-title">{session.title}</div>
                <div className="session-date">
                  {new Date(session.updated_at).toLocaleDateString()}
                </div>
                <button
                  className="delete-session-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="chat-main">
          <div className="chat-header">
            <div>
              <h2>🤖 AI Financial Advisor</h2>
              <p>Ask me anything about your financial data, operations, or strategies</p>
            </div>
            
            {/* Entity Selector */}
            <div className="entity-selector">
              <label>Entity Context:</label>
              <select 
                value={selectedEntity || ''} 
                onChange={(e) => handleEntityChange(e.target.value)}
                className="entity-select"
                style={{
                  backgroundColor: 'white',
                  color: 'black',
                  border: '1px solid #ccc',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                {entities.length === 0 && (
                  <option value="">No entities available</option>
                )}
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Messages Area */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <h3>👋 Welcome to Your AI Financial Advisor!</h3>
                <p>I'm here to help you:</p>
                <ul>
                  <li>Analyze your financial performance</li>
                  <li>Optimize operational costs</li>
                  <li>Protect and improve profit margins</li>
                  <li>Identify growth opportunities</li>
                  <li>Provide industry benchmarks</li>
                </ul>
                {selectedEntity ? (
                  <p className="start-hint">I'll provide advice specific to your selected entity. Ask a question below or click a suggested question to get started.</p>
                ) : (
                  <p className="start-hint">Please create an entity/company first to get personalized financial advice.</p>
                )}
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    <div className="message-text">{msg.content}</div>
                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="message assistant">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {suggestedQuestions.length > 0 && messages.length === 0 && (
            <div className="suggested-questions">
              <p className="suggested-label">Suggested questions:</p>
              <div className="questions-grid">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    className="suggested-question-btn"
                    onClick={() => sendMessage(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="input-wrapper">
              <Input
                type="text"
                placeholder="Ask me anything about your finances..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="chat-input"
              />
              <button
                className={`voice-input-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
                disabled={loading}
                title="Voice input"
              >
                {isListening ? '🔴' : '🎤'}
              </button>
              <Button
                onClick={() => sendMessage()}
                disabled={loading || !inputMessage.trim()}
                className="send-btn"
              >
                {loading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAdvisor;
