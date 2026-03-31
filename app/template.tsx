import { ImmersiveRouteTransition } from "@/components/transitions/ImmersiveRouteTransition";

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return <ImmersiveRouteTransition>{children}</ImmersiveRouteTransition>;
}
