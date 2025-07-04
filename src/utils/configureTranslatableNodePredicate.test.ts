import { configureTranslatableNodePredicate } from './nodes';

beforeEach(() => {
	vi.clearAllMocks();
	document.body.innerHTML = `
	<div class="container">
		<div class="card">
			<img src="#"/>
		</div>
	</div>
	`;
});

test('invalid selectors must be ignored', () => {
	const container = document.querySelector('.container') as HTMLElement;
	const card = document.querySelector('.card') as HTMLElement;
	const img = document.querySelector('.card img') as HTMLElement;

	const filter = configureTranslatableNodePredicate({
		ignoredSelectors: [';', '!', '3', '.card', '<'],
	});

	expect(() => filter(img)).not.toThrow();

	expect(filter(container)).toBe(true);
	expect(filter(card)).toBe(false);
	expect(filter(img)).toBe(false);

	expect(filter(card.getAttributeNode('class') as Node)).toBe(false);
});
