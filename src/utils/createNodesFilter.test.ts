import { createNodesFilter } from './nodes';

beforeEach(() => {
	vi.clearAllMocks();
	document.body.innerHTML = `
	<div class="container">
		<div class="card" data-foo="1" data-bar="2">
			<img src="#" alt="Image description" title="Image title"/>
		</div>
	</div>
	`;
});

test('invalid selectors must be ignored', () => {
	const container = document.querySelector('.container') as HTMLElement;
	const card = document.querySelector('.card') as HTMLElement;
	const img = document.querySelector('.card img') as HTMLElement;

	const filter = createNodesFilter({
		ignoredSelectors: [';', '!', '3', '.card', '<'],
	});

	expect(() => filter(img)).not.toThrow();

	expect(filter(container)).toBe(true);
	expect(filter(card)).toBe(false);
	expect(filter(img)).toBe(false);

	expect(filter(card.getAttributeNode('class') as Node)).toBe(false);
});

test('attributes on non-matched nodes is skipped', () => {
	const container = document.querySelector('.container') as HTMLElement;
	const card = document.querySelector('.card') as HTMLElement;
	const img = document.querySelector('.card img') as HTMLElement;

	const filter = createNodesFilter({
		ignoredSelectors: ['.card'],
	});

	expect(filter(img.getAttributeNode('alt') as Node)).toBe(false);

	expect(filter(container)).toBe(true);
	expect(filter(card)).toBe(false);
	expect(filter(img)).toBe(false);
});

test('only attributes in list is match', () => {
	const container = document.querySelector('.container') as HTMLElement;
	const card = document.querySelector('.card') as HTMLElement;
	const img = document.querySelector('.card img') as HTMLElement;

	const filter = createNodesFilter({
		attributesList: ['title', 'data-foo'],
	});

	expect(filter(img.getAttributeNode('title') as Node)).toBe(true);
	expect(filter(img.getAttributeNode('alt') as Node)).toBe(false);
	expect(filter(img.getAttributeNode('src') as Node)).toBe(false);

	expect(filter(card.getAttributeNode('data-foo') as Node)).toBe(true);
	expect(filter(card.getAttributeNode('data-bar') as Node)).toBe(false);

	expect(filter(container)).toBe(true);
	expect(filter(card)).toBe(true);
	expect(filter(img)).toBe(true);
});
