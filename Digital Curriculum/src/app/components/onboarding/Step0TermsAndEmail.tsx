import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

const TERMS_VERSION = "2023-07";

const TERMS_TEXT = `Last update: July 2023

These Terms of Use ("Site Terms") state the terms and conditions under which you may use our website and mobile application (the "Sites"). The Sites contain various information relating to Mortar ("Mortar", "We", or "Us"). By accessing, browsing, and/or using the Sites you acknowledge that you have read, understood, and agree to be legally bound by the Site Terms and our Privacy Policy, which is deemed a part of and included within these Site Terms. Please read the Site Terms carefully before using the Site. If you do not accept all provisions of the Site Terms, do not use the Sites.

PRIVACY
Please review our Privacy Policy so that you may understand our privacy practices.

INTELLECTUAL PROPERTY
All information and content available on the Sites and its "look and feel", including but not limited to trademarks, logos, service marks, text, graphics, logos, button icons, images, audio clips, data compilations and software, and the compilation and organization thereof (collectively, the "Site Content") is the property of Mortar, its affiliates, partners or licensors, and is protected by United States and international laws, including laws governing copyrights and trademarks.

LIMITED LICENSE
Subject to the terms, conditions and restrictions set forth in these Site Terms, we grant you a limited, non-exclusive, non-sublicensable and revocable license to access and use the Sites and to view, copy and print portions of the Site Content for your own personal use (the "License"). The License is specifically conditioned upon the following: (i) you may only view, copy and print portions of the Site Content for your own informational, personal and non-commercial use; (ii) you may not remove or modify any copyright, trademark or other proprietary notices that have been placed in the Site Content; (iii) you may not use any data mining, robots or similar data gathering or extraction methods or take any action that may impose an unreasonable burden or load on our infrastructure; (iv) you may not use the Sites or the Site Content other than for its intended purpose; and (v) you may not reproduce, modify, prepare derivative works from, distribute or display the Sites or any Site Content (other than for page caching), except as provided herein.

Except as expressly permitted above, any use of any portion of the Sites or Site Content without the prior written permission of Mortar is strictly prohibited and will terminate the License without prejudice to any other remedy provided by applicable law or these Site Terms. Your unauthorized use of the Sites or Site Content may also violate applicable laws including, without limitation, copyright and trademark laws and applicable communications regulations and statutes. You expressly agree to indemnify, defend and hold harmless Mortar against any liability to any person arising out of your use of the Sites or Site Content or breach of the Site Terms.

CODE OF CONDUCT
By accessing or using the Sites you agree to abide by the following standards of conduct. You agree that you will not, and will not authorize or facilitate any attempt by another person or entity to:
• Use the Sites in breach of these Terms;
• Reproduce, duplicate, copy, sell, resell or exploit for any commercial purposes, any portion of any Site or use or access to the Sites;
• Harass, threaten, stalk or intentionally embarrass or cause distress to another person or entity;
• Impersonate another person or entity;
• Introduce viruses, worms, Trojan horses, harmful code, or any software or other materials that contain a component harmful to the website;
• Gain unauthorized access to any computer system or nonpublic portion of the Sites or interfere with or disrupt the Sites, servers, or networks connected to the Sites;
• Engage in, encourage, advocate, provide instructions for or discuss with the intent to commit conduct that would constitute a criminal or civil offense or otherwise violate any federal, state, local, or international law or regulation.

USER CONTENT
When you provide, transmit, upload, post, e-mail or otherwise make available text, graphics, images, audio, video, or other materials ("User Content") on the Sites, you are entirely responsible for such User Content. You expressly agree not to provide, post, upload, distribute, store, create, submit or transmit any User Content that: (a) is unlawful, libelous, defamatory, obscene, pornographic, indecent, lewd, suggestive, harassing, threatening, abusive, inflammatory, fraudulent or otherwise objectionable; (b) would constitute, encourage or provide instructions for a criminal offense, violate the rights of any party, or create liability or violate any local, state, national, foreign, or international law; (c) may infringe any patent, trademark, trade secret, copyright or other intellectual or proprietary right of any party; (d) impersonates any person or entity; (e) is unsolicited promotions, advertising, or any form of "spam"; (f) is private information of any third party; or (g) contains viruses, corrupted data or other harmful, disruptive or destructive files.

Mortar reserves the right to remove, without notice, any User Content that violates these Site Terms or is otherwise unlawful. Any violation may result in termination or suspension of your rights to use the Sites.

RIGHTS TO USER CONTENT
By providing, posting or distributing User Content, you grant Mortar and its affiliates a nonexclusive, royalty-free, perpetual, transferable, irrevocable and fully sublicensable right to use, reproduce, modify, adapt, translate, distribute, publish, create derivative works from and publicly display and perform such User Content throughout the world in any media, now known or hereafter devised.

THIRD-PARTY LINKS
The Sites contain links to other sites on the Internet owned and operated by third parties. Mortar has no control over these External Sites and is not responsible for their privacy practices, terms and conditions, or content. These linked sites are only for your convenience and you access them at your own risk.

DISCLAIMER OF WARRANTIES
The materials on the Sites are provided "as is" and without warranties of any kind, either express or implied. To the fullest extent permissible pursuant to applicable law, Mortar disclaims all warranties, express or implied, including but not limited to all implied warranties of merchantability, fitness for a particular purpose, title and non-infringement.

LIMITATION OF LIABILITY
IN NO EVENT SHALL MORTAR BE LIABLE FOR ANY DIRECT, INDIRECT, SPECIAL, PUNITIVE, INCIDENTAL, EXEMPLARY OR CONSEQUENTIAL DAMAGES, OR ANY DAMAGES WHATSOEVER, EVEN IF MORTAR HAS BEEN PREVIOUSLY ADVISED OF THE POSSIBILITY OF SUCH DAMAGES, WHETHER IN AN ACTION UNDER CONTRACT, NEGLIGENCE, OR ANY OTHER THEORY, ARISING OUT OF OR IN CONNECTION WITH THE USE, INABILITY TO USE, OR PERFORMANCE OF THE INFORMATION, SERVICES, PRODUCTS, AND MATERIALS AVAILABLE FROM THE SITES.

DISPUTES
With respect to any dispute regarding the Sites, all rights and obligations and all actions contemplated by these Site Terms shall be governed by the laws of the United States and by the laws of Ohio. You agree that all claims you may have against Mortar arising from or relating to the Sites will be heard and resolved in a court of competent jurisdiction located in Hamilton County, Ohio.

CONTACT US
By Mail: Mortar, 340 Reading Road, Cincinnati, Ohio 45202
By E-mail: Please go to www.wearemortar.com and click the "Contact Us" link at the bottom of the page.`;

interface Step0TermsAndEmailProps {
  onAccept: (emailOptIn: boolean) => void;
}

export { TERMS_VERSION };

export function Step0TermsAndEmail({ onAccept }: Step0TermsAndEmailProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    if (!termsAccepted) {
      setError("You must agree to the Terms of Use to continue.");
      return;
    }
    setError(null);
    onAccept(emailOptIn);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to Mortar</h1>
        <p className="text-muted-foreground text-sm">
          Before we get started, please review and agree to our Terms of Use.
        </p>
      </div>

      {/* Scrollable terms box */}
      <Card className="mb-5">
        <div
          className="h-64 overflow-y-auto p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono"
          style={{ scrollbarWidth: "thin" }}
        >
          {TERMS_TEXT}
        </div>
      </Card>

      {/* Terms agreement checkbox — required */}
      <label className="flex items-start gap-3 cursor-pointer mb-4 group">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => {
            setTermsAccepted(e.target.checked);
            if (e.target.checked) setError(null);
          }}
          className="mt-0.5 w-4 h-4 shrink-0 accent-primary cursor-pointer"
        />
        <span className="text-sm text-foreground leading-snug">
          I have read and agree to the{" "}
          <strong>Mortar Terms of Use</strong>.{" "}
          <span className="text-destructive font-medium">(Required)</span>
        </span>
      </label>

      {/* Email opt-in checkbox — optional */}
      <label className="flex items-start gap-3 cursor-pointer mb-6 group">
        <input
          type="checkbox"
          checked={emailOptIn}
          onChange={(e) => setEmailOptIn(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 accent-primary cursor-pointer"
        />
        <span className="text-sm text-muted-foreground leading-snug">
          I agree to receive emails from Mortar about course updates, events, and community news.{" "}
          <span className="text-muted-foreground/70">(Optional — you can change this later in your settings)</span>
        </span>
      </label>

      {error && (
        <p className="text-sm text-destructive mb-4 font-medium">{error}</p>
      )}

      <Button
        onClick={handleContinue}
        className="w-full"
        size="lg"
      >
        Continue
      </Button>
    </div>
  );
}
