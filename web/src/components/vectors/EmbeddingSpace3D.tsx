"use client";

import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Point3D {
  x: number;
  y: number;
  z: number;
  label?: string;
  content?: string;
  color?: string;
  isQuery?: boolean;
}

interface EmbeddingSpace3DProps {
  points: Point3D[];
  className?: string;
}

const DEFAULT_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316",
];

function Points({ points }: { points: Point3D[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    points.forEach((pt, i) => {
      dummy.position.set(pt.x, pt.y, pt.z);
      const scale = pt.isQuery ? 0.15 : hovered === i ? 0.12 : 0.06;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      const color = pt.isQuery
        ? new THREE.Color("#ff0000")
        : new THREE.Color(pt.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]);
      meshRef.current!.setColorAt(i, color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, points.length]}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId != null) setHovered(e.instanceId);
        }}
        onPointerLeave={() => setHovered(null)}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial />
      </instancedMesh>
      {hovered != null && points[hovered] && (
        <Html
          position={[points[hovered].x, points[hovered].y + 0.2, points[hovered].z]}
          center
          distanceFactor={3}
        >
          <div className="max-w-48 rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
            <div className="font-medium">{points[hovered].label ?? `Point ${hovered}`}</div>
            {points[hovered].content && (
              <p className="mt-1 line-clamp-3 text-muted-foreground">
                {points[hovered].content}
              </p>
            )}
          </div>
        </Html>
      )}
    </>
  );
}

export function EmbeddingSpace3D({ points, className }: EmbeddingSpace3DProps) {
  if (points.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">3D 向量空间</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">3D 向量空间 (UMAP 投影)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full rounded-lg border bg-muted/20">
          <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} />
            <Points points={points} />
            <OrbitControls enableDamping dampingFactor={0.1} />
            <gridHelper args={[4, 10, "#666", "#333"]} />
          </Canvas>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          拖拽旋转 | 滚轮缩放 | 悬停查看内容
        </p>
      </CardContent>
    </Card>
  );
}
