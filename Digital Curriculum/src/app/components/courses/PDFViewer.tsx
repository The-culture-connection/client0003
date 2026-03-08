import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2 } from "lucide-react";
// Note: CSS files for react-pdf v10+ are optional and may be bundled automatically

// Set up PDF.js worker - use local worker file to avoid CDN issues
// The worker file is copied from react-pdf's pdfjs-dist dependency (version 5.4.296) to public directory
if (typeof window !== 'undefined') {
  // Use local worker file served from public directory (matches react-pdf's internal version)
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PDFViewerProps {
  url: string;
  onPageChange?: (pageNumber: number, totalPages: number) => void;
  initialPage?: number;
  onNext?: () => void;
  onPrevious?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
}

export function PDFViewer({ 
  url, 
  onPageChange, 
  initialPage = 1,
  onNext,
  onPrevious,
  canGoNext = true,
  canGoPrevious = true,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale] = useState(1.2);
  const [pdfBlob, setPdfBlob] = useState<Blob | string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    if (onPageChange) {
      onPageChange(pageNumber, numPages);
    }
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    setError("Failed to load PDF. Please try again.");
    setLoading(false);
  }

  // Fetch PDF using Firebase Function proxy to handle CORS
  useEffect(() => {
    const fetchPdf = async () => {
      if (!url) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Check if URL is a Firebase Storage URL (contains firebasestorage.googleapis.com)
        if (url.includes('firebasestorage.googleapis.com')) {
          // Extract the file path from the Firebase Storage download URL
          // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token={token}
          const urlObj = new URL(url);
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
          
          if (pathMatch) {
            // Decode the URL-encoded path
            const filePath = decodeURIComponent(pathMatch[1]);
            
            // Use Firebase Function to proxy the file (handles CORS automatically)
            // Get the functions URL from environment or construct from project ID
            const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mortar-dev';
            const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 
              `https://us-central1-${projectId}.cloudfunctions.net`;
            const proxyUrl = `${functionsUrl}/getCourseFile?path=${encodeURIComponent(filePath)}`;
            
            // Fetch from the proxy function
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            // Create object URL from blob
            const objectUrl = URL.createObjectURL(blob);
            setBlobUrl(objectUrl);
            setPdfBlob(objectUrl);
            setLoading(false);
          } else {
            throw new Error("Could not extract file path from Firebase Storage URL");
          }
        } else {
          // For non-Firebase URLs, use directly
          setPdfBlob(url);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching PDF:", err);
        setError("Failed to load PDF. Please check your connection and try again.");
        setLoading(false);
      }
    };
    
    fetchPdf();
    
    // Cleanup: revoke blob URL when component unmounts or URL changes
    return () => {
      setBlobUrl((prevBlobUrl) => {
        if (prevBlobUrl) {
          URL.revokeObjectURL(prevBlobUrl);
        }
        return null;
      });
    };
  }, [url]);
  
  // Additional cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  useEffect(() => {
    setPageNumber(initialPage);
  }, [initialPage, url]);

  useEffect(() => {
    if (numPages && onPageChange) {
      onPageChange(pageNumber, numPages);
    }
  }, [pageNumber, numPages, onPageChange]);

  // Handle external navigation (from parent component)
  useEffect(() => {
    if (onNext && canGoNext && pageNumber < (numPages || 0)) {
      // Navigation handled by parent
    }
    if (onPrevious && canGoPrevious && pageNumber > 1) {
      // Navigation handled by parent
    }
  }, [onNext, onPrevious, canGoNext, canGoPrevious, pageNumber, numPages]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
        </div>
      </div>
    );
  }

  // Don't render until we have the PDF blob/URL
  if (!pdfBlob) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-accent" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <Document
        file={pdfBlob}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex items-center justify-center h-full min-h-[600px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-accent" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        }
        options={{
          cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/standard_fonts/`,
          httpHeaders: {
            'Access-Control-Allow-Origin': '*',
          },
        }}
      >
        {loading && (
          <div className="flex items-center justify-center h-full min-h-[600px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-accent" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}
        {numPages && (
          <div className="flex items-center justify-center bg-background border border-border rounded-lg p-2 shadow-lg max-w-full">
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={false}
              className="max-w-full"
              width={800}
            />
          </div>
        )}
      </Document>
    </div>
  );
}
