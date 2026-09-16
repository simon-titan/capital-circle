import { PlatformFrame } from "@/components/platform/shell/PlatformFrame";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformFrame>{children}</PlatformFrame>;
}
