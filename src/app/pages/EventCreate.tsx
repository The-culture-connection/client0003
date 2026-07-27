import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { ArrowLeft, Upload } from 'lucide-react';

export default function EventCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit for approval
    console.log('Submitting event:', formData);
    navigate('/events');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl">Create Event</h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div>
            <label className="block mb-2">Event Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
              placeholder="e.g., Alumni Networking Mixer"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block mb-2">Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
              placeholder="e.g., Alumni Center"
              required
            />
          </div>

          <div>
            <label className="block mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors resize-none"
              rows={4}
              placeholder="Tell attendees about your event..."
              required
            />
          </div>

          <div>
            <label className="block mb-2">Event Flyer</label>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload flyer</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              Your event will be submitted for approval and will be visible to all members once approved.
            </p>
          </div>

          <Button type="submit" variant="primary" className="w-full" size="lg">
            Submit for Approval
          </Button>
        </form>
      </div>
    </div>
  );
}
