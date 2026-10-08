/** Deterministic headline similarity; used for conservative editorial deduplication. */
const stopwords = new Set(["a","an","and","are","as","at","be","by","for","from","in","is","of","on","the","to","with"]);
function tokens(title: string): Set<string> {
  return new Set(title.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu," ").split(/\s+/).filter(word => word.length > 1 && !stopwords.has(word)));
}
export function titleSimilarity(left: string, right: string): number {
  const a=tokens(left), b=tokens(right);
  if(!a.size || !b.size) return 0;
  let intersection=0;
  for(const word of a) if(b.has(word)) intersection++;
  return (2*intersection)/(a.size+b.size);
}
export function clusterStories<T extends {title:string}>(stories: readonly T[], threshold=0.55): T[][] {
  const clusters:T[][]=[];
  for(const story of stories){
    const group=clusters.find(items=>items.some(item=>titleSimilarity(item.title,story.title)>threshold));
    if(group) group.push(story); else clusters.push([story]);
  }
  return clusters;
}
