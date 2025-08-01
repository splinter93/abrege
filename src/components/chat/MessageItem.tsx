import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Bot, Download } from 'lucide-react';
import Mermaid from './Mermaid';
import CopyButton from './CopyButton';
import { Message } from './types';

function isImageUrl(url: string) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  if (imageExtensions.some(ext => url.toLowerCase().includes(ext))) return true;
  if (/^https?:\/\//.test(url) && !isAudioUrl(url)) return true;
  return false;
}
function isAudioUrl(url: string) {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  return audioExtensions.some(ext => url.toLowerCase().includes(ext));
}

const MessageContent = ({ content }: { content: string }) => {
  const [imgError, setImgError] = React.useState(false);
  if (isImageUrl(content) && !imgError) {
    return (
      <div className="message-image-container">
        <a href={content} target="_blank" rel="noopener noreferrer" className="message-image-link">
          <img src={content} alt="Shared content" className="message-image" loading="lazy" onError={() => setImgError(true)} />
        </a>
      </div>
    );
  }
  if (isImageUrl(content) && imgError) {
    return (
      <a href={content} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">
        {content}
      </a>
    );
  }
  if (isAudioUrl(content)) {
    return (
      <div className="message-audio-container">
        <audio controls src={content} className="message-audio" preload="none">
          Your browser does not support the audio element.
        </audio>
        <a href={content} target="_blank" rel="noopener noreferrer" className="message-audio-link" download>
          <Download size={18} />
        </a>
      </div>
    );
  }
  return (
    <div className="message-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h2: ({node, ...props}) => <h2 {...props} />,
          h3: ({node, ...props}) => <h3 {...props} />,
          ul: ({node, ...props}) => <ul {...props} />,
          ol: ({node, ...props}) => <ol {...props} />,
          li: ({node, ...props}) => <li {...props} />,
          pre: ({ children, ...props }) => {
            const childArray = React.Children.toArray(children);
            if (childArray.length === 1 && React.isValidElement(childArray[0]) && childArray[0].type === Mermaid) {
              return childArray[0];
            }
            let codeText = '';
            if (React.isValidElement(children) && children.props) {
                const childProps = children.props as { children: string | string[] };
                if (typeof childProps.children === 'string') {
                    codeText = childProps.children;
                } else if (Array.isArray(childProps.children)) {
                    codeText = childProps.children.join('');
                }
            }
            return (
              <pre {...props} className="code-block">
                <CopyButton text={codeText} />
                {children}
              </pre>
            );
          },
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isMermaid = match && match[1] === 'mermaid';
            if (isMermaid) {
              return <Mermaid chart={String(children).replace(/\n$/, '')} />;
            }
            if (inline) {
              return <code className="inline-code" {...props}>{children}</code>;
            }
            return (
              <code className={`block-code ${className || ''}`} {...props}>
                <CopyButton text={String(children)} />
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default function MessageItem({ message, isDialogMode }: { message: Message; isDialogMode?: boolean }) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={
        message.role === 'user'
          ? 'user-bubble'
          : isDialogMode ? 'assistant-bubble' : 'assistant-message'
      }>
        <MessageContent content={message.content} />
        <div className="message-footer">
          {message.role === 'assistant' && (
            <div className="message-meta">
              <Bot className="w-4 h-4" />
              <span>Synesia Agent</span>
            </div>
          )}
          {message.role === 'user' && (
            <div className="message-meta" />
          )}
          {message.timestamp && (
            <p className="timestamp">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
