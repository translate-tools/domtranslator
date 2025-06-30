Simple and powerful DOM translator.


# About

With this package you may implement translation for any elements on web page like "Google Translate Widget" and make site multi lingual even if no localization system is designed yet.

Some of key features
- Battle tested solution. This package is used by a popular browser extension [Linguist Translate](https://linguister.io/) with **over 200k active users**.
- DOM translator is a high performance solution
- Modular design let you tune any part DOM translator
- Translation of web pages with dynamical changes is supported
- Highly configurable design let you start translate any document in minutes

# Usage

Install with `npm install domtranslator`

```js
import { NodesTranslator } from 'domtranslator';

// Dummy translator
const translator = async (text) => '[translated] ' + text;

// `PersistentDOMTranslator` will translate updated nodes with use `DOMTranslator`
const domTranslator = new PersistentDOMTranslator(
	new DOMTranslator(
		// Nodes will be translated with fake translator,
		// that is just adds a text prefix to original text
		new NodesTranslator(translator),
		{
			// When `nodesIntersectionObserver` is provided, a lazy translation mode will be used.
			// Nodes will be translated only when intersects a viewport
			nodesIntersectionObserver: new NodesIntersectionObserver(),

			// Filter will skip nodes that must not be translated
			filter: configureTranslatableNodePredicate({
				// Only listed attributes will be translated
				translatableAttributes: [
					'title',
					'alt',
					'placeholder',
					'label',
					'aria-label',
				],
				// Any elements not included in list will be translated
				ignoredSelectors: [
					'meta',
					'link',
					'script',
					'noscript',
					'style',
					'code',
					'textarea',
				],
			}),
		}
	),
);

// You may translate whole document
// domTranslator.observe(document.documentElement);

// Or just few elements
domTranslator.observe(document.querySelector('#widget1'));
domTranslator.observe(document.querySelector('#widget2'));
domTranslator.observe(document.querySelector('#widget3'));

// You may disable translation for any element, and restore its original text
domTranslator.unobserve(document.querySelector('#widget2'));
```
