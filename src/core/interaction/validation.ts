import type { InteractionDefinition } from './types';

export const INTERACTION_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export function isValidInteractionId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 96 && INTERACTION_ID_PATTERN.test(value);
}

export function validateInteractionDefinition(definition: InteractionDefinition): void {
  if (!isValidInteractionId(definition.id)) throw new Error(`Invalid interaction id: ${String(definition.id)}`);
  if (!Array.isArray(definition.position) || definition.position.length !== 3 || !definition.position.every(Number.isFinite)) {
    throw new Error(`Interaction ${definition.id} has an invalid position`);
  }
  if (!Number.isFinite(definition.activationDistance) || definition.activationDistance <= 0 || definition.activationDistance > 100) {
    throw new Error(`Interaction ${definition.id} has an invalid activation distance`);
  }
  if (definition.type === 'view-and-proximity' && definition.focusAngleDegrees === undefined) {
    throw new Error(`Interaction ${definition.id} requires a focus angle`);
  }
  if (definition.focusAngleDegrees !== undefined && (!Number.isFinite(definition.focusAngleDegrees) || definition.focusAngleDegrees <= 0 || definition.focusAngleDegrees > 180)) {
    throw new Error(`Interaction ${definition.id} has an invalid focus angle`);
  }
  if (definition.priority !== undefined && (!Number.isInteger(definition.priority) || Math.abs(definition.priority) > 1000)) {
    throw new Error(`Interaction ${definition.id} has an invalid priority`);
  }
  if (!definition.prompt.trim() || !definition.accessibilityLabel.trim()) {
    throw new Error(`Interaction ${definition.id} requires prompt and accessibility text`);
  }
  if (definition.behavior === 'one-shot' && definition.persistence === 'completion' && definition.id.startsWith('dev.') === false && definition.id.length < 3) {
    throw new Error(`Persistent interaction ${definition.id} needs a stable descriptive id`);
  }
  if (definition.cooldownMs !== undefined && (!Number.isFinite(definition.cooldownMs) || definition.cooldownMs < 0 || definition.cooldownMs > 60_000)) {
    throw new Error(`Interaction ${definition.id} has an invalid cooldown`);
  }
}
