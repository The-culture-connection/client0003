import {useEffect, useState} from "react";
import {useParams} from "react-router";
import {doc, getDoc} from "firebase/firestore";
import {db} from "../lib/firebase";
import {Card} from "../components/ui/card";
import {Button} from "../components/ui/button";
import {Award, ExternalLink} from "lucide-react";

type PublicCertificateDoc = {
  recipientName?: string;
  skill?: string;
  courseTitle?: string;
  certificatePdfUrl?: string;
  active?: boolean;
};

export function PublicCertificatePage() {
  const {shareId} = useParams<{shareId: string}>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicCertificateDoc | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!shareId) {
        setError("Certificate link is invalid.");
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, "certificate_public_links", shareId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("Certificate was not found.");
          setLoading(false);
          return;
        }
        const docData = snap.data() as PublicCertificateDoc;
        if (docData.active === false) {
          setError("Certificate link is inactive.");
          setLoading(false);
          return;
        }
        setData(docData);
      } catch (e) {
        console.error("Failed to load public certificate:", e);
        setError("Unable to load certificate.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading certificate...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-xl w-full p-6 text-center">
          <p className="text-destructive font-medium">{error || "Certificate unavailable."}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center mx-auto w-12 h-12 rounded-full bg-accent/10">
            <Award className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Mortar Certificate</h1>
          <p className="text-muted-foreground">This certificate is proudly presented to</p>
          <p className="text-4xl italic text-foreground">{data.recipientName || "Learner"}</p>
          <p className="text-muted-foreground uppercase tracking-wide">For Learning The Follow Essential Skill</p>
          <p className="text-3xl font-semibold text-foreground uppercase">{data.skill || "Skill"}</p>
          {data.courseTitle ? <p className="text-sm text-muted-foreground">{data.courseTitle}</p> : null}
          {data.certificatePdfUrl ? (
            <Button asChild className="mt-4">
              <a href={data.certificatePdfUrl} target="_blank" rel="noopener noreferrer">
                View Official PDF
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

