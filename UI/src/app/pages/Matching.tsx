import { Sparkles, Brain, Target, Users, TrendingUp, ArrowLeft, Loader2 } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export default function Matching() {
  const navigate = useNavigate();
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<any>(null);

  const runMatching = () => {
    setIsMatching(true);
    // Simulate matching algorithm
    setTimeout(() => {
      setMatchResults({
        jobs: 12,
        connections: 8,
        score: 94,
      });
      setIsMatching(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate('/explore')} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl text-foreground">Smart Matching</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            AI-powered algorithm to find your perfect connections
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Hero Section */}
          <div className="p-6 bg-gradient-to-br from-accent to-accent/80 rounded-xl text-accent-foreground">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-white/10 rounded-full">
                <Sparkles className="w-12 h-12" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center mb-2">
              Discover Your Perfect Matches
            </h2>
            <p className="text-center text-accent-foreground/90 text-sm">
              Our advanced AI algorithm analyzes your profile, interests, and career goals to find the best opportunities and connections for you.
            </p>
          </div>

          {/* How It Works */}
          <div className="p-4 bg-card border border-border rounded-xl">
            <h3 className="text-lg text-foreground font-medium mb-4">How It Works</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                  <Brain className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h4 className="text-foreground font-medium text-sm mb-1">AI Analysis</h4>
                  <p className="text-muted-foreground text-sm">
                    We analyze your profile, skills, and preferences
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h4 className="text-foreground font-medium text-sm mb-1">Smart Matching</h4>
                  <p className="text-muted-foreground text-sm">
                    Find opportunities that align with your goals
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h4 className="text-foreground font-medium text-sm mb-1">Connect & Grow</h4>
                  <p className="text-muted-foreground text-sm">
                    Build meaningful connections with alumni and professionals
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {matchResults && !isMatching && (
            <div className="p-4 bg-card border border-accent rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-accent" />
                <h3 className="text-lg text-foreground font-medium">Match Results</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-accent/10 rounded-lg text-center">
                  <p className="text-3xl font-bold text-accent mb-1">{matchResults.jobs}</p>
                  <p className="text-xs text-muted-foreground">Job Matches</p>
                </div>
                <div className="p-3 bg-accent/10 rounded-lg text-center">
                  <p className="text-3xl font-bold text-accent mb-1">{matchResults.connections}</p>
                  <p className="text-xs text-muted-foreground">Connections</p>
                </div>
              </div>

              <div className="p-3 bg-accent/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Match Score</span>
                  <span className="text-lg font-bold text-accent">{matchResults.score}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-1000"
                    style={{ width: `${matchResults.score}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => navigate('/explore')}
                className="w-full mt-4 py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors font-medium"
              >
                View Matches
              </button>
            </div>
          )}

          {/* Run Button */}
          {!matchResults && (
            <button
              onClick={runMatching}
              disabled={isMatching}
              className="w-full p-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMatching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Algorithm...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Start Matching
                </>
              )}
            </button>
          )}

          {/* Info */}
          <div className="p-4 bg-card/50 border border-border rounded-xl">
            <p className="text-sm text-muted-foreground text-center">
              💡 Run matching weekly to discover new opportunities as they become available
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
