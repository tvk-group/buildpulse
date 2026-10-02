import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.cwd(),"src");const failures=[];
const artifact=/\\n(?:\s*(?:import|export|const|let|var|if|for|return|await|[A-Za-z_$][\w$]*\s*[:=]))/;
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name)){const s=fs.readFileSync(p,"utf8");if(artifact.test(s))failures.push(path.relative(process.cwd(),p));}}}
walk(root);if(failures.length){console.error("Literal escaped-newline source artifacts:",failures);process.exit(1)}console.log("BuildPulse source hygiene OK");
