export function markdown(s){return `# The Blend Board — Living Report

Generated: ${new Date().toLocaleString()}

## Observations
${s.observations.map(x=>`- **${x.title}** (${x.stage}) — ${x.description}`).join("\n")}

## Projects
${s.projects.map(x=>`### ${x.title}
Stage: ${x.stage}

${x.description}`).join("\n\n")}

## Reflections
${s.reflections.map(x=>`- Worked: ${x.worked||"—"}
- Failed: ${x.failed||"—"}
- Emerged: ${x.emerged||"—"}
- Continue: ${x.continue||"—"}
- New source: ${x.newSource||"—"}`).join("\n\n")}`}
export function mermaid(s){let lines=["flowchart TD"];s.projects.forEach((p,i)=>{let a=`P${i}`;lines.push(`${a}[\"${clean(p.title)}\"] --> ${a}C{${p.stage}}`);(p.outcomes||[]).forEach((o,j)=>lines.push(`${a}C --> ${a}O${j}[\"${clean(o.transformation.join(', ')||'Outcome')}\"]`))});return lines.join("\n")}function clean(x){return String(x).replace(/["{}\[\]]/g,"")}