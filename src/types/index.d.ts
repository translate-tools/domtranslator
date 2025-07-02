export type ProcessedNodeCallback = (node: Node) => void;

export interface DOMProcessor {
	process(node: Node, callback?: ProcessedNodeCallback): void;
	update(node: Node, callback?: ProcessedNodeCallback): void;
	restore(node: Node): void;
}

export interface StateStorage<S> {
	has(node: Node): boolean;
	getState(node: Node): S | null;
}

/**
 * Scheduler that define when node will be translated.
 * 
 * For example, node translation may be delayed if node is not visible,
 * or if pool of requests is full, or to score nodes priority in tree,
 * and translate it in order of importance.
 */
export interface DOMTranslationScheduler {
	/**
	 * Add node to scheduler
	 * 
	 * Callback will be called when scheduler decide to start translate a node
	 */
	add(node: Node, callback: (node: Node) => void): void;

	/**
	 * Remove node of scheduler
	 */
	remove(node: Node): void;
}