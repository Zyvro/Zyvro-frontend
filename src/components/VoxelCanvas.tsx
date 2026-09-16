"use client"

// Interactive 3D preview of the voxelPreview node: a textured primitive
// (cube: one image per face, cycled; sphere: equirectangular longitude
// bands) rendered with three.js, draggable to rotate, scroll to zoom.

import { useEffect, useRef } from "react"
import * as THREE from "three"

export type VoxelFace = {
  dataUrl: string
  url?: string
  mimeType?: string
}

type Props = {
  shape: "cube" | "sphere"
  faces: VoxelFace[]
  className?: string
}

// Sphere with coherent equirectangular UVs: image k of n covers the
// longitude band u in [k/n, (k+1)/n], full latitude. Bands are laid out
// sequentially in one index buffer with one group per band so each image
// wraps its own slice of longitude without stretching.
function buildSphereGeometry(bands: number): THREE.BufferGeometry {
  const rows = 24
  const radius = 0.62
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let b = 0; b < bands; b++) {
    const phiStart = (b / bands) * Math.PI * 2
    const phiLength = (Math.PI * 2) / bands
    for (let r = 0; r <= rows; r++) {
      const v = r / rows
      const theta = v * Math.PI // 0 = north pole
      for (let c = 0; c <= 1; c++) {
        const u = c // u normalized inside the band
        const phi = phiStart + u * phiLength
        const sinPhi = Math.sin(phi)
        const cosPhi = Math.cos(phi)
        const sinTheta = Math.sin(theta)
        const cosTheta = Math.cos(theta)
        const x = -radius * cosPhi * sinTheta
        const y = radius * cosTheta
        const z = radius * sinPhi * sinTheta
        positions.push(x, y, z)
        normals.push(x / radius, y / radius, z / radius)
        uvs.push(u, 1 - v)
      }
    }
    const base = b * (rows + 1) * 2
    for (let r = 0; r < rows; r++) {
      const a = base + r * 2
      const bb = a + 1
      const cc = a + 2
      const dd = a + 3
      indices.push(a, cc, bb, bb, cc, dd)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  const idxPerBand = rows * 6
  for (let b = 0; b < bands; b++) {
    geo.addGroup(idxPerBand * b, idxPerBand, b)
  }
  return geo
}

export function VoxelCanvas({ shape, faces, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const facesKey = faces.map((f) => f.dataUrl || f.url || "").join("|")

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || faces.length === 0) return
    const el: HTMLDivElement = mount

    const w = mount.clientWidth || 240
    const h = mount.clientHeight || 180
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 50)
    camera.position.set(0, 0, 2.4)

    // Load the face textures (data URLs resolve instantly).
    const loader = new THREE.TextureLoader()
    const textures = faces.map((f) => {
      const t = loader.load(f.dataUrl || f.url || "")
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = renderer.capabilities.getMaxAnisotropy()
      return t
    })

    let mesh: THREE.Mesh
    if (shape === "sphere") {
      const bands = Math.max(1, textures.length)
      const geo = buildSphereGeometry(bands)
      const mats = textures.map((t) => new THREE.MeshBasicMaterial({ map: t }))
      mesh = new THREE.Mesh(geo, mats)
    } else {
      const geo = new THREE.BoxGeometry(1, 1, 1)
      const mats: THREE.MeshBasicMaterial[] = []
      for (let i = 0; i < 6; i++) {
        mats.push(new THREE.MeshBasicMaterial({ map: textures[i % textures.length] }))
      }
      mesh = new THREE.Mesh(geo, mats)
    }
    scene.add(mesh)

    // Drag to rotate, wheel to zoom (guarded by pointer capture).
    let dragging = false
    let lastX = 0
    let lastY = 0
    let rotX = -0.35
    let rotY = 0.6
    let zoom = 2.4

    function applyTransform() {
      mesh.rotation.x = rotX
      mesh.rotation.y = rotY
      camera.position.set(0, 0, zoom)
    }
    applyTransform()

    function onDown(e: PointerEvent) {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return
      rotY += (e.clientX - lastX) * 0.01
      rotX += (e.clientY - lastY) * 0.01
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX))
      lastX = e.clientX
      lastY = e.clientY
      applyTransform()
    }
    function onUp(e: PointerEvent) {
      dragging = false
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      zoom = Math.max(1.2, Math.min(5, zoom + e.deltaY * 0.002))
      applyTransform()
    }
    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("pointercancel", onUp)
    el.addEventListener("wheel", onWheel, { passive: false })

    let raf = 0
    const render = () => {
      renderer.render(scene, camera)
      raf = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("pointercancel", onUp)
      el.removeEventListener("wheel", onWheel)
      textures.forEach((t) => t.dispose())
      ;(Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose())
      mesh.geometry.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, facesKey])

  return <div ref={mountRef} className={className} />
}