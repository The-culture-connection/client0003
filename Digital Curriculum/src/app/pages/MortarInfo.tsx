import { useNavigate } from "react-router";
import { useScreenAnalytics } from "../analytics/useScreenAnalytics";
import { Button } from "../components/ui/button";
import {
  ANDROID_PLAY_STORE_URL,
  GET_THE_APP_PATH,
  IOS_APP_STORE_URL,
  MOBILE_APP_NAME,
} from "../lib/appStoreLinks";

const YOUTUBE_EMBED_URL = "https://www.youtube.com/embed/ScN2yhwYoqw?start=1";

const COURSE_MODULES = [
  {
    title: "First Verse: Foundations",
    lessons: [
      { name: "The Release Party", description: "Introduction to course" },
      { name: "Expect the Unexpected", description: "Setting Your Sights on the Road Ahead" },
      { name: "Dollars and Sense", description: "Getting Your House in Order" },
      { name: "Fade In", description: "Clarifying Your Concept" },
      { name: "Reflection", description: "Checking in and Making Decisions" },
    ],
  },
  {
    title: "The Core",
    lessons: [
      { name: "The Medium is the Message", description: "Branding & Marketing" },
      { name: "Always Be Closing", description: "Sales & Distribution" },
      { name: "All Eyes on Them", description: "Competitive Analysis" },
      { name: "Balancing Act", description: "Cost Structures" },
      { name: "Make Me Care", description: "Storytelling for Entrepreneurs" },
    ],
  },
  {
    title: "Really Real",
    lessons: [
      { name: "Game Recognize Game", description: "Pricing and Revenue" },
      { name: "Legit or Quit", description: "Legitimizing Your Business" },
      { name: "C.R.E.A.M.", description: "Cash Flow and Funding" },
      { name: "Pitching & Alternatives", description: "Pitch submission" },
      { name: "The End of the Beginning", description: "Goals & Planning" },
    ],
  },
] as const;

export function MortarInfoPage() {
  useScreenAnalytics("mortar_info");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Section 1 — Banner */}
      <section className="w-full bg-black">
        <img
          src="/mortar-info/banner.png"
          alt="MORTAR MASTER — entrepreneurs in the MORTAR Masters program"
          className="w-full h-auto block"
        />
      </section>

      {/* Section 2 — Hero + sponsors */}
      <section className="bg-white px-6 py-14 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight uppercase leading-tight text-neutral-900 mb-6">
            BUILD YOUR BUSINESS. OWN YOUR LEGACY.
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-10">
            Since 2014, MORTAR has empowered entrepreneurs with the tools, resources, and access they
            need to thrive and flourish. We&apos;re proud to now offer our curriculum online!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="min-w-[160px] bg-white border-2 border-neutral-900 text-neutral-900 font-semibold hover:bg-neutral-100"
            >
              Dashboard
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/curriculum")}
              className="min-w-[200px] bg-[#871002] hover:bg-[#6d0d02] text-white uppercase tracking-wide font-semibold"
            >
              Get started now
            </Button>
          </div>
          <img
            src="/mortar-info/sponsors.png"
            alt="MORTAR alumni and partner businesses"
            className="w-full max-w-4xl mx-auto h-auto"
          />
        </div>
      </section>

      {/* Section 3 — Video */}
      <section className="bg-neutral-100 px-6 py-14 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg bg-black">
            <iframe
              src={YOUTUBE_EMBED_URL}
              title="MORTAR Masters Online — course preview"
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      </section>

      {/* Section 4 — Challenge */}
      <section className="bg-white px-6 py-14 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold uppercase tracking-tight leading-tight text-neutral-900 mb-6">
                DO YOU HAVE WHAT IT TAKES TO BECOME A MORTAR MASTER?
              </h2>
              <p className="text-base md:text-lg text-neutral-600 leading-relaxed">
                This course is designed for those who are starting or growing their businesses. It will
                challenge you. It will inspire you. It will force you to confront your limitations and
                help you identify and develop your strengths. You will be exposed to new information,
                and you will be reminded of what you already know. You will be asked to think
                concretely, to work with data and information, and to make decisions about your
                business. Most of all, you will leave this course well-prepared for the journey ahead.
              </p>
            </div>
            <img
              src="/mortar-info/dreamers-doers.png"
              alt="For the dreamers and the doers — MORTAR entrepreneurs"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Section 5 — Course curriculum */}
      <section className="bg-neutral-50 px-6 py-14 md:py-20 border-t border-neutral-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-center text-neutral-900 mb-4">
            MORTAR Masters Digital Curriculum
          </h2>
          <p className="text-center text-neutral-600 mb-12 max-w-2xl mx-auto">
            Three verses. Fifteen lessons. Everything you need to build, grow, and own your business.
          </p>

          <div className="space-y-10">
            {COURSE_MODULES.map((module, moduleIndex) => (
              <div key={module.title} className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
                <div className="bg-[#871002] px-6 py-4">
                  <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-wide">
                    {moduleIndex === 0 ? "First Module" : moduleIndex === 1 ? "Second Module" : "Third Module"}
                    {": "}
                    {module.title}
                  </h3>
                </div>
                <ol className="divide-y divide-neutral-100">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <li key={lesson.name} className="px-6 py-4 flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-100 text-[#871002] font-bold text-sm flex items-center justify-center">
                        {lessonIndex + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-neutral-900">{lesson.name}</p>
                        <p className="text-sm text-neutral-600 mt-0.5">{lesson.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          {/* Graduates continue in the mobile network, so the course rundown
              is the natural place to point at it. */}
          <div className="mt-14 border-2 border-neutral-900 bg-white px-6 py-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#871002]">
              After the course
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase tracking-tight text-neutral-900">
              Keep building in {MOBILE_APP_NAME}
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-neutral-600">
              MORTAR alumni stay connected in the mobile network — a founders&rsquo;
              feed, groups, events and matching. Free on iPhone and Android.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={IOS_APP_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="min-w-[160px] border-2 border-neutral-900 bg-neutral-900 px-6 py-3 font-semibold text-white hover:bg-neutral-800"
              >
                App Store
              </a>
              <a
                href={ANDROID_PLAY_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="min-w-[160px] border-2 border-neutral-900 bg-white px-6 py-3 font-semibold text-neutral-900 hover:bg-neutral-100"
              >
                Google Play
              </a>
            </div>
            <button
              type="button"
              onClick={() => navigate(GET_THE_APP_PATH)}
              className="mt-4 text-sm text-neutral-600 underline hover:text-neutral-900"
            >
              How access works
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-14">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="min-w-[160px] bg-white border-2 border-neutral-900 text-neutral-900 font-semibold hover:bg-neutral-100"
            >
              Dashboard
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/curriculum")}
              className="min-w-[200px] bg-[#871002] hover:bg-[#6d0d02] text-white uppercase tracking-wide font-semibold"
            >
              Get started now
            </Button>
          </div>

          <p className="text-center text-sm text-neutral-500 mt-10">
            © Copyright MORTAR {new Date().getFullYear()}
          </p>
        </div>
      </section>
    </div>
  );
}
