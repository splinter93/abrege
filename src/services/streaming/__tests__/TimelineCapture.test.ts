import { describe, it, expect } from 'vitest';
import { TimelineCapture } from '../TimelineCapture';

describe('TimelineCapture.addPlanEvent', () => {
  it('appends first plan when no plan exists', () => {
    const cap = new TimelineCapture();
    cap.addPlanEvent({
      title: 'T1',
      steps: [{ id: 'a', content: 'A', status: 'pending' }],
      toolCallId: 'call-1'
    });
    const { items } = cap.getTimeline();
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('plan');
    if (items[0].type === 'plan') {
      expect(items[0].steps).toHaveLength(1);
      expect(items[0].toolCallId).toBe('call-1');
    }
  });

  it('replaces last plan on second update (Cursor-like)', () => {
    const cap = new TimelineCapture();
    cap.addPlanEvent({
      steps: [{ id: 'a', content: 'A', status: 'pending' }],
      toolCallId: 'call-1'
    });
    cap.addPlanEvent({
      steps: [
        { id: 'a', content: 'A', status: 'completed' },
        { id: 'b', content: 'B', status: 'in_progress' }
      ],
      toolCallId: 'call-2'
    });
    const { items } = cap.getTimeline();
    expect(items).toHaveLength(1);
    if (items[0].type === 'plan') {
      expect(items[0].steps).toHaveLength(2);
      expect(items[0].toolCallId).toBe('call-2');
    }
  });

  it('preserves title when a follow-up update omits title (execution steps)', () => {
    const cap = new TimelineCapture();
    cap.addPlanEvent({
      title: 'Benchmark LLM Mars 2026',
      steps: [{ id: 'a', content: 'A', status: 'pending' }],
      toolCallId: 'call-1'
    });
    cap.addPlanEvent({
      steps: [{ id: 'a', content: 'A', status: 'in_progress' }],
      toolCallId: 'call-2'
    });
    const { items } = cap.getTimeline();
    expect(items).toHaveLength(1);
    if (items[0].type === 'plan') {
      expect(items[0].title).toBe('Benchmark LLM Mars 2026');
      expect(items[0].steps[0].status).toBe('in_progress');
    }
  });

  it('appends plan after text then replaces that plan only', () => {
    const cap = new TimelineCapture();
    cap.addTextEvent('hello');
    cap.addPlanEvent({ steps: [{ id: '1', content: 'S1', status: 'pending' }] });
    cap.addPlanEvent({ steps: [{ id: '1', content: 'S1', status: 'completed' }] });
    const { items } = cap.getTimeline();
    expect(items).toHaveLength(2);
    expect(items[0].type).toBe('text');
    expect(items[1].type).toBe('plan');
    if (items[1].type === 'plan') {
      expect(items[1].steps[0].status).toBe('completed');
    }
  });
});
