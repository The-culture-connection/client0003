import { ArrowLeft, Send, MoreVertical, Phone, Video, Calendar, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

export default function DirectChat() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [message, setMessage] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');

  // Mock user data based on userId
  const users: Record<string, any> = {
    'maria-garcia': {
      name: 'Maria Garcia',
      avatar: 'MG',
      role: 'Marketing Director • Class of 2022',
      status: 'online',
    },
    'james-wilson': {
      name: 'James Wilson',
      avatar: 'JW',
      role: 'Tech Entrepreneur • Class of 2021',
      status: 'online',
    },
  };

  const user = users[userId || ''] || {
    name: 'User',
    avatar: 'U',
    role: 'Alumni',
    status: 'offline',
  };

  const messages = [
    {
      id: 1,
      senderId: userId,
      text: "Hey! Thanks for connecting. I saw your profile and would love to chat about potential opportunities.",
      timestamp: "10:30 AM",
      isMine: false,
    },
    {
      id: 2,
      senderId: 'me',
      text: "Hi! Absolutely, I'd be happy to discuss. What did you have in mind?",
      timestamp: "10:32 AM",
      isMine: true,
    },
    {
      id: 3,
      senderId: userId,
      text: "We're looking for someone with your skillset for a new project. Are you open to new opportunities?",
      timestamp: "10:35 AM",
      isMine: false,
    },
    {
      id: 4,
      senderId: 'me',
      text: "That sounds interesting! I'm definitely open to hearing more about it.",
      timestamp: "10:37 AM",
      isMine: true,
    },
    {
      id: 5,
      senderId: userId,
      text: "Great! Let me share some details. Would you be available for a quick call tomorrow?",
      timestamp: "10:40 AM",
      isMine: false,
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      // Handle sending message
      setMessage('');
    }
  };

  const handleScheduleMeeting = () => {
    if (!meetingTitle || !meetingDate || !meetingTime) return;

    // In a real app, this would send the meeting invite
    // For now, we'll just close the modal
    setShowScheduleModal(false);
    setMeetingTitle('');
    setMeetingDate('');
    setMeetingTime('');
    setMeetingLocation('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/explore')} className="text-muted-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium">
                    {user.avatar}
                  </div>
                  {user.status === 'online' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
                  )}
                </div>
                <div>
                  <h2 className="text-foreground font-medium text-sm">{user.name}</h2>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-muted-foreground hover:text-accent transition-colors">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-accent transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowScheduleModal(true)}
                className="p-2 text-muted-foreground hover:text-accent transition-colors"
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-accent transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[80%] ${msg.isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {!msg.isMine && (
                  <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {user.avatar}
                  </div>
                )}
                <div>
                  <div
                    className={`p-3 rounded-2xl ${
                      msg.isMine
                        ? 'bg-accent text-accent-foreground rounded-br-sm'
                        : 'bg-card border border-border text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <p className={`text-xs text-muted-foreground mt-1 ${msg.isMine ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-background border border-input rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="p-2.5 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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