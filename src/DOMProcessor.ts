export type ProcessedNodeCallback = (node: Node) => void;

export interface DOMProcessor<S> {
	process(node: Node, callback?: ProcessedNodeCallback): void;
	update(node: Node, callback?: ProcessedNodeCallback): void;
	restore(node: Node): void;

	has(node: Node): boolean;
	getState(node: Node): S | null;
}
