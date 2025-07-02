import { DOMTranslationScheduler } from './types';
import { NodesIntersectionObserver } from './utils/NodesIntersectionObserver';

export class IntersectionDOMTranslationScheduler implements DOMTranslationScheduler {
	private readonly intersectionObserver;
	constructor(intersectionConfig?: IntersectionObserverInit) {
		this.intersectionObserver = new NodesIntersectionObserver(intersectionConfig);
	}

	public add(node: Node, callback: (node: Node) => void): void {
		this.intersectionObserver.observe(node, callback);
	}

	public remove(node: Node): void {
		this.intersectionObserver.unobserve(node);
	}
}
