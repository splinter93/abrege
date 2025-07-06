declare module 'lowlight/lib/core' {
  import { Lowlight } from 'lowlight/lib/core';
  const lowlight: Lowlight;
  export default lowlight;
}

declare module 'highlight.js/lib/languages/javascript' {
  const lang: any;
  export default lang;
}
declare module 'highlight.js/lib/languages/typescript' {
  const lang: any;
  export default lang;
}
declare module 'highlight.js/lib/languages/python' {
  const lang: any;
  export default lang;
}
declare module 'highlight.js/lib/languages/bash' {
  const lang: any;
  export default lang;
}

declare module 'lowlight' {
  const lowlight: any;
  export = lowlight;
} 