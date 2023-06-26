import { highlightAuto } from "highlight.js";

import { VNode } from "maquette";
import { jsx } from "maquette-jsx";

export function highlight(languageName: string, code: string): VNode {
  return (
    <pre style="font-size: 20px; line-height: 1.1;">
      <code innerHTML={highlightAuto(code).value}></code>
    </pre>
  );
}
