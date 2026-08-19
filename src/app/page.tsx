import { Site } from "@/components/Site";

/**
 * Fully static. This used to read `?v=` to switch landing layouts while we
 * compared directions, which opted the route into on-demand rendering; the
 * direction is settled, so the param is gone and `/` prerenders again.
 *
 * The variant machinery in `@/lib/layout-variants` is still there and still
 * wired through `Site` → `Landing`, so an alternative can be revived by
 * passing `variant` here — it just no longer costs a dynamic route.
 */
export default function Home() {
  return <Site />;
}
