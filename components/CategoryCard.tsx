import Link from "next/link";
import { Progress } from "./Progress";
import { IconClock } from "./ui/icons";

export default function CategoryCard({
  name,
  number_of_items,
  description,
  minutes,
  progress,
  correct,
  incorrect,
  slug,
  cta = "Continue",
  disabled = false,
}: {
  name: string;
  number_of_items:number,
  description: string;
  minutes: number;
  progress: number;
  correct?: number;
  incorrect?: number;
  slug?:string,
  cta?: string;
  disabled?: boolean;
}) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="text-sm text-slate-500">Learn {name}</div>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">{number_of_items} Words</h3>
        <Link href={"/courses/lesson/"+slug }
           
          className={`px-4 py-2 rounded-md text-white text-sm font-medium ${disabled ? "bg-slate-300" : "bg-sky-500 hover:bg-sky-600"}`}
        >
          {disabled ? "Start" : cta}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-600">{Math.round(progress)}% - In progress</span>
        <div className="flex-1"><Progress value={progress} color="bg-emerald-500" /></div>
      </div>

      {(correct !== undefined && incorrect !== undefined) && (
        <div className="text-xs text-slate-500">{correct} correct / {incorrect} incorrect</div>
      )}

      <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
        <span className="inline-flex items-center gap-1">
          <IconClock />    {minutes} minutes
        </span>
      </div>
    </div>
  );
}
