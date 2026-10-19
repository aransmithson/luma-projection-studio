import { mod, smooth } from "./effects/common";
import type { ChaseRoute } from "./chaseRoute";
import type { StoryStack } from "./types";

// The route is one continuous strip measured in projector pixels. Every tile
// samples the same position, including hidden tiles and the last/first join.
export function storyMotion(
  time: number,
  stack: Pick<StoryStack, "duration" | "direction">,
  route: ChaseRoute,
) {
  const phase = mod(Math.round(mod(time / stack.duration, 1) * 1e9), 1e9) / 1e9;
  const facing = stack.direction === "right" ? -1 : 1;
  return { phase, facing, x: mod(facing * phase * route.width, route.width) };
}

export function storyCopies(x: number, route: ChaseRoute, index: number) {
  const segment = route.segments[index];
  const reach = route.unit * 8; // Includes the ghost train's carriages and smoke.
  return [-route.width, 0, route.width]
    .map((lap) => x + lap - segment.start)
    .filter((local) => local + reach > 0 && local - reach < segment.width);
}

// A local reaction is derived from the last visit, not accumulated frame state.
// Scrubbing, Pause, Restart and the wrap therefore reproduce the same scene.
export function storyVisit(
  phase: number,
  route: ChaseRoute,
  index: number,
  direction: StoryStack["direction"],
) {
  const tile = route.segments[index];
  const arrival = mod(
    ((tile.start + tile.width * 0.52) / route.width) *
      (direction === "right" ? -1 : 1),
    1,
  );
  const age = mod(phase - arrival + 0.045, 1) - 0.045;
  const glow =
    smooth((age + 0.045) / 0.045) * (1 - smooth((age - 0.035) / 0.24));
  return {
    age,
    glow,
    bloom: smooth((age + 0.025) / 0.065) * (1 - smooth((age - 0.17) / 0.27)),
  };
}
