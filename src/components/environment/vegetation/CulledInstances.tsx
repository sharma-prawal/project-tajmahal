import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { Instances } from '@react-three/drei';
import type { InstancedMesh } from 'three';

interface Props extends Omit<ComponentProps<typeof Instances>, 'children'> {
  children: ReactNode;
}

/** Recomputes aggregate instance bounds after drei has committed instance matrices. */
export function CulledInstances({ children, ...props }: Props) {
  const ref = useRef<InstancedMesh>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      ref.current?.computeBoundingBox();
      ref.current?.computeBoundingSphere();
    });
    return () => cancelAnimationFrame(frame);
  }, [props.range]);

  return (
    <Instances ref={ref} {...props} frustumCulled>
      {children}
    </Instances>
  );
}
