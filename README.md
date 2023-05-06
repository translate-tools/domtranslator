Translate DOM nodes. Package under construction, subscribe on [github page of project](https://github.com/translate-tools/domtranslator).

# Usage

Install with `npm install domtranslator`

```js
import { NodesTranslator } from 'domtranslator';

// Dummy translator
const translator = async (text) => '[translated] ' + text;
const domTranslator = new NodesTranslator(translator);

// Translate document
domTranslator.observe(document.documentElement);
```
