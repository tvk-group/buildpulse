import {buildPulseBloggers} from "@/lib/buildpulse/editorial-bloggers";
export type EditorialAssignment={date:string;authorId:string;authorName:string;topic:string;angle:string;requiresHumanReview:boolean;status:"planned"};
const angles=["What changed and why it matters","A practical explainer for readers","What the evidence does and does not show","Key questions to follow next","Common misconceptions and how to evaluate them","How this affects everyday life","A beginner-friendly guide"];
/** Deterministic daily assignment plan; does not generate or publish factual claims. */
export function dailyEditorialPlan(date:string):EditorialAssignment[]{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T00:00:00Z")))throw new Error("invalid_date");
 const day=Math.floor(Date.parse(date+"T00:00:00Z")/86400000);
 return buildPulseBloggers.map((author,index)=>({
  date,authorId:author.id,authorName:author.name,
  topic:author.topics[(day+index)%author.topics.length],
  angle:angles[(day+index*3)%angles.length],
  requiresHumanReview:true,status:"planned" as const
 }));
}
