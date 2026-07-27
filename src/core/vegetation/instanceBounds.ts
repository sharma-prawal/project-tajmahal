import { Box3, Sphere, Vector3 } from 'three';
import type { VegetationInstance } from './placement';

export interface InstanceFieldBounds {
  box: Box3;
  sphere: Sphere;
}

export function calculateInstanceFieldBounds(instances: VegetationInstance[], radius: number, minY = 0, maxY = radius * 2): InstanceFieldBounds {
  const box = new Box3();
  for (const instance of instances) {
    const r = radius * instance.scale;
    box.expandByPoint(new Vector3(instance.position[0] - r, minY, instance.position[2] - r));
    box.expandByPoint(new Vector3(instance.position[0] + r, maxY * instance.scale, instance.position[2] + r));
  }
  if (instances.length === 0) box.set(new Vector3(), new Vector3());
  return { box, sphere: box.getBoundingSphere(new Sphere()) };
}
