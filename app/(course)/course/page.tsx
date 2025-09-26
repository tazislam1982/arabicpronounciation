import Navbar from "@/components/Navbar";
import LessonCard from "@/components/LessonCard";
import { Progress } from "@/components/Progress";

export default function CoursePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <section className="ribbon">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-3xl font-semibold">Welcome to your plan.</h1>
          <div className="mt-6 max-w-md">
            <div className="text-sm text-white">Arabic Pronunciation</div>
            <div className="mt-2">
              <Progress value={65} color="bg-amber-500" />
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl w-full px-4 py-6 space-y-4">
        <div className="card p-0 overflow-hidden">
          <div className="p-5">
            <LessonCard
              title="99 Words"
              subtitle="Learn • 99 Names of Allah"
              lessonslug="99-names-of-allah"
              slug="arabic-words"
              minutes={10}
              progress={80}
              correct={25}
              incorrect={4}
              cta="Continue"
            />
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="p-5">
            <LessonCard
              title="200 Words"
              subtitle="Learn  • 40 Rabbana"
              lessonslug="40-rabbana"
              slug="arabic-words"
              minutes={10}
              progress={11}
              correct={6}
              incorrect={4}
              cta="Continue"
              disabled
            />
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="p-5">
            <LessonCard
              title="20 Words"
              subtitle="Learn  • Furits Names"
              lessonslug="basic-sentences"
              slug="arabic-words"
              minutes={10}
              progress={0}
              cta="Start"
              disabled
            />
          </div>
        </div>
      </main>
    </div>
  )
}
