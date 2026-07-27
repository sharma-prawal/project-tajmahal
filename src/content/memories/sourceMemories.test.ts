import { describe, expect, it } from 'vitest';
import { MemoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { OwnershipManager } from '@core/memoryRuntime/OwnershipManager';
import { WorldActionRegistry } from '@core/memoryRuntime/WorldActionRegistry';
import { MINTS_MEMORY } from '@core/memoryRuntime/mintsMemoryDefinition';
import { BACK_MEMORY } from '@core/memoryRuntime/backMemoryDefinition';
import { UMBRELLA_MEMORY } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { LITTLE_DETAILS_MEMORY } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_MEMORY } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BOARDING_PASSES_MEMORY } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { SOURCE_MEMORIES, getSourceMemory } from './sourceMemories';
import { validateSourceMemories } from './validation';

describe('approved source memory catalog', () => {
  it('preserves all seven unique versioned approved records', () => {
    expect(SOURCE_MEMORIES).toHaveLength(7);
    expect(new Set(SOURCE_MEMORIES.map((memory) => memory.id)).size).toBe(7);
    for (const memory of SOURCE_MEMORIES) {
      expect(memory.originalText.trim()).not.toBe(''); expect(memory.approvedText.trim()).not.toBe('');
      expect(memory.approvalStatus).toBe('approved'); expect(memory.contentVersion).toBe(2); expect(memory.boundaryNotes.length).toBeGreaterThan(0);
    }
  });
  it('marks all seven production memories implemented and links each once', () => {
    expect(SOURCE_MEMORIES.filter((memory) => memory.productionStatus === 'implemented').map((memory) => memory.id)).toEqual(['memory.all-day-call', 'memory.back', 'memory.boarding-passes', 'memory.mints', 'memory.umbrella', 'memory.little-details', 'memory.friday-night']);
    expect(() => validateSourceMemories(SOURCE_MEMORIES, [MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY, ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY])).not.toThrow();
    expect(getSourceMemory('memory.all-day-call').runtimeMemoryId).toBe(ALL_DAY_CALL_MEMORY.id);
    expect(getSourceMemory('memory.back').runtimeMemoryId).toBe(BACK_MEMORY.id);
    expect(getSourceMemory('memory.mints').runtimeMemoryId).toBe(MINTS_MEMORY.id);
    expect(getSourceMemory('memory.umbrella').runtimeMemoryId).toBe(UMBRELLA_MEMORY.id);
    expect(getSourceMemory('memory.little-details').runtimeMemoryId).toBe(LITTLE_DETAILS_MEMORY.id);
    expect(getSourceMemory('memory.boarding-passes').runtimeMemoryId).toBe(BOARDING_PASSES_MEMORY.id);
    expect(getSourceMemory('memory.friday-night').runtimeMemoryId).toBe(FRIDAY_NIGHT_MEMORY.id);
  });
  it('has no source-only record and loading content itself creates no runtime registrations', () => {
    const runtime = new MemoryRuntime(new OwnershipManager(), new WorldActionRegistry());
    expect(runtime.registry.list()).toEqual([]);
    expect(SOURCE_MEMORIES.filter((memory) => memory.productionStatus === 'source-only')).toEqual([]);
  });
  it('rejects duplicate IDs, unsupported assets, missing text, unsupported versions, and invalid links', () => {
    const definitions = [MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY, ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY];
    expect(() => validateSourceMemories([...SOURCE_MEMORIES, SOURCE_MEMORIES[0]], definitions)).toThrow(/Duplicate source/);
    expect(() => validateSourceMemories(SOURCE_MEMORIES.map((record) => record.id === 'memory.mints' ? { ...record, assetReferences: ['unknown:file'] } : record), definitions)).toThrow(/Unsupported asset/);
    expect(() => validateSourceMemories(SOURCE_MEMORIES.map((record) => record.id === 'memory.back' ? { ...record, approvedText: '' } : record), definitions)).toThrow(/missing approved/);
    expect(() => validateSourceMemories(SOURCE_MEMORIES.map((record) => record.id === 'memory.back' ? { ...record, contentVersion: 99 as 1 } : record), definitions)).toThrow(/Unsupported source/);
    expect(() => validateSourceMemories(SOURCE_MEMORIES, [])).toThrow(/invalid runtime link/);
  });
  it('preserves critical authenticity boundaries verbatim', () => {
    expect(getSourceMemory('memory.back').approvedText).toContain('company deadlines');
    expect(getSourceMemory('memory.boarding-passes').approvedText).toContain('PS Portal');
    expect(getSourceMemory('memory.mints').approvedText).toContain('Himachal');
  });
});
