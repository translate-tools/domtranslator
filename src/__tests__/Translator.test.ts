import { Translator } from '../Translator';
import { containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

describe('Translator', () => {
	let translate: Translator;
	let div: HTMLElement;
	let attr: Attr;

	beforeEach(() => {
		translate = new Translator(translator);

		div = document.createElement('div');
		attr = document.createAttribute('title');
		attr.value = 'Hello attribute!';
		div.setAttributeNode(attr);
	});

	describe('translate method', () => {
		test('successful translate text and attr node', async () => {
			div.textContent = 'Hello world!';

			const textNode = div.firstChild;
			const attrNode = div.lastChild;
			if (!(textNode instanceof Text) || !(attrNode instanceof Attr)) {
				return;
			}

			// trasnale text node
			await expect(
				translate.translateNode(textNode, {
					id: 0,
					originalText: null,
					priority: 1,
					translateContext: 0,
					updateId: 1,
				}),
			).resolves.toMatchObject(containsRegex(TRANSLATION_SYMBOL));

			// translate attr node
			await expect(
				translate.translateNode(attr, {
					id: 0,
					originalText: null,
					priority: 1,
					translateContext: 0,
					updateId: 1,
				}),
			).resolves.toMatchObject(containsRegex(TRANSLATION_SYMBOL));
		});

		test('not translate', () => {
			// not translate if translateContext == updateId
			// Recursion prevention

			const textNode = div.firstChild;
			if (!(textNode instanceof Text)) {
				return;
			}

			expect(
				translate.translateNode(textNode, {
					id: 0,
					originalText: null,
					priority: 1,
					translateContext: 1,
					updateId: 1,
				}),
			).toBe(undefined);
		});

		test('not translate if nodeValue null', async () => {
			div.textContent = null;

			// if nodeValue is null not translate
			expect(
				translate.translateNode(div, {
					id: 0,
					originalText: null,
					priority: 1,
					translateContext: 0,
					updateId: 1,
				}),
			).toBe(undefined);
		});
	});

	describe('getNodePriority method', () => {
		test('get currect priority for text node and atribute', () => {
			const textNode = div.firstChild;
			if (!(textNode instanceof Text)) {
				return;
			}

			expect(translate.getNodePriority(textNode)).toBe(2);

			expect(translate.getNodePriority(attr)).toBe(2);
		});

		test('priority for not attr and node is 0', () => {
			expect(translate.getNodePriority(div)).toBe(0);
		});
	});
});
