import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Camera } from 'lucide-react';
import { Button } from '../components/Button';
import { SkillChip } from '../components/SkillChip';

const availableSkills = [
  'React', 'Python', 'Design', 'Marketing', 'Sales', 'Product Management',
  'Data Science', 'iOS Development', 'Android', 'UI/UX', 'Leadership', 'Strategy',
  'Machine Learning', 'System Design'
];

export default function ProfileEdit() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: 'Alex Thompson',
    title: 'Product Manager',
    organization: 'Tech Corp',
    about: 'Passionate about building products that make a difference. Always looking to connect with fellow alumni and share experiences.',
    skillsOffered: ['Product Management', 'Strategy', 'Leadership', 'UI/UX'],
    skillsNeeded: ['Data Science', 'Machine Learning'],
  });

  const handleSave = () => {
    // Save profile
    console.log('Saving profile:', formData);
    navigate('/profile');
  };

  const toggleSkill = (skill: string, type: 'offered' | 'needed') => {
    const key = type === 'offered' ? 'skillsOffered' : 'skillsNeeded';
    const current = formData[key];
    setFormData({
      ...formData,
      [key]: current.includes(skill)
        ? current.filter(s => s !== skill)
        : [...current, skill],
    });
  };

  return (
    <div className="min-h-screen bg-background">
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
            <h1 className="text-2xl">Edit Profile</h1>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-6">
          {/* Profile Picture */}
          <div className="flex justify-center">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1554765345-6ad6a5417cde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzQzMDM4ODh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
              />
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-lg">
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block mb-2">Organization</label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block mb-2">About</label>
            <textarea
              value={formData.about}
              onChange={(e) => setFormData({ ...formData, about: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors resize-none"
              rows={4}
            />
          </div>

          <div>
            <h3 className="font-medium mb-3">Skills I Can Offer</h3>
            <div className="flex flex-wrap gap-2">
              {availableSkills.map((skill) => (
                <SkillChip
                  key={skill}
                  label={skill}
                  selected={formData.skillsOffered.includes(skill)}
                  onClick={() => toggleSkill(skill, 'offered')}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">Skills I'm Looking For</h3>
            <div className="flex flex-wrap gap-2">
              {availableSkills.map((skill) => (
                <SkillChip
                  key={skill}
                  label={skill}
                  selected={formData.skillsNeeded.includes(skill)}
                  onClick={() => toggleSkill(skill, 'needed')}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Save Button */}
        <div className="sticky bottom-0 bg-background border-t border-border p-6">
          <Button onClick={handleSave} variant="primary" className="w-full" size="lg">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
