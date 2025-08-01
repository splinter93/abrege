import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Message } from './types';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import { getSynesiaResponse } from './chatService';

interface ChatComponentProps {
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function ChatComponent({ className = '', isOpen = true, onToggle }: ChatComponentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: true });
    if (error) {
      console.error('Error loading messages:', error);
      return;
    }
    setMessages(data || []);
  };

  const handleSend = async (trimmedInput: string) => {
    if (!trimmedInput.trim()) return;
    
    setLoading(true);
    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
    };

    // Ajouter le message utilisateur à l'état et à la DB
    setMessages(prev => [...prev, userMessage]);
    await supabase.from('chat_messages').insert([userMessage]);

    try {
      // Appel Synesia API
      const response = await getSynesiaResponse(trimmedInput, messages);
      
      if (response.error) {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Erreur: ${response.error}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
        await supabase.from('chat_messages').insert([errorMessage]);
      } else if (response.result) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.result,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        await supabase.from('chat_messages').insert([assistantMessage]);
      }
    } catch (error) {
      console.error('Error in handleSend:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Erreur lors de l\'envoi du message',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      await supabase.from('chat_messages').insert([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .neq('id', 0);

      if (error) {
        console.error('Error clearing history:', error);
        return;
      }

      setMessages([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  if (!isOpen) {
    return (
      <button onClick={onToggle} className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg z-50">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Aurora Background */}
      <div className="aurora-background"></div>

      {/* Main Chat Container */}
      <div className={`chat-container ${className}`}>
        <div className="chat-header">
        </div>

        <div className="chat-content">
          <div className="messages-container">
            <div className="message-list">
              {messages.map((msg, idx) => (
                <MessageItem key={msg.id || idx} message={msg} />
              ))}
            </div>
            {loading && (
              <div className="loading-bubble">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <ChatInput onSend={handleSend} loading={loading} textareaRef={textareaRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
