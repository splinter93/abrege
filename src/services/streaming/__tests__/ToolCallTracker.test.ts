/**
 * Tests unitaires pour ToolCallTracker
 * Démontre la testabilité du système de déduplication
 */

import { ToolCallTracker } from '../ToolCallTracker';

describe('ToolCallTracker', () => {
  let tracker: ToolCallTracker;

  beforeEach(() => {
    tracker = new ToolCallTracker();
  });

  describe('addToolCall', () => {
    it('should add a new tool call', () => {
      tracker.addToolCall({
        id: 'tc1',
        type: 'function',
        function: {
          name: 'search_notes',
          arguments: '{"query":"test"}'
        }
      });

      const toolCalls = tracker.getAllToolCalls();
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].id).toBe('tc1');
      expect(toolCalls[0].function.name).toBe('search_notes');
    });

    it('should deduplicate tool calls by ID', () => {
      tracker.addToolCall({
        id: 'tc1',
        function: { name: 'search', arguments: '{"q"' }
      });

      tracker.addToolCall({
        id: 'tc1',
        function: { arguments: ':\"test\"}' }
      });

      const toolCalls = tracker.getAllToolCalls();

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].function.arguments).toBe('{"q":\"test\"}');
    });

    it('should track multiple distinct tool calls', () => {
      tracker.addToolCall({
        id: 'tc1',
        function: { name: 'search', arguments: '{}' }
      });

      tracker.addToolCall({
        id: 'tc2',
        function: { name: 'create', arguments: '{}' }
      });

      const toolCalls = tracker.getAllToolCalls();
      expect(toolCalls).toHaveLength(2);
    });
  });

  describe('getNewToolCallsForNotification', () => {
    it('should return only non-notified tool calls', () => {
      tracker.addToolCall({ id: 'tc1', function: { name: 'search', arguments: '{}' } });
      tracker.addToolCall({ id: 'tc2', function: { name: 'create', arguments: '{}' } });

      const newCalls1 = tracker.getNewToolCallsForNotification();
      expect(newCalls1).toHaveLength(2);

      tracker.markNotified(newCalls1);

      const newCalls2 = tracker.getNewToolCallsForNotification();
      expect(newCalls2).toHaveLength(0);
    });
  });

  describe('getNewToolCallsForExecution', () => {
    it('should track execution separately from notification', () => {
      tracker.addToolCall({ id: 'tc1', function: { name: 'search', arguments: '{}' } });

      const forNotification = tracker.getNewToolCallsForNotification();
      expect(forNotification).toHaveLength(1);

      const forExecution = tracker.getNewToolCallsForExecution();
      expect(forExecution).toHaveLength(1);

      // Marquer comme notifié (mais pas exécuté)
      tracker.markNotified(forNotification);

      const forNotification2 = tracker.getNewToolCallsForNotification();
      expect(forNotification2).toHaveLength(0);

      const forExecution2 = tracker.getNewToolCallsForExecution();
      expect(forExecution2).toHaveLength(1); // Toujours 1
    });
  });

  describe('clearCurrentRound', () => {
    it('should clear current round but keep all tool calls', () => {
      tracker.addToolCall({ id: 'tc1', function: { name: 'search', arguments: '{}' } });

      const stateBefore = tracker.getState();
      expect(stateBefore.currentRound).toBe(1);
      expect(stateBefore.totalToolCalls).toBe(1);

      tracker.clearCurrentRound();

      const stateAfter = tracker.getState();
      expect(stateAfter.currentRound).toBe(0);
      expect(stateAfter.totalToolCalls).toBe(1); // Toujours 1
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      tracker.addToolCall({ id: 'tc1', function: { name: 'search', arguments: '{}' } });
      tracker.markNotified(tracker.getAllToolCalls());
      tracker.markExecutionNotified(tracker.getAllToolCalls());

      tracker.reset();

      const state = tracker.getState();
      expect(state.totalToolCalls).toBe(0);
      expect(state.notified).toBe(0);
      expect(state.executionNotified).toBe(0);
      expect(state.currentRound).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return accurate state', () => {
      tracker.addToolCall({ id: 'tc1', function: { name: 'search', arguments: '{}' } });
      tracker.addToolCall({ id: 'tc2', function: { name: 'create', arguments: '{}' } });

      const state = tracker.getState();

      expect(state.totalToolCalls).toBe(2);
      expect(state.currentRound).toBe(2);
      expect(state.notified).toBe(0);
      expect(state.executionNotified).toBe(0);
    });
  });
});

