import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import ChatMessage from '../components/ChatMessage';

export default function Chat() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('main');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [costInfo, setCostInfo] = useState({ cost: 0, label: '' });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.getAgents()
      .then((agentList) => {
        setAgents(agentList);
        if (!agentList?.length) return;
        const defaultAgent = agentList.find(a => a.is_default) || agentList[0];
        setSelectedAgent(defaultAgent.id);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      api.getChatHistory(selectedAgent).then(setMessages).catch(console.error);
      api.getAgentCost(selectedAgent).then(setCostInfo).catch(console.error);
    }
  }, [selectedAgent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent) return;

    const userMessage = { agent_id: selectedAgent, role: 'user', content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.sendMessage(selectedAgent, input);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-accent flex items-center justify-center">
            <span className="text-2xl">💬</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Chat</h2>
            <p className="text-dashi-muted text-sm">OpenClaw Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-dashi-surface border border-dashi-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-dashi-primary/50"
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <button
            onClick={async () => {
              if (!confirm('Clear all chat history for this agent?')) return;
              try {
                await api.clearChat(selectedAgent);
                setMessages([]);
              } catch (error) {
                console.error('Failed to clear history:', error);
              }
            }}
            className="px-4 py-2.5 text-dashi-danger hover:text-white text-sm font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col mb-4">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-dashi-muted">
              <div className="w-20 h-20 rounded-3xl bg-dashi-surface flex items-center justify-center mb-4">
                <span className="text-4xl opacity-30">💬</span>
              </div>
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm mt-1">Type a message to chat with OpenClaw</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="glass-card p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 bg-dashi-bg border border-dashi-border rounded-xl px-4 py-3 text-white placeholder-dashi-muted focus:outline-none focus:border-dashi-primary/50 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="btn-primary px-6 self-end h-12 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : (
              <>
                <span>Send</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </>
            )}
          </button>
        </div>
        <div className="mt-3 text-sm">
          {costInfo.cost === 0 ? (
            <span className="text-dashi-success flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-dashi-success" />
              {costInfo.label} • No cost
            </span>
          ) : (
            <span className="text-dashi-warning flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-dashi-warning" />
              {costInfo.label} • This message will cost approximately ${costInfo.cost.toFixed(3)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
