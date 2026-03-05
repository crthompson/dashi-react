export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Avatar & Name */}
        <div className={`flex items-center gap-2 mb-2 ${isUser ? 'flex-row-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
            isUser 
              ? 'bg-gradient-accent' 
              : 'bg-gradient-primary'
          }`}>
            {isUser ? '👤' : '🦞'}
          </div>
          <span className="text-sm text-dashi-muted">
            {isUser ? 'You' : 'OpenClaw'}
          </span>
          <span className="text-xs text-dashi-muted/50">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Message Bubble */}
        <div className={`rounded-2xl px-5 py-3 ${
          isUser 
            ? 'bg-gradient-primary text-white rounded-tr-sm' 
            : 'bg-dashi-surface border border-dashi-border text-white rounded-tl-sm'
        }`}>
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
