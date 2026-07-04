import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Send, Paperclip, Calendar, X } from 'lucide-react';
import { mockMessages } from '../data/mockData';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: string;
  read?: boolean;
}

export default function ChatRoom() {
  const navigate = useNavigate();
  const { id } = useParams();
  const contact = mockMessages.find((m) => m.id === id);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hey! I saw your profile and would love to connect.',
      sender: 'them',
      timestamp: '10:30 AM',
      read: true,
    },
    {
      id: '2',
      text: 'Hi! Thanks for reaching out. I\'d be happy to chat!',
      sender: 'me',
      timestamp: '10:32 AM',
      read: true,
    },
    {
      id: '3',
      text: 'Thanks for connecting! Would love to chat about product strategy.',
      sender: 'them',
      timestamp: '10:35 AM',
      read: true,
    },
    {
      id: '4',
      text: 'Absolutely! I have some time next week. Coffee?',
      sender: 'me',
      timestamp: '10:38 AM',
      read: true,
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };

    setMessages([...messages, newMessage]);
    setInputText('');
  };

  const handleScheduleMeeting = () => {
    if (!meetingTitle || !meetingDate || !meetingTime) return;

    const meetingMessage: Message = {
      id: Date.now().toString(),
      text: `📅 Meeting scheduled: ${meetingTitle}\n📆 ${meetingDate} at ${meetingTime}${meetingLocation ? `\n📍 ${meetingLocation}` : ''}`,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };

    setMessages([...messages, meetingMessage]);
    setShowScheduleModal(false);
    setMeetingTitle('');
    setMeetingDate('');
    setMeetingTime('');
    setMeetingLocation('');
  };

  if (!contact) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img
              src={contact.user.avatar}
              alt={contact.user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <h2 className="font-medium">{contact.user.name}</h2>
              <p className="text-xs text-muted-foreground">Active now</p>
            </div>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  message.sender === 'me'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-foreground'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs opacity-70">{message.timestamp}</span>
                  {message.sender === 'me' && message.read && (
                    <span className="text-xs opacity-70">· Read</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="p-2.5 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background max-w-md w-full rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-medium text-foreground">Schedule Meeting</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g., Coffee Chat, Strategy Discussion"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  placeholder="e.g., Zoom, Starbucks on Main St"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleMeeting}
                  disabled={!meetingTitle || !meetingDate || !meetingTime}
                  className="flex-1 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}